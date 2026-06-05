import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId gerekli" }, { status: 400 });
  await prisma.order.delete({ where: { id: orderId } });
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const { orderIds } = await req.json();
  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return NextResponse.json({ error: "orderIds gerekli" }, { status: 400 });
  }
  const deleted = await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  return NextResponse.json({ success: true, deletedCount: deleted.count });
}
