import { createAdminNotification } from "@/lib/services/adminNotificationService";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/public/forum/report
 * Forum konusu veya yorumu şikayet et
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topicId, postId, reporterId, reason } = body;

    if (!reporterId || !reason || (!topicId && !postId)) {
      return NextResponse.json(
        { error: "topicId veya postId, reporterId ve reason zorunludur." },
        { status: 400 }
      );
    }

    // Aynı kişi aynı konuyu tekrar şikayet edemez
    const existing = await prisma.forumReport.findFirst({
      where: { topicId: topicId || undefined, reporterId },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu içeriği zaten şikayet ettiniz." }, { status: 409 });
    }

    const report = await prisma.forumReport.create({
      data: {
        topicId: topicId || undefined,
        reporterId,
        reason,
        status: "PENDING",
      },
    });

    return NextResponse.json(
      { success: true, message: "Şikayetiniz moderatörlere iletildi.", data: { id: report.id } },
      { status: 201 }
    );
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Hata" }, { status: 500 });
  }
}
