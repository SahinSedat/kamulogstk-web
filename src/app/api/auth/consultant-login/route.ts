import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json();
    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: "Geçerli bir telefon numarası girin." }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ phone }, { email: phone }] },
      select: { id: true, name: true, phone: true, email: true, role: true, avatarUrl: true, credits: true, isPremium: true },
    });

    if (!user) return NextResponse.json({ error: "Kayıtlı kullanıcı bulunamadı." }, { status: 404 });

    if (user.role !== "CONSULTANT" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Erişim Reddedildi: Sadece onaylı danışmanlar giriş yapabilir." }, { status: 403 });
    }

    if (otp) {
      const otpRecord = await prisma.whatsAppLog.findFirst({
        where: { phoneNumber: user.phone || phone, messageType: "OTP", message: otp },
        orderBy: { createdAt: "desc" },
      });
      if (!otpRecord) return NextResponse.json({ error: "Geçersiz doğrulama kodu." }, { status: 401 });
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (otpRecord.createdAt < fiveMinAgo) {
        return NextResponse.json({ error: "Doğrulama kodunun süresi dolmuş." }, { status: 401 });
      }
    }

    const consultant = await prisma.consultant.findFirst({
      where: { userId: user.id },
      select: { id: true, name: true, title: true, category: true, sessionFeeJeton: true, consultantCredits: true },
    });

    return NextResponse.json({ success: true, user: { ...user, consultantProfile: consultant }, token: user.id });
  } catch (error: any) {
    console.error("[consultant-login]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
