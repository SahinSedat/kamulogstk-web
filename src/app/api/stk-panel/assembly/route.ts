import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// GET /api/stk-panel/assembly — Genel kurul kayıtlarını getir
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const assemblies = await prisma.sTKGeneralAssembly.findMany({
      where: { stkId: stk.id },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, data: assemblies });
  } catch (error) {
    console.error("[STK Assembly GET]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST /api/stk-panel/assembly — Yeni genel kurul planla
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const body = await request.json();
    const { assemblyType, assemblyNumber, date, location, quorum } = body;

    if (!assemblyType || !assemblyNumber || !date || !location) {
      return NextResponse.json({ error: "Tür, Numara, Tarih ve Yer zorunludur" }, { status: 400 });
    }

    // Aynı numara var mı
    const existing = await prisma.sTKGeneralAssembly.findUnique({
      where: { stkId_assemblyNumber: { stkId: stk.id, assemblyNumber: Number(assemblyNumber) } },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu genel kurul numarası zaten mevcut" }, { status: 409 });
    }

    const assembly = await prisma.sTKGeneralAssembly.create({
      data: {
        id: `asm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        stkId: stk.id,
        assemblyType: assemblyType as "OLAGAN" | "OLAGANUSTU",
        assemblyNumber: Number(assemblyNumber),
        date: new Date(date),
        location,
        quorum: Number(quorum) || 0,
        status: "PLANNED",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: assembly }, { status: 201 });
  } catch (error) {
    console.error("[STK Assembly POST]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE /api/stk-panel/assembly — Genel kurul sil
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
      await prisma.sTKGeneralAssembly.delete({ where: { id: singleId } });
      return NextResponse.json({ success: true, deleted: 1 });
    }

    const body = await request.json();
    const { ids } = body;
    if (!ids || !Array.isArray(ids)) return NextResponse.json({ error: "ids gerekli" }, { status: 400 });

    const result = await prisma.sTKGeneralAssembly.deleteMany({ where: { id: { in: ids }, stkId: stk.id } });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error) {
    console.error("[STK Assembly DELETE]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// PATCH /api/stk-panel/assembly — Genel kurul düzenle
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

    const body = await request.json();
    const updateData: any = { updatedAt: new Date() };
    if (body.assemblyType) updateData.assemblyType = body.assemblyType;
    if (body.date) updateData.date = new Date(body.date);
    if (body.location) updateData.location = body.location;
    if (body.quorum !== undefined) updateData.quorum = Number(body.quorum);
    if (body.status) updateData.status = body.status;

    const updated = await prisma.sTKGeneralAssembly.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[STK Assembly PATCH]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
