import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/stk-details/[id]
// Süper Admin'e o STK'ya ait detaylı özet veri getirir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth kontrolü
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Bu işlem için Admin yetkisi gerekli" }, { status: 403 });
    }

    const { id } = await params;

    // STK verilerini getir
    const stk = await prisma.sTKOrganization.findUnique({
      where: { id },
      include: {
        User: {
          select: { id: true, name: true, email: true, phone: true },
        },
        STKBoardMember: {
          orderBy: { createdAt: "desc" },
        },
        STKBoardDecision: {
          orderBy: { date: "desc" },
          take: 20,
        },
        STKGeneralAssembly: {
          orderBy: { date: "desc" },
          take: 10,
        },
        STKDocument: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!stk) {
      return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });
    }

    // Üye istatistikleri
    const totalApplications = await prisma.sTKApplication.count({
      where: { stkId: id },
    });

    const applicationsBySource = await prisma.sTKApplication.groupBy({
      by: ["registrationSource"],
      where: { stkId: id },
      _count: { id: true },
    });

    const applicationsByStatus = await prisma.sTKApplication.groupBy({
      by: ["membershipStatus"],
      where: { stkId: id },
      _count: { id: true },
    });

    // Karar istatistikleri
    const totalDecisions = stk.STKBoardDecision.length;
    const draftedDecisions = stk.STKBoardDecision.filter((d) => d.status === "DRAFT").length;
    const finalizedDecisions = stk.STKBoardDecision.filter((d) => d.status === "FINALIZED").length;

    // Genel kurul istatistikleri
    const totalAssemblies = stk.STKGeneralAssembly.length;
    const completedAssemblies = stk.STKGeneralAssembly.filter((a) => a.status === "COMPLETED").length;
    const plannedAssemblies = stk.STKGeneralAssembly.filter((a) => a.status === "PLANNED").length;

    // Kaynak kırılımı
    const sourceMap: Record<string, number> = {};
    applicationsBySource.forEach((item) => {
      sourceMap[item.registrationSource] = item._count.id;
    });

    // Durum kırılımı
    const statusMap: Record<string, number> = {};
    applicationsByStatus.forEach((item) => {
      statusMap[item.membershipStatus] = item._count.id;
    });

    return NextResponse.json({
      success: true,
      data: {
        stk: {
          id: stk.id,
          name: stk.name,
          type: stk.type,
          status: stk.status,
          city: stk.city,
          district: stk.district,
          email: stk.email,
          phone: stk.phone,
          website: stk.website,
          memberCount: stk.memberCount,
          registrationNumber: stk.registrationNumber,
          foundedAt: stk.foundedAt,
          createdAt: stk.createdAt,
        },
        manager: stk.User,
        boardMembers: stk.STKBoardMember,
        STKBoardDecision: {
          total: totalDecisions,
          drafted: draftedDecisions,
          finalized: finalizedDecisions,
          recent: stk.STKBoardDecision.slice(0, 5),
        },
        STKGeneralAssembly: {
          total: totalAssemblies,
          completed: completedAssemblies,
          planned: plannedAssemblies,
          recent: stk.STKGeneralAssembly.slice(0, 5),
        },
        memberStats: {
          total: totalApplications,
          bySource: {
            ONLINE: sourceMap["ONLINE"] || 0,
            MOBILE: sourceMap["MOBILE"] || 0,
            MANUAL: sourceMap["MANUAL"] || 0,
          },
          byStatus: {
            PENDING: statusMap["PENDING"] || 0,
            ACTIVE: statusMap["ACTIVE"] || 0,
            RESIGNED: statusMap["RESIGNED"] || 0,
            REJECTED: statusMap["REJECTED"] || 0,
          },
        },
        documents: stk.STKDocument,
      },
    });
  } catch (error) {
    console.error("[STK Details API Error]:", error);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
