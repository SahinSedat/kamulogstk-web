import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/admin/payouts
 * Tüm payout taleplerini listele + sistem ayarları
 */
export async function GET(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status) where.status = status;

  const [requests, settings, creditPackages] = await Promise.all([
    prisma.payoutRequest.findMany({
      where,
      include: {
        consultant: {
          select: {
            id: true, name: true, category: true, iban: true,
            email: true, phone: true, avatarUrl: true, consultantCredits: true,
            completedConsultations: true, commissionRate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.systemSetting.findMany({
      where: { key: { in: ["jeton_rate", "commission_rate"] } },
    }),
    prisma.creditPackage.findMany({
      where: { isActive: true },
      select: { jetons: true, price: true },
    }),
  ]);

  const commissionRate = parseFloat(settings.find((s: { key: string; value: string }) => s.key === "commission_rate")?.value || "20");
  const jetonRate = parseFloat(settings.find((s: { key: string; value: string }) => s.key === "jeton_rate")?.value || "50");

  // CreditPackage'lerden jeton birim fiyatları
  let avgJetonUnitPrice = 0;
  let minJetonUnitPrice = 0;
  if (creditPackages.length > 0) {
    const unitPrices = creditPackages.map((p: { price: number; jetons: number }) => p.price / p.jetons);
    avgJetonUnitPrice = unitPrices.reduce((a: number, b: number) => a + b, 0) / unitPrices.length;
    minJetonUnitPrice = Math.min(...unitPrices);
  }

  const stats = {
    total: requests.length,
    pending: requests.filter((r: { status: string }) => r.status === "PENDING").length,
    completed: requests.filter((r: { status: string }) => r.status === "COMPLETED").length,
    totalPaidTL: requests.filter((r: { status: string }) => r.status === "COMPLETED").reduce((s: number, r: { amountTL: number }) => s + r.amountTL, 0),
    commissionRate,
    jetonRate,
    avgJetonUnitPrice: Math.round(avgJetonUnitPrice * 100) / 100,
    minJetonUnitPrice: Math.round(minJetonUnitPrice * 100) / 100,
  };

  return NextResponse.json({ success: true, data: requests, stats });
}

/**
 * PATCH /api/admin/payouts?id=xxx
 * Ödeme talebini onayla veya reddet
 */
export async function PATCH(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

    const body = await req.json();
    const { status, adminNote } = body;

    if (!status || !["COMPLETED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "status COMPLETED veya REJECTED olmalı" }, { status: 400 });
    }

    const request = await prisma.payoutRequest.findUnique({
      where: { id },
      include: { consultant: { select: { id: true, name: true, consultantCredits: true } } },
    });
    if (!request) return NextResponse.json({ error: "Talep bulunamadı" }, { status: 404 });
    if (request.status !== "PENDING") return NextResponse.json({ error: "Bu talep zaten işlenmiş" }, { status: 400 });

    if (status === "COMPLETED") {
      // Jetonlar zaten payout-request oluşturulurken düşüldü, sadece durumu güncelle
      await prisma.payoutRequest.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: new Date(), adminNote },
      });
      console.log(`[Payout] ✅ Ödeme tamamlandı → ${request.consultant.name} | ${request.amountTL} TL (net)`);
    }

    if (status === "REJECTED") {
      // Reddedilirse jetonları geri ver
      await prisma.$transaction([
        prisma.payoutRequest.update({
          where: { id },
          data: { status: "REJECTED", adminNote },
        }),
        prisma.consultant.update({
          where: { id: request.consultantId },
          data: { consultantCredits: { increment: request.amountCredits } },
        }),
      ]);
      console.log(`[Payout] ❌ Ödeme reddedildi → ${request.consultant.name} | ${request.amountCredits} jeton iade edildi`);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "İşlem başarısız";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
