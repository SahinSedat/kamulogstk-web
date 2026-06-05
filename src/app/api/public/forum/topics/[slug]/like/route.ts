import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/public/forum/topics/[slug]/like
 * Beğeni toggle — varsa kaldır, yoksa ekle
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId zorunludur." }, { status: 400 });
    }

    const topic = await prisma.forumTopic.findUnique({ where: { slug } });
    if (!topic) {
      return NextResponse.json({ error: "Konu bulunamadı." }, { status: 404 });
    }

    // Daha önce beğenmiş mi?
    const existing = await prisma.forumTopicLike.findUnique({
      where: { topicId_userId: { topicId: topic.id, userId } },
    });

    if (existing) {
      // Unlike
      await prisma.forumTopicLike.delete({ where: { id: existing.id } });
      await prisma.forumTopic.update({
        where: { id: topic.id },
        data: { likeCount: { decrement: 1 } },
      });
      return NextResponse.json({ success: true, liked: false, likeCount: topic.likeCount - 1 });
    } else {
      // Like
      await prisma.forumTopicLike.create({
        data: { topicId: topic.id, userId },
      });
      await prisma.forumTopic.update({
        where: { id: topic.id },
        data: { likeCount: { increment: 1 } },
      });
      return NextResponse.json({ success: true, liked: true, likeCount: topic.likeCount + 1 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
