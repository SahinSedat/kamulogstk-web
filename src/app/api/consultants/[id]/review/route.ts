import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/consultants/[id]/review
 * Danışmanı puanla — SADECE kullanıcı puanlayabilir, danışman kendini puanlayamaz.
 * Her görüşme için 1 kez puanlama (conversationId @unique).
 * Body: { userId, userName, rating (1-5), comment, conversationId }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: consultantId } = await params;
  const { userId, userName, rating, comment, conversationId } = await req.json();

  if (!userId || !rating) {
    return NextResponse.json({ error: "userId ve rating gerekli" }, { status: 400 });
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Puan 1-5 arası olmalı" }, { status: 400 });
  }

  // Danışman var mı kontrol
  const consultant = await prisma.consultant.findUnique({
    where: { id: consultantId },
    select: { id: true, userId: true, rating: true, reviewCount: true },
  });

  if (!consultant) {
    return NextResponse.json({ error: "Danışman bulunamadı" }, { status: 404 });
  }

  // Danışman kendini puanlayamaz
  if (consultant.userId === userId) {
    return NextResponse.json({ error: "Danışman kendini puanlayamaz" }, { status: 403 });
  }

  // Bu görüşme için zaten puanlanmış mı? (conversationId varsa)
  if (conversationId) {
    const existingByConversation = await prisma.review.findUnique({
      where: { conversationId },
    });
    if (existingByConversation) {
      return NextResponse.json({ error: "Bu görüşme için zaten puan verilmiş" }, { status: 400 });
    }
  }

  // Review oluştur
  await prisma.review.create({
    data: {
      consultantId,
      userId,
      userName: userName || "Anonim",
      conversationId: conversationId || null,
      rating: parseFloat(rating.toString()),
      comment: comment || "",
    },
  });

  // Ortalama puan güncelle
  const newReviewCount = consultant.reviewCount + 1;
  const newRating =
    (consultant.rating * consultant.reviewCount + parseFloat(rating.toString())) / newReviewCount;

  await prisma.consultant.update({
    where: { id: consultantId },
    data: {
      rating: Math.round(newRating * 10) / 10,
      reviewCount: newReviewCount,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Değerlendirmeniz kaydedildi!",
    newRating: Math.round(newRating * 10) / 10,
    reviewCount: newReviewCount,
  });
}
