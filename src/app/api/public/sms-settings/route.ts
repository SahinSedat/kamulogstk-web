import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public SMS Ayarları API — STK Panel ve diğer istemciler için
 * GET /api/public/sms-settings → Sadece smsContractUrl, smsExampleDocUrl, whatsappNumber döner
 * Auth gerektirmez — hassas veri yok
 */
export async function GET() {
  try {
    let settings = await prisma.globalSettings.findUnique({
      where: { id: "global" },
      select: {
        smsContractUrl: true,
        smsContractExampleUrl: true,
        smsExampleDocUrl: true,
        whatsappNumber: true,
      },
    });

    if (!settings) {
      settings = { smsContractUrl: null, smsContractExampleUrl: null, smsExampleDocUrl: null, whatsappNumber: "905392647655" };
    }

    return NextResponse.json({ success: true, data: settings }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      },
    });
  } catch (error) {
    console.error("[Public SMS Settings]:", error);
    return NextResponse.json({ success: false, error: "Ayarlar alınamadı" }, { status: 500 });
  }
}
