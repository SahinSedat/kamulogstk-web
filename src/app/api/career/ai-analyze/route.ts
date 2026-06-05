import { createAdminNotification } from "@/lib/services/adminNotificationService";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { callWithFailover } from "@/lib/ai/keyProvider";

/**
 * Kariyer AI Analiz API — OpenAI
 * POST /api/career/ai-analyze
 * Body: { jobId: string }
 * 
 * Kullanıcı profilini iş ilanıyla karşılaştırıp uyumluluk analizi yapar.
 */


async function resolveUser(req: NextRequest) {
    const auth = req.headers.get("authorization");
    if (!auth) return null;
    const parts = auth.split(" ");
    const token = parts.length === 2 ? parts[1] : auth;
    if (!token) return null;
    return prisma.user.findUnique({
        where: { id: token },
        select: {
            id: true, firstName: true, lastName: true,
            city: true, unvan: true, istihdamTuru: true,
            kurum: true, bakanlik: true, isPremium: true, isCareerPremium: true,
        },
    });
}

export async function POST(req: NextRequest) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json({ error: "Yetkilendirme gerekli.", reauth: true }, { status: 401 });
        }

        if (!user.isPremium && !user.isCareerPremium) {
            return NextResponse.json({ error: "Bu özellik Premium üyelere özeldir." }, { status: 403 });
        }

        const body = await req.json();
        const { jobId } = body;

        if (!jobId) {
            return NextResponse.json({ error: "jobId zorunlu" }, { status: 400 });
        }

        const job = await prisma.jobListing.findUnique({ where: { id: jobId } });
        if (!job) {
            return NextResponse.json({ error: "İlan bulunamadı" }, { status: 404 });
        }

        const prompt = `Sen bir kariyer danışmanı asistanısın. Aşağıdaki kullanıcı profilini ve iş ilanını analiz ederek uyumluluk raporu hazırla.

KULLANICI PROFİLİ:
- Ad Soyad: ${user.firstName || ""} ${user.lastName || ""}
- Şehir: ${user.city || "Belirtilmemiş"}
- Ünvan: ${user.unvan || "Belirtilmemiş"}
- İstihdam Türü: ${user.istihdamTuru || "Belirtilmemiş"}
- Kurum: ${user.kurum || "Belirtilmemiş"}
- Bakanlık: ${user.bakanlik || "Belirtilmemiş"}

İŞ İLANI:
- Başlık: ${job.title}
- Kurum: ${job.company}
- Şehir: ${job.location || "Belirtilmemiş"}
- Tür: ${job.type === "PUBLIC" ? "Kamu" : "Özel Sektör"}
- Açıklama: ${job.description}
- Aranan Nitelikler: ${job.requirements || "Belirtilmemiş"}
- Maaş: ${job.salary || "Belirtilmemiş"}

Aşağıdaki JSON formatında yanıt ver:
{
  "matchScore": 0-100 arası uyumluluk puanı,
  "summary": "Kısa genel değerlendirme (2-3 cümle)",
  "strengths": ["Güçlü yönler listesi (maks 4 madde)"],
  "weaknesses": ["Zayıf/eksik yönler listesi (maks 3 madde)"],
  "recommendations": ["Başvuru öncesi öneriler listesi (maks 3 madde)"],
  "locationMatch": true/false şehir uyumu,
  "experienceMatch": true/false deneyim uyumu
}`;

        const completion = await callWithFailover("OPENAI", async (apiKey) => {
            const client = new OpenAI({ apiKey });
            return client.chat.completions.create({

                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Sen bir kariyer danışmanı asistanısın. SADECE JSON formatında yanıt ver." },
                    { role: "user", content: prompt },
                ],
                temperature: 0.7,
                max_tokens: 2048,
                response_format: { type: "json_object" },
            });
        });

        const text = completion.choices[0]?.message?.content || "{}";
        const analysis = JSON.parse(text);

        // Kullanım logu
        await prisma.aIUsageLog.create({
            data: { userId: user.id, module: "CAREER_ANALYZE", tokenUsed: completion.usage?.total_tokens || 500 },
        });

        return NextResponse.json({
            success: true,
            analysis,
            job: { id: job.id, title: job.title, company: job.company, code: job.code },
            analyzedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Career AI Analyze error:", error);
        return NextResponse.json({ error: "AI analizi başarısız oldu" }, { status: 500 });
    }
}
