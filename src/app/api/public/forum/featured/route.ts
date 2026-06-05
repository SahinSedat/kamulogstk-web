import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/forum/featured
 * isFeatured == true olan en güncel konuları döner (max 5)
 * Geriye dönük uyumluluk: Tek konu da "data" olarak döner,
 * ayrıca "topics" dizisi de eklenir.
 */
export async function GET() {
  const topics = await prisma.forumTopic.findMany({
    where: { isFeatured: true, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
      _count: { select: { posts: true } },
    },
  });

  if (topics.length === 0) {
    return NextResponse.json({ data: null, topics: [] });
  }

  const mapped = topics.map((topic) => ({
    id: topic.id,
    title: topic.title,
    slug: topic.slug,
    content: topic.content,
    authorName: topic.authorName || "Anonim",
    categoryId: topic.categoryId,
    category: topic.category,
    likeCount: topic.likeCount || 0,
    replyCount: topic._count.posts || 0,
    viewCount: topic.viewCount || 0,
    createdAt: topic.createdAt,
  }));

  return NextResponse.json({
    data: mapped[0], // Geriye dönük uyumluluk
    topics: mapped,  // Birden fazla featured topic
  });
}
