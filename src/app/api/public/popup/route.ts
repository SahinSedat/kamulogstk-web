import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/popup
 * Mobil uygulama için aktif pop-up bilgisini döndürür (auth gerektirmez).
 * SystemSetting tablosundan POPUP_* key'lerini okur.
 */
export async function GET() {
  try {
    const keys = [
      "POPUP_ACTIVE",
      "POPUP_TITLE",
      "POPUP_BODY",
      "POPUP_IMAGE_URL",
      "POPUP_CTA_TEXT",
      "POPUP_CTA_URL",
      "POPUP_SHOW_COUNT",
    ];

    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: keys } },
    });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    const isActive = map["POPUP_ACTIVE"] === "true";

    if (!isActive) {
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({
      active: true,
      title: map["POPUP_TITLE"] || "",
      body: map["POPUP_BODY"] || "",
      imageUrl: map["POPUP_IMAGE_URL"] || "",
      ctaText: map["POPUP_CTA_TEXT"] || "Şimdi İncele",
      ctaUrl: map["POPUP_CTA_URL"] || "",
      showCount: parseInt(map["POPUP_SHOW_COUNT"] || "1", 10) || 1,
    });
  } catch (error) {
    console.error("Public popup API error:", error);
    return NextResponse.json({ active: false });
  }
}
