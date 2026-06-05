import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/sms/send — Vatan SMS üzerinden toplu SMS gönder
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const body = await request.json();
    const { message, phones } = body;

    // Gerekli alan kontrolü
    if (!message || !phones || !Array.isArray(phones) || phones.length === 0) {
      return NextResponse.json(
        { error: "Mesaj ve en az bir telefon numarası gereklidir." },
        { status: 400 }
      );
    }

    // SystemSetting tablosundan Vatan SMS bilgilerini çek
    const smsSettings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ["VATAN_SMS_API_ID", "VATAN_SMS_API_KEY", "VATAN_SMS_SENDER"],
        },
      },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of smsSettings) {
      settingsMap[s.key] = s.value;
    }

    const apiId = settingsMap["VATAN_SMS_API_ID"];
    const apiKey = settingsMap["VATAN_SMS_API_KEY"];
    const sender = settingsMap["VATAN_SMS_SENDER"];

    if (!apiId || !apiKey || !sender) {
      return NextResponse.json(
        {
          error:
            "Vatan SMS ayarları eksik. Lütfen Sistem Ayarları sayfasından API ID, API Key ve Sender bilgilerini girin.",
        },
        { status: 400 }
      );
    }

    // Vatan SMS 1'den N'e gönderim endpoint'ine POST isteği at
    const vatanPayload = {
      api_id: apiId,
      api_key: apiKey,
      sender: sender,
      message_type: "normal",
      message: message,
      phones: phones,
    };

    const response = await fetch("https://api.vatansms.net/api/v1/1toN", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vatanPayload),
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: "SMS'ler başarıyla gönderildi/kuyruğa alındı.",
        vatanResponse: data,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Vatan SMS API hatası.",
          vatanResponse: data,
        },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error("SMS Gönderim API Hatası:", error);
    return NextResponse.json(
      { error: "SMS gönderimi sırasında bir hata oluştu." },
      { status: 500 }
    );
  }
}
