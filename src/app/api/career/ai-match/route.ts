import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { callWithFailover } from "@/lib/ai/keyProvider";

/**
 * Kariyer AI Eşleştirme API — OpenAI (Hızlı)
 * GET /api/career/ai-match
 * 
 * Kullanıcı profilini + CV bilgisini tüm aktif ilanlarla karşılaştırır.
 * gpt-4o-mini kullanır (hız optimizasyonu için).
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
            cvs: { take: 1, orderBy: { updatedAt: "desc" }, select: { data: true, title: true, pdfPath: true } },
        },
    });
}

export async function GET(req: NextRequest) {
    const startTime = Date.now();

    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json({ error: "Yetkilendirme gerekli.", reauth: true }, { status: 401 });
        }

        if (!user.isCareerPremium) {
            return NextResponse.json({ error: "Bu özellik Premium üyelere özeldir." }, { status: 403 });
        }

        // Aktif ilanları çek (sadece gerekli alanlar → hız)
        const jobs = await prisma.jobListing.findMany({
            where: { isActive: true },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
                id: true, title: true, company: true, location: true,
                type: true, salary: true, code: true, deadline: true,
                requirements: true,
                description: true,
            },
        });

        if (jobs.length === 0) {
            return NextResponse.json({
                matches: [],
                message: "Şu anda aktif ilan bulunmuyor.",
                analyzedAt: new Date().toISOString(),
            });
        }

        // İlan özetlerini kısa tut → hız
        const jobSummaries = jobs.map((j, i) => {
            const desc = j.description?.substring(0, 150) || "";
            const reqs = j.requirements?.substring(0, 100) || "Belirtilmemiş";
            const sector = j.type === "PUBLIC" ? "KAMU" : "ÖZEL";
            return `${i + 1}. [ID:${j.id}] "${j.title}" | ${j.company} | ${j.location || "?"} | ${sector} | Gereksinimler: ${reqs} | ${desc}`;
        }).join("\n");

        // CV bilgisi varsa ekle
        let cvInfo = "";
        
        // AI ile oluşturulmuş CV
        const userCv = user.cvs?.[0];
        if (userCv?.data) {
            try {
                const cvParsed = JSON.parse(userCv.data);
                cvInfo = `\n\nCV BİLGİLERİ (kullanıcının yapay zeka ile oluşturduğu CV):\n${JSON.stringify(cvParsed).substring(0, 800)}`;
            } catch {
                cvInfo = `\n\nCV İÇERİĞİ:\n${userCv.data.substring(0, 800)}`;
            }
            if (userCv.pdfPath) {
                cvInfo += `\n(Kullanıcı ayrıca PDF CV de yüklemiş: ${userCv.title || "CV"})`;
            }
        }
        
        const hasCvData = cvInfo.length > 0;

        const prompt = `Sen bir kariyer eşleştirme uzmanısın. Kullanıcının profil bilgileri ve CV'sine dayanarak, mevcut iş ilanları arasından SADECE gerçekten uygun olanları belirle.

⚠️ ÖNEMLİ KURALLAR:
- Kullanıcının CV'sindeki beceriler, deneyim, eğitim ve mesleki yetkinliklerini PRİORİTE olarak değerlendir
- Kullanıcının şehri, sektörü ve ünvanı ile UYUMLU ilanları tercih et
- ALAKASIZ ilanları DAHİL ETME (matchScore < 50 olan ilanları kesinlikle listeleme)
- Eğer hiçbir ilan kullanıcıya uygun değilse, matches dizisini BOŞ döndür
- Sadece gerçekten uygun olanları göster, sayıyı şişirme

KULLANICI PROFİLİ:
- Ad: ${user.firstName || ""} ${user.lastName || ""}
- Şehir: ${user.city || "Belirtilmemiş"}
- Ünvan: ${user.unvan || "Belirtilmemiş"}
- İstihdam Türü: ${user.istihdamTuru || "Belirtilmemiş"}
- Kurum: ${user.kurum || "Belirtilmemiş"}
- Bakanlık: ${user.bakanlik || "Belirtilmemiş"}${cvInfo}${!hasCvData ? "\n\n⚠️ Kullanıcının CV bilgisi bulunmuyor. Sadece profil bilgilerine göre değerlendir ve eşleşme puanlarını daha düşük tut." : ""}

İLANLAR:
${jobSummaries}

PUANLAMA KRİTERLERİ:
- %80-100: Mükemmel uyum (şehir + sektör + beceri + deneyim hepsi uyuyor)
- %60-79: İyi uyum (çoğu kriter uyuyor)
- %50-59: Kabul edilebilir uyum (temel kriterler uyuyor)
- %50 altı: DAHİL ETME

JSON FORMATI:
{
  "matches": [{"jobId": "ID", "matchScore": 50-100, "reason": "Neden uygun olduğunun kısa açıklaması (1 cümle)"}],
  "summary": "Kullanıcı için genel değerlendirme (CV'ye referans vererek, 1-2 cümle). Eğer uygun ilan yoksa bunu açıkça belirt."
}`;

        const completion = await callWithFailover("OPENAI", async (apiKey) => {
            const client = new OpenAI({ apiKey });
            return client.chat.completions.create({

                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Kariyer eşleştirme uzmanısın. SADECE JSON döndür. Kullanıcının CV ve profil bilgilerine göre GERÇEKTEN uygun ilanları belirle. Uygun ilan yoksa boş matches dizisi döndür." },
                    { role: "user", content: prompt },
                ],
                temperature: 0.3,
                max_tokens: 2048,
                response_format: { type: "json_object" },
            });
        });

        const text = completion.choices[0]?.message?.content || "{}";
        const aiResult = JSON.parse(text);

        // Sonuçları ilan verisiyle zenginleştir
        const jobMap = new Map(jobs.map(j => [j.id, j]));
        const enrichedMatches = (aiResult.matches || [])
            .filter((m: { jobId: string }) => jobMap.has(m.jobId))
            .map((m: { jobId: string; matchScore: number; reason: string }) => {
                const job = jobMap.get(m.jobId)!;
                return {
                    ...m,
                    job: {
                        id: job.id,
                        code: job.code,
                        title: job.title,
                        company: job.company,
                        location: job.location,
                        type: job.type,
                        salary: job.salary,
                        deadline: job.deadline,
                        description: job.description,
                    },
                };
            });

        // Kullanım logu
        await prisma.aIUsageLog.create({
            data: {
                userId: user.id,
                module: "CAREER_MATCH",
                tokenUsed: completion.usage?.total_tokens || 1000,
            },
        });

        const elapsed = Date.now() - startTime;
        console.log(`[AI Match] Tamamlandı: ${enrichedMatches.length} eşleşme, ${elapsed}ms`);

        return NextResponse.json({
            matches: enrichedMatches,
            summary: aiResult.summary || "Analiz tamamlandı.",
            totalJobs: jobs.length,
            analyzedAt: new Date().toISOString(),
            elapsedMs: elapsed,
        });
    } catch (error) {
        console.error("Career AI Match error:", error);
        return NextResponse.json({ error: "AI eşleştirme başarısız oldu" }, { status: 500 });
    }
}
