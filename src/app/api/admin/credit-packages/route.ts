import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * GET  /api/admin/credit-packages — Tüm jeton paketlerini listele
 * POST /api/admin/credit-packages — Yeni paket oluştur
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const packages = await prisma.creditPackage.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ packages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, jetons, price, isPopular, isActive, sortOrder, description, appleProductId, googleProductId } = await req.json();

    if (!name || !jetons || !price) {
      return NextResponse.json({ error: "name, jetons ve price zorunludur" }, { status: 400 });
    }

    const pkg = await prisma.creditPackage.create({
      data: {
        name,
        jetons: Number(jetons),
        price: Number(price),
        isPopular: isPopular ?? false,
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
        description: description || null,
        appleProductId: appleProductId || null,
        googleProductId: googleProductId || null,
      },
    });

    return NextResponse.json({ success: true, package: pkg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
