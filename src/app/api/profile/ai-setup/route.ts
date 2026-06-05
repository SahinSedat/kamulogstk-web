import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateProfileAndBecayisDraft } from "@/lib/ai/kamulogAIService";

/**
 * POST /api/profile/ai-setup
 * AI ile profil + becayiş taslağı oluştur ve kullanıcının DB kaydını güncelle.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, userNote } = body;

        if (!userId || typeof userId !== "string") {
            return NextResponse.json(
                { error: "userId gerekli." },
                { status: 400 }
            );
        }

        if (!userNote || typeof userNote !== "string" || userNote.trim().length < 10) {
            return NextResponse.json(
                { error: "Lütfen en az 10 karakter uzunluğunda bir metin girin." },
                { status: 400 }
            );
        }

        // Kullanıcıyı kontrol et
        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        if (!existingUser) {
            return NextResponse.json(
                { error: "Kullanıcı bulunamadı." },
                { status: 404 }
            );
        }

        // AI ile profil + becayiş taslağı oluştur
        const result = await generateProfileAndBecayisDraft(userNote.trim());

        if (!result.isValid) {
            return NextResponse.json(
                { error: "AI metni analiz edemedi. Lütfen daha detaylı bir metin girin." },
                { status: 422 }
            );
        }

        // DB güncelle
        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                istihdamTuru: result.workInfo.istihdamTuru || undefined,
                bakanlik: result.workInfo.bakanlik || undefined,
                kurum: result.workInfo.kurum || undefined,
                unvan: result.workInfo.unvan || undefined,
                atamaUsulu: result.workInfo.atamaUsulu || undefined,
                targetCities: result.targetCities.length > 0 ? result.targetCities.join(", ") : undefined,
                aiGeneratedBecayisText: result.becayisText || undefined,
                isWorkInfoGeneratedByAI: true,
                isLookingForBecayis: true,
            },
            select: {
                id: true,
                istihdamTuru: true,
                bakanlik: true,
                kurum: true,
                unvan: true,
                atamaUsulu: true,
                targetCities: true,
                aiGeneratedBecayisText: true,
                isWorkInfoGeneratedByAI: true,
                isLookingForBecayis: true,
            },
        });

        // AI kullanım logu
        await prisma.aIUsageLog.create({
            data: {
                userId,
                module: "AI_PROFILE_SETUP",
                tokenUsed: null,
            },
        });

        return NextResponse.json({
            success: true,
            user: updated,
            provider: result.provider,
        });
    } catch (error) {
        console.error("[ai-setup] Hata:", error);
        return NextResponse.json(
            { error: "Profil oluşturulurken hata oluştu." },
            { status: 500 }
        );
    }
}
