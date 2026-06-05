import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * PATCH  /api/admin/credit-packages/[id] — Paket güncelle
 * DELETE /api/admin/credit-packages/[id] — Paket sil
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const pkg = await prisma.creditPackage.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.jetons !== undefined && { jetons: Number(body.jetons) }),
        ...(body.price !== undefined && { price: Number(body.price) }),
        ...(body.isPopular !== undefined && { isPopular: body.isPopular }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.sortOrder !== undefined && { sortOrder: Number(body.sortOrder) }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.appleProductId !== undefined && { appleProductId: body.appleProductId || null }),
        ...(body.googleProductId !== undefined && { googleProductId: body.googleProductId || null }),
      },
    });

    return NextResponse.json({ success: true, package: pkg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.creditPackage.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
