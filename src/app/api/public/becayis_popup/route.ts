import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/becayis_popup
 * Becayiş sayfasına özel pop-up bilgisini döndürür.
 * SystemSetting tablosundan BECAYIS_POPUP_* key'lerini okur.
 */
export async function GET() {
  try {
    const keys = [
      "BECAYIS_POPUP_ACTIVE",
      "BECAYIS_POPUP_TITLE",
      "BECAYIS_POPUP_BODY",
      "BECAYIS_POPUP_IMAGE_URL",
      "BECAYIS_POPUP_CTA_TEXT",
      "BECAYIS_POPUP_CTA_URL",
      "BECAYIS_POPUP_SHOW_COUNT",
    ];

    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: keys } },
    });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    const isActive = map["BECAYIS_POPUP_ACTIVE"] === "true";

    if (!isActive) {
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({
      active: true,
      title: map["BECAYIS_POPUP_TITLE"] || "",
      body: map["BECAYIS_POPUP_BODY"] || "",
      imageUrl: map["BECAYIS_POPUP_IMAGE_URL"] || "",
      ctaText: map["BECAYIS_POPUP_CTA_TEXT"] || "İncele",
      ctaUrl: map["BECAYIS_POPUP_CTA_URL"] || "",
      showCount: parseInt(map["BECAYIS_POPUP_SHOW_COUNT"] || "1", 10) || 1,
    });
  } catch (error) {
    console.error("Public Becayis popup API error:", error);
    return NextResponse.json({ active: false });
  }
}
