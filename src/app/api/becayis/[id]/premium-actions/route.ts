import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/becayis/[id]/premium-actions
 * Premium kullanıcılar için: BOOST (öne çıkarma) veya URGENT (acil ilan)
 * + UNBOOST (öne çıkarma kaldır) ve UNURGENT (acil ilan kaldır)
 * Body: { action: "BOOST" | "URGENT" | "UNBOOST" | "UNURGENT" }
 * 
 * Boost süresi ve kota bilgileri kullanıcının aktif planından okunur.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { action } = body;

        if (!action || !["BOOST", "URGENT", "UNBOOST", "UNURGENT"].includes(action)) {
            return NextResponse.json({ error: "Geçersiz aksiyon. 'BOOST', 'URGENT', 'UNBOOST' veya 'UNURGENT' gönderin." }, { status: 400 });
        }

        // ── 1. Auth: Token'dan kullanıcıyı çöz
        const auth = req.headers.get("authorization");
        if (!auth) {
            return NextResponse.json({ error: "Yetkilendirme gerekli.", reauth: true }, { status: 401 });
        }
        const parts = auth.split(" ");
        const token = parts.length === 2 ? parts[1] : auth;

        const user = await prisma.user.findUnique({
            where: { id: token },
            select: { id: true, isPremium: true, role: true },
        });

        if (!user) {
            return NextResponse.json({ error: "Kullanıcı bulunamadı.", reauth: true }, { status: 401 });
        }

        // ── 2. Premium Guard (Admin bypass + Aktif Abonelik kontrolü)
        const isAdmin = user.role === "ADMIN" || user.role === "MODERATOR";

        let hasPremiumAccess = user.isPremium;
        let activePlan: { boostQuota: number; boostDurationDays: number; urgentQuota: number; urgentDurationDays: number } | null = null;

        // Aktif abonelikten plan bilgisini çek
        const activeSubscription = await prisma.subscription.findFirst({
            where: {
                userId: user.id,
                status: "active",
                endsAt: { gte: new Date() },
            },
            select: {
                id: true,
                plan: {
                    select: {
                        boostQuota: true,
                        boostDurationDays: true,
                        urgentQuota: true,
                        urgentDurationDays: true,
                    },
                },
            },
        });

        if (activeSubscription) {
            hasPremiumAccess = true;
            activePlan = activeSubscription.plan;

            // isPremium bayrağını otomatik senkronize et
            if (!user.isPremium) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { isPremium: true },
                });
            }
        }

        if (!hasPremiumAccess && !isAdmin) {
            return NextResponse.json({
                error: "Bu özellik yalnızca Premium üyeler için kullanılabilir.",
                requiresPremium: true,
            }, { status: 403 });
        }

        // Plan yoksa varsayılan değerler
        const planConfig = activePlan || { boostQuota: 1, boostDurationDays: 7, urgentQuota: 1, urgentDurationDays: 7 };

        // ── 3. İlanı bul ve sahiplik kontrol et
        const listing = await prisma.becayisListing.findUnique({
            where: { id },
            select: { id: true, ownerId: true, isUrgent: true, urgentUntil: true, boostedUntil: true, hasUsedFreeBoost: true },
        });

        if (!listing) {
            return NextResponse.json({ error: "İlan bulunamadı." }, { status: 404 });
        }

        // Sahiplik kontrolü (admin bypass)
        if (listing.ownerId !== user.id && !isAdmin) {
            return NextResponse.json({ error: "Bu ilan size ait değil." }, { status: 403 });
        }

        // ── 4. Aksiyon uygula
        if (action === "BOOST") {
            // Kullanıcının toplam boost kullanımını say
            const usedBoosts = await prisma.becayisListing.count({
                where: {
                    ownerId: user.id,
                    hasUsedFreeBoost: true,
                },
            });

            if (usedBoosts >= planConfig.boostQuota && !isAdmin) {
                return NextResponse.json({
                    error: `Boost hakkınız doldu. Planınızda ${planConfig.boostQuota} boost hakkı var, ${usedBoosts} tanesini kullandınız.`,
                    alreadyBoosted: true,
                    usedBoosts,
                    maxBoosts: planConfig.boostQuota,
                }, { status: 409 });
            }

            // Bu spesifik ilan zaten boost'lu mu?
            if (listing.hasUsedFreeBoost) {
                return NextResponse.json({
                    error: "Bu ilan için öne çıkarma hakkınızı zaten kullandınız.",
                    alreadyBoosted: true,
                }, { status: 409 });
            }

            const boostDays = planConfig.boostDurationDays;
            const boostedUntil = new Date();
            boostedUntil.setDate(boostedUntil.getDate() + boostDays);

            const updated = await prisma.becayisListing.update({
                where: { id },
                data: {
                    boostedUntil,
                    hasUsedFreeBoost: true,
                },
            });

            return NextResponse.json({
                success: true,
                message: `İlanınız ${boostDays} gün boyunca öne çıkarıldı!`,
                boostedUntil: updated.boostedUntil,
                boostDurationDays: boostDays,
                remainingBoosts: Math.max(0, planConfig.boostQuota - usedBoosts - 1),
            });
        }

        if (action === "URGENT") {
            // Kullanıcının toplam urgent kullanımını say
            const usedUrgents = await prisma.becayisListing.count({
                where: {
                    ownerId: user.id,
                    isUrgent: true,
                },
            });

            if (usedUrgents >= planConfig.urgentQuota && !isAdmin) {
                return NextResponse.json({
                    error: `Acil ilan hakkınız doldu. Planınızda ${planConfig.urgentQuota} acil ilan hakkı var, ${usedUrgents} tanesini kullandınız.`,
                    quotaExceeded: true,
                    usedUrgents,
                    maxUrgents: planConfig.urgentQuota,
                }, { status: 409 });
            }

            if (listing.isUrgent && listing.urgentUntil && new Date(listing.urgentUntil) > new Date()) {
                return NextResponse.json({
                    error: "Bu ilan zaten acil olarak işaretli.",
                    alreadyUrgent: true,
                    urgentUntil: listing.urgentUntil,
                }, { status: 409 });
            }

            const urgentDays = planConfig.urgentDurationDays;
            const urgentUntil = new Date();
            urgentUntil.setDate(urgentUntil.getDate() + urgentDays);

            const updated = await prisma.becayisListing.update({
                where: { id },
                data: {
                    isUrgent: true,
                    urgentUntil,
                },
            });

            return NextResponse.json({
                success: true,
                message: `İlanınız ${urgentDays} gün boyunca 'Acil' olarak işaretlendi!`,
                isUrgent: updated.isUrgent,
                urgentUntil: updated.urgentUntil,
                urgentDurationDays: urgentDays,
                remainingUrgents: Math.max(0, planConfig.urgentQuota - usedUrgents - 1),
            });
        }

        // ── UNBOOST: Öne çıkarmayı kaldır (hak düşümü olur, iade yok)
        if (action === "UNBOOST") {
            if (!listing.boostedUntil || new Date(listing.boostedUntil) <= new Date()) {
                return NextResponse.json({
                    error: "Bu ilan zaten öne çıkarılmamış.",
                }, { status: 409 });
            }

            // boostedUntil'i kaldır ama hasUsedFreeBoost TRUE kalır (hak düşümü)
            await prisma.becayisListing.update({
                where: { id },
                data: {
                    boostedUntil: null,
                },
            });

            const usedBoosts = await prisma.becayisListing.count({
                where: { ownerId: user.id, hasUsedFreeBoost: true },
            });

            return NextResponse.json({
                success: true,
                message: "Öne çıkarma kaldırıldı. Kullanılan hak düşümü yapıldı.",
                remainingBoosts: Math.max(0, planConfig.boostQuota - usedBoosts),
            });
        }

        // ── UNURGENT: Acil ilan işaretini kaldır (hak düşümü olur, iade yok)
        if (action === "UNURGENT") {
            if (!listing.isUrgent || !listing.urgentUntil || new Date(listing.urgentUntil) <= new Date()) {
                return NextResponse.json({
                    error: "Bu ilan zaten acil olarak işaretlenmemiş.",
                }, { status: 409 });
            }

            // isUrgent TRUE kalır (hak düşümü için) ama urgentUntil şimdiye ayarlanır (süresi dolmuş)
            await prisma.becayisListing.update({
                where: { id },
                data: {
                    urgentUntil: new Date(),
                },
            });

            const usedUrgents = await prisma.becayisListing.count({
                where: { ownerId: user.id, isUrgent: true },
            });

            return NextResponse.json({
                success: true,
                message: "Acil ilan işareti kaldırıldı. Kullanılan hak düşümü yapıldı.",
                remainingUrgents: Math.max(0, planConfig.urgentQuota - usedUrgents),
            });
        }

        return NextResponse.json({ error: "Bilinmeyen aksiyon." }, { status: 400 });
    } catch (error) {
        console.error("[premium-actions] Hata:", error);
        return NextResponse.json({ error: "İşlem sırasında hata oluştu." }, { status: 500 });
    }
}
