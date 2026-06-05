import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { callWithFailover } from "@/lib/ai/keyProvider";

/**
 * POST /api/career/cv-builder/extract-json
 * Sohbet geçmişinden yapılandırılmış CV JSON'u çıkarır.
 */


const EXTRACT_PROMPT = `Aşağıdaki sohbet geçmişinden kullanıcının CV bilgilerini çıkar.

KESİNLİKLE sadece şu formatta geçerli bir JSON dön (başka hiçbir şey yazma):

{
  "fullName": "Ad Soyad",
  "email": "email@örnek.com",
  "phone": "+90 5XX XXX XX XX",
  "address": "Şehir, İlçe",
  "title": "Mesleki Unvan (Örn: Yazılım Mühendisi)",
  "summary": "2-3 cümlelik profesyonel özet",
  "education": [
    { "school": "Üniversite Adı", "degree": "Bölüm/Fakülte", "year": "Mezuniyet Yılı" }
  ],
  "experience": [
    { "company": "Şirket/Kurum Adı", "role": "Pozisyon", "duration": "Tarih Aralığı", "description": "Görev açıklaması" }
  ],
  "skills": ["Yetenek 1", "Yetenek 2"],
  "certificates": [
    { "name": "Sertifika Adı", "issuer": "Kurum", "year": "Yıl" }
  ],
  "languages": [
    { "language": "Dil", "level": "Seviye" }
  ]
}

Eğer eksik bilgi varsa ilgili alanı boş string veya boş array olarak bırak. Asla null döndürme.

SOHBET GEÇMİŞİ:
`;

async function resolveUser(req: NextRequest) {
    const auth = req.headers.get("authorization");
    if (auth) {
        const token = auth.split(" ").pop();
        if (token && token.length > 5) {
            return prisma.user.findFirst({
                where: { id: token },
                select: { id: true, isCareerPremium: true, isPremium: true },
            });
        }
    }
    return null;
}

export async function POST(req: NextRequest) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json({ error: "Yetkilendirme gerekli." }, { status: 401 });
        }
        if (!user.isCareerPremium && !user.isPremium) {
            return NextResponse.json({ error: "Kariyer Premium üyelik gerekli." }, { status: 403 });
        }

        const body = await req.json();
        const messages: { role: string; content: string }[] = body.messages || [];

        if (!messages.length) {
            return NextResponse.json({ error: "Mesaj geçmişi gerekli." }, { status: 400 });
        }

        // Sohbet geçmişini metin haline getir
        const chatText = messages
            .map((m) => `${m.role === "user" ? "Kullanıcı" : "Asistan"}: ${m.content}`)
            .join("\n\n");

        const completion = await callWithFailover("OPENAI", async (apiKey) => {
            const client = new OpenAI({ apiKey });
            return client.chat.completions.create({

                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "SADECE JSON formatında yanıt ver. Başka hiçbir şey ekleme." },
                    { role: "user", content: EXTRACT_PROMPT + chatText },
                ],
                response_format: { type: "json_object" },
                temperature: 0.3,
                max_tokens: 2048,
            });
        });

        const text = completion.choices[0]?.message?.content || "{}";

        let cvData;
        try {
            cvData = JSON.parse(text);
        } catch {
            // JSON parse fail — regex ile dene
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cvData = JSON.parse(jsonMatch[0]);
            } else {
                return NextResponse.json({ error: "CV verisi çıkarılamadı.", raw: text }, { status: 422 });
            }
        }

        // Zorunlu alan kontrolü
        const defaults = {
            fullName: "",
            email: "",
            phone: "",
            address: "",
            title: "",
            summary: "",
            education: [],
            experience: [],
            skills: [],
            certificates: [],
            languages: [],
        };

        const merged = { ...defaults, ...cvData };

        // Log usage
        await prisma.aIUsageLog.create({
            data: {
                userId: user.id,
                module: "CAREER_CV_EXTRACT",
                tokenUsed: completion.usage?.total_tokens || text.length,
            },
        });

        return NextResponse.json({ success: true, cvData: merged });
    } catch (error: unknown) {
        console.error("[CV Extract] Hata:", error);
        return NextResponse.json(
            { error: "CV verisi çıkarılamadı", detail: error instanceof Error ? error.message : "Bilinmeyen hata" },
            { status: 500 }
        );
    }
}
