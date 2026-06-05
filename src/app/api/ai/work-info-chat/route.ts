import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { callWithFailover } from "@/lib/ai/keyProvider";

/**
 * POST /api/ai/work-info-chat
 * KamulogAI Çalışma Bilgileri Asistanı — Çok turlu sohbet.
 *
 * Body: { messages: [{ role: 'user'|'assistant', content: string }] }
 * Yanıt: { message: string, done: boolean, workInfo?: {...} }
 */


const SYSTEM_PROMPT = `Sen KamulogAI Çalışma Bilgileri Asistanısın. Kamu personelinin çalışma bilgilerini sohbet yoluyla topluyorsun. Türkçe konuş, samimi ama resmi ol.

GÖREV: Aşağıdaki 6 bilgiyi sırayla, birer birer sor. Her turda SADECE bir soru sor. Kullanıcının cevabını al ve bir sonraki soruyu sor.

Toplanacak bilgiler (sırasıyla):
1. employmentType — Çalışma/İstihdam türü: "memur", "isci", "sozlesmeli", "ozel_sektor" veya "is_arayan"
2. ministry — Bağlı olduğu bakanlık (örn: "Milli Eğitim Bakanlığı", "Sağlık Bakanlığı"). Bakanlık çalışanı değilse "Yok" yaz.
3. institutionName — Çalıştığı kurum/kuruluş adı (örn: "Ankara Şehir Hastanesi", "Kayseri Büyükşehir Belediyesi")
4. hizmetSinifi — Hizmet sınıfı kısaltması: GİH, THS, SHS, YHS, AHS, EÖH, DHS, MUSH veya "Yok"
5. unvan — Kadro/ünvan bilgisi (örn: "Güvenlik Görevlisi", "Hemşire", "Memur", "Mühendis")
6. atamaYontemi — Atama yöntemi: "merkezi", "mahalli", "696khk", "iskur" veya "diger"

KURALLAR:
- İlk mesajda kendini kısaca tanıt ve ilk soruyu sor.
- Her mesajda SADECE BİR soru sor.
- Kullanıcının cevabını anla ve doğru değere dönüştür.
- Eğer kullanıcı belirsiz cevap verirse nazikçe tekrar sor.
- 6 bilgiyi de topladıktan sonra, son mesajda tüm bilgileri özetle VE mesajın sonuna aşağıdaki JSON bloğunu ekle:

Son mesaj formatı:
1. Önce bilgilerin özetini yaz.
2. Sonra şu satırı ekle: ---WORK_INFO_JSON---
3. Ardından JSON'u yaz:
{"done":true,"employmentType":"...","ministry":"...","institutionName":"...","hizmetSinifi":"...","unvan":"...","atamaYontemi":"..."}

ÖNEMLİ: JSON'u SADECE 6 bilgi de toplandığında ekle. Ara mesajlarda JSON ekleme.`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const messages: { role: string; content: string }[] = body.messages || [];

        if (!messages.length) {
            return NextResponse.json(
                { error: "Mesaj gereklidir." },
                { status: 400 }
            );
        }

        // Auth header'dan userId al (opsiyonel)
        let userId: string | null = null;
        const auth = req.headers.get("authorization");
        if (auth) {
            const token = auth.split(" ").pop();
            if (token) {
                const user = await prisma.user.findUnique({ where: { id: token }, select: { id: true } });
                if (user) userId = user.id;
            }
        }

        // OpenAI
        let aiText = "";

        try {
            const response = await callWithFailover("OPENAI", async (apiKey) => {
                const client = new OpenAI({ apiKey });
                return client.chat.completions.create({

                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        ...messages.map((m) => ({
                            role: m.role as "user" | "assistant",
                            content: m.content,
                        })),
                    ],
                    temperature: 0.7,
                    max_tokens: 1024,
                });
            });
            aiText = response.choices[0]?.message?.content || "";
        } catch (openaiError) {
            console.error("[work-info-chat] OpenAI başarısız:", openaiError);
            return NextResponse.json(
                { error: "AI asistan şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin." },
                { status: 503 }
            );
        }

        // JSON parse kontrolü — sohbet bitmiş mi?
        let done = false;
        let workInfo: Record<string, string> | null = null;
        let displayMessage = aiText;

        const jsonMarker = "---WORK_INFO_JSON---";
        const markerIndex = aiText.indexOf(jsonMarker);

        if (markerIndex !== -1) {
            displayMessage = aiText.substring(0, markerIndex).trim();
            const jsonPart = aiText.substring(markerIndex + jsonMarker.length).trim();

            try {
                // JSON'u çıkart (bazen markdown code block içinde olabilir)
                const cleanJson = jsonPart.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
                const parsed = JSON.parse(cleanJson);

                if (parsed.done === true) {
                    done = true;
                    workInfo = {
                        employmentType: parsed.employmentType || "",
                        ministry: parsed.ministry || "",
                        institutionName: parsed.institutionName || "",
                        hizmetSinifi: parsed.hizmetSinifi || "",
                        unvan: parsed.unvan || "",
                        atamaYontemi: parsed.atamaYontemi || "",
                    };
                }
            } catch {
                // JSON parse hatası — sohbet devam eder
                console.warn("[work-info-chat] JSON parse hatası:", jsonPart);
            }
        }

        // AI kullanım logu
        if (userId) {
            await prisma.aIUsageLog.create({
                data: {
                    userId,
                    module: "WORK_INFO_CHAT",
                    tokenUsed: null,
                },
            }).catch(() => { /* log hatası sessiz */ });
        }

        return NextResponse.json({
            message: displayMessage,
            done,
            workInfo,
        });
    } catch (error) {
        console.error("[work-info-chat] Hata:", error);
        return NextResponse.json(
            { error: "Sohbet sırasında bir hata oluştu." },
            { status: 500 }
        );
    }
}
