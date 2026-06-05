import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/services/notificationService";

/**
 * GET /api/cron/becayis-expire
 *
 * Otomatik Süre Sistemi:
 * 1. expiresAt < now → ilanı "expired" yap + bildirim
 * 2. expiresAt < now+2gün → uyarı bildirimi gönder
 * 3. Premium süresi dolmuş ilanların premium'unu kaldır
 */

const CRON_SECRET = process.env.CRON_SECRET || "kamulog-cron-secret-2026";

export async function GET(req: NextRequest) {
    try {
        // 1. Güvenlik kontrolü
        const auth = req.headers.get("authorization");
        const token = auth?.replace("Bearer ", "");

        if (token !== CRON_SECRET) {
            return NextResponse.json(
                { error: "Yetkisiz erişim" },
                { status: 401 }
            );
        }

        const now = new Date();

        // 2. Süresi dolmuş ilanları "expired" yap
        const expiredListings = await prisma.becayisListing.findMany({
            where: {
                expiresAt: { lt: now },
                status: { in: ["published", "approved", "active"] },
                isExpiredNotified: false,
            },
            select: { id: true, ownerId: true, title: true, adNumber: true },
        });

        if (expiredListings.length > 0) {
            // Toplu güncelle
            await prisma.becayisListing.updateMany({
                where: {
                    id: { in: expiredListings.map(l => l.id) },
                },
                data: {
                    status: "expired",
                    isExpiredNotified: true,
                },
            });

            // Bildirimleri gönder
            for (const listing of expiredListings) {
                try {
                    await createNotification({
                        userId: listing.ownerId,
                        title: "⏰ İlanınızın Süresi Doldu",
                        message: `"${listing.title}" (${listing.adNumber || ""}) ilanınızın 30 günlük süresi doldu ve pasife alındı. İlanınızı yenileyerek tekrar yayına alabilirsiniz.`,
                        type: "SYSTEM",
                        payload: { listingId: listing.id, action: "expired" },
                    });
                } catch (e) {
                    console.error(`[Cron] Süre dolumu bildirimi gönderilemedi: ${listing.id}`, e);
                }
            }
        }

        // 3. 2 gün içinde süresi dolacak ilanlara uyarı
        const twoDaysLater = new Date();
        twoDaysLater.setDate(twoDaysLater.getDate() + 2);

        const expiringListings = await prisma.becayisListing.findMany({
            where: {
                expiresAt: { gt: now, lt: twoDaysLater },
                status: { in: ["published", "approved", "active"] },
                isExpiringNotified: false,
            },
            select: { id: true, ownerId: true, title: true, adNumber: true, expiresAt: true },
        });

        if (expiringListings.length > 0) {
            await prisma.becayisListing.updateMany({
                where: { id: { in: expiringListings.map(l => l.id) } },
                data: { isExpiringNotified: true },
            });

            for (const listing of expiringListings) {
                const hoursLeft = listing.expiresAt
                    ? Math.ceil((listing.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60))
                    : 0;
                try {
                    await createNotification({
                        userId: listing.ownerId,
                        title: "⚠️ İlanınızın Süresi Azalıyor",
                        message: `"${listing.title}" ilanınızın süresi yaklaşık ${hoursLeft} saat içinde dolacak. Süresini uzatmak için ilanınızı yenileyin.`,
                        type: "SYSTEM",
                        payload: { listingId: listing.id, action: "expiring_soon" },
                    });
                } catch (e) {
                    console.error(`[Cron] Yaklaşan süre bildirimi gönderilemedi: ${listing.id}`, e);
                }
            }
        }

        // 4. expiresAt olmayan eski ilanlar için fallback (geriye uyumluluk)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const legacyExpired = await prisma.becayisListing.updateMany({
            where: {
                expiresAt: null,
                approvedAt: { lt: thirtyDaysAgo },
                status: { in: ["published", "approved", "active"] },
                isPremium: false,
            },
            data: { status: "expired" },
        });

        // 5. Premium süresi dolmuş ilanların premium'unu kaldır
        const premiumExpired = await prisma.becayisListing.updateMany({
            where: {
                isPremium: true,
                premiumUntil: { lt: now },
            },
            data: {
                isPremium: false,
                premiumUntil: null,
            },
        });

        console.log(`[Cron] Expire: ${expiredListings.length} doldu, ${expiringListings.length} uyarı, ${legacyExpired.count} eski, ${premiumExpired.count} premium kaldırıldı`);

        return NextResponse.json({
            success: true,
            expired: expiredListings.length,
            expiringSoon: expiringListings.length,
            legacyExpired: legacyExpired.count,
            premiumExpired: premiumExpired.count,
            checkedAt: now.toISOString(),
        });
    } catch (error) {
        console.error("Cron becayis-expire error:", error);
        return NextResponse.json(
            { error: "Cron işlemi sırasında hata oluştu" },
            { status: 500 }
        );
    }
}

// POST — Admin panelden "Süresi Dolmuşları Kapat" butonu için (CRON_SECRET gerekmez)
export async function POST() {
    try {
        const now = new Date();

        // expiresAt geçmiş olanları kapat
        const result1 = await prisma.becayisListing.updateMany({
            where: {
                expiresAt: { lt: now },
                status: { in: ["published", "approved", "active"] },
            },
            data: { status: "expired", isExpiredNotified: true },
        });

        // expiresAt olmayıp 30 gün geçmiş olanları da kapat (fallback)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result2 = await prisma.becayisListing.updateMany({
            where: {
                expiresAt: null,
                approvedAt: { lt: thirtyDaysAgo },
                status: { in: ["published", "approved", "active"] },
                isPremium: false,
            },
            data: { status: "expired" },
        });

        return NextResponse.json({
            success: true,
            message: `${result1.count + result2.count} ilan pasife alındı.`,
            expiredByDate: result1.count,
            expiredByLegacy: result2.count,
        });
    } catch (error) {
        console.error("Admin expire error:", error);
        return NextResponse.json({ error: "İşlem sırasında hata oluştu" }, { status: 500 });
    }
}
