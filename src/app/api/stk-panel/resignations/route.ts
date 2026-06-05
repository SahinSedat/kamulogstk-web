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

    const resignations = await prisma.sTKResignation.findMany({
      where: { stkId: stk.id },
      orderBy: { createdAt: "desc" },
      include: { Member: { select: { name: true, surname: true, email: true, phone: true } } },
    });

    return NextResponse.json({ success: true, data: resignations });
  } catch (error) {
    console.error("[STK Resignations GET]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const { resignationId, action } = await request.json();
    if (!resignationId || !action) return NextResponse.json({ error: "ID ve işlem zorunludur" }, { status: 400 });

    const resignation = await prisma.sTKResignation.findFirst({ where: { id: resignationId, stkId: stk.id } });
    if (!resignation) return NextResponse.json({ error: "İstifa kaydı bulunamadı" }, { status: 404 });

    if (action === "APPROVE") {
      await prisma.sTKResignation.update({ where: { id: resignationId }, data: { status: "APPROVED" } });
      await prisma.member.update({ where: { id: resignation.memberId }, data: { status: "RESIGNED", leaveDate: new Date(), leaveReason: resignation.reason || "İstifa" } });
      await prisma.sTKOrganization.update({ where: { id: stk.id }, data: { memberCount: { decrement: 1 } } });
    } else {
      await prisma.sTKResignation.update({ where: { id: resignationId }, data: { status: "REJECTED" } });
    }

    return NextResponse.json({ success: true, message: action === "APPROVE" ? "İstifa onaylandı" : "İstifa reddedildi" });
  } catch (error) {
    console.error("[STK Resignations PATCH]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
