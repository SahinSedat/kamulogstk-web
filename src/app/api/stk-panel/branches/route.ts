import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const branches = await prisma.sTKBranch.findMany({ where: { stkId: stk.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, data: branches });
  } catch (error) {
    console.error("[STK Branches GET]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const { name, city, district, phone, email, address, managerName, managerPhone, managerEmail, managerRole, managerAvatar, vicePresName, vicePresPhone, vicePresRole, vicePresAvatar } = await request.json();
    if (!name || !city) return NextResponse.json({ error: "Şube adı ve şehir zorunludur" }, { status: 400 });

    const branch = await prisma.sTKBranch.create({
      data: { stkId: stk.id, name, city, district: district||null, phone: phone||null, email: email||null, address: address||null, managerName: managerName||null, managerPhone: managerPhone||null, managerEmail: managerEmail||null, managerRole: managerRole||"Şube Başkanı", managerAvatar: managerAvatar||null, vicePresName: vicePresName||null, vicePresPhone: vicePresPhone||null, vicePresRole: vicePresRole||"Başkan Yardımcısı", vicePresAvatar: vicePresAvatar||null },
    });

    return NextResponse.json({ success: true, data: branch }, { status: 201 });
  } catch (error) {
    console.error("[STK Branches POST]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
    await prisma.sTKBranch.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: 1 });
  } catch (error) {
    console.error("[STK Branches DELETE]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
    const body = await request.json();
    const updated = await prisma.sTKBranch.update({ where: { id }, data: body });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[STK Branches PATCH]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
