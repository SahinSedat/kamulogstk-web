import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Email ekleme / değiştirme route.
 * Flutter `Authorization: Token <userId>` gönderir.
 * OTP: WhatsAppLog tablosunu kullanır (otpVerification yok).
 */

async function resolveUser(req: Request) {
    const auth = req.headers.get("authorization");
    if (!auth) return null;

    const parts = auth.split(" ");
    const token = parts.length === 2 ? parts[1] : auth;
    if (!token) return null;

    let user = await prisma.user.findUnique({ where: { id: token } });
    if (user) return user;

    const phoneHeader = req.headers.get("x-user-phone");
    if (phoneHeader) {
        user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: phoneHeader },
                    { phoneNumber: phoneHeader },
                ],
            },
        });
        if (user) return user;
    }

    return null;
}

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmailOtp(
    email: string,
    code: string
): Promise<boolean> {
    try {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_TX_HOST || "smtp.gmail.com",
            port: parseInt(process.env.SMTP_TX_PORT || "587"),
            secure: false,
            tls: { rejectUnauthorized: false },
            auth: {
                user: process.env.SMTP_TX_USER,
                pass: process.env.SMTP_TX_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.SMTP_TX_FROM || "Kamulog <iletisim@kamulogstk.net>",
            to: email,
            subject: "Kamulog E-Posta Doğrulama Kodu",
            html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;">
          <h2 style="color:#1a56db;">🔐 Kamulog Doğrulama</h2>
          <p>Doğrulama kodunuz:</p>
          <div style="background:#f3f4f6;padding:16px;border-radius:8px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a56db;">
            ${code}
          </div>
          <p style="color:#6b7280;font-size:13px;margin-top:16px;">Bu kod 5 dakika geçerlidir. Kimseyle paylaşmayın.</p>
        </div>
      `,
        });
        return true;
    } catch (e) {
        console.error("Email OTP send error:", e);
        return false;
    }
}

// POST — Yeni email'e doğrulama kodu gönder
export async function POST(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json(
                { error: "Kullanıcı bulunamadı.", reauth: true },
                { status: 401 }
            );
        }

        const { newEmail, isFirstTime } = await req.json();

        if (!newEmail || !newEmail.includes("@")) {
            return NextResponse.json(
                { error: "Geçerli bir e-posta adresi girin." },
                { status: 400 }
            );
        }

        // Bu email başka bir kullanıcıda kullanılıyor mu?
        const existing = await prisma.user.findUnique({
            where: { email: newEmail },
        });
        if (existing && existing.id !== user.id) {
            return NextResponse.json(
                {
                    error: "Bu e-posta adresi başka bir hesapta kullanılıyor.",
                },
                { status: 409 }
            );
        }

        // Jeton kontrolü kaldırıldı — e-posta değiştirme ücretsiz

        // OTP oluştur
        const code = generateOtp();

        // WhatsAppLog tablosuna kaydet (OTP tracking)
        await prisma.whatsAppLog.create({
            data: {
                phoneNumber: newEmail,
                message: code,
                messageType: "EMAIL_CHANGE_OTP",
                status: "PENDING",
            },
        });

        // Email ile gönder
        const sent = await sendEmailOtp(newEmail, code);

        // Durumu güncelle
        if (sent) {
            await prisma.whatsAppLog.updateMany({
                where: {
                    phoneNumber: newEmail,
                    messageType: "EMAIL_CHANGE_OTP",
                    message: code,
                },
                data: { status: "SENT" },
            });
        }

        // Yeni email'i kaydet
        await prisma.user.update({
            where: { id: user.id },
            data: { newEmail },
        });

        return NextResponse.json({
            success: true,
            sent,
            isFirstTime: !!isFirstTime,
            message: sent
                ? "Doğrulama kodu yeni e-posta adresine gönderildi."
                : "E-posta gönderilemedi, lütfen tekrar deneyin.",
            // Fallback: email gönderilemezse kodu göster
            ...(!sent && { code }),
        });
    } catch (error: unknown) {
        const msg =
            error instanceof Error ? error.message : "Sunucu hatası";
        console.error("Change email OTP error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// PUT — OTP doğrula + email güncelle
export async function PUT(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json(
                { error: "Kullanıcı bulunamadı.", reauth: true },
                { status: 401 }
            );
        }

        const { newEmail, code } = await req.json();

        if (!newEmail || !code) {
            return NextResponse.json(
                { error: "E-posta ve doğrulama kodu gerekli." },
                { status: 400 }
            );
        }

        // OTP doğrula (son 5 dakika)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const record = await prisma.whatsAppLog.findFirst({
            where: {
                phoneNumber: newEmail,
                messageType: "EMAIL_CHANGE_OTP",
                status: { in: ["SENT", "PENDING"] },
                createdAt: { gte: fiveMinutesAgo },
            },
            orderBy: { createdAt: "desc" },
        });

        if (!record || record.message !== code) {
            return NextResponse.json(
                {
                    error: "Doğrulama kodu geçersiz veya süresi dolmuş.",
                },
                { status: 400 }
            );
        }

        // OTP'yi doğrulanmış işaretle
        await prisma.whatsAppLog.update({
            where: { id: record.id },
            data: { status: "VERIFIED" },
        });

        // Güncelleme verilerini hazırla
        const updateData: Record<string, unknown> = {
            email: newEmail,
            newEmail: null,
            emailVerified: new Date(),
        };

        // Eski email'i log'a kaydet (audit trail)
        if (user.email && user.email !== newEmail) {
            await prisma.whatsAppLog.create({
                data: {
                    phoneNumber: user.id,
                    message: `Eski email: ${user.email} → Yeni email: ${newEmail}`,
                    messageType: "EMAIL_CHANGE_LOG",
                    status: "COMPLETED",
                },
            });
        }

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
        });

        return NextResponse.json({
            success: true,
            email: updated.email,
            credits: updated.credits,
            token: updated.id,
            message: "E-posta adresiniz başarıyla güncellendi.",
        });
    } catch (error: unknown) {
        const msg =
            error instanceof Error ? error.message : "Sunucu hatası";
        console.error("Change email verify error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
