import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAdFromProfile } from "@/lib/ai/kamulogAIService";

/**
 * POST /api/ai/generate-ad-from-profile
 * Kullanıcının Becayiş Profili verilerinden AI ile ilan taslağı üretir.
 * Body: { targetCityOrNote: string }
 * Veritabanına ilan KAYDETMEZ — sadece title + description JSON döner.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { targetCityOrNote } = body;

        // ── 1. Auth: Token'dan kullanıcıyı çöz
        const auth = req.headers.get("authorization");
        if (!auth) {
            return NextResponse.json({ error: "Yetkilendirme gerekli.", reauth: true }, { status: 401 });
        }
        const parts = auth.split(" ");
        const token = parts.length === 2 ? parts[1] : auth;

        let userId = "";
        let user = await prisma.user.findUnique({
            where: { id: token },
            select: {
                id: true,
                istihdamTuru: true,
                aiExtractedEmploymentType: true,
                bakanlik: true,
                kurum: true,
                unvan: true,
                atamaUsulu: true,
                city: true,
            },
        });
        if (user) {
            userId = user.id;
        } else {
            // Telefon numarası ile dene
            const phoneHeader = req.headers.get("x-user-phone");
            if (phoneHeader) {
                user = await prisma.user.findFirst({
                    where: { OR: [{ phone: phoneHeader }, { phoneNumber: phoneHeader }] },
                    select: {
                        id: true,
                        istihdamTuru: true,
                        aiExtractedEmploymentType: true,
                        bakanlik: true,
                        kurum: true,
                        unvan: true,
                        atamaUsulu: true,
                        city: true,
                    },
                });
                if (user) userId = user.id;
            }
        }

        if (!user) {
            return NextResponse.json({ error: "Kullanıcı bulunamadı.", reauth: true }, { status: 401 });
        }

        // ── 2. Profil verilerini birleştir: DB + client fallback (profileOverride)
        const override = body.profileOverride || {};
        const istihdamTuru = user.istihdamTuru || user.aiExtractedEmploymentType || override.istihdamTuru || "";
        const kurum = user.kurum || override.kurum || "";
        const unvan = user.unvan || override.unvan || "";
        const city = user.city || override.city || "";
        const bakanlik = user.bakanlik || override.bakanlik || "";
        const atamaUsulu = user.atamaUsulu || override.atamaUsulu || "";

        if (!istihdamTuru || !kurum || !unvan || !city) {
            return NextResponse.json({
                error: "Lütfen önce Becayiş Profilinizi eksiksiz doldurun. İlan taslağı oluşturmak için İstihdam Türü, Kurum, Ünvan ve Mevcut Şehir bilgileriniz gereklidir.",
                missingFields: {
                    istihdamTuru: !istihdamTuru,
                    kurum: !kurum,
                    unvan: !unvan,
                    city: !city,
                },
            }, { status: 400 });
        }

        // ── 3. targetCityOrNote kontrolü
        if (!targetCityOrNote || typeof targetCityOrNote !== "string" || targetCityOrNote.trim().length < 2) {
            return NextResponse.json(
                { error: "Lütfen gitmek istediğiniz şehri veya kısa bir not girin." },
                { status: 400 }
            );
        }

        // ── 4. AI çağrısı — profil verilerinden ilan taslağı üret
        const result = await generateAdFromProfile(
            {
                istihdamTuru,
                bakanlik,
                kurum,
                unvan,
                atamaUsulu,
                city,
            },
            targetCityOrNote.trim()
        );

        // ── 5. AI kullanım logu
        await prisma.aIUsageLog.create({
            data: {
                userId,
                module: "GENERATE_AD_FROM_PROFILE",
                tokenUsed: null,
            },
        });

        return NextResponse.json({
            title: result.title,
            description: result.description,
            provider: result.provider,
            targetCity: targetCityOrNote.trim(),
        });
    } catch (error) {
        console.error("[generate-ad-from-profile] Hata:", error);
        return NextResponse.json(
            { error: "İlan taslağı oluşturulurken hata oluştu. Lütfen tekrar deneyin." },
            { status: 500 }
        );
    }
}
