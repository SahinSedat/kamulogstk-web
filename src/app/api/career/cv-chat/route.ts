import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { callWithFailover } from "@/lib/ai/keyProvider";

/**
 * POST /api/career/cv-chat
 * AI CV Builder — OpenAI ile CV sohbet asistanı.
 * Body: { messages: [{ role, content }], systemContext?: string, stream?: boolean }
 */


const DEFAULT_SYSTEM = `Sen profesyonel bir İnsan Kaynakları ve Kariyer Danışmanısın. Amacın kullanıcının mükemmel bir Özgeçmiş (CV) hazırlamasına yardım etmek.

KRİTİK KURALLAR:
1. Profil bilgileri verilmişse bunları CV'de OLDUĞU GİBİ kullan ve TEKRAR SORMA.
2. Kullanıcıya sırayla, adım adım sorular sor (Eğitim durumu, iş tecrübeleri, yetenekleri). Asla tüm soruları aynı anda sorma.
3. CV dışı konularda "Görevim sadece CV hazırlamaktır." de.
4. Kullanıcı "tamam", "yeter" veya "oluştur" derse CV'yi oluştur.
5. CV hazır olduğunda mesajının EN BAŞINA [CV_HAZIR] etiketini koy.

═══ CV FORMAT TALİMATI ═══
CV'yi aşağıdaki formatta yaz (bölüm başlıkları ■ ile işaretli):

■ KİŞİSEL BİLGİLER
Ad Soyad: ...
Telefon: ...
E-posta: ...
Adres: ...

■ KARİYER HEDEFİ
(2-3 cümle profesyonel hedef özeti)

■ EĞİTİM BİLGİLERİ
• Okul — Bölüm (Yıl)

■ İŞ DENEYİMİ
• Pozisyon — Şirket (Tarih aralığı)
  Görev ve sorumluluklar

■ BECERİLER VE YETKİNLİKLER
• Teknik: ...
• Kişisel: ...

■ SERTİFİKA VE KURSLAR
• Sertifika adı (Kurum, Yıl)

■ YABANCI DİLLER
• Dil — Seviye

■ REFERANSLAR
İstenildiğinde sunulabilir.
═══════════════════════

--- PROFESYONELLİK DEĞERLENDİRMESİ ---
CV'nin altına: 🎯 Güçlü Yönler + 💡 Öneriler + ⭐ Puan X/10
Bu CV KamulogAI Kariyer Asistanı tarafından oluşturulmuştur.`;

async function resolveUser(req: NextRequest) {
    const auth = req.headers.get("authorization");
    if (auth) {
        const token = auth.split(" ").pop();
        if (token && token.length > 5) {
            return prisma.user.findFirst({
                where: { id: token },
                select: { id: true, isPremium: true, isCareerPremium: true, cvApplicationsUsed: true },
            });
        }
    }
    return null;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const messages: { role: string; content: string }[] = body.messages || [];
        const systemContext: string = body.systemContext || "";
        const stream: boolean = body.stream === true;

        if (!messages.length) {
            return NextResponse.json({ error: "Mesaj gereklidir." }, { status: 400 });
        }

        // Auth + Premium check
        const user = await resolveUser(req);
        if (user) {
            if (!user.isCareerPremium && !user.isPremium && user.cvApplicationsUsed > 0) {
                return NextResponse.json(
                    { error: "CV oluşturma hakkınız doldu. Kariyer Premium ile sınırsız CV oluşturabilirsiniz." },
                    { status: 403 }
                );
            }
        }

        // System prompt
        const systemPrompt = systemContext
            ? `${DEFAULT_SYSTEM}\n\n${systemContext}`
            : DEFAULT_SYSTEM;

        // OpenAI mesaj formatı
        const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
            })),
        ];

        // ── STREAMING MODE ──
        if (stream) {
            const completion = await callWithFailover("OPENAI", async (apiKey) => {
                const client = new OpenAI({ apiKey });
                return client.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: openaiMessages,
                    temperature: 0.7,
                    max_tokens: 4096,
                    stream: true,
                });
            });

            const encoder = new TextEncoder();
            const readable = new ReadableStream({
                async start(controller) {
                    try {
                        let fullText = "";
                        for await (const chunk of completion) {
                            const text = chunk.choices[0]?.delta?.content || "";
                            if (text) {
                                fullText += text;
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                            }
                        }
                        // Son sinyal
                        controller.enqueue(
                            encoder.encode(
                                `data: ${JSON.stringify({ done: true, full: fullText, isCvReady: fullText.includes("[CV_HAZIR]") })}\n\n`
                            )
                        );
                        controller.close();

                        // Log
                        if (user) {
                            await prisma.aIUsageLog.create({
                                data: {
                                    userId: user.id,
                                    module: "CAREER_CV_CHAT",
                                    tokenUsed: fullText.length,
                                },
                            });
                        }
                    } catch (err) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Stream hatası" })}\n\n`));
                        controller.close();
                    }
                },
            });

            return new Response(readable, {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            });
        }

        // ── NON-STREAMING MODE ──
        const completion = await callWithFailover("OPENAI", async (apiKey) => {
            const client = new OpenAI({ apiKey });
            return client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: openaiMessages,
                temperature: 0.7,
                max_tokens: 4096,
            });
        });
        const responseText = completion.choices[0]?.message?.content || "";

        // Log
        if (user) {
            await prisma.aIUsageLog.create({
                data: {
                    userId: user.id,
                    module: "CAREER_CV_CHAT",
                    tokenUsed: completion.usage?.total_tokens || responseText.length,
                },
            });
        }

        return NextResponse.json({
            message: responseText,
            done: responseText.includes("[CV_HAZIR]"),
        });
    } catch (error: unknown) {
        console.error("[CV Chat] Hata:", error);
        return NextResponse.json(
            { error: "Sunucu hatası", detail: error instanceof Error ? error.message : "Bilinmeyen hata" },
            { status: 500 }
        );
    }
}
