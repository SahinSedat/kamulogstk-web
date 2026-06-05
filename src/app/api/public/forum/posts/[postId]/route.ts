import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/public/forum/posts/[postId]
 * Kullanıcının kendi yorumunu silmesini sağlar.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const body = await req.json();
    const authorId = body.authorId;

    if (!postId || !authorId) {
      return NextResponse.json({ error: "postId ve authorId zorunludur" }, { status: 400 });
    }

    // Yorumu bul ve sahipliğini doğrula
    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json({ error: "Yorum bulunamadı" }, { status: 404 });
    }

    if (post.authorId !== authorId) {
      return NextResponse.json({ error: "Bu yorumu silme yetkiniz yok" }, { status: 403 });
    }

    // Yorumu sil
    await prisma.forumPost.delete({
      where: { id: postId },
    });

    // Konunun yanıt sayısını güncelle
    await prisma.forumTopic.update({
      where: { id: post.topicId },
      data: { replyCount: { decrement: 1 } },
    });

    return NextResponse.json({
      success: true,
      message: "Yorum başarıyla silindi",
    });
  } catch (error: any) {
    console.error("[forum/posts/delete]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
