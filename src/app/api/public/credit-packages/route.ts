import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/credit-packages — Aktif jeton paketlerini döner (mobil için)
 */
export async function GET() {
  try {
    const packages = await prisma.creditPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        jetons: true,
        price: true,
        isPopular: true,
        description: true,
        appleProductId: true,
        googleProductId: true,
      },
    });

    return NextResponse.json({ packages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
