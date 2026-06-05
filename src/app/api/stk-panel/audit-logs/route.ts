import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/stk-panel/audit-logs — Adli bilişim loglarını getir
 * STK yöneticisi kendi STK'sına ait tüm logları görebilir
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
    const action = request.nextUrl.searchParams.get("action"); // Filter by action type

    const where: any = { stkId: stk.id };
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.sTKAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { name: true, email: true, firstName: true, lastName: true } },
        },
      }),
      prisma.sTKAuditLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[STK Audit Logs GET]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
