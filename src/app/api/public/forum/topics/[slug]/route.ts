import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/forum/topics/[slug]
 * Konu detayı + tüm yanıtlar (posts) — viewCount artır
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Kullanıcı kimliğini header'dan al (beğeni durumu için)
  const authHeader = req.headers.get("authorization");
  const currentUserId = authHeader ? (authHeader.split(" ").length === 2 ? authHeader.split(" ")[1] : authHeader) : null;

  const topic = await prisma.forumTopic.findUnique({
    where: { slug },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true } },
      posts: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          authorId: true,
          authorName: true,
          likeCount: true,
          dislikeCount: true,
          createdAt: true,
          reactions: {
            select: { userId: true, type: true },
          },
        },
      },
    },
  });

  if (!topic) {
    return NextResponse.json({ error: "Konu bulunamadı." }, { status: 404 });
  }

  if (topic.status === "HIDDEN" || topic.status === "DELETED") {
    return NextResponse.json({ error: "Bu konu artık erişilebilir değil." }, { status: 403 });
  }

  // viewCount artır (fire-and-forget)
  prisma.forumTopic.update({
    where: { id: topic.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  // Posts'a userReaction alanı ekle
  const enrichedPosts = topic.posts.map((post: any) => {
    const userReaction = currentUserId
      ? post.reactions?.find((r: any) => r.userId === currentUserId)?.type || null
      : null;
    const { reactions, ...rest } = post;
    return { ...rest, userReaction };
  });

  return NextResponse.json({ 
    success: true, 
    data: { ...topic, posts: enrichedPosts } 
  });
}


/**
 * DELETE /api/public/forum/topics/[slug]
 * Kullanıcı kendi açtığı konuyu silebilir (authorId eşleşmesi zorunlu).
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Kullanıcı kimliğini header'dan al
  const auth = req.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const parts = auth.split(" ");
  const userId = parts.length === 2 ? parts[1] : auth;

  const topic = await prisma.forumTopic.findUnique({
    where: { slug },
    select: { id: true, authorId: true, categoryId: true },
  });

  if (!topic) {
    return NextResponse.json({ error: "Konu bulunamadı." }, { status: 404 });
  }

  // Sadece konu sahibi silebilir
  if (topic.authorId !== userId) {
    return NextResponse.json({ error: "Bu konuyu silme yetkiniz yok." }, { status: 403 });
  }

  // Cascade: önce postları sil, sonra konuyu
  await prisma.forumPost.deleteMany({ where: { topicId: topic.id } });
  await prisma.forumTopic.delete({ where: { id: topic.id } });

  // Kategori topicCount'u güncelle
  await prisma.forumCategory.update({
    where: { id: topic.categoryId },
    data: { topicCount: { decrement: 1 } },
  }).catch(() => {});

  return NextResponse.json({ success: true, message: "Konu silindi." });
}
