"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/pbkdf2";
import { revalidatePath } from "next/cache";

export async function updateUser(id: string, data: {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  isVerified?: boolean;
  isActive?: boolean;
  isPremium?: boolean;
  isCareerPremium?: boolean;
  credits?: number;
  aiTokens?: number;
  careerAiTokens?: number;
  consultantJetons?: number;
  subscriptionTier?: string;
  // Mobil profil alanları
  city?: string;
  district?: string;
  tcKimlik?: string;
  address?: string;
  postalCode?: string;
  // 5 Temel Çalışma Bilgisi
  istihdamTuru?: string;
  bakanlik?: string;
  kurum?: string;
  unvan?: string;
  atamaUsulu?: string;
  title?: string;
  yearsWorking?: number;
  phoneVerified?: boolean;
  kvkkAccepted?: boolean;
  userAgreementAccepted?: boolean;
}) {
  await prisma.user.update({ where: { id }, data: data as Parameters<typeof prisma.user.update>[0]["data"] });
  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  return { success: true };
}

export async function toggleVerification(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { isVerified: true } });
  if (!user) return { success: false, error: "Kullanıcı bulunamadı" };

  await prisma.user.update({ where: { id }, data: { isVerified: !user.isVerified } });
  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  return { success: true };
}

export async function updateCredits(id: string, amount: number) {
  await prisma.user.update({
    where: { id },
    data: { credits: { increment: amount } },
  });
  revalidatePath("/users");
  revalidatePath(`/users/${id}`);
  return { success: true };
}

export async function deleteUser(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      // Kariyer modülü ilişkileri
      await tx.cVAnalysis.deleteMany({ where: { userId: id } });
      await tx.cV.deleteMany({ where: { userId: id } });
      await tx.chatSession.deleteMany({ where: { userId: id } });
      await tx.usageRecord.deleteMany({ where: { userId: id } });
      await tx.kariyerSubscription.deleteMany({ where: { userId: id } });

      // Kariyer sohbet
      const chatRooms = await tx.kariyerChatRoom.findMany({ where: { userId: id }, select: { id: true } });
      if (chatRooms.length > 0) {
        const roomIds = chatRooms.map(r => r.id);
        await tx.kariyerConsultantRating.deleteMany({ where: { roomId: { in: roomIds } } });
        await tx.kariyerChatMessage.deleteMany({ where: { roomId: { in: roomIds } } });
        await tx.kariyerChatRoom.deleteMany({ where: { userId: id } });
      }

      // Mesajlaşma
      await tx.message.deleteMany({ where: { senderId: id } });
      const convos = await tx.conversation.findMany({ where: { userId: id }, select: { id: true } });
      if (convos.length > 0) {
        await tx.message.deleteMany({ where: { conversationId: { in: convos.map(c => c.id) } } });
        await tx.conversation.deleteMany({ where: { userId: id } });
      }

      // Diğer ilişkiler
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.consultationRequest.deleteMany({ where: { userId: id } });
      await tx.subscription.deleteMany({ where: { userId: id } });
      await tx.order.deleteMany({ where: { userId: id } });
      await tx.adminLog.deleteMany({ where: { adminId: id } });
      await tx.salesRecord.deleteMany({ where: { userId: id } });
      await tx.aIUsageLog.deleteMany({ where: { userId: id } });

      // Engelleme
      await tx.blockedUser.deleteMany({ where: { OR: [{ blockerUserId: id }, { blockedUserId: id }] } });

      // Becayiş — ÖNEMLİ: Önce MatchRequest, BecayisMessage, FavoriteAd, Report sil
      // 1. Kullanıcının ilanlarına ait alt kayıtları temizle
      const userListings = await tx.becayisListing.findMany({ where: { ownerId: id }, select: { id: true } });
      if (userListings.length > 0) {
        const listingIds = userListings.map(l => l.id);
        await tx.matchRequest.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.becayisMessage.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.favoriteAd.deleteMany({ where: { listingId: { in: listingIds } } });
        await tx.report.deleteMany({ where: { reportedAdId: { in: listingIds } } });
      }

      // 2. Kullanıcının gönderdiği/aldığı match request ve mesajları sil (başka ilanlarla ilgili)
      await tx.matchRequest.deleteMany({ where: { OR: [{ senderId: id }, { receiverId: id }] } });
      await tx.becayisMessage.deleteMany({ where: { OR: [{ senderId: id }, { receiverId: id }] } });
      await tx.report.deleteMany({ where: { reporterId: id } });
      await tx.favoriteAd.deleteMany({ where: { userId: id } });

      // 3. İlan onaylayanı null'la, sonra ilanları sil
      await tx.becayisListing.updateMany({ where: { approvedById: id }, data: { approvedById: null } });
      await tx.becayisListing.deleteMany({ where: { ownerId: id } });

      // Son olarak kullanıcıyı sil
      await tx.user.delete({ where: { id } });
    });

    revalidatePath("/users");
    return { success: true };
  } catch (error) {
    console.error("Kullanıcı silme hatası:", error);
    return { success: false, error: "Kullanıcı silinemedi" };
  }
}

export async function createUser(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return { success: false, error: "Bu e-posta zaten kayıtlı" };

  const hashedPassword = hashPassword(data.password);
  await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || null,
      phone: data.phone || null,
      role: (data.role as "USER" | "ADMIN" | "MODERATOR" | "CONSULTANT") || "USER",
      isVerified: true,
    },
  });
  revalidatePath("/users");
  return { success: true };
}
