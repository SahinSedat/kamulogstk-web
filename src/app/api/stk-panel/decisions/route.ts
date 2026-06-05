import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// GET /api/stk-panel/decisions — Kararları getir
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;

    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stk = await getManagerSTK(user.id);
    if (!stk) {
      return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });
    }

    const decisions = await prisma.sTKBoardDecision.findMany({
      where: { stkId: stk.id },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, data: decisions });
  } catch (error) {
    console.error("[STK Decisions GET]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST /api/stk-panel/decisions — Yeni karar ekle
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;

    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stk = await getManagerSTK(user.id);
    if (!stk) {
      return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });
    }

    const body = await request.json();
    const { decisionNumber, date, subject, content, status } = body;

    if (!decisionNumber || !date || !subject) {
      return NextResponse.json({ error: "Karar No, Tarih ve Konu zorunludur" }, { status: 400 });
    }

    // Aynı karar numarası var mı kontrol et
    const existing = await prisma.sTKBoardDecision.findUnique({
      where: { stkId_decisionNumber: { stkId: stk.id, decisionNumber } },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu karar numarası zaten mevcut" }, { status: 409 });
    }

    const decision = await prisma.sTKBoardDecision.create({
      data: {
        id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        stkId: stk.id,
        decisionNumber,
        date: new Date(date),
        subject,
        content: content || null,
        status: status === "FINALIZED" ? "FINALIZED" : "DRAFT",
        createdBy: user.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: decision }, { status: 201 });
  } catch (error) {
    console.error("[STK Decisions POST]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE /api/stk-panel/decisions — Karar sil (tekli veya toplu)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const singleId = request.nextUrl.searchParams.get("id");
    if (singleId) {
      await prisma.sTKBoardDecision.delete({ where: { id: singleId } });
      return NextResponse.json({ success: true, deleted: 1 });
    }

    const body = await request.json();
    const { ids } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids dizisi veya id parametresi gerekli" }, { status: 400 });
    }

    const result = await prisma.sTKBoardDecision.deleteMany({
      where: { id: { in: ids }, stkId: stk.id },
    });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error("[STK Decisions DELETE]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
