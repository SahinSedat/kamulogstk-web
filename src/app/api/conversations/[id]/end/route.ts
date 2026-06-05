import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/conversations/[id]/end
 * Görüşmeyi sonlandır + danışanın completedConsultations artır
 * Body: { userId }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId gerekli" }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      consultantId: true,
      isEnded: true,
      consultant: { select: { userId: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Konuşma bulunamadı" }, { status: 404 });
  }

  if (conversation.isEnded) {
    return NextResponse.json({ error: "Bu görüşme zaten sonlandırılmış" }, { status: 400 });
  }

  // Danışanın completedConsultations artır
  if (conversation.consultantId) {
    await prisma.consultant.update({
      where: { id: conversation.consultantId },
      data: { completedConsultations: { increment: 1 } },
    });
  }

  // Konuşmayı "sonlandırıldı" olarak işaretle
  await prisma.conversation.update({
    where: { id },
    data: {
      isEnded: true,
      lastMessage: "📋 Görüşme sonlandırıldı",
      lastMessageAt: new Date(),
    },
  });

  // Sistem mesajı oluştur
  await prisma.message.create({
    data: {
      conversationId: id,
      senderId: userId,
      text: "📋 Bu görüşme sonlandırıldı.",
      type: "TEXT",
      status: "SENT",
    },
  });

  // Kullanıcının ID'si (puanlama yapabilecek kişi)
  const isConsultantEnding = conversation.consultant?.userId === userId;

  return NextResponse.json({
    success: true,
    message: "Görüşme sonlandırıldı",
    consultantId: conversation.consultantId,
    canRate: !isConsultantEnding, // Danışman bitirdiyse bile kullanıcı puanlayabilir, ama danışman puanlayamaz
    conversationUserId: conversation.userId, // Puanlayabilecek kullanıcı
  });
}
