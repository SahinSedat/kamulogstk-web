import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/consultant/payout-request
 * Danışman birikmiş jetonlarını nakde çevirme talebi oluşturur
 * Body: { iban?, holderName?, jetons? (kısmi çekim) }
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const consultantUserId = req.headers.get("x-user-id") || authHeader.replace(/^(Bearer|Token)\s+/i, "");
    if (!consultantUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Body — opsiyonel alanlar
    let bodyData: { iban?: string; holderName?: string; jetons?: number } = {};
    try { bodyData = await req.json(); } catch { /* boş body olabilir */ }

    // Danışmanı bul
    const consultant = await prisma.consultant.findUnique({
      where: { userId: consultantUserId },
      select: { id: true, name: true, consultantCredits: true, iban: true, commissionRate: true },
    });

    if (!consultant) return NextResponse.json({ error: "Danışman bulunamadı" }, { status: 404 });
    if (consultant.consultantCredits <= 0) return NextResponse.json({ error: "Çekilecek jeton bulunmuyor" }, { status: 400 });

    // Bekleyen talep var mı?
    const pendingRequest = await prisma.payoutRequest.findFirst({
      where: { consultantId: consultant.id, status: "PENDING" },
    });
    if (pendingRequest) return NextResponse.json({ error: "Zaten bekleyen bir ödeme talebiniz var" }, { status: 400 });

    // Sistem ayarlarını al (kur credit-packages'dan + komisyon)
    const [creditPackages, commSetting] = await Promise.all([
      prisma.creditPackage.findMany({ where: { isActive: true }, select: { jetons: true, price: true } }),
      prisma.systemSetting.findFirst({ where: { key: "commission_rate" } }),
    ]);
    // Jeton kurunu aktif paketlerden hesapla — EN DÜŞÜK birim fiyat (platform zarar etmesin)
    let jetonRate = 5;
    if (creditPackages.length > 0) {
      const unitPrices = creditPackages.map((p: { jetons: number; price: number }) => p.price / p.jetons);
      jetonRate = Math.round(Math.min(...unitPrices) * 100) / 100;
    }
    const globalCommissionRate = parseFloat(commSetting?.value || "20");
    // Bireysel komisyon oranı varsa onu kullan, yoksa global
    const commissionRate = consultant.commissionRate ?? globalCommissionRate;

    // Kısmi çekim destesi: body.jetons varsa onu kullan, yoksa tüm bakiye
    const requestedJetons = bodyData.jetons && bodyData.jetons > 0
      ? Math.min(bodyData.jetons, consultant.consultantCredits)
      : consultant.consultantCredits;

    const brutTL = requestedJetons * jetonRate;
    const commissionTL = brutTL * (commissionRate / 100);
    const netTL = brutTL - commissionTL;

    // IBAN: mobil'den gelen varsa onu kullan, yoksa kayıtlı IBAN
    const submittedIban = bodyData.iban?.trim() || consultant.iban || "";
    const holderName = bodyData.holderName?.trim() || consultant.name;
    const bankDetailsText = submittedIban
      ? `IBAN: ${submittedIban}\nHesap Sahibi: ${holderName}`
      : null;

    // IBAN yoksa uyar
    if (!submittedIban) {
      return NextResponse.json({ error: "Lütfen IBAN bilginizi girin." }, { status: 400 });
    }

    // Danışman'ın IBAN'ını güncelle (mobil'den yeni girildiyse)
    const updateIban = bodyData.iban ? { iban: submittedIban } : {};

    // Jeton düş + talep oluştur (atomik)
    await prisma.$transaction([
      prisma.consultant.update({
        where: { id: consultant.id },
        data: {
          consultantCredits: { decrement: requestedJetons },
          ...updateIban,
        },
      }),
      prisma.payoutRequest.create({
        data: {
          consultantId: consultant.id,
          amountCredits: requestedJetons,
          amountTL: netTL, // Net tutar (komisyon düşülmüş)
          jetonRate,
          status: "PENDING",
          bankDetails: bankDetailsText,
        },
      }),
    ]);

    console.log(`[Payout] 📩 Ödeme talebi → ${consultant.name} | ${requestedJetons} jeton | Brüt: ${brutTL} TL | Komisyon: %${commissionRate} = ${commissionTL} TL | Net: ${netTL} TL`);

    return NextResponse.json({
      success: true,
      message: "Ödeme talebiniz oluşturuldu.",
      data: {
        amountCredits: requestedJetons,
        brutTL,
        commissionRate,
        commissionTL,
        netTL,
        jetonRate,
        remainingCredits: consultant.consultantCredits - requestedJetons,
      },
    });
  } catch (error: unknown) {
    console.error("[Payout] Hata:", error);
    const msg = error instanceof Error ? error.message : "İşlem başarısız";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/consultant/payout-request
 * Danışmanın kendi talep geçmişi
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const consultantUserId = req.headers.get("x-user-id") || authHeader.replace(/^(Bearer|Token)\s+/i, "");
    if (!consultantUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const consultant = await prisma.consultant.findUnique({
      where: { userId: consultantUserId },
      select: { id: true },
    });
    if (!consultant) return NextResponse.json({ error: "Danışman bulunamadı" }, { status: 404 });

    const requests = await prisma.payoutRequest.findMany({
      where: { consultantId: consultant.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: requests });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Hata";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
