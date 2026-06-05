import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/conversations
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const consultantId = searchParams.get("consultantId") || "";
  const userId = searchParams.get("userId") || "";

  // 🛡️ GÜVENLİK: userId veya consultantId ZORUNLU — tüm konuşmaları çekme engeli
  if (!userId && !consultantId) {
    return NextResponse.json({ error: "userId veya consultantId gerekli" }, { status: 400 });
  }

  // 🛡️ Auth header'dan gelen gerçek kullanıcı ID'sini doğrula
  const authHeader = req.headers.get("authorization") || "";
  const authUserId = req.headers.get("x-user-id") || authHeader.replace(/^(Bearer|Token)\s+/i, "");

  // Admin panelden gelen istekleri (session bazlı) ayır
  const isAdminRequest = !authUserId && !userId;

  if (!isAdminRequest && authUserId && userId && authUserId !== userId) {
    // Kullanıcı başka birinin konuşmalarını çekmeye çalışıyor
    console.warn(`[Conversations] 🚫 Yetkisiz erişim denemesi: auth=${authUserId} requested=${userId}`);
    return NextResponse.json({ error: "Bu konuşmalara erişim yetkiniz yok" }, { status: 403 });
  }

  // Danışman ise kendi userId'si ile eşleşen consultant kaydını doğrula
  if (consultantId && authUserId) {
    const consultant = await prisma.consultant.findUnique({
      where: { id: consultantId },
      select: { userId: true },
    });
    if (consultant && consultant.userId !== authUserId) {
      console.warn(`[Conversations] 🚫 Danışman yetkisiz erişim: auth=${authUserId} consultant.userId=${consultant.userId}`);
      return NextResponse.json({ error: "Bu danışman konuşmalarına erişim yetkiniz yok" }, { status: 403 });
    }
  }

  const where: Record<string, unknown> = {};
  if (consultantId) where.consultantId = consultantId;
  if (userId) where.userId = userId;

  const conversations = await prisma.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    include: {
      user: { select: { id: true, name: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      consultant: { select: { id: true, name: true, avatarUrl: true, isOnline: true, costPerMessage: true, maxMessagesPerSession: true, userId: true } },
    },
  });

  return NextResponse.json(conversations);
}

// POST /api/conversations — Yeni konuşma başlat
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, consultantId, category } = body;

  // Sadece aktif (sonlanmamış) konuşmayı döndür
  const existing = await prisma.conversation.findFirst({
    where: { userId, consultantId, isEnded: false },
  });

  if (existing) return NextResponse.json(existing);

  const conversation = await prisma.conversation.create({
    data: { userId, consultantId, category: category || "genel" },
  });

  return NextResponse.json(conversation, { status: 201 });
}
