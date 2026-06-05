import { createNotification } from "@/lib/services/notificationService";
import { createAdminNotification } from "@/lib/services/adminNotificationService";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/admin/stk/payments
 * Tüm ödeme bildirimlerini listele
 */
export async function GET(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR", "STK_MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  const stkId = req.nextUrl.searchParams.get("stkId");
  const status = req.nextUrl.searchParams.get("status");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status) where.status = status;
  if (stkId) {
    where.application = { stkId };
  }

  const payments = await prisma.sTKPaymentReport.findMany({
    where,
    include: {
      application: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          tcKimlik: true,
          membershipStatus: true,
          expiryDate: true,
          stk: { select: { id: true, name: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: payments });
}

/**
 * PATCH /api/admin/stk/payments?id=xxx
 * Ödeme onay/red
 */
export async function PATCH(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR", "STK_MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

    const body = await req.json();
    const { status, durationDays } = body;

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "status APPROVED veya REJECTED olmalı" }, { status: 400 });
    }

    const payment = await prisma.sTKPaymentReport.update({
      where: { id },
      data: { status, reviewedAt: new Date() },
      include: {
        application: {
          select: { id: true, name: true, expiryDate: true, membershipStatus: true, userId: true },
        },
      },
    });

    // Onaylandıysa — üyelik süresini uzat
    if (status === "APPROVED") {
      const days = durationDays || 30; // Varsayılan 30 gün (aylık)
      const baseDate = payment.application.expiryDate && payment.application.expiryDate > new Date()
        ? payment.application.expiryDate
        : new Date();
      const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      await prisma.sTKApplication.update({
        where: { id: payment.applicationId },
        data: {
          membershipStatus: "ACTIVE",
          expiryDate: newExpiry,
          nextDuesDate: newExpiry,
        },
      });

      // Member tablosundaki premiumUntil alanını da güncelle (Premium rozeti + bot hatırlatıcı için)
      try {
        const app = await prisma.sTKApplication.findUnique({
          where: { id: payment.applicationId },
          select: { stkId: true, email: true, phone: true },
        });
        if (app) {
          const member = await prisma.member.findFirst({
            where: {
              stkId: app.stkId,
              OR: [
                { email: app.email || "" },
                ...(app.phone ? [{ phone: { contains: app.phone.slice(-10) } }] : []),
              ],
            },
          });
          if (member) {
            const memberBase = member.premiumUntil && member.premiumUntil > new Date()
              ? member.premiumUntil
              : new Date();
            const memberExpiry = new Date(memberBase.getTime() + days * 24 * 60 * 60 * 1000);
            await prisma.member.update({
              where: { id: member.id },
              data: { premiumUntil: memberExpiry },
            });
            console.log(`[STK Payment] 🌟 Member premiumUntil → ${member.name} ${member.surname} | ${memberExpiry.toISOString()}`);
          }
        }
      } catch (e: unknown) {
        console.error("[STK Payment] Member premiumUntil güncelleme hatası:", e instanceof Error ? e.message : e);
      }

      console.log(`[STK Payment] ✅ Ödeme onaylandı → ${payment.application.name} | +${days} gün | Yeni bitiş: ${newExpiry.toISOString()}`);

      // 🔔 Kullanıcıya FCM Push Bildirim
      if (payment.application.userId) {
        createNotification({
          userId: payment.application.userId,
          title: "Ödemeniz Onaylandı ✅",
          message: "Kuruluşa yaptığınız ödeme onaylandı. Teşekkür ederiz.",
          type: "SYSTEM",
        }).catch(() => {});
      }

      // 🔔 Admin Bildirim
      createAdminNotification({
        type: "STK_PAYMENT_APPROVED",
        title: "Ödeme Onaylandı",
        message: `${payment.application.name} üyesinin ödemesi onaylandı.`,
        userId: payment.application.userId || undefined,
        senderName: payment.application.name,
      }).catch(() => {});
    }

    if (status === "REJECTED") {
      console.log(`[STK Payment] ❌ Ödeme reddedildi → ${payment.application.name}`);
    }

    return NextResponse.json({ success: true, data: payment });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "İşlem başarısız";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/stk/payments?id=xxx
 * Ödeme kaydını sil
 */
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

    const payment = await prisma.sTKPaymentReport.findUnique({ where: { id } });
    if (!payment) return NextResponse.json({ error: "Ödeme bulunamadı" }, { status: 404 });

    await prisma.sTKPaymentReport.delete({ where: { id } });
    console.log(`[STK Payment] 🗑 Ödeme silindi → ID: ${id}`);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Silme başarısız";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
