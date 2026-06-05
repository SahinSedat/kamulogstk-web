import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createNotification } from "@/lib/services/notificationService";

// POST /api/becayis/[id]/approve
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Admin/Moderator yetki kontrolü
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "MODERATOR"].includes(session.user?.role as string)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const { action, approvedById } = body; // action: "approve" | "reject"

  if (action === "approve") {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const listing = await prisma.becayisListing.update({
      where: { id },
      data: {
        status: "published",
        approvedById: approvedById || null,
        approvedAt: new Date(),
        rejectionReason: null,  // Önceki red gerekçesini temizle
        expiresAt,
        isExpiringNotified: false,
        isExpiredNotified: false,
      },
      select: { ownerId: true, title: true },
    });

    try {
      await createNotification({
        userId: listing.ownerId,
        title: "✅ İlanınız Onaylandı!",
        message: `"${listing.title}" başlıklı ilanınız onaylanarak yayına alındı.`,
        type: "AD_APPROVED",
        payload: { listingId: id, action: "approved" },
      });
    } catch (e) {
      console.error("[Becayis API] Onay bildirimi gönderilemedi:", e);
    }
  } else if (action === "reject") {
    const listing = await prisma.becayisListing.update({
      where: { id },
      data: {
        status: "rejected",
        rejectionReason: body.rejectionReason || null,
      },
      select: { ownerId: true, title: true },
    });

    try {
      const reasonText = body.rejectionReason ? `\nGerekçe: ${body.rejectionReason}` : '';
      await createNotification({
        userId: listing.ownerId,
        title: "❌ İlanınız Reddedildi",
        message: `"${listing.title}" başlıklı ilanınız maalesef onaylanmadı.${reasonText}`,
        type: "AD_REJECTED",
        payload: { listingId: id, action: "rejected", rejectionReason: body.rejectionReason },
      });
    } catch (e) {
      console.error("[Becayis API] Red bildirimi gönderilemedi:", e);
    }
  } else {
    return NextResponse.json({ error: "Geçersiz aksiyon" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
