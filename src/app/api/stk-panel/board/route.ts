import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// GET /api/stk-panel/board — Yönetim kurulu üyelerini getir
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const members = await prisma.sTKBoardMember.findMany({
      where: { stkId: stk.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    console.error("[STK Board GET]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST /api/stk-panel/board — Yeni kurul üyesi ekle
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
    const { name, title, phone, email, tcKimlik } = body;

    if (!name || !title) {
      return NextResponse.json({ error: "Ad ve Unvan zorunludur" }, { status: 400 });
    }

    const member = await prisma.sTKBoardMember.create({
      data: {
        id: `brd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        stkId: stk.id,
        name,
        title,
        phone: phone || null,
        email: email || null,
        tcKimlik: tcKimlik || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (error) {
    console.error("[STK Board POST]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE /api/stk-panel/board?id=xxx — Kurul üyesi sil
export async function DELETE(request: NextRequest) {
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

    await prisma.sTKBoardMember.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: 1 });
  } catch (error) {
    console.error("[STK Board DELETE]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// PATCH /api/stk-panel/board?id=xxx — Kurul üyesi düzenle
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
    if (body.name) updateData.name = body.name;
    if (body.title) updateData.title = body.title;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.email !== undefined) updateData.email = body.email || null;

    const updated = await prisma.sTKBoardMember.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[STK Board PATCH]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
