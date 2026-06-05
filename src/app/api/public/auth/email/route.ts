import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/rate-limiter";
import { signToken } from "@/lib/auth-helpers";
import { emailOtpSendSchema, emailOtpVerifySchema, formatZodError } from "@/lib/validations";
import { getWelcomeCredits } from "@/lib/systemSettings";

/**
 * Email OTP route for LOGIN / REGISTRATION.
 * No auth required — works like the WhatsApp OTP route.
 * POST: Generate OTP and send via email
 * PUT: Verify OTP and create/login user
 */

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
            subject: "Kamulog Doğrulama Kodu",
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

// POST — Email OTP gönder (auth gerektirmez)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const parsed = emailOtpSendSchema.safeParse({ email: body.email || body.newEmail });
        if (!parsed.success) {
            return NextResponse.json(
                { error: formatZodError(parsed.error) },
                { status: 400 }
            );
        }
        const email = parsed.data.email;

        // Rate limiting: IP başına 15 dakikada max 5 OTP isteği
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
        const { limited, retryAfterMs } = checkRateLimit(`email-otp:${ip}`, 5, 15 * 60 * 1000);
        if (limited) {
            return NextResponse.json(
                { error: `Çok fazla istek. ${Math.ceil(retryAfterMs / 60000)} dakika sonra tekrar deneyin.` },
                { status: 429 }
            );
        }

        const code = generateOtp();

        // WhatsAppLog tablosuna kaydet (OTP tracking)
        await prisma.whatsAppLog.create({
            data: {
                phoneNumber: email,
                message: code,
                messageType: "EMAIL_OTP",
                status: "PENDING",
            },
        });

        // Email ile gönder
        const sent = await sendEmailOtp(email, code);

        // Durumu güncelle
        if (sent) {
            await prisma.whatsAppLog.updateMany({
                where: {
                    phoneNumber: email,
                    messageType: "EMAIL_OTP",
                    message: code,
                },
                data: { status: "SENT" },
            });
        }

        return NextResponse.json({
            success: true,
            sent,
            message: sent
                ? "Doğrulama kodu e-posta adresine gönderildi."
                : "E-posta gönderilemedi, lütfen tekrar deneyin.",
        });
    } catch (error) {
        console.error("User Email OTP error:", error);
        return NextResponse.json(
            { error: "Sunucu hatası" },
            { status: 500 }
        );
    }
}

// PUT — Email OTP doğrula + kullanıcı oluştur/giriş yap
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const parsed = emailOtpVerifySchema.safeParse({
            email: body.email || body.newEmail,
            code: body.code,
            displayName: body.displayName,
        });
        if (!parsed.success) {
            return NextResponse.json(
                { error: formatZodError(parsed.error) },
                { status: 400 }
            );
        }
        const { email, code, displayName } = parsed.data;

        // OTP doğrula (son 5 dakika)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const record = await prisma.whatsAppLog.findFirst({
            where: {
                phoneNumber: email,
                messageType: { in: ["EMAIL_OTP", "EMAIL_CHANGE_OTP"] },
                status: { in: ["SENT", "PENDING"] },
                createdAt: { gte: fiveMinutesAgo },
            },
            orderBy: { createdAt: "desc" },
        });

        if (!record) {
            return NextResponse.json(
                { error: "Kod süresi dolmuş veya bulunamadı." },
                { status: 400 }
            );
        }

        if (record.message !== code) {
            return NextResponse.json(
                { error: "Kod hatalı." },
                { status: 400 }
            );
        }

        // OTP'yi doğrulanmış işaretle
        await prisma.whatsAppLog.update({
            where: { id: record.id },
            data: { status: "VERIFIED" },
        });

        // Kullanıcıyı bul veya oluştur
        let user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Yeni kullanıcı oluştur
            try {
                const hashedPassword = await bcrypt.hash(
                    `kamulog_${email}_${Date.now()}`,
                    10
                );
                const welcomeCredits = await getWelcomeCredits();
                user = await prisma.user.create({
                    data: {
                        email,
                        password: hashedPassword,
                        name: displayName || null,
                        emailVerified: new Date(),
                        lastLoginMethod: "email",
                        credits: welcomeCredits,
                    },
                });
            } catch (createError: unknown) {
                if (
                    createError &&
                    typeof createError === "object" &&
                    "code" in createError &&
                    (createError as { code: string }).code === "P2002"
                ) {
                    user = await prisma.user.findUnique({
                        where: { email },
                    });
                }
                if (!user) throw createError;
            }
        } else {
            // Mevcut kullanıcı — giriş bilgilerini güncelle
            // Hesap dondurulmuşsa otomatik uyandır
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    emailVerified: new Date(),
                    lastLoginMethod: "email",
                    ...(displayName && !user.name ? { name: displayName } : {}),
                    ...(user.isDeactivated ? {
                        isDeactivated: false,
                        deactivatedAt: null,
                        deactivationReason: null,
                    } : {}),
                },
            });
        }

        // JWT token oluştur
        const jwtToken = signToken(user.id);
        return NextResponse.json({
            success: true,
            token: jwtToken,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone || user.phoneNumber,
                email: user.email,
                credits: user.credits,
                isPremium: user.isPremium,
                employmentType: user.employmentType,
                title: user.title,
                lastLoginMethod: "email",
            },
            message: "Giriş başarılı!",
        });
    } catch (error) {
        console.error("Email OTP verify error:", error);
        return NextResponse.json(
            { error: "Sunucu hatası" },
            { status: 500 }
        );
    }
}
