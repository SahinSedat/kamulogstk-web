import { NextRequest, NextResponse } from "next/server";
import { getApiKey } from "@/lib/ai/keyProvider";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/admin/career/kpss/pdf-upload
 * PDF dosyasını OpenAI GPT-4o ile parse edip KPSS sorularına dönüştürür.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as unknown as { role?: string })?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Bu işlem yalnızca Admin yetkisiyle yapılabilir." }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const category = (formData.get("category") as string) || "Lisans";

    if (!file) {
      return NextResponse.json({ error: "PDF dosyası yüklenmedi." }, { status: 400 });
    }

    if (!file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "Yalnızca .pdf dosyaları kabul edilir." }, { status: 400 });
    }

    // PDF → base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Dinamik API key (DB-first, .env fallback)
    const apiKey = await getApiKey("OPENAI");
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API anahtarı bulunamadı." }, { status: 500 });
    }

    // OpenAI GPT-4o ile PDF parse
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Sen bir KPSS sınav sorusu ayrıştırıcısısın. Verilen PDF'deki soruları JSON formatında çıkart. Yalnızca geçerli JSON döndür, başka metin ekleme."
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64}`,
                },
              },
              {
                type: "text",
                text: `Bu PDF bir KPSS sınav soruları dokümanıdır. Lütfen her soruyu ayrıştır ve aşağıdaki JSON formatında döndür.

KURALLAR:
- Yalnızca geçerli JSON döndür, başka metin ekleme
- Her soru için 5 şık (A, B, C, D, E) olmalı
- Doğru cevabı bul ve "correctAnswer" alanına yaz
- Konu/ders adını otomatik belirle (Türkçe, Matematik, Tarih, Coğrafya, Vatandaşlık, Güncel Bilgiler vb.)
- Zorluk seviyesini belirle (1=Kolay, 2=Orta, 3=Zor)
- Eğer açıklama/çözüm varsa "explanation" alanına yaz

JSON FORMATI:
{
  "questions": [
    {
      "category": "${category}",
      "subject": "Ders Adı",
      "questionText": "Soru metni...",
      "options": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
      "correctAnswer": "A",
      "explanation": "Açıklama (opsiyonel)",
      "difficulty": 2
    }
  ]
}`,
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 16384,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiRes.ok) {
      const errData = await openaiRes.json().catch(() => ({}));
      console.error("OpenAI API error:", errData);
      return NextResponse.json({ error: "OpenAI API yanıt vermedi. Lütfen tekrar deneyin.", detail: JSON.stringify(errData) }, { status: 502 });
    }

    const openaiData = await openaiRes.json();
    const textContent = openaiData?.choices?.[0]?.message?.content;

    if (!textContent) {
      return NextResponse.json({ error: "OpenAI'dan geçerli yanıt alınamadı." }, { status: 502 });
    }

    // JSON parse
    let parsed;
    try {
      parsed = JSON.parse(textContent);
    } catch {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch {
          return NextResponse.json({ error: "AI yanıtı geçerli JSON değil.", rawResponse: textContent.slice(0, 1000) }, { status: 422 });
        }
      } else {
        return NextResponse.json({ error: "AI yanıtında JSON bulunamadı.", rawResponse: textContent.slice(0, 1000) }, { status: 422 });
      }
    }

    const questions = parsed.questions || parsed;
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "PDF'den soru çıkarılamadı.", rawResponse: textContent.slice(0, 500) }, { status: 422 });
    }

    // Validasyon + DB'ye kaydet
    const validCategories = ["Ortaöğretim", "Önlisans", "Lisans"];
    const validAnswers = ["A", "B", "C", "D", "E"];
    const errors: string[] = [];

    const cleanQuestions = questions
      .map((q: Record<string, unknown>, idx: number) => {
        if (!q.questionText || !q.options || !q.correctAnswer) {
          errors.push(`Soru ${idx + 1}: Zorunlu alan eksik`);
          return null;
        }
        const cat = validCategories.includes(q.category as string) ? (q.category as string) : category;
        const answer = validAnswers.includes(q.correctAnswer as string) ? (q.correctAnswer as string) : "A";
        const opts = q.options as Record<string, string>;
        if (!opts.A || !opts.B || !opts.C || !opts.D) {
          errors.push(`Soru ${idx + 1}: Şıklar eksik`);
          return null;
        }

        return {
          category: cat,
          subject: ((q.subject as string) || "Genel").trim(),
          questionText: (q.questionText as string).trim(),
          options: q.options,
          correctAnswer: answer,
          explanation: (q.explanation as string) || null,
          difficulty: typeof q.difficulty === "number" ? q.difficulty : 2,
          isActive: true,
        };
      })
      .filter(Boolean);

    if (cleanQuestions.length === 0) {
      return NextResponse.json({ error: "Geçerli soru bulunamadı.", errors }, { status: 422 });
    }

    // DB'ye kaydet
    const result = await (prisma as any).kpssQuestion.createMany({
      data: cleanQuestions,
      skipDuplicates: true,
    });

    // İstatistik
    const totalByCategory = await (prisma as any).kpssQuestion.groupBy({
      by: ["category"],
      _count: { id: true },
    });

    const stats = totalByCategory.reduce((acc: Record<string, number>, item: { category: string; _count: { id: number } }) => {
      acc[item.category] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      insertedCount: result.count,
      totalExtracted: questions.length,
      totalQuestionsInDb: stats,
      errors: errors.length > 0 ? errors : undefined,
      message: `PDF'den ${questions.length} soru çıkarıldı, ${result.count} tanesi başarıyla eklendi.`,
    });
  } catch (error) {
    console.error("PDF upload error:", error);
    return NextResponse.json({ error: "PDF yükleme işlemi başarısız.", detail: String(error) }, { status: 500 });
  }
}
