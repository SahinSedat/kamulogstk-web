import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/users/[id] — Kullanıcı detay
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // GÜVENLİK: Sadece admin/moderator erişebilir
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, firstName: true, lastName: true, name: true,
      phone: true, phoneNumber: true, role: true, isVerified: true, isActive: true, isPremium: true,
      premiumUntil: true, credits: true, aiTokens: true, subscriptionTier: true,
      istihdamTuru: true, bakanlik: true, kurum: true, title: true, unvan: true, atamaUsulu: true, isAriyor: true,
      tcKimlik: true, lastLoginMethod: true, fcmToken: true, institutionName: true,
      banForumUntil: true, banBecayisUntil: true, banReason: true,
      createdAt: true, updatedAt: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  return NextResponse.json(user);
}

// PATCH /api/users/[id] — Kullanıcı güncelle
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // GÜVENLİK: Sadece admin erişebilir
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const allowedFields = [
    "name", "firstName", "lastName", "email", "phone", "role",
    "isVerified", "isActive", "isPremium", "credits", "aiTokens",
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const user = await prisma.user.update({ where: { id }, data });
  return NextResponse.json(user);
}

// DELETE /api/users/[id] — Kullanıcı sil (cascade)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

    await prisma.$transaction(async (tx) => {
      // 1. Kariyer modülü
      await tx.cVAnalysis.deleteMany({ where: { userId: id } });
      await tx.cV.deleteMany({ where: { userId: id } });
      await tx.chatSession.deleteMany({ where: { userId: id } });
      await tx.usageRecord.deleteMany({ where: { userId: id } });
      await tx.kariyerSubscription.deleteMany({ where: { userId: id } });

      // 2. Kariyer chat odaları (alt tablolar önce)
      const chatRooms = await tx.kariyerChatRoom.findMany({ where: { userId: id }, select: { id: true } });
      if (chatRooms.length > 0) {
        const roomIds = chatRooms.map(r => r.id);
        await tx.kariyerConsultantRating.deleteMany({ where: { roomId: { in: roomIds } } });
        await tx.kariyerChatMessage.deleteMany({ where: { roomId: { in: roomIds } } });
        await tx.kariyerChatRoom.deleteMany({ where: { userId: id } });
      }

      // 3. Mesajlaşma (Conversation → Message cascade var ama senderId FK yok)
      await tx.message.deleteMany({ where: { senderId: id } });
      const convos = await tx.conversation.findMany({ where: { userId: id }, select: { id: true } });
      if (convos.length > 0) {
        await tx.message.deleteMany({ where: { conversationId: { in: convos.map(c => c.id) } } });
        await tx.conversation.deleteMany({ where: { userId: id } });
      }

      // 4. Bildirim, danışmanlık, abonelik, sipariş, log, satış
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.consultationRequest.deleteMany({ where: { userId: id } });
      await tx.subscription.deleteMany({ where: { userId: id } });
      await tx.order.deleteMany({ where: { userId: id } });
      await tx.adminLog.deleteMany({ where: { adminId: id } });
      await tx.salesRecord.deleteMany({ where: { userId: id } });

      // 5. AI kullanım logları
      await tx.aIUsageLog.deleteMany({ where: { userId: id } });

      // 6. Engelleme
      await tx.blockedUser.deleteMany({ where: { OR: [{ blockerUserId: id }, { blockedUserId: id }] } });

      // 7. Becayiş — ÖNEMLİ: MatchRequest ve BecayisMessage listing FK'ya bağlı
      //    Önce kullanıcının ilanlarına ait alt kayıtları temizle
      const userListings = await tx.becayisListing.findMany({ where: { ownerId: id }, select: { id: true } });
      if (userListings.length > 0) {
        const listingIds = userListings.map(l => l.id);
        // İlanlara bağlı match request, mesaj, favori, rapor sil
        await tx.matchRequest.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.becayisMessage.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.favoriteAd.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.report.deleteMany({ where: { reportedAdId: { in: listingIds } } });
      }

      // Bu kullanıcının gönderdiği/aldığı match request ve mesajları da sil
      await tx.matchRequest.deleteMany({ where: { OR: [{ senderId: id }, { receiverId: id }] } });
      await tx.becayisMessage.deleteMany({ where: { OR: [{ senderId: id }, { receiverId: id }] } });
      await tx.report.deleteMany({ where: { reporterId: id } });
      await tx.favoriteAd.deleteMany({ where: { userId: id } });

      // İlan onaylayanı null'la, sonra ilanları sil
      await tx.becayisListing.updateMany({ where: { approvedById: id }, data: { approvedById: null } });
      await tx.becayisListing.deleteMany({ where: { ownerId: id } });

      // 8. Son: Kullanıcıyı sil
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Kullanıcı silme hatası:", errMsg);
    return NextResponse.json(
      { error: "Kullanıcı silinemedi", detail: errMsg },
      { status: 500 }
    );
  }
}
