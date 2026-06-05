import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * KPSS Toplu Soru Yükleme (Bulk Insert) API
 * POST /api/admin/career/kpss/bulk-insert
 *
 * Sadece ADMIN yetkili kullanıcılar kullanabilir.
 * Body: { "questions": [ { category, subject, questionText, options, correctAnswer, explanation? } ] }
 */

export async function POST(req: NextRequest) {
    // ── Admin yetki kontrolü
    const session = await getServerSession(authOptions);
    const role = (session?.user as unknown as { role?: string })?.role;
    if (role !== "ADMIN") {
        return NextResponse.json(
            { error: "Bu işlem yalnızca Admin yetkisiyle yapılabilir." },
            { status: 403 }
        );
    }

    try {
        const body = await req.json();
        const questions = body.questions;

        if (!Array.isArray(questions) || questions.length === 0) {
            return NextResponse.json(
                { error: "questions dizisi boş veya geçersiz." },
                { status: 400 }
            );
        }

        // ── Validasyon
        const validCategories = ["Ortaöğretim", "Önlisans", "Lisans"];
        const validAnswers = ["A", "B", "C", "D", "E"];
        const errors: string[] = [];

        const validatedQuestions = questions.map((q: Record<string, unknown>, idx: number) => {
            // Zorunlu alan kontrolü
            if (!q.category || !q.subject || !q.questionText || !q.options || !q.correctAnswer) {
                errors.push(`Soru ${idx + 1}: Zorunlu alan eksik (category, subject, questionText, options, correctAnswer)`);
                return null;
            }

            // Kategori kontrolü
            if (!validCategories.includes(q.category as string)) {
                errors.push(`Soru ${idx + 1}: Geçersiz kategori "${q.category}". Geçerli: ${validCategories.join(", ")}`);
                return null;
            }

            // Doğru cevap kontrolü
            if (!validAnswers.includes(q.correctAnswer as string)) {
                errors.push(`Soru ${idx + 1}: Geçersiz doğru cevap "${q.correctAnswer}". Geçerli: A, B, C, D, E`);
                return null;
            }

            // Options format kontrolü
            const opts = q.options as Record<string, string>;
            if (typeof opts !== "object" || !opts.A || !opts.B || !opts.C || !opts.D) {
                errors.push(`Soru ${idx + 1}: Şıklar (options) eksik veya geçersiz. En az A, B, C, D olmalı.`);
                return null;
            }

            return {
                category: q.category as string,
                subject: (q.subject as string).trim(),
                questionText: (q.questionText as string).trim(),
                options: q.options,
                correctAnswer: q.correctAnswer as string,
                explanation: (q.explanation as string) || null,
                difficulty: typeof q.difficulty === "number" ? q.difficulty : 1,
                isActive: true,
            };
        });

        // Hata varsa döndür
        if (errors.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Validasyon hataları bulundu.",
                    errors: errors.slice(0, 20), // İlk 20 hatayı göster
                    totalErrors: errors.length,
                },
                { status: 400 }
            );
        }

        // Null filtreleme
        const cleanQuestions = validatedQuestions.filter(Boolean) as Prisma.KpssQuestionCreateManyInput[];

        // ── Toplu ekleme (createMany)
        const result = await prisma.kpssQuestion.createMany({
            data: cleanQuestions,
            skipDuplicates: true,
        });

        // ── Toplam soru sayısı (istatistik)
        const totalByCategory = await prisma.kpssQuestion.groupBy({
            by: ["category"],
            _count: { id: true },
        });

        const stats = totalByCategory.reduce((acc, item) => {
            acc[item.category] = item._count.id;
            return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({
            success: true,
            insertedCount: result.count,
            totalQuestionsInDb: stats,
            message: `${result.count} soru başarıyla eklendi.`,
        });
    } catch (error) {
        console.error("KPSS Bulk Insert error:", error);
        return NextResponse.json(
            { error: "Toplu soru ekleme işlemi başarısız.", detail: String(error) },
            { status: 500 }
        );
    }
}
