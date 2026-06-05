import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/ai/tis-check
 * Kullanıcının TİS danışmanlığına erişim hakkını kontrol et.
 * Sadece Premium kontrolü yapar. Kurum eşleştirmesi YAPILMAZ.
 * AI sohbette kendisi kurumu sorar.
 */

async function resolveUser(req: NextRequest) {
  // 1) Token-based auth (Mobil)
  const auth = req.headers.get("authorization");
  if (auth) {
    const parts = auth.split(" ");
    const token = parts.length === 2 ? parts[1] : auth;
    if (token) {
      return prisma.user.findUnique({
        where: { id: token },
        select: { id: true, isPremium: true, premiumUntil: true, employmentType: true, credits: true },
      });
    }
  }
  // 2) Session-based auth (Web)
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isPremium: true, premiumUntil: true, employmentType: true, credits: true },
    });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ canAccess: false, error: "Oturum gerekli" }, { status: 401 });
  }

  // Premium kontrol
  const now = new Date();
  const isPremiumActive = user.isPremium && (!user.premiumUntil || user.premiumUntil > now);

  // TIS AI jeton orani (SiteSettings'ten)
  const jetonSetting = await prisma.siteSettings.findUnique({ where: { key: "tisJetonRate" } });
  const tisJetonRate = parseInt(jetonSetting?.value || "10") || 10;

  if (isPremiumActive) {
    // Premium kullanici -> her zaman erisebilir
    return NextResponse.json({
      canAccess: true,
      employmentType: user.employmentType || null,
      tisJetonRate,
      message: "TIS danismanligi kullanilabilir.",
    });
  }

  // Non-premium kullanici -> jeton ile erisebilir
  const userCredits = (user as any).credits || 0;
  return NextResponse.json({
    canAccess: false,
    requiresPremium: false,
    canUseJeton: true,
    credits: userCredits,
    tisJetonRate,
    employmentType: user.employmentType || null,
    message: "Jeton ile veya premium abonelik ile erisebilirsiniz.",
  });
}
