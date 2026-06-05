import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUser } from "@/lib/auth-helpers";
import {
    searchAiMatches,
    type SearchUserProfile,
    type SearchListing,
} from "@/lib/ai/kamulogAIService";

// POST /api/becayis/ai-search — Hibrit AI Arama Motoru (Proximity Fallback)
export async function POST(req: NextRequest) {
    try {
        // ── 1. Kullanıcı doğrulaması
        const authUser = await resolveUser(req);
        if (!authUser) {
            return NextResponse.json(
                { error: "Yetkilendirme gerekli.", reauth: true },
                { status: 401 }
            );
        }

        // ── 2. Kullanıcının mühürlü AI profilini al
        const user = await prisma.user.findUnique({
            where: { id: authUser.id },
            select: {
                id: true,
                city: true,
                istihdamTuru: true,
                aiExtractedEmploymentType: true,
                bakanlik: true,
                kurum: true,
                unvan: true,
                atamaUsulu: true,
                aiGeneratedBecayisText: true,
                targetCities: true,
                isLookingForBecayis: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Kullanıcı bulunamadı." },
                { status: 404 }
            );
        }

        // Body'den opsiyonel override parametreleri
        const body = await req.json().catch(() => ({}));
        const overrideTargetCity = body.targetCity || null;

        // ── 3. Hedef şehirleri parse et
        let targetCities: string[] = [];
        if (overrideTargetCity) {
            targetCities = [overrideTargetCity];
        } else if (user.targetCities) {
            try {
                const parsed = JSON.parse(user.targetCities);
                targetCities = Array.isArray(parsed) ? parsed : [user.targetCities];
            } catch {
                targetCities = user.targetCities.split(",").map((s: string) => s.trim()).filter(Boolean);
            }
        }

        if (!user.city && targetCities.length === 0) {
            return NextResponse.json(
                {
                    error:
                        "AI arama yapabilmek için en az mevcut şehir veya hedef şehir bilgisi gereklidir. Lütfen profilinizi güncelleyin.",
                },
                { status: 400 }
            );
        }

        // ── 4. Veritabanından aktif ilanları çek (max 40, kendi ilanları hariç)
        const listings = await prisma.becayisListing.findMany({
            where: {
                ownerId: { not: user.id },
                status: { in: ["approved", "published", "active"] },
            },
            take: 40,
            orderBy: { createdAt: "desc" },
            include: {
                owner: {
                    select: { firstName: true, lastName: true, name: true },
                },
                institution: { select: { name: true } },
            },
        });

        if (listings.length === 0) {
            // Sonuç yoksa bile kullanım logu kaydet
            await prisma.aIUsageLog.create({
                data: {
                    userId: user.id,
                    module: "BECAYIS_AI_SEARCH",
                    tokenUsed: 0,
                },
            });

            return NextResponse.json({
                perfectMatches: [],
                proximityMatches: [],
                recommendationText:
                    "Şu anda veritabanında aktif becayiş ilanı bulunmamaktadır. Daha sonra tekrar deneyin.",
                totalListings: 0,
            });
        }

        // ── 5. Profil ve ilan verilerini AI servisine hazırla
        const userProfile: SearchUserProfile = {
            currentCity: user.city || undefined,
            targetCities,
            unvan: user.unvan || undefined,
            istihdamTuru: user.istihdamTuru || undefined,
            aiExtractedEmploymentType: user.aiExtractedEmploymentType || undefined,
            bakanlik: user.bakanlik || undefined,
            kurum: user.kurum || undefined,
            atamaUsulu: user.atamaUsulu || undefined,
            aiGeneratedBecayisText: user.aiGeneratedBecayisText || undefined,
        };

        const searchListings: SearchListing[] = listings.map((l) => ({
            id: l.id,
            title: l.title,
            currentCity: l.currentCity,
            targetCity: l.targetCity,
            branch: l.branch,
            role: l.role,
            description: l.description,
            assignmentMethod: l.assignmentMethod || undefined,
            institutionName: l.institution?.name || undefined,
            ownerName:
                l.owner.name ||
                `${l.owner.firstName || ""} ${l.owner.lastName || ""}`.trim() ||
                undefined,
        }));

        // ── 6. AI Arama çağrısı
        const aiResult = await searchAiMatches(userProfile, searchListings);

        // ── 7. AI kullanım logu kaydet
        await prisma.aIUsageLog.create({
            data: {
                userId: user.id,
                module: "BECAYIS_AI_SEARCH",
                tokenUsed: searchListings.length * 60, // Tahmini token kullanımı
            },
        });

        // ── 8. Eşleşen ilanları detaylarıyla zenginleştir
        const listingMap = new Map(listings.map((l) => [l.id, l]));

        const enrichMatch = (match: { listingId: string; matchPercentage: number; reason: string; matchType: string }) => {
            const listing = listingMap.get(match.listingId);
            if (!listing) return null;
            return {
                ...match,
                listing: {
                    id: listing.id,
                    title: listing.title,
                    currentCity: listing.currentCity,
                    targetCity: listing.targetCity,
                    branch: listing.branch,
                    role: listing.role,
                    description: listing.description,
                    slug: listing.slug,
                    adNumber: listing.adNumber,
                    isPremium: listing.isPremium,
                    createdAt: listing.createdAt,
                    institution: listing.institution,
                    owner: {
                        name:
                            listing.owner.name ||
                            `${listing.owner.firstName || ""} ${listing.owner.lastName || ""}`.trim(),
                    },
                },
            };
        };

        const enrichedPerfect = aiResult.perfectMatches.map(enrichMatch).filter(Boolean);
        const enrichedProximity = aiResult.proximityMatches.map(enrichMatch).filter(Boolean);

        return NextResponse.json({
            perfectMatches: enrichedPerfect,
            proximityMatches: enrichedProximity,
            recommendationText: aiResult.recommendationText,
            totalListings: listings.length,
            analyzedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("AI Search hatası:", error);

        const message =
            error instanceof Error ? error.message : "Bilinmeyen hata oluştu.";

        return NextResponse.json(
            { error: `AI arama sırasında hata oluştu: ${message}` },
            { status: 500 }
        );
    }
}
