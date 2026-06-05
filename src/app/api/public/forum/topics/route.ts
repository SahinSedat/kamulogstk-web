import { createAdminNotification } from "@/lib/services/adminNotificationService";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { containsProfanity } from "@/lib/utils/profanityFilter";

/**
 * GET /api/public/forum/topics
 * Açık ve kilitli konuları en yeniden eskiye getir (HIDDEN/DELETED hariç)
 * ?categoryId=xxx ile filtreleme destekler
 */
export async function GET(req: NextRequest) {
  const categoryId = req.nextUrl.searchParams.get("categoryId");
  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where: any = {
    status: { in: ["OPEN", "LOCKED"] },
  };
  if (categoryId) where.categoryId = categoryId;

  const [topics, total] = await Promise.all([
    prisma.forumTopic.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, icon: true, color: true, slug: true } },
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.forumTopic.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: topics,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * POST /api/public/forum/topics
 * Mobil uygulamadan yeni konu aç (STK bağımsız, genel forum)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, content, categoryId, authorId, authorName } = body;

    if (!title || !content || !categoryId || !authorId || !authorName) {
      return NextResponse.json(
        { error: "title, content, categoryId, authorId ve authorName zorunludur." },
        { status: 400 }
      );
    }

    // ⚖️ Forum Ban kontrolü
    const banCheck = await prisma.user.findUnique({
      where: { id: authorId },
      select: { banForumUntil: true, banReason: true },
    });
    if (banCheck?.banForumUntil && new Date(banCheck.banForumUntil) > new Date()) {
      const until = new Date(banCheck.banForumUntil).toLocaleDateString("tr-TR");
      return NextResponse.json({
        error: `Hesabınız '${banCheck.banReason || "Kural ihlali"}' nedeniyle ${until} tarihine kadar forumdan uzaklaştırılmıştır.`,
        banUntil: banCheck.banForumUntil,
        banReason: banCheck.banReason,
      }, { status: 403 });
    }

    // 🛡️ Küfür/Hakaret filtresi
    if (containsProfanity(title) || containsProfanity(content)) {
      return NextResponse.json(
        { error: "İçeriğinizde uygunsuz ifadeler tespit edildi. Lütfen düzenleyiniz." },
        { status: 400 }
      );
    }

    // Kategori var mı kontrol
    const category = await prisma.forumCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json({ error: "Geçersiz kategori." }, { status: 404 });
    }

    // Slug üret
    let slug = slugify(title);
    const existing = await prisma.forumTopic.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    // Konu oluştur
    const topic = await prisma.forumTopic.create({
      data: {
        title,
        slug,
        content,
        categoryId,
        authorId,
        authorName,
        status: "OPEN",
      },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
    });

    // Kategorinin topicCount'unu artır
    await prisma.forumCategory.update({
      where: { id: categoryId },
      data: { topicCount: { increment: 1 } },
    });

    // 🔔 Admin Bildirim — Yeni Forum Konusu
    createAdminNotification({
      type: "NEW_FORUM_TOPIC",
      title: "Yeni Forum Konusu",
      message: `${body.authorName || "Kullanıcı"} yeni bir forum konusu açtı: ${body.title}`,
      userId: body.authorId || undefined,
      senderName: body.authorName || undefined,
      relatedId: topic?.id,
      metadata: { topicTitle: body.title },
    }).catch(() => {});

    return NextResponse.json({ success: true, data: topic }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
