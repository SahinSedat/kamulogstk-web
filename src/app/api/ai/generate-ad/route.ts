import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBecayisAdDraft, AdUserProfile } from "@/lib/ai/kamulogAIService";

/**
 * POST /api/ai/generate-ad
 * İlan taslağı oluştur (DB'ye kaydetmez, sadece JSON döner)
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, userNote, useProfileAsReference = true } = body;

        if (!userNote || typeof userNote !== "string" || userNote.trim().length < 10) {
            return NextResponse.json(
                { error: "Lütfen en az 10 karakter uzunluğunda bir not girin." },
                { status: 400 }
            );
        }

        // Kullanıcı profilini opsiyonel olarak al + Premium & AI kota kontrolü
        let userProfile: AdUserProfile | null = null;

        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    name: true,
                    firstName: true,
                    lastName: true,
                    city: true,
                    kurum: true,
                    bakanlik: true,
                    istihdamTuru: true,
                    unvan: true,
                    atamaUsulu: true,
                    yearsWorking: true,
                    isPremium: true,
                    aiTokens: true,
                },
            });

            // Premium & AI kota kontrolü
            if (!user?.isPremium || (user.aiTokens ?? 0) <= 0) {
                return NextResponse.json(
                    {
                        error: "Bu özellik yalnızca Premium kullanıcılar içindir.",
                        requiresPremium: true,
                        aiTokens: user?.aiTokens ?? 0,
                    },
                    { status: 403 }
                );
            }

            if (useProfileAsReference && user) {
                userProfile = {
                    name: user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
                    currentCity: user.city || undefined,
                    kurum: user.kurum || undefined,
                    bakanlik: user.bakanlik || undefined,
                    role: user.istihdamTuru || undefined,
                    unvan: user.unvan || undefined,
                    atamaUsulu: user.atamaUsulu || undefined,
                    yearsWorking: user.yearsWorking || undefined,
                };
            }
        } else {
            return NextResponse.json(
                { error: "userId gerekli." },
                { status: 400 }
            );
        }

        const result = await generateBecayisAdDraft(
            userProfile,
            userNote.trim(),
            useProfileAsReference
        );

        // AI kullanım logu + kota düşür
        await prisma.$transaction([
            prisma.aIUsageLog.create({
                data: {
                    userId,
                    module: "GENERATE_AD",
                    tokenUsed: null,
                },
            }),
            prisma.user.update({
                where: { id: userId },
                data: { aiTokens: { decrement: 1 } },
            }),
        ]);

        return NextResponse.json(result);
    } catch (error) {
        console.error("[generate-ad] Hata:", error);
        return NextResponse.json(
            { error: "İlan taslağı oluşturulurken hata oluştu." },
            { status: 500 }
        );
    }
}
