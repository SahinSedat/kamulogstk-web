import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/consultant/me?userId=xxx
 * Danışmanın kendi dashboard verilerini + jeton kurunu getirir
 */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId gerekli" }, { status: 400 });

  const [consultant, creditPackages, commSetting] = await Promise.all([
    prisma.consultant.findFirst({
      where: { userId },
      include: {
        consultantConversations: {
          orderBy: { lastMessageAt: "desc" },
          take: 20,
          include: {
            user: { select: { id: true, name: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    }),
    prisma.creditPackage.findMany({ where: { isActive: true }, select: { jetons: true, price: true } }),
    prisma.systemSetting.findFirst({ where: { key: "commission_rate" } }),
  ]);

  if (!consultant) {
    return NextResponse.json({ error: "Danışman bulunamadı" }, { status: 404 });
  }

  // Jeton kurunu aktif paketlerden hesapla — EN DÜŞÜK birim fiyat (platform zarar etmesin)
  let jetonRate = 5; // fallback
  if (creditPackages.length > 0) {
    const unitPrices = creditPackages.map((p: { price: number; jetons: number }) => p.price / p.jetons);
    jetonRate = Math.round(Math.min(...unitPrices) * 100) / 100;
  }
  const globalCommissionRate = parseFloat(commSetting?.value || "20");
  // Override kuralı: Global komisyon > 0 ise HER ZAMAN global kullanılır.
  // Global komisyon 0 veya boşsa, bireysel komisyon geçerli olur.
  const appliedCommissionRate = globalCommissionRate > 0
    ? globalCommissionRate
    : (consultant.commissionRate ?? 20);

  // Jeton kuru ayarını da yükle (admin tarafından belirlenen 1 Jeton = X TL)
  const jetonRateSetting = await prisma.systemSetting.findFirst({ where: { key: "jeton_rate" } });
  const adminJetonRate = parseFloat(jetonRateSetting?.value || "0");
  // Admin jeton kuru belirlemişse onu kullan, yoksa paket bazlı hesapla
  const finalJetonRate = adminJetonRate > 0 ? adminJetonRate : jetonRate;

  // Net kazanç hesaplaması
  const totalJetons = consultant.consultantCredits || 0;
  const grossEarningsTl = totalJetons * finalJetonRate;
  const commissionTl = grossEarningsTl * (appliedCommissionRate / 100);
  const netEarningsTl = Math.round((grossEarningsTl - commissionTl) * 100) / 100;

  return NextResponse.json({
    success: true,
    jetonRate: finalJetonRate,
    commissionRate: appliedCommissionRate,
    appliedCommissionRate,
    netEarningsTl,
    grossEarningsTl: Math.round(grossEarningsTl * 100) / 100,
    consultant: {
      id: consultant.id,
      name: consultant.name,
      title: consultant.title,
      category: consultant.category,
      bio: consultant.bio,
      specializations: consultant.specializations,
      experienceYears: consultant.experienceYears,
      isOnline: consultant.isOnline,
      isActive: consultant.isActive,
      rating: consultant.rating,
      reviewCount: consultant.reviewCount,
      completedConsultations: consultant.completedConsultations,
      consultantCredits: consultant.consultantCredits,
      sessionFeeJeton: consultant.sessionFeeJeton,
      workingHours: consultant.workingHours,
      iban: consultant.iban,
      avatarUrl: consultant.avatarUrl,
    },
    conversations: consultant.consultantConversations.map((c) => ({
      id: c.id,
      userId: c.userId,
      userName: c.user?.name || c.user?.firstName || "Kullanıcı",
      userAvatar: c.user?.avatarUrl,
      category: c.category,
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      unreadCount: c.unreadCount,
      createdAt: c.createdAt,
    })),
  });
}

/**
 * PATCH /api/consultant/me
 * Danışmanın isOnline ve workingHours (JSON string) güncellemesi
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) return NextResponse.json({ error: "userId gerekli" }, { status: 400 });

    const consultant = await prisma.consultant.findFirst({ where: { userId } });
    if (!consultant) return NextResponse.json({ error: "Danışman bulunamadı" }, { status: 404 });

    // Danışmanın self-edit yapabileceği alanlar
    const allowedFields = [
      "isOnline", "workingHours", "title", "category", "bio",
      "specializations", "experienceYears", "sessionFeeJeton", "iban",
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        if (key === "isOnline" && typeof body[key] === "boolean") updateData.isOnline = body[key];
        else if (key === "workingHours" && typeof body[key] === "string") updateData.workingHours = body[key];
        else if (key === "specializations" && Array.isArray(body[key])) updateData.specializations = body[key];
        else if (key === "experienceYears") updateData.experienceYears = parseInt(body[key]) || 0;
        else if (key === "sessionFeeJeton") updateData.sessionFeeJeton = Math.max(1, parseInt(body[key]) || 5);
        else if (typeof body[key] === "string") updateData[key] = body[key].trim();
      }
    }

    const updated = await prisma.consultant.update({
      where: { id: consultant.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      consultant: {
        title: updated.title, category: updated.category, bio: updated.bio,
        specializations: updated.specializations, experienceYears: updated.experienceYears,
        sessionFeeJeton: updated.sessionFeeJeton, isOnline: updated.isOnline,
        workingHours: updated.workingHours, iban: updated.iban,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Güncelleme başarısız";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
