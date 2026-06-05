import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/becayis/[id]/boost — İlanı Öne Çıkar (VIP)
 *
 * Güvenlik:
 * - Auth doğrulama (resolveUser)
 * - İlan sahipliği kontrolü
 * - Sunucu tarafında jeton yeterliliği kontrolü
 * - prisma.$transaction ile atomik işlem (jeton düşüm + premium güncelleme)
 */

const BOOST_COST = 10; // Öne çıkarma maliyeti: 10 jeton
const BOOST_DURATION_DAYS = 7; // 7 gün boyunca VIP

async function resolveUser(req: NextRequest | Request) {
    const auth = req.headers.get("authorization");
    if (!auth) return null;

    const parts = auth.split(" ");
    const token = parts.length === 2 ? parts[1] : auth;
    if (!token) return null;

    let user = await prisma.user.findUnique({
        where: { id: token },
        select: { id: true, credits: true, isPremium: true },
    });
    if (user) return user;

    const phoneHeader = req.headers.get("x-user-phone");
    if (phoneHeader) {
        user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: phoneHeader },
                    { phoneNumber: phoneHeader },
                ],
            },
            select: { id: true, credits: true, isPremium: true },
        });
        if (user) return user;
    }

    return null;
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Auth doğrulama
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json(
                { error: "Yetkilendirme gerekli.", reauth: true },
                { status: 401 }
            );
        }

        // 2. İlanı bul
        const listing = await prisma.becayisListing.findUnique({
            where: { id },
            select: {
                id: true,
                ownerId: true,
                isPremium: true,
                premiumUntil: true,
                status: true,
            },
        });

        if (!listing) {
            return NextResponse.json(
                { error: "İlan bulunamadı" },
                { status: 404 }
            );
        }

        // 3. Sahiplik kontrolü
        if (listing.ownerId !== user.id) {
            return NextResponse.json(
                { error: "Bu ilanı öne çıkarma yetkiniz yok." },
                { status: 403 }
            );
        }

        // 4. İlan zaten premium mi?
        if (
            listing.isPremium &&
            listing.premiumUntil &&
            new Date(listing.premiumUntil) > new Date()
        ) {
            return NextResponse.json(
                {
                    error: "Bu ilan zaten öne çıkarılmış.",
                    premiumUntil: listing.premiumUntil,
                },
                { status: 400 }
            );
        }

        // 5. İlan yayında mı?
        if (!["published", "approved", "active"].includes(listing.status)) {
            return NextResponse.json(
                {
                    error: "Sadece yayında olan ilanlar öne çıkarılabilir.",
                },
                { status: 400 }
            );
        }

        // 6. Jeton yeterliliği kontrolü (sunucu tarafı — kritik güvenlik)
        // Güncel kredi bilgisini tekrar çek (race condition önlemi)
        const freshUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { credits: true },
        });

        if (!freshUser || freshUser.credits < BOOST_COST) {
            return NextResponse.json(
                {
                    error: `Yetersiz jeton. Gerekli: ${BOOST_COST}, Mevcut: ${freshUser?.credits ?? 0}`,
                    requiredCredits: BOOST_COST,
                    currentCredits: freshUser?.credits ?? 0,
                },
                { status: 400 }
            );
        }

        // 7. ATOMİK İŞLEM — prisma.$transaction
        const premiumUntil = new Date();
        premiumUntil.setDate(
            premiumUntil.getDate() + BOOST_DURATION_DAYS
        );

        const [updatedListing, updatedUser] = await prisma.$transaction([
            // İlanı premium yap
            prisma.becayisListing.update({
                where: { id },
                data: {
                    isPremium: true,
                    premiumUntil,
                },
            }),
            // Kullanıcının jetonunu düş
            prisma.user.update({
                where: { id: user.id },
                data: {
                    credits: { decrement: BOOST_COST },
                },
                select: { credits: true },
            }),
        ]);

        return NextResponse.json({
            success: true,
            message: `İlan ${BOOST_DURATION_DAYS} gün boyunca öne çıkarıldı.`,
            listing: {
                id: updatedListing.id,
                isPremium: updatedListing.isPremium,
                premiumUntil: updatedListing.premiumUntil,
            },
            remainingCredits: updatedUser.credits,
            deductedCredits: BOOST_COST,
        });
    } catch (error) {
        console.error("Becayis boost error:", error);
        return NextResponse.json(
            { error: "Öne çıkarma işlemi sırasında hata oluştu" },
            { status: 500 }
        );
    }
}
