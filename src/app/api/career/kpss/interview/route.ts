import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { callWithFailover } from "@/lib/ai/keyProvider";


const INTERVIEW_QUESTIONS = [
    "Anayasa Mahkemesinin görevlerini kısaca açıklayınız.",
    "Devlet memurluğuna girmek için gerekli genel şartları sayınız.",
    "Kuvvetler ayrılığı ilkesini açıklayarak Türkiye'deki uygulamasını değerlendiriniz.",
    "Cumhurbaşkanlığı hükümet sistemi ile parlamenter sistem arasındaki temel farkları belirtiniz.",
    "Laiklik ilkesinin Türkiye Cumhuriyeti için önemini açıklayınız.",
    "657 sayılı Devlet Memurları Kanunu'nun temel ilkelerini sayınız.",
    "Kamu hizmetlerinde verimlilik nasıl artırılabilir? Önerilerinizi belirtiniz.",
    "Sosyal devlet anlayışını açıklayarak günümüz Türkiye'sindeki uygulamalarına örnek veriniz.",
    "Temel hak ve özgürlüklerin sınırlandırılma koşullarını açıklayınız.",
    "Devlet memurlarının uyması gereken etik ilkeleri nelerdir?",
    "Yerel yönetimler ile merkezi yönetim arasındaki görev paylaşımını açıklayınız.",
    "İdarenin yargısal denetiminin önemini ve işleyişini açıklayınız.",
    "Atatürk İlke ve İnkılaplarından Halkçılık ilkesini açıklayınız.",
    "Türkiye'nin Avrupa Birliği üyelik sürecini değerlendiriniz.",
    "Kamu yönetiminde şeffaflık ve hesap verebilirlik kavramlarını açıklayınız.",
];

async function resolveUser(req: NextRequest) {
    const auth = req.headers.get("authorization");
    if (!auth) return null;
    const parts = auth.split(" ");
    const token = parts.length === 2 ? parts[1] : auth;
    return token && token.length > 5 ? { id: token } : null;
}

export async function POST(req: NextRequest) {
    try {
        const user = await resolveUser(req);
        if (!user) return NextResponse.json({ error: "Yetkilendirme gerekli." }, { status: 401 });

        const body = await req.json();
        const { question, answer } = body;

        // Yeni soru iste
        if (!answer) {
            const randomQ = INTERVIEW_QUESTIONS[Math.floor(Math.random() * INTERVIEW_QUESTIONS.length)];
            return NextResponse.json({ question: randomQ });
        }

        // Cevabı değerlendir
        if (!question || !answer) {
            return NextResponse.json({ error: "Soru ve cevap gerekli" }, { status: 400 });
        }

        const prompt = `Sen zorlu bir devlet memurluğu mülakat komisyonu üyesisin. Kullanıcının KPSS mülakatındaki cevabını değerlendiriyorsun.

Soru: "${question}"
Kullanıcının Cevabı: "${answer}"

Bu cevabı 100 üzerinden puanla (Çok katı olma ama gerçekçi ol). Eksiklerini söyle ve düzeltilmesi gereken yerleri 2-3 cümleyle profesyonelce belirt.

Ayrıca ideal cevabın kısa bir özetini ver.

JSON formatında yanıt ver:
{
  "score": <0-100 arası puan>,
  "feedback": "<2-3 cümle değerlendirme>",
  "strengths": "<Güçlü yönler - 1-2 cümle>",
  "improvements": "<Geliştirilecek yönler - 1-2 cümle>",
  "idealAnswer": "<İdeal cevabın kısa özeti - 2-3 cümle>"
}`;

        const completion = await callWithFailover("OPENAI", async (apiKey) => {
            const client = new OpenAI({ apiKey });
            return client.chat.completions.create({

                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "SADECE JSON formatında yanıt ver." },
                    { role: "user", content: prompt },
                ],
                response_format: { type: "json_object" },
                temperature: 0.7,
                max_tokens: 1024,
            });
        });

        const text = completion.choices[0]?.message?.content || "{}";

        let evaluation;
        try {
            evaluation = JSON.parse(text);
        } catch {
            evaluation = {
                score: 50,
                feedback: text.slice(0, 300),
                strengths: "Değerlendirme yapılamadı.",
                improvements: "Lütfen tekrar deneyin.",
                idealAnswer: "",
            };
        }

        return NextResponse.json({
            success: true,
            question,
            userAnswer: answer,
            evaluation,
        });
    } catch (error) {
        console.error("KPSS Interview API error:", error);
        return NextResponse.json({ error: "Mülakat değerlendirmesi yapılamadı" }, { status: 500 });
    }
}
