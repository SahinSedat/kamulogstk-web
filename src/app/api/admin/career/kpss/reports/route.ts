import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR";
}

/**
 * GET /api/admin/career/kpss/reports
 * Tüm şikayetleri listele (filtreleme: status, page)
 */
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;

  try {
    const [reports, totalCount, pendingCount, acceptedCount, rejectedCount] = await Promise.all([
      (prisma as any).kpssQuestionReport.findMany({
        where,
        include: {
          question: {
            select: {
              id: true,
              category: true,
              subject: true,
              questionText: true,
              options: true,
              correctAnswer: true,
              explanation: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      (prisma as any).kpssQuestionReport.count({ where }),
      (prisma as any).kpssQuestionReport.count({ where: { status: "PENDING" } }),
      (prisma as any).kpssQuestionReport.count({ where: { status: "ACCEPTED" } }),
      (prisma as any).kpssQuestionReport.count({ where: { status: "REJECTED" } }),
    ]);

    return NextResponse.json({
      reports,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      stats: {
        pending: pendingCount,
        accepted: acceptedCount,
        rejected: rejectedCount,
        total: pendingCount + acceptedCount + rejectedCount,
      },
    });
  } catch (error) {
    console.error("KPSS reports GET:", error);
    return NextResponse.json({ error: "Şikayetler yüklenemedi" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/career/kpss/reports?id=xxx
 * Şikayet durumunu güncelle (ACCEPTED/REJECTED) + opsiyonel: doğru cevabı düzelt
 */
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id parametresi gerekli" }, { status: 400 });

  try {
    const body = await req.json();
    const { status, adminNote, fixCorrectAnswer, fixQuestionText, fixOptions, fixExplanation } = body;

    // Şikayeti güncelle
    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      updateData.reviewedAt = new Date();
    }
    if (adminNote !== undefined) updateData.adminNote = adminNote;

    const report = await (prisma as any).kpssQuestionReport.update({
      where: { id },
      data: updateData,
      include: { question: true },
    });

    // Eğer ACCEPTED ise ve düzeltme varsa, soruyu da güncelle
    if (status === "ACCEPTED" && report.questionId) {
      const questionUpdate: Record<string, unknown> = {};

      if (fixCorrectAnswer) questionUpdate.correctAnswer = fixCorrectAnswer;
      if (fixQuestionText) questionUpdate.questionText = fixQuestionText;
      if (fixOptions) questionUpdate.options = fixOptions;
      if (fixExplanation !== undefined) questionUpdate.explanation = fixExplanation;

      // Önerilen cevap varsa ve admin düzeltme belirtmediyse, önerilen cevabı kullan
      if (!fixCorrectAnswer && report.suggestedAnswer) {
        questionUpdate.correctAnswer = report.suggestedAnswer;
      }

      if (Object.keys(questionUpdate).length > 0) {
        await (prisma as any).kpssQuestion.update({
          where: { id: report.questionId },
          data: questionUpdate,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: status === "ACCEPTED"
        ? "Şikayet kabul edildi ve soru güncellendi."
        : "Şikayet değerlendirildi.",
      report,
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Şikayet bulunamadı." }, { status: 404 });
    }
    console.error("KPSS report PATCH:", error);
    return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 500 });
  }
}
