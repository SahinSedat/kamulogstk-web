"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/services/notificationService";

function generateAdNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `BCY-${code}`;
}

export async function approveListing(id: string, approvedById: string) {
  const listing = await prisma.becayisListing.update({
    where: { id },
    data: {
      status: "published",
      approvedById,
      approvedAt: new Date(),
    },
    select: { ownerId: true, title: true },
  });

  // Bildirim gönder
  try {
    await createNotification({
      userId: listing.ownerId,
      title: "✅ İlanınız Onaylandı!",
      message: `"${listing.title}" başlıklı ilanınız onaylanarak yayına alındı.`,
      type: "SYSTEM",
      payload: { listingId: id, action: "approved" },
    });
    console.log(`[Becayis] ✅ Onay bildirimi gönderildi → ownerId: ${listing.ownerId}`);
  } catch (e) {
    console.error(`[Becayis] ❌ Onay bildirimi gönderilemedi:`, e);
  }

  revalidatePath("/becayis");
  return { success: true };
}

export async function rejectListing(id: string, rejectionReason?: string) {
  const listing = await prisma.becayisListing.update({
    where: { id },
    data: {
      status: "rejected",
      rejectionReason: rejectionReason || null,
    },
    select: { ownerId: true, title: true },
  });

  // Bildirim gönder
  try {
    const reasonText = rejectionReason ? `\nGerekçe: ${rejectionReason}` : '';
    await createNotification({
      userId: listing.ownerId,
      title: "❌ İlanınız Reddedildi",
      message: `"${listing.title}" başlıklı ilanınız maalesef onaylanmadı.${reasonText}`,
      type: "SYSTEM",
      payload: { listingId: id, action: "rejected", rejectionReason },
    });
    console.log(`[Becayis] ✅ Red bildirimi gönderildi → ownerId: ${listing.ownerId}`);
  } catch (e) {
    console.error(`[Becayis] ❌ Red bildirimi gönderilemedi:`, e);
  }

  revalidatePath("/becayis");
  return { success: true };
}

export async function deleteListing(id: string) {
  await prisma.becayisListing.delete({ where: { id } });
  revalidatePath("/becayis");
  return { success: true };
}

export async function updateListingStatus(id: string, status: string) {
  await prisma.becayisListing.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/becayis");
  return { success: true };
}

export async function createListing(data: {
  ownerId: string;
  title: string;
  role: string;
  institutionId?: string;
  branch: string;
  currentCity: string;
  targetCity: string;
  assignmentMethod?: string;
  description: string;
}) {
  const slug = `${data.title.toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, "-").replace(/-+/g, "-")}-${Date.now().toString(36)}`;

  // Benzersiz adNumber üret
  let adNumber = generateAdNumber();
  for (let attempt = 0; attempt < 5; attempt++) {
    const exists = await prisma.becayisListing.findUnique({ where: { adNumber } });
    if (!exists) break;
    adNumber = generateAdNumber();
  }

  await prisma.becayisListing.create({
    data: {
      ...data,
      slug,
      adNumber,
      status: "pending",
      institutionId: data.institutionId || null,
    },
  });
  revalidatePath("/becayis");
  return { success: true };
}

export async function updateListing(id: string, data: {
  title?: string;
  role?: string;
  institutionId?: string;
  branch?: string;
  currentCity?: string;
  targetCity?: string;
  assignmentMethod?: string;
  description?: string;
  isPremium?: boolean;
  status?: string;
}) {
  await prisma.becayisListing.update({ where: { id }, data });
  revalidatePath("/becayis");
  return { success: true };
}

export async function promoteListing(id: string) {
  const premiumUntil = new Date();
  premiumUntil.setDate(premiumUntil.getDate() + 7);
  await prisma.becayisListing.update({
    where: { id },
    data: { isPremium: true, premiumUntil },
  });
  revalidatePath("/becayis");
  return { success: true };
}

export async function demoteListing(id: string) {
  await prisma.becayisListing.update({
    where: { id },
    data: { isPremium: false, premiumUntil: null },
  });
  revalidatePath("/becayis");
  return { success: true };
}

// ── Düzenleme Onay/Red ────────────────────────────────────

export async function approveEditChanges(id: string, approvedById: string) {
  const listing = await prisma.becayisListing.findUnique({
    where: { id },
    select: { pendingChanges: true },
  });

  if (!listing?.pendingChanges) {
    return { success: false, error: "Bekleyen düzenleme bulunamadı." };
  }

  const pending = listing.pendingChanges as {
    changes: Record<string, unknown>;
    previousStatus: string;
  };

  await prisma.becayisListing.update({
    where: { id },
    data: {
      ...pending.changes,
      pendingChanges: Prisma.DbNull,
      status: "published",          // Düzenleme onaylanınca her zaman yayına al
      rejectionReason: null,         // Önceki red gerekçesini temizle
      approvedById,
      approvedAt: new Date(),
    },
  });

  // Bildirim gönder
  try {
    const updatedListing = await prisma.becayisListing.findUnique({
      where: { id },
      select: { ownerId: true, title: true },
    });
    if (updatedListing) {
      await createNotification({
        userId: updatedListing.ownerId,
        title: "✅ Düzenlemeniz Onaylandı!",
        message: `"${updatedListing.title}" ilanındaki değişiklikleriniz onaylandı.`,
        type: "SYSTEM",
        payload: { listingId: id, action: "edit_approved" },
      });
    }
  } catch (e) {
    console.error(`[Becayis] ❌ Düzenleme onay bildirimi gönderilemedi:`, e);
  }

  revalidatePath("/becayis");
  return { success: true };
}

export async function rejectEditChanges(id: string) {
  const listing = await prisma.becayisListing.findUnique({
    where: { id },
    select: { pendingChanges: true },
  });

  if (!listing?.pendingChanges) {
    return { success: false, error: "Bekleyen düzenleme bulunamadı." };
  }

  const pending = listing.pendingChanges as {
    previousStatus: string;
  };

  await prisma.becayisListing.update({
    where: { id },
    data: {
      pendingChanges: Prisma.DbNull,
      status: pending.previousStatus || "published",
    },
  });

  // Bildirim gönder
  try {
    const rejListing = await prisma.becayisListing.findUnique({
      where: { id },
      select: { ownerId: true, title: true },
    });
    if (rejListing) {
      await createNotification({
        userId: rejListing.ownerId,
        title: "❌ Düzenlemeniz Reddedildi",
        message: `"${rejListing.title}" ilanındaki değişiklikleriniz onaylanmadı.`,
        type: "SYSTEM",
        payload: { listingId: id, action: "edit_rejected" },
      });
    }
  } catch (e) {
    console.error(`[Becayis] ❌ Düzenleme red bildirimi gönderilemedi:`, e);
  }

  revalidatePath("/becayis");
  return { success: true };
}

export async function toggleUrgent(id: string) {
  const listing = await prisma.becayisListing.findUnique({ where: { id }, select: { isUrgent: true } });
  if (!listing) return { success: false };

  await prisma.becayisListing.update({
    where: { id },
    data: { isUrgent: !listing.isUrgent },
  });

  revalidatePath("/becayis");
  return { success: true };
}
