import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/public/subscription-plans — Auth gerektirmeyen public endpoint
// Mobil uygulamanın Paywall ekranı için aktif planları döndürür
export async function GET() {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      price: true,
      interval: true,
      description: true,
      badgeText: true,
      yearlyDiscountRate: true,
      includedQuota: true,
      appleProductId: true,
      googleProductId: true,
      features: true,
      entitlements: true,
      isDefault: true,
      order: true,
      aiSearchQuota: true,
      listingQuota: true,
      boostQuota: true,
      boostDurationDays: true,
      urgentQuota: true,
      urgentDurationDays: true,
      matchRequestQuota: true,
      hasRadarFeature: true,
      radarDurationDays: true,
      isUnlimited: true,
      tisChatQuota: true,
      yearlyPrice: true,
    },
  });

  return NextResponse.json(plans, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
