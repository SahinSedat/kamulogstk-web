import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/stk/[slug]/activities
 *
 * Mobil uygulama (Flutter) için STK faaliyetleri endpoint'i.
 * Admin panelindeki "STK Faaliyet Yönetimi" (/stk-activities) ile eklenen
 * faaliyetleri, STKActivity tablosundan çekerek mobil uygulamanın
 * beklediği JSON formatında döndürür.
 *
 * Flutter beklenen JSON:
 * { success: true, activities: [{ title, content, imageUrl, createdAt }] }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // ── STK'yı bul ──────────────────────────────────────
    const stk = await prisma.sTKOrganization.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (!stk || stk.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "STK bulunamadı." },
        { status: 404 }
      );
    }

    // ── Faaliyetleri çek (STKActivity tablosu) ──────────
    const activities = await prisma.sTKActivity.findMany({
      where: {
        stkId: stk.id,
        isPublished: true,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    // ── Flutter'ın beklediği format ─────────────────────
    // imageUrl'leri tam URL'ye çevir (relative -> absolute)
    const baseUrl = process.env.NEXTAUTH_URL || "https://kamulog.net";
    const mappedActivities = activities.map((a) => ({
      ...a,
      imageUrl: a.imageUrl
        ? a.imageUrl.startsWith("http") ? a.imageUrl : `${baseUrl}${a.imageUrl}`
        : null,
    }));

    return NextResponse.json({
      success: true,
      activities: mappedActivities,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error("[STK Activities API]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
