import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/notifications/filters
 * Admin paneli için bildirim hedefleme filtrelerini döner.
 * DB'den distinct bakanlık ve istihdamTuru değerlerini çeker.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  try {
    const [bakanliklar, istihdamTurleri] = await Promise.all([
      prisma.user.findMany({
        where: {
          bakanlik: { not: null },
          isActive: true,
          accountDeleted: false,
        },
        select: { bakanlik: true },
        distinct: ["bakanlik"],
        orderBy: { bakanlik: "asc" },
      }),
      prisma.user.findMany({
        where: {
          istihdamTuru: { not: null },
          isActive: true,
          accountDeleted: false,
        },
        select: { istihdamTuru: true },
        distinct: ["istihdamTuru"],
        orderBy: { istihdamTuru: "asc" },
      }),
    ]);

    return NextResponse.json({
      bakanliklar: bakanliklar
        .map((b) => b.bakanlik)
        .filter((b): b is string => !!b && b.trim() !== ""),
      istihdamTurleri: istihdamTurleri
        .map((i) => i.istihdamTuru)
        .filter((i): i is string => !!i && i.trim() !== ""),
    });
  } catch (error) {
    console.error("[notifications/filters] GET Hata:", error);
    return NextResponse.json({ error: "Filtreler alınamadı." }, { status: 500 });
  }
}
