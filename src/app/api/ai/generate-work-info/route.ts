import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWorkInfoDraft } from "@/lib/ai/kamulogAIService";

/**
 * POST /api/ai/generate-work-info
 * Çalışma bilgisi taslağı oluştur (DB'ye kaydetmez, sadece JSON döner)
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, userNote } = body;

        if (!userNote || typeof userNote !== "string" || userNote.trim().length < 5) {
            return NextResponse.json(
                { error: "Lütfen çalışma bilgilerinizi kısaca açıklayın (en az 5 karakter)." },
                { status: 400 }
            );
        }

        const result = await generateWorkInfoDraft(userNote.trim());

        // AI kullanım logu
        if (userId) {
            await prisma.aIUsageLog.create({
                data: {
                    userId,
                    module: "GENERATE_WORK_INFO",
                    tokenUsed: null,
                },
            });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("[generate-work-info] Hata:", error);
        return NextResponse.json(
            { error: "Çalışma bilgisi taslağı oluşturulurken hata oluştu." },
            { status: 500 }
        );
    }
}
