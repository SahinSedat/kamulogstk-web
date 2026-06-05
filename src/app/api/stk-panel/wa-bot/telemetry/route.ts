import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER")
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [contractCount, receiptCount, totalLogCount, faqCount, logs, orgCredits] = await Promise.all([
      // Son 30 gün WhatsApp'tan gelen başvurular
      prisma.sTKApplication.count({
        where: { stkId: stk.id, registrationSource: "WHATSAPP", createdAt: { gte: thirtyDaysAgo } },
      }),
      // Son 30 gün yakalanan dekontlar
      prisma.sTKFinanceRecord.count({
        where: { stkId: stk.id, description: { contains: "WhatsApp" }, createdAt: { gte: thirtyDaysAgo } },
      }),
      // Toplam bot işlemi
      prisma.sTKBotLog.count({ where: { stkId: stk.id } }),
      // SSS yanıtları
      prisma.sTKBotLog.count({ where: { stkId: stk.id, action: "FAQ_ANSWERED" } }),
      // Son 50 log
      prisma.sTKBotLog.findMany({
        where: { stkId: stk.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, action: true, details: true, createdAt: true },
      }),
      // Kalan kredi
      prisma.sTKOrganization.findUnique({ where: { id: stk.id }, select: { whatsappCredits: true } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        stats: { contractCount, receiptCount, totalLogCount, faqCount, remainingCredits: orgCredits?.whatsappCredits ?? 0 },
        logs,
      },
    });
  } catch (e) {
    console.error("[Telemetry GET]:", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
