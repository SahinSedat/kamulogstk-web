import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/verify-otp
 * OTP kodunu doğrula. Doğruysa session başlat.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();
    if (!email || !otp) {
      return NextResponse.json({ error: "E-posta ve doğrulama kodu zorunludur" }, { status: 400 });
    }

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // OTP kontrolü
    if (!user.otpCode || !user.otpExpiry) {
      return NextResponse.json({ error: "Doğrulama kodu bulunamadı. Lütfen tekrar giriş yapın." }, { status: 400 });
    }

    // Süre kontrolü
    if (new Date() > user.otpExpiry) {
      // Süresi dolmuş OTP'yi temizle
      await prisma.user.update({
        where: { id: user.id },
        data: { otpCode: null, otpExpiry: null },
      });
      return NextResponse.json({ error: "Doğrulama kodunun süresi dolmuş. Lütfen tekrar giriş yapın." }, { status: 400 });
    }

    // Kod kontrolü
    if (user.otpCode !== otp.toString().trim()) {
      return NextResponse.json({ error: "Doğrulama kodu hatalı" }, { status: 401 });
    }

    // OTP doğrulandı — temizle
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode: null, otpExpiry: null },
    });

    console.log(`[2FA] ✅ OTP doğrulandı: ${email}`);

    return NextResponse.json({ 
      success: true, 
      verified: true,
      message: "Doğrulama başarılı" 
    });
  } catch (error) {
    console.error("[2FA Verify OTP]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
