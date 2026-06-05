import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/forum/posts/react
 * Yorum beğenme/beğenmeme
 * Body: { postId, userId, type: "LIKE" | "DISLIKE" }
 */
export async function POST(req: NextRequest) {
  try {
    const { postId, userId, type } = await req.json();

    if (!postId || !userId || !type) {
      return NextResponse.json({ error: "postId, userId, type gerekli" }, { status: 400 });
    }

    if (!["LIKE", "DISLIKE"].includes(type)) {
      return NextResponse.json({ error: "type LIKE veya DISLIKE olmalı" }, { status: 400 });
    }

    // Mevcut reaction var mı?
    const existing = await prisma.forumPostReaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      if (existing.type === type) {
        // Aynı tipte → kaldır (toggle off)
        await prisma.forumPostReaction.delete({ where: { id: existing.id } });
        // Count güncelle
        await prisma.forumPost.update({
          where: { id: postId },
          data: type === "LIKE" ? { likeCount: { decrement: 1 } } : { dislikeCount: { decrement: 1 } },
        });
        return NextResponse.json({ success: true, action: "removed", type });
      } else {
        // Farklı tip → güncelle (like↔dislike)
        await prisma.forumPostReaction.update({ where: { id: existing.id }, data: { type } });
        await prisma.forumPost.update({
          where: { id: postId },
          data:
            type === "LIKE"
              ? { likeCount: { increment: 1 }, dislikeCount: { decrement: 1 } }
              : { likeCount: { decrement: 1 }, dislikeCount: { increment: 1 } },
        });
        return NextResponse.json({ success: true, action: "switched", type });
      }
    } else {
      // Yeni reaction
      await prisma.forumPostReaction.create({ data: { postId, userId, type } });
      await prisma.forumPost.update({
        where: { id: postId },
        data: type === "LIKE" ? { likeCount: { increment: 1 } } : { dislikeCount: { increment: 1 } },
      });
      return NextResponse.json({ success: true, action: "added", type });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Bilinmeyen hata";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
