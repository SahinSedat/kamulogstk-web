import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Becayiş Favori API — Kullanıcının favori ilanlarını yönetir.
 * Auth: Authorization: Token <userId>
 */

async function resolveUser(req: NextRequest | Request) {
    const auth = req.headers.get("authorization");
    if (!auth) return null;
    const parts = auth.split(" ");
    const token = parts.length === 2 ? parts[1] : auth;
    if (!token) return null;

    let user = await prisma.user.findUnique({
        where: { id: token },
        select: { id: true },
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
            select: { id: true },
        });
        if (user) return user;
    }
    return null;
}

// GET /api/becayis/favorites — Kullanıcının favori ilanları
export async function GET(req: NextRequest) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json(
                { error: "Yetkilendirme gerekli.", reauth: true },
                { status: 401 }
            );
        }

        const favorites = await prisma.favoriteAd.findMany({
            where: { userId: user.id },
            include: {
                listing: {
                    include: {
                        institution: { select: { name: true } },
                        owner: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                avatarUrl: true,
                                isPremium: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Favori ID listesi (hızlı lookup için)
        const favoriteIds = favorites.map((f) => f.listingId);
        // Tam ilan bilgileri
        const listings = favorites.map((f) => f.listing);

        return NextResponse.json({ favoriteIds, listings });
    } catch (error) {
        console.error("Favorites GET error:", error);
        return NextResponse.json(
            { error: "Favoriler yüklenemedi" },
            { status: 500 }
        );
    }
}

// POST /api/becayis/favorites — Favoriye ekle
export async function POST(req: NextRequest) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json(
                { error: "Yetkilendirme gerekli.", reauth: true },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { listingId } = body;

        if (!listingId) {
            return NextResponse.json(
                { error: "listingId zorunlu" },
                { status: 400 }
            );
        }

        // İlan var mı kontrol
        const listing = await prisma.becayisListing.findUnique({
            where: { id: listingId },
            select: { id: true },
        });
        if (!listing) {
            return NextResponse.json(
                { error: "İlan bulunamadı" },
                { status: 404 }
            );
        }

        // Zaten favoride mi?
        const existing = await prisma.favoriteAd.findUnique({
            where: { userId_listingId: { userId: user.id, listingId } },
        });
        if (existing) {
            return NextResponse.json({
                success: true,
                message: "Zaten favorilerde",
                action: "exists",
            });
        }

        await prisma.favoriteAd.create({
            data: { userId: user.id, listingId },
        });

        return NextResponse.json({
            success: true,
            message: "Favorilere eklendi",
            action: "added",
        });
    } catch (error) {
        console.error("Favorites POST error:", error);
        return NextResponse.json(
            { error: "Favorilere eklenirken hata oluştu" },
            { status: 500 }
        );
    }
}

// DELETE /api/becayis/favorites — Favoriden çıkar
export async function DELETE(req: NextRequest) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json(
                { error: "Yetkilendirme gerekli.", reauth: true },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const listingId = searchParams.get("listingId");

        if (!listingId) {
            return NextResponse.json(
                { error: "listingId zorunlu" },
                { status: 400 }
            );
        }

        await prisma.favoriteAd.deleteMany({
            where: { userId: user.id, listingId },
        });

        return NextResponse.json({
            success: true,
            message: "Favorilerden çıkarıldı",
            action: "removed",
        });
    } catch (error) {
        console.error("Favorites DELETE error:", error);
        return NextResponse.json(
            { error: "Favorilerden çıkarılırken hata oluştu" },
            { status: 500 }
        );
    }
}
