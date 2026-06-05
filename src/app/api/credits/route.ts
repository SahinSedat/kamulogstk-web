import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET  /api/credits — Mevcut jeton bakiyesini doner
 * POST artik yok — Jeton satin alimi RevenueCat webhook uzerinden yapilir
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const userId = req.headers.get("x-user-id") || authHeader.replace(/^(Bearer|Token)\s+/i, "");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, consultantJetons: true },
    });
    if (!user) return NextResponse.json({ error: "Kullanici bulunamadi" }, { status: 404 });

    return NextResponse.json({
      credits: user.credits,
      consultantJetons: user.consultantJetons,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/credits — Devre disi
 * Jeton satin alimi artik magaza uzerinden (RevenueCat webhook) yapilir.
 * Bu endpoint artik calismaz.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Bu endpoint devre disi birakilmistir. Jeton satin alimi magaza uzerinden yapilmalidir.",
      code: "SIMULATION_DISABLED",
    },
    { status: 410 }
  );
}
