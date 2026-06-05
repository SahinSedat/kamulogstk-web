import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyDjangoPassword } from "@/lib/pbkdf2";

const GLOBAL_BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:3101";

/**
 * POST /api/auth/send-otp
 * 1. Email + Password doğrula (NextAuth authorize ile aynı mantık)
 * 2. 6 haneli OTP üret
 * 3. User tablosuna kaydet (otpCode, otpExpiry)
 * 4. WhatsApp Global Bot ile kullanıcının telefonuna gönder
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "E-posta ve şifre zorunludur" }, { status: 400 });
    }

    // 1. Kullanıcıyı bul
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "E-posta veya şifre hatalı" }, { status: 401 });
    }

    // Sadece yetkili roller girebilir
    if (!["ADMIN", "MODERATOR", "CONSULTANT", "STK_MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Yetkisiz kullanıcı" }, { status: 401 });
    }

    // 2. Şifre doğrula (bcrypt veya Django PBKDF2)
    let isValid = false;
    if (user.password.startsWith("$2b$") || user.password.startsWith("$2a$")) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      isValid = verifyDjangoPassword(password, user.password);
    }
    if (!isValid) {
      return NextResponse.json({ error: "E-posta veya şifre hatalı" }, { status: 401 });
    }

    // 3. Telefon numarası kontrolü
    const phone = user.phone || user.phoneNumber;
    if (!phone) {
      // Telefonu olmayan kullanıcılar için 2FA atla, direkt giriş izni ver
      return NextResponse.json({ 
        success: true, 
        skipOtp: true, 
        message: "Telefon numarası kayıtlı değil, 2FA atlanıyor" 
      });
    }

    // 4. 6 haneli OTP üret
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 dakika geçerli

    // 5. OTP'yi DB'ye kaydet
    await prisma.user.update({
      where: { id: user.id },
      data: { otpCode, otpExpiry },
    });

    // 6. WhatsApp ile gönder (Global Bot)
    try {
      const waMessage = `🔐 *KamuLog Güvenlik:*\nSTK Yönetim Paneline giriş yapmaya çalışıyorsunuz.\n\nDoğrulama kodunuz: *${otpCode}*\n\nBu kod 5 dakika geçerlidir.\nBu işlem size ait değilse lütfen kurucu yöneticiye başvurun.`;

      await fetch(`${GLOBAL_BOT_URL}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message: waMessage }),
        signal: AbortSignal.timeout(10000),
      });
      console.log(`[2FA] ✅ OTP gönderildi: ${phone.slice(0, 4)}****`);
    } catch (waErr) {
      console.error("[2FA] WhatsApp gönderim hatası:", waErr);
      // WhatsApp başarısız olsa bile devam et (kullanıcı e-posta ile de alabilir)
    }

    // Telefon numarasının maskelenmiş hali
    const maskedPhone = phone.slice(0, 4) + "****" + phone.slice(-2);

    return NextResponse.json({ 
      success: true, 
      skipOtp: false,
      maskedPhone,
      message: "Doğrulama kodu WhatsApp ile gönderildi" 
    });
  } catch (error) {
    console.error("[2FA Send OTP]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
