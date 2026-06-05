import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * KPSS Deneme Sınavı API — Gerçekçi Soru Dağılımı
 * GET /api/career/kpss/questions?category=Lisans&count=30
 *
 * KPSS Gerçek Dağılım (120 soru):
 * Genel Yetenek (60): Türkçe 30, Matematik 30
 * Genel Kültür (60): Tarih 27, Coğrafya 18, Vatandaşlık 9, Güncel Bilgiler 6
 *
 * İstenen soru sayısına göre bu oranları koruyarak dağıtır.
 */

// Ders dağılım oranları (120 soru bazında)
const SUBJECT_RATIOS = [
    { subject: "Türkçe", ratio: 30 / 120 },
    { subject: "Matematik", ratio: 30 / 120 },
    { subject: "Tarih", ratio: 27 / 120 },
    { subject: "Coğrafya", ratio: 18 / 120 },
    { subject: "Vatandaşlık", ratio: 9 / 120 },
    { subject: "Güncel Bilgiler", ratio: 6 / 120 },
];

async function resolveUser(req: NextRequest) {
    const auth = req.headers.get("authorization");
    if (auth) {
        const parts = auth.split(" ");
        const token = parts.length === 2 ? parts[1] : auth;
        if (token && token.length > 5) {
            return prisma.user.findUnique({
                where: { id: token },
                select: { id: true, isCareerPremium: true, isPremium: true },
            });
        }
    }
    // Fallback: x-user-phone
    const phone = req.headers.get("x-user-phone");
    if (phone) {
        return prisma.user.findFirst({
            where: { OR: [{ phone }, { phoneNumber: phone }] },
            select: { id: true, isCareerPremium: true, isPremium: true },
        });
    }
    return null;
}

export async function GET(req: NextRequest) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json({ error: "Yetkilendirme gerekli.", reauth: true }, { status: 401 });
        }

        if (!user.isCareerPremium) {
            return NextResponse.json({ error: "Bu özellik Kariyer Premium üyelere özeldir." }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category") || "Lisans";
        const requestedCount = Math.min(parseInt(searchParams.get("count") || "30"), 120);

        // Toplam soru sayısını kontrol et
        const totalAvailable = await prisma.kpssQuestion.count({
            where: { category, isActive: true },
        });

        if (totalAvailable === 0) {
            return NextResponse.json({
                questions: [],
                category,
                totalAvailable: 0,
                message: `"${category}" kategorisinde henüz soru bulunmuyor.`,
            });
        }

        // ── Gerçekçi Soru Dağılımı Algoritması ──
        // Her ders için istenen sayıyı hesapla
        const subjectCounts: { subject: string; count: number }[] = [];
        let totalAllocated = 0;

        for (const sr of SUBJECT_RATIOS) {
            const count = Math.round(requestedCount * sr.ratio);
            subjectCounts.push({ subject: sr.subject, count });
            totalAllocated += count;
        }

        // Yuvarlama farkını Tarih'e ekle (en çok sorusu olan ders)
        const diff = requestedCount - totalAllocated;
        if (diff !== 0) {
            const tarihIdx = subjectCounts.findIndex(s => s.subject === "Tarih");
            if (tarihIdx >= 0) subjectCounts[tarihIdx].count += diff;
        }

        // Her ders için rastgele soruları çek
        const allQuestions: any[] = [];

        for (const sc of subjectCounts) {
            if (sc.count <= 0) continue;

            try {
                const questions = await prisma.$queryRawUnsafe<any[]>(
                    `SELECT id, category, subject, "questionText", options, "correctAnswer", explanation, difficulty
                     FROM "KpssQuestion"
                     WHERE category = $1 AND subject = $2 AND "isActive" = true
                     ORDER BY RANDOM()
                     LIMIT $3`,
                    category,
                    sc.subject,
                    sc.count
                );
                allQuestions.push(...questions);
            } catch (e) {
                // Bu dersten soru yoksa devam et
                console.log(`[KPSS] ${sc.subject} için soru bulunamadı, atlanıyor...`);
            }
        }

        // Eğer yeterli soru toplanamadıysa, kalan miktarı genel havuzdan tamamla (fallback)
        if (allQuestions.length < requestedCount) {
            const remaining = requestedCount - allQuestions.length;
            const existingIds = allQuestions.map(q => q.id);

            try {
                const fallbackQuestions = await prisma.$queryRawUnsafe<any[]>(
                    `SELECT id, category, subject, "questionText", options, "correctAnswer", explanation, difficulty
                     FROM "KpssQuestion"
                     WHERE category = $1 AND "isActive" = true
                     ${existingIds.length > 0 ? `AND id NOT IN (${existingIds.map((_, i) => `$${i + 3}`).join(",")})` : ""}
                     ORDER BY RANDOM()
                     LIMIT $2`,
                    category,
                    remaining,
                    ...existingIds
                );
                allQuestions.push(...fallbackQuestions);
            } catch (e) {
                console.log("[KPSS] Fallback soru çekme hatası:", e);
            }
        }

        // JSON parse options + soru numarası ekle
        const parsed = allQuestions.map((q, index) => ({
            ...q,
            questionNumber: index + 1,
            options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
        }));

        // Sınav süresi
        let examDurationMinutes: number;
        if (requestedCount <= 30) examDurationMinutes = 45;
        else if (requestedCount <= 60) examDurationMinutes = 65;
        else examDurationMinutes = 130;

        // Ders dağılımı raporu
        const distribution: Record<string, number> = {};
        for (const q of parsed) {
            distribution[q.subject] = (distribution[q.subject] || 0) + 1;
        }

        return NextResponse.json({
            questions: parsed,
            category,
            totalQuestions: parsed.length,
            totalAvailable,
            examDurationMinutes,
            distribution,
        });
    } catch (error) {
        console.error("KPSS Questions API error:", error);
        return NextResponse.json({ error: "Sorular yüklenemedi" }, { status: 500 });
    }
}
