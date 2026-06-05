import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/admin/forum/topics
 * Forum konularını kategori bilgisiyle getir
 */
export async function GET(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  const categoryId = req.nextUrl.searchParams.get("categoryId");
  const status = req.nextUrl.searchParams.get("status");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (categoryId) where.categoryId = categoryId;
  if (status) where.status = status;

  const topics = await prisma.forumTopic.findMany({
    where,
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ success: true, data: topics, count: topics.length });
}

/**
 * PATCH /api/admin/forum/topics?id=xxx
 * Forum konusu durumunu güncelle
 */
export async function PATCH(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const body = await req.json();
  const topic = await prisma.forumTopic.update({
    where: { id },
    data: { status: body.status },
  });

  return NextResponse.json({ success: true, data: topic });
}

/**
 * DELETE /api/admin/forum/topics?id=xxx
 * Forum konusunu ve tüm yorumlarını sil
 */
export async function DELETE(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  try {
    // Cascade silme: önce posts sonra topic
    await prisma.forumPost.deleteMany({ where: { topicId: id } });
    await prisma.forumTopic.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Bilinmeyen hata";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
