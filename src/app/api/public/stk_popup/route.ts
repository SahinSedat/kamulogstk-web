import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/stk_popup
 * STK'lara özel (Dernekler/Sendikalar sayfası) pop-up bilgisini döndürür.
 * SystemSetting tablosundan STK_POPUP_* key'lerini okur.
 */
export async function GET() {
  try {
    const keys = [
      "STK_POPUP_ACTIVE",
      "STK_POPUP_TITLE",
      "STK_POPUP_BODY",
      "STK_POPUP_IMAGE_URL",
      "STK_POPUP_CTA_TEXT",
      "STK_POPUP_CTA_URL",
      "STK_POPUP_SHOW_COUNT",
    ];

    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: keys } },
    });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    const isActive = map["STK_POPUP_ACTIVE"] === "true";

    if (!isActive) {
      return NextResponse.json({ active: false });
    }

    return NextResponse.json({
      active: true,
      title: map["STK_POPUP_TITLE"] || "",
      body: map["STK_POPUP_BODY"] || "",
      imageUrl: map["STK_POPUP_IMAGE_URL"] || "",
      ctaText: map["STK_POPUP_CTA_TEXT"] || "İncele",
      ctaUrl: map["STK_POPUP_CTA_URL"] || "",
      showCount: parseInt(map["STK_POPUP_SHOW_COUNT"] || "1", 10) || 1,
    });
  } catch (error) {
    console.error("Public STK popup API error:", error);
    return NextResponse.json({ active: false });
  }
}
