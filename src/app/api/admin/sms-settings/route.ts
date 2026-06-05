import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Admin Panel — SMS Ayarları API (GlobalSettings)
 * GET  /api/admin/sms-settings → Mevcut ayarları getir (yoksa oluştur)
 * PUT  /api/admin/sms-settings → Ayarları güncelle
 */

// Ayarları getir — yoksa varsayılan oluştur
async function getOrCreateSettings() {
  let settings = await prisma.globalSettings.findUnique({ where: { id: "global" } });
  if (!settings) {
    settings = await prisma.globalSettings.create({
      data: {
        id: "global",
        whatsappNumber: "905392647655",
      },
    });
  }
  return settings;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role: string } | undefined;
    if (!user || !["ADMIN", "MODERATOR"].includes(user.role)) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const settings = await getOrCreateSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("[SMS Settings GET]:", error);
    return NextResponse.json({ error: "Ayarlar alınamadı" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || !["ADMIN", "MODERATOR"].includes(user.role)) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const body = await request.json();
    const { smsContractUrl, smsContractExampleUrl, smsExampleDocUrl, whatsappNumber } = body;

    // Önce mevcut kaydı garanti et
    await getOrCreateSettings();

    const updated = await prisma.globalSettings.update({
      where: { id: "global" },
      data: {
        ...(smsContractUrl !== undefined && { smsContractUrl }),
        ...(smsContractExampleUrl !== undefined && { smsContractExampleUrl }),
        ...(smsExampleDocUrl !== undefined && { smsExampleDocUrl }),
        ...(whatsappNumber !== undefined && { whatsappNumber }),
      },
    });

    // Admin log
    await prisma.adminLog.create({
      data: {
        adminId: user.id,
        action: "SMS_SETTINGS_UPDATE",
        targetType: "GLOBAL_SETTINGS",
        targetId: "global",
        details: JSON.stringify({ smsContractUrl, smsExampleDocUrl, whatsappNumber }),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[SMS Settings PUT]:", error);
    return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 500 });
  }
}
