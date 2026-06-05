import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/sms/recipients — Telefon numarası olan tüm kullanıcıları getir
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    // phone veya phoneNumber alanı dolu olan kullanıcıları çek
    const users = await prisma.user.findMany({
      select: {
        phone: true,
        phoneNumber: true,
      },
      where: {
        OR: [
          { phone: { not: null, notIn: [""] } },
          { phoneNumber: { not: null, notIn: [""] } },
        ],
      },
    });

    // ÖNEMLİ: Numaralara KESİNLİKLE DOKUNMA, filtreleme veya temizleme YAPMA.
    // Sadece dolu olan numarayı olduğu gibi diziye aktar.
    const phones: string[] = [];
    for (const user of users) {
      const rawPhone = user.phoneNumber || user.phone || "";
      if (rawPhone.trim() !== "") {
        phones.push(rawPhone);
      }
    }

    return NextResponse.json({
      success: true,
      validCount: phones.length,
      phones,
    });
  } catch (error) {
    console.error("SMS Recipients API Hatası:", error);
    return NextResponse.json(
      { error: "Kullanıcı telefon numaraları alınamadı." },
      { status: 500 }
    );
  }
}
