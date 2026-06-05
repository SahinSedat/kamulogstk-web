import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/app-config
 * Mobil uygulama için feature flag'leri döndürür (auth gerektirmez).
 * SystemSetting tablosundan ilgili key'leri okur.
 */
export async function GET() {
  try {
    const keys = [
      "ONBOARDING_ACTIVE",
      "ONBOARDING_VERSION",
      "STORY_ACTIVE",
      "TUTORIAL_ACTIVE",
      "CONTACT_EMAIL",
      "CONTACT_PHONE",
      "CONTACT_WHATSAPP",
    ];

    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: keys } },
    });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    return NextResponse.json({
      success: true,
      data: {
        isOnboardingActive: map["ONBOARDING_ACTIVE"] === "true",
        onboardingVersion: map["ONBOARDING_VERSION"] || "1",
        isStoryActive: map["STORY_ACTIVE"] === "true",
        isTutorialActive: map["TUTORIAL_ACTIVE"] === "true",
        contactEmail: map["CONTACT_EMAIL"] || "",
        contactPhone: map["CONTACT_PHONE"] || "",
        contactWhatsApp: map["CONTACT_WHATSAPP"] || "",
      },
    });
  } catch (error) {
    console.error("App config error:", error);
    return NextResponse.json({
      success: true,
      data: {
        isOnboardingActive: false,
        onboardingVersion: "1",
        isStoryActive: false,
        isTutorialActive: false,
        contactEmail: "",
        contactPhone: "",
        contactWhatsApp: "",
      },
    });
  }
}
