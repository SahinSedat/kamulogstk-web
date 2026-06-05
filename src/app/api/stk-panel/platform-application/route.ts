import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/stk-panel/platform-application
 * Yeni STK platformuna başvuru (Landing page formu)
 */
export async function POST(request: NextRequest) {
  try {
    const { stkName, stkType, contactName, contactPhone, contactEmail, description } = await request.json();

    if (!stkName || !stkType || !contactName || !contactPhone || !contactEmail) {
      return NextResponse.json({ error: "Tüm alanlar zorunludur" }, { status: 400 });
    }

    // Aynı e-posta ile mükerrer başvuru kontrolü
    const existing = await prisma.sTKPlatformApplication.findFirst({
      where: { contactEmail, status: "PENDING" },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu e-posta ile zaten bekleyen bir başvuru mevcut" }, { status: 409 });
    }

    const application = await prisma.sTKPlatformApplication.create({
      data: {
        stkName,
        stkType,
        contactName,
        contactPhone,
        contactEmail,
        description: description || null,
        status: "PENDING",
      },
    });

    console.log(`[Platform Application] 📝 Yeni başvuru: ${stkName} (${contactEmail})`);

    return NextResponse.json({ success: true, data: application }, { status: 201 });
  } catch (error) {
    console.error("[Platform Application POST]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
