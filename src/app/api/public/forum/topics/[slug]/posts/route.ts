import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { containsProfanity } from "@/lib/utils/profanityFilter";

/**
 * POST /api/public/forum/topics/[slug]/posts
 * Konuya yanıt/yorum yaz (slug ile konu bul)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { content, authorId, authorName } = body;

    if (!content || !authorId || !authorName) {
      return NextResponse.json(
        { error: "content, authorId ve authorName zorunludur." },
        { status: 400 }
      );
    }

    // ⚖️ Forum Ban kontrolü
    const banUser = await prisma.user.findUnique({
      where: { id: authorId },
      select: { banForumUntil: true, banReason: true },
    });
    if (banUser?.banForumUntil && new Date(banUser.banForumUntil) > new Date()) {
      const until = new Date(banUser.banForumUntil).toLocaleDateString("tr-TR");
      return NextResponse.json({
        error: `Hesabınız '${banUser.banReason || "Kural ihlali"}' nedeniyle ${until} tarihine kadar forumdan uzaklaştırılmıştır.`,
        banUntil: banUser.banForumUntil,
        banReason: banUser.banReason,
      }, { status: 403 });
    }

    // 🛡️ Küfür/Hakaret filtresi
    if (containsProfanity(content)) {
      return NextResponse.json(
        { error: "Yorumunuzda uygunsuz ifadeler tespit edildi. Lütfen düzenleyiniz." },
        { status: 400 }
      );
    }

    // Konu var mı ve açık mı kontrol et (slug ile bul)
    const topic = await prisma.forumTopic.findUnique({ where: { slug } });
    if (!topic) {
      return NextResponse.json({ error: "Konu bulunamadı." }, { status: 404 });
    }
    if (topic.status === "LOCKED") {
      return NextResponse.json({ error: "Bu konu kilitli, yanıt yazılamaz." }, { status: 403 });
    }
    if (topic.status === "HIDDEN" || topic.status === "DELETED") {
      return NextResponse.json({ error: "Bu konu artık erişilebilir değil." }, { status: 403 });
    }

    // Yanıtı oluştur
    const post = await prisma.forumPost.create({
      data: {
        content,
        topicId: topic.id,
        authorId,
        authorName,
      },
    });

    // Konunun replyCount ve lastReplyAt'ını güncelle
    await prisma.forumTopic.update({
      where: { id: topic.id },
      data: {
        replyCount: { increment: 1 },
        lastReplyAt: new Date(),
      },
    });

    // Kategorinin postCount'unu artır
    await prisma.forumCategory.update({
      where: { id: topic.categoryId },
      data: { postCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
