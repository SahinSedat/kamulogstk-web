import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUser } from "@/lib/auth-helpers";
import {
    analyzeBecayisMatches,
    type UserProfile,
    type CandidateListing,
} from "@/lib/ai/geminiService";

// POST /api/becayis/ai-match — AI destekli becayiş eşleştirme
// SADECE "Becayiş Profilim" parametrelerini kullanır (kendi ilanını baz almaz)
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

        // ── 2. Kullanıcı profilini al (Becayiş Profilim alanları)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user: any = await prisma.user.findUnique({
            where: { id: authUser.id },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Kullanıcı bulunamadı." },
                { status: 404 }
            );
        }

        // ── 3. REFERANS KAYNAĞI: İLAN VARSA İLAN, YOKSA PROFİL ──
        // Kullanıcının aktif ilanı varsa → İlan parametrelerini baz al
        // Yoksa → Becayiş & AI Profil bilgilerini baz al
        const userListing = await prisma.becayisListing.findFirst({
            where: {
                ownerId: user.id,
                status: { in: ["approved", "published", "active"] },
            },
            orderBy: { createdAt: "desc" },
            include: {
                institution: { select: { name: true } },
            },
        });

        const hasListing = !!userListing;
        let referenceSource: string;
        let userCurrentCity: string;
        let userTargetCity: string;
        let userBakanlik: string;
        let userUnvan: string;
        let userIstihdamTuru: string;
        let userAtamaUsulu: string;
        let userKurum: string;

        if (hasListing) {
            // ═══ İLAN REFERANSI ═══
            referenceSource = "listing";
            userCurrentCity = userListing.currentCity || "";
            userTargetCity = userListing.targetCity || "";
            userBakanlik = userListing.institution?.name || user.bakanlik || "";
            userUnvan = userListing.branch || user.unvan || "";
            userIstihdamTuru = userListing.role || user.istihdamTuru || "";
            userAtamaUsulu = userListing.assignmentMethod || user.atamaUsulu || "";
            userKurum = userListing.institution?.name || user.kurum || "";
            console.log(
                `[AI Match] ${user.id} → İLAN referans alınıyor: ${userCurrentCity}→${userTargetCity} (${userIstihdamTuru})`
            );
        } else {
            // ═══ PROFİL REFERANSI ═══
            referenceSource = "profile";
            userCurrentCity = user.city || "";
            userTargetCity = user.targetCities || "";
            userBakanlik = user.bakanlik || "";
            userUnvan = user.unvan || "";
            userIstihdamTuru = user.istihdamTuru || "";
            userAtamaUsulu = user.atamaUsulu || "";
            userKurum = user.kurum || "";
            console.log(
                `[AI Match] ${user.id} → PROFİL referans alınıyor: ${userCurrentCity}→${userTargetCity} (${userIstihdamTuru})`
            );
        }

        // Alternatif şehirler (her zaman profilden gelir)
        const altCitiesRaw: string = user.alternativeCities || "";
        const altCities: string[] = altCitiesRaw
            .split(",")
            .map((c: string) => c.trim())
            .filter((c: string) => c.length > 0);

        if (!userCurrentCity || !userTargetCity) {
            return NextResponse.json(
                {
                    error: hasListing
                        ? "İlanınızda şehir bilgileri eksik. Lütfen ilanınızı düzenleyin."
                        : "Eşleştirme yapabilmek için 'Bulunduğum Şehir' ve 'Gitmek İstediğim Şehir' bilgileri gereklidir. Lütfen Becayiş profilinizi doldurun.",
                },
                { status: 400 }
            );
        }

        const includeFields = {
            owner: {
                select: {
                    firstName: true,
                    lastName: true,
                    name: true,
                    unvan: true,
                    istihdamTuru: true,
                },
            },
            institution: { select: { name: true } },
        };

        // ── 4. TÜM AKTİF İLANLARI ÇEK ──
        const allListings = await prisma.becayisListing.findMany({
            where: {
                ownerId: { not: user.id },
                status: { in: ["approved", "published", "active"] },
            },
            orderBy: { createdAt: "desc" },
            include: includeFields,
        });

        if (allListings.length === 0) {
            await logUsage(user.id, 0);
            return NextResponse.json({
                matches: [],
                message:
                    "Sistemde aktif becayiş ilanı bulunamadı.",
                totalCandidates: 0,
                analyzedAt: new Date().toISOString(),
                referenceSource: hasListing ? "listing" : "profile",
            });
        }

        // ── 5. HİYERARŞİK FİLTRELEME ──
        // Öncelik sırası: Şehir → İstihdam Türü → Bakanlık/Kurum → Meslek/Ünvan → Atama Usulü
        const uCurrent = userCurrentCity.toLowerCase();
        const uTarget = userTargetCity.toLowerCase();

        // Tüm ilanları sınıflandır
        type ScoredListing = (typeof allListings)[number] & {
            _matchType: "perfect" | "proximity" | "alternative";
            _filterScore: number; // ne kadar çok parametre uyuşuyorsa o kadar yüksek
        };

        const scoredListings: ScoredListing[] = [];

        for (const listing of allListings) {
            const lCity = (listing.currentCity || "").toLowerCase();
            const lTarget = (listing.targetCity || "").toLowerCase();
            const lRole = (listing.role || "").toLowerCase();
            const lBranch = (listing.branch || "").toLowerCase();
            const lAssignment = (listing.assignmentMethod || "").toLowerCase();
            const lInstitution = (listing.institution?.name || "").toLowerCase();

            // ── Şehir kontrolü (ZORUNLU) ──
            const mainCityMatch = uTarget && lCity.includes(uTarget);
            const mainReverseMatch = uCurrent && lTarget.includes(uCurrent);
            const altCityMatch = altCities.some((alt) =>
                lCity.toLowerCase().includes(alt.toLowerCase())
            );
            const altReverseMatch = altCities.some((alt) =>
                lTarget.toLowerCase().includes(alt.toLowerCase())
            );

            let matchType: "perfect" | "proximity" | "alternative" | null =
                null;

            if (mainCityMatch && mainReverseMatch) {
                matchType = "perfect"; // Tam karşılıklı
            } else if (mainCityMatch || mainReverseMatch) {
                matchType = "proximity"; // Tek yönlü (ana şehir)
            } else if (altCityMatch || altReverseMatch) {
                matchType = "alternative"; // Alternatif şehir
            }

            if (!matchType) continue; // Şehir uyumu yok → atla

            // ── İSTİHDAM TÜRÜ HARD FILTER (ZORUNLU) ──
            // İstihdam türü uyuşmadan analiz yapılmaz!
            if (userIstihdamTuru) {
                const userEmpNorm = normalizeEmploymentType(userIstihdamTuru);
                const listingEmpNorm = normalizeEmploymentType(lRole);
                const ownerEmpNorm = normalizeEmploymentType(
                    (listing.owner as any)?.istihdamTuru || ""
                );

                // İlan role'ü VEYA ilan sahibinin istihdamTuru eşleşmeli
                if (userEmpNorm !== listingEmpNorm && userEmpNorm !== ownerEmpNorm) {
                    continue; // İstihdam türü uyuşmuyor → ATLA
                }
            }

            // ── Profil parametre uyum skoru ──
            let filterScore = 0;

            // Bakanlık/Kurum kontrolü (+20 puan)
            if (userBakanlik) {
                if (
                    lInstitution.includes(userBakanlik.toLowerCase()) ||
                    (listing.description || "")
                        .toLowerCase()
                        .includes(userBakanlik.toLowerCase())
                ) {
                    filterScore += 20;
                }
            }
            if (userKurum) {
                if (lInstitution.includes(userKurum.toLowerCase())) {
                    filterScore += 20;
                }
            }

            // Meslek/Ünvan kontrolü (+25 puan)
            if (userUnvan) {
                const unvanLower = userUnvan.toLowerCase();
                if (
                    lRole.includes(unvanLower) ||
                    lBranch.includes(unvanLower) ||
                    (listing.description || "")
                        .toLowerCase()
                        .includes(unvanLower) ||
                    (listing.owner as any)?.unvan?.toLowerCase() === unvanLower
                ) {
                    filterScore += 25;
                }
            }

            // Atama Usulü kontrolü (+15 puan)
            if (userAtamaUsulu) {
                if (
                    lAssignment.includes(userAtamaUsulu.toLowerCase()) ||
                    (listing.description || "")
                        .toLowerCase()
                        .includes(userAtamaUsulu.toLowerCase())
                ) {
                    filterScore += 15;
                }
            }

            scoredListings.push({
                ...listing,
                _matchType: matchType,
                _filterScore: filterScore,
            });
        }

        // Skora göre sırala (yüksekten düşüğe)
        scoredListings.sort((a, b) => {
            // Önce tip: perfect > proximity > alternative
            const typeOrder = { perfect: 0, proximity: 1, alternative: 2 };
            if (typeOrder[a._matchType] !== typeOrder[b._matchType]) {
                return typeOrder[a._matchType] - typeOrder[b._matchType];
            }
            return b._filterScore - a._filterScore;
        });

        if (scoredListings.length === 0) {
            await logUsage(user.id, 0);
            const altInfo =
                altCities.length > 0
                    ? ` ve alternatif şehirler (${altCities.join(", ")})`
                    : "";
            return NextResponse.json({
                matches: [],
                message: `${userCurrentCity} → ${userTargetCity}${altInfo} rotasında profilinize uygun eşleşme bulunamadı. Profilinizi genişletmeyi veya daha sonra tekrar denemeyi düşünün.`,
                totalCandidates: allListings.length,
                analyzedAt: new Date().toISOString(),
            });
        }

        // ── 6. OpenAI ile analiz ──
        const userProfile: UserProfile = {
            id: user.id,
            name:
                user.name ||
                `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                undefined,
            currentCity: userCurrentCity,
            targetCity: userTargetCity,
            alternativeCities: altCities.length > 0 ? altCities : undefined,
            kurum: userKurum || undefined,
            bakanlik: userBakanlik || undefined,
            unvan: userUnvan || undefined,
            istihdamTuru: userIstihdamTuru || undefined,
            atamaUsulu: userAtamaUsulu || undefined,
            yearsWorking: user.yearsWorking || undefined,
        };

        const candidateListings: CandidateListing[] = scoredListings.map(
            (l) => ({
                id: l.id,
                title: l.title,
                role: l.role,
                branch: l.branch,
                currentCity: l.currentCity,
                targetCity: l.targetCity,
                assignmentMethod: l.assignmentMethod || undefined,
                description: l.description,
                institutionName: l.institution?.name || undefined,
                ownerName:
                    l.owner.name ||
                    `${l.owner.firstName || ""} ${l.owner.lastName || ""}`.trim() ||
                    undefined,
            })
        );

        const perfectCount = scoredListings.filter(
            (l) => l._matchType === "perfect"
        ).length;
        const proximityCount = scoredListings.filter(
            (l) => l._matchType === "proximity"
        ).length;
        const altCount = scoredListings.filter(
            (l) => l._matchType === "alternative"
        ).length;

        const altInfo =
            altCities.length > 0 ? ` | Alt: ${altCities.join(",")}` : "";
        console.log(
            `[AI Match] ${user.id} | ${userCurrentCity}→${userTargetCity}${altInfo} | Unvan: ${userUnvan} | İstihdam: ${userIstihdamTuru} | Toplam: ${allListings.length} | Uyumlu: ${scoredListings.length} (${perfectCount} tam, ${proximityCount} yakın, ${altCount} alternatif)`
        );

        const aiResults = await analyzeBecayisMatches(
            userProfile,
            candidateListings
        );

        // ── 7. AI kullanım logu kaydet
        await logUsage(user.id, candidateListings.length * 50);

        // ── 8. Sonuçları zenginleştir ──
        const listingMap = new Map(
            scoredListings.map((l) => [l.id, l])
        );

        const enrichedMatches = aiResults
            .map((match) => {
                const listing = listingMap.get(match.listingId);
                if (!listing) return null;

                // Skor garantisi:
                // perfect → min 80
                // proximity → 60-79
                // alternative → 50-69
                let adjustedPercentage = match.matchPercentage;
                if (listing._matchType === "perfect") {
                    adjustedPercentage = Math.max(adjustedPercentage, 80);
                } else if (listing._matchType === "proximity") {
                    adjustedPercentage = Math.min(
                        Math.max(adjustedPercentage, 50),
                        79
                    );
                } else {
                    // alternative
                    adjustedPercentage = Math.min(
                        Math.max(adjustedPercentage, 50),
                        69
                    );
                }

                return {
                    listingId: match.listingId,
                    matchPercentage: adjustedPercentage,
                    matchType: listing._matchType,
                    reason: match.reason,
                    listing: {
                        id: listing.id,
                        title: listing.title,
                        role: listing.role,
                        branch: listing.branch,
                        currentCity: listing.currentCity,
                        targetCity: listing.targetCity,
                        assignmentMethod: listing.assignmentMethod,
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
            })
            .filter(Boolean)
            .sort(
                (a, b) =>
                    (b?.matchPercentage || 0) - (a?.matchPercentage || 0)
            );

        return NextResponse.json({
            matches: enrichedMatches,
            totalCandidates: allListings.length,
            analyzedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("AI Becayiş Match hatası:", error);

        const message =
            error instanceof Error ? error.message : "Bilinmeyen hata oluştu.";

        return NextResponse.json(
            { error: `AI eşleştirme sırasında hata oluştu: ${message}` },
            { status: 500 }
        );
    }
}

// Yardımcı: AI kullanım logu kaydet

// ── İstihdam Türü Normalizasyonu ──
// "4/D İşçi" → "isci", "4/A Kadrolu Memur" → "memur", "4/B Sözleşmeli" → "sozlesmeli"
function normalizeEmploymentType(raw: string): string {
    const lower = raw.toLowerCase().trim();
    if (lower.includes("işçi") || lower.includes("isci") || lower === "isci" || lower.includes("4/d")) {
        return "isci";
    }
    if (lower.includes("sözleşmeli") || lower.includes("sozlesmeli") || lower === "sozlesmeli" || lower.includes("4/b")) {
        return "sozlesmeli";
    }
    if (lower.includes("memur") || lower === "memur" || lower.includes("4/a") || lower.includes("kadrolu")) {
        return "memur";
    }
    return lower;
}

async function logUsage(userId: string, tokenUsed: number) {
    await prisma.aIUsageLog.create({
        data: {
            userId,
            module: "BECAYIS_MATCH",
            tokenUsed,
        },
    });
}
