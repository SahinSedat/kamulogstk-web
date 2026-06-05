import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/becayis/premium-quota
 * Kullanıcının boost ve acil ilan kota durumunu döner.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = req.headers.get("authorization");
        if (!auth) {
            return NextResponse.json({ error: "Yetkilendirme gerekli." }, { status: 401 });
        }
        const parts = auth.split(" ");
        const token = parts.length === 2 ? parts[1] : auth;

        const user = await prisma.user.findUnique({
            where: { id: token },
            select: { id: true, isPremium: true },
        });

        if (!user) {
            return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 401 });
        }

        // Varsayılan kota
        let boostQuota = 0;
        let boostDurationDays = 7;
        let urgentQuota = 0;
        let urgentDurationDays = 7;
        let aiSearchQuota = 1;
        let listingQuota = 1;
        let matchRequestQuota = 1;
        let hasRadarFeature = false;
        let radarDurationDays = 30;
        let resolvedIsPremium = user.isPremium;

        // ── 1. Aktif abonelik var mı? (isPremium flag'ına bakmadan) ──
        const activeSub = await prisma.subscription.findFirst({
            where: {
                userId: user.id,
                status: "active",
                endsAt: { gte: new Date() },
            },
            select: { planId: true },
        });

        if (activeSub) {
            // Aktif abonelik var — planın kotalarını oku
            const plan = await prisma.subscriptionPlan.findUnique({
                where: { id: activeSub.planId },
            });
            if (plan) {
                boostQuota = plan.boostQuota;
                boostDurationDays = plan.boostDurationDays;
                urgentQuota = plan.urgentQuota;
                urgentDurationDays = plan.urgentDurationDays;
                aiSearchQuota = plan.aiSearchQuota;
                listingQuota = plan.listingQuota;
                matchRequestQuota = plan.matchRequestQuota;
                hasRadarFeature = plan.hasRadarFeature;
                radarDurationDays = plan.radarDurationDays;
            }
            resolvedIsPremium = true;

            // isPremium false ise DB'de düzelt
            if (!user.isPremium) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { isPremium: true },
                });
                console.log(`[premium-quota] isPremium auto-sync → true (userId: ${user.id})`);
            }
        } else if (user.isPremium) {
            // isPremium=true ama aktif abonelik yok — varsayılan premium değerler
            boostQuota = 2;
            urgentQuota = 2;
        } else {
            // Ücretsiz kullanıcı — Standart (default) planı oku
            const defaultPlan = await prisma.subscriptionPlan.findFirst({
                where: { isDefault: true },
            });
            if (defaultPlan) {
                boostQuota = defaultPlan.boostQuota;
                boostDurationDays = defaultPlan.boostDurationDays;
                urgentQuota = defaultPlan.urgentQuota;
                urgentDurationDays = defaultPlan.urgentDurationDays;
                aiSearchQuota = defaultPlan.aiSearchQuota;
                listingQuota = defaultPlan.listingQuota;
                matchRequestQuota = defaultPlan.matchRequestQuota;
                hasRadarFeature = defaultPlan.hasRadarFeature;
                radarDurationDays = defaultPlan.radarDurationDays;
            }
        }

        // Kullanılan boost ve acil ilan sayısı
        const [usedBoosts, usedUrgents] = await Promise.all([
            prisma.becayisListing.count({
                where: { ownerId: user.id, hasUsedFreeBoost: true },
            }),
            prisma.becayisListing.count({
                where: { ownerId: user.id, isUrgent: true },
            }),
        ]);

        return NextResponse.json({
            boostQuota,
            usedBoosts,
            remainingBoosts: Math.max(0, boostQuota - usedBoosts),
            boostDurationDays,
            urgentQuota,
            usedUrgents,
            remainingUrgents: Math.max(0, urgentQuota - usedUrgents),
            urgentDurationDays,
            aiSearchQuota,
            listingQuota,
            matchRequestQuota,
            hasRadarFeature,
            radarDurationDays,
            isPremium: resolvedIsPremium,
        });
    } catch (error) {
        console.error("[premium-quota] Hata:", error);
        return NextResponse.json({ error: "İşlem sırasında hata oluştu." }, { status: 500 });
    }
}
