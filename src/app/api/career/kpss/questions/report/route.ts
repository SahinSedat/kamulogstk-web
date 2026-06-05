import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Mobil kullanıcı çözümleme — Authorization: Bearer <userId> header'ından
 */
async function resolveUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth) {
    const parts = auth.split(" ");
    const token = parts.length === 2 ? parts[1] : auth;
    if (token && token.length > 5) {
      return prisma.user.findUnique({
        where: { id: token },
        select: { id: true, name: true },
      });
    }
  }
  const phone = req.headers.get("x-user-phone");
  if (phone) {
    return prisma.user.findFirst({
      where: { OR: [{ phone }, { phoneNumber: phone }] },
      select: { id: true, name: true },
    });
  }
  return null;
}

/**
 * POST /api/career/kpss/questions/report
 * Kullanıcının bir KPSS sorusunu şikayet etmesi (yanlış cevap bildirimi)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
    }

    const body = await req.json();
    const { questionId, suggestedAnswer, message, reportType } = body;

    if (!questionId) {
      return NextResponse.json({ error: "Soru ID'si gerekli." }, { status: 400 });
    }

    // Soru var mı kontrol et
    const question = await (prisma as any).kpssQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      return NextResponse.json({ error: "Soru bulunamadı." }, { status: 404 });
    }

    // Aynı kullanıcı aynı soruyu zaten şikayet etmiş mi
    const existing = await (prisma as any).kpssQuestionReport.findFirst({
      where: {
        questionId,
        userId: user.id,
        status: { in: ["PENDING", "REVIEWED"] },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu soruyu zaten şikayet ettiniz. Değerlendirme bekliyor." }, { status: 409 });
    }

    // Şikayet oluştur
    const report = await (prisma as any).kpssQuestionReport.create({
      data: {
        questionId,
        userId: user.id,
        userName: user.name || null,
        reportType: reportType || "WRONG_ANSWER",
        suggestedAnswer: suggestedAnswer || null,
        message: message || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Şikayetiniz alındı. Yönetici değerlendirmesinden sonra bilgilendirileceksiniz.",
      reportId: report.id,
    });
  } catch (error) {
    console.error("KPSS report error:", error);
    return NextResponse.json({ error: "Şikayet gönderilemedi." }, { status: 500 });
  }
}
