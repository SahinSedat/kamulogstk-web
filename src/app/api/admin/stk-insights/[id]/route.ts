import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/stk-insights/[id] — Süper Admin Gözetim Raporu
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role: string } | undefined;
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { id } = await params;

    const [stk, members, boardMembers, recentDecisions, assemblies, documents, campaigns, financeRecords] = await Promise.all([
      // STK bilgileri + krediler
      prisma.sTKOrganization.findUnique({
        where: { id },
        select: {
          id: true, name: true, slug: true, type: true, status: true, email: true, phone: true,
          city: true, website: true, description: true, registrationNumber: true, memberCount: true,
          smsCredits: true, whatsappCredits: true, emailCredits: true, pushCredits: true,
          createdAt: true, foundedAt: true,
        },
      }),
      // Üye istatistikleri
      prisma.member.groupBy({
        by: ["registrationSource"],
        where: { stkId: id },
        _count: { id: true },
      }),
      // Yönetim kurulu
      prisma.sTKBoardMember.findMany({
        where: { stkId: id, isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, title: true, phone: true, email: true },
      }),
      // Son 5 karar
      prisma.sTKBoardDecision.findMany({
        where: { stkId: id },
        orderBy: { date: "desc" },
        take: 5,
        select: { id: true, decisionNumber: true, subject: true, date: true, status: true },
      }),
      // Genel kurullar
      prisma.sTKGeneralAssembly.findMany({
        where: { stkId: id },
        orderBy: { date: "desc" },
        take: 3,
        select: { id: true, assemblyType: true, assemblyNumber: true, date: true, status: true, location: true },
      }),
      // Belgeler
      prisma.sTKDocument.findMany({
        where: { stkId: id },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, fileUrl: true, fileType: true, createdAt: true },
      }),
      // Kampanya istatistikleri
      prisma.sTKMessageCampaign.findMany({
        where: { stkId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, title: true, channel: true, targetCount: true, status: true, createdAt: true },
      }),
      // Finans kayıtları
      prisma.sTKFinanceRecord.findMany({
        where: { stkId: id },
        orderBy: { date: "desc" },
        take: 20,
        select: { id: true, type: true, category: true, amount: true, description: true, date: true },
      }),
    ]);

    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

    // Üye kaynak istatistikleri
    const memberStats = {
      total: members.reduce((s, m) => s + m._count.id, 0),
      bySource: Object.fromEntries(members.map(m => [m.registrationSource, m._count.id])),
    };

    // Finans özeti
    const income = financeRecords.filter(r => r.type === "INCOME").reduce((s, r) => s + r.amount, 0);
    const expense = financeRecords.filter(r => r.type === "EXPENSE").reduce((s, r) => s + r.amount, 0);

    // Kampanya özeti
    const campaignStats = {
      total: campaigns.length,
      totalSent: campaigns.reduce((s, c) => s + c.targetCount, 0),
    };

    return NextResponse.json({
      success: true,
      stk,
      memberStats,
      boardMembers,
      recentDecisions,
      assemblies,
      documents,
      campaigns,
      campaignStats,
      financeSummary: { income, expense, balance: income - expense },
      financeRecords,
    });
  } catch (error) {
    console.error("[Admin STK Insights]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
