import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/rate-limiter";
import { signToken } from "@/lib/auth-helpers";
import { otpSendSchema, otpVerifySchema, formatZodError } from "@/lib/validations";
import { getWelcomeCredits } from "@/lib/systemSettings";

// ── Apple Review Test Hesabı ──────────────────────────────────
// Apple hakemlerinin uygulamayı test edebilmesi için sabit test hesabı.
const APPLE_TEST_PHONE = '905551234567';
const APPLE_TEST_CODE = '123456';

// Telefon numarasını normalize et: tüm formatları "905XXXXXXXXX" standardına çevir
function normalizePhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, ""); // Sadece rakamları al
    if (cleaned.startsWith("0")) cleaned = "90" + cleaned.slice(1);
    else if (!cleaned.startsWith("90") && cleaned.length === 10) cleaned = "90" + cleaned;
    return cleaned;
}

// Bir telefon numarasının tüm olası formatlarını döndür (DB'de farklı formatlarda olabilir)
function phoneVariants(phone: string): string[] {
    const digits = normalizePhone(phone); // "905XXXXXXXXX"
    const withPlus = "+" + digits;        // "+905XXXXXXXXX"
    // Boşluklu format: "+90 5XX XXX XX XX"
    const spaced = digits.length === 12
        ? `+90 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`
        : withPlus;
    return [digits, withPlus, spaced, phone]; // Orijinal formatı da ekle
}

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST — SMS OTP gönder
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const parsed = otpSendSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: formatZodError(parsed.error) },
                { status: 400 }
            );
        }
        const rawPhone = parsed.data.phone;

        // Rate limiting: IP başına 15 dakikada max 5 OTP isteği
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
        const { limited, retryAfterMs } = checkRateLimit(`otp:${ip}`, 5, 15 * 60 * 1000);
        if (limited) {
            return NextResponse.json(
                { error: `Çok fazla istek. ${Math.ceil(retryAfterMs / 60000)} dakika sonra tekrar deneyin.` },
                { status: 429 }
            );
        }

        // Apple Review test hesabı — sabit kod kullan
        if (rawPhone === APPLE_TEST_PHONE) {
            await prisma.whatsAppLog.create({
                data: {
                    phoneNumber: rawPhone,
                    message: APPLE_TEST_CODE,
                    messageType: "SMS_OTP",
                    status: "SENT",
                },
            });
            return NextResponse.json({
                success: true,
                sent: true,
                message: "OTP SMS ile gönderildi.",
            });
        }

        const code = generateOtp();
        const message = `Kamulog onay kodunuz: ${code}. SMS İptal https://lcv.tc/d/22151`;

        const normalizedVatanPhone = normalizePhone(rawPhone);

        // VatanSMS üzerinden göndermeyi dene
        let sent = false;
        let vatanResponse = null;
        try {
            const params = {
                api_id: process.env.VATAN_API_ID,
                api_key: process.env.VATAN_API_KEY,
                sender: process.env.VATAN_SENDER,
                message_type: 'turkce',
                message: message,
                message_content_type: 'bilgi',
                phones: [normalizedVatanPhone]
            };

            const res = await fetch('https://api.vatansms.net/api/v1/1toN', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            const data = await res.json();
            vatanResponse = data;
            sent = true; // VatanSMS genelde hata atmazsa veya HTTP 200 dönerse
        } catch (smsErr) {
            console.error("VatanSMS API Hatası:", smsErr);
            sent = false;
        }

        // Admin Paneli İçin SMS Log kaydet
        const crypto = require('crypto');
        await prisma.smsLog.create({
            data: {
                id: crypto.randomUUID(),
                senderType: "SYSTEM_OTP",
                recipientCount: 1,
                phones: [normalizedVatanPhone],
                message: message,
                status: sent ? "SENT" : "FAILED",
                apiResponse: vatanResponse,
                errorMessage: sent ? null : "VatanSMS API Hatası",
            }
        });

        // OTP Doğrulama İçin WhatsAppLog kaydet
        await prisma.whatsAppLog.create({
            data: {
                phoneNumber: rawPhone,
                message: code,
                messageType: "SMS_OTP",
                status: sent ? "SENT" : "FAILED",
                errorMessage: sent
                    ? null
                    : "SMS gönderilemedi — kod ekranda gösterildi.",
            },
        });

        return NextResponse.json({
            success: true,
            sent,
            message: sent ? "OTP SMS ile gönderildi." : "Kod oluşturuldu.",
        });
    } catch (error) {
        console.error("User WhatsApp OTP error:", error);
        return NextResponse.json(
            { error: "Sunucu hatası" },
            { status: 500 }
        );
    }
}

// PUT — OTP doğrula + kullanıcı oluştur/giriş yap + token döndür
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const parsed = otpVerifySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: formatZodError(parsed.error) },
                { status: 400 }
            );
        }
        const rawPhone = parsed.data.phone;
        const code = parsed.data.code;
        const displayName = parsed.data.displayName;

        // Apple Review test hesabı — sabit kod doğrulama bypass
        if (rawPhone === APPLE_TEST_PHONE && code === APPLE_TEST_CODE) {
            // Test kullanıcısını bul veya oluştur
            const normalizedPhone = normalizePhone(rawPhone);
            const generatedEmail = normalizedPhone + '@kamulog.net';
            let user = await prisma.user.findFirst({
                where: { OR: [{ phone: normalizedPhone }, { email: generatedEmail }] },
            });
            if (!user) {
                const hashedPassword = await bcrypt.hash('apple_test_' + Date.now(), 10);
                const welcomeCredits = await getWelcomeCredits();
                user = await prisma.user.create({
                    data: {
                        email: generatedEmail,
                        phone: normalizedPhone,
                        phoneNumber: normalizedPhone,
                        password: hashedPassword,
                        name: 'Apple Test',
                        phoneVerified: true,
                        lastLoginMethod: 'whatsapp',
                        credits: welcomeCredits,
                    },
                });
            }
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
                    lastLoginMethod: 'whatsapp',
                },
                message: 'Giriş başarılı!',
            });
        }

        // OTP doğrula (son 5 dakika)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const record = await prisma.whatsAppLog.findFirst({
            where: {
                phoneNumber: rawPhone,
                messageType: "SMS_OTP",
                status: { in: ["SENT", "FAILED"] },
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

        // Telefon numarasını normalize et ve tüm format varyantlarını oluştur
        const normalizedPhone = normalizePhone(rawPhone);
        const variants = phoneVariants(rawPhone);

        // Kullanıcıyı tüm olası telefon formatlarıyla ara
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: { in: variants } },
                    { phoneNumber: { in: variants } },
                ],
            },
        });

        if (!user) {
            // Yeni kullanıcı oluştur — normalize edilmiş telefon ile
            try {
                const hashedPassword = await bcrypt.hash(
                    `kamulog_${normalizedPhone}_${Date.now()}`,
                    10
                );
                const welcomeCredits = await getWelcomeCredits();
                user = await prisma.user.create({
                    data: {
                        email: null,
                        phone: normalizedPhone,
                        phoneNumber: normalizedPhone,
                        password: hashedPassword,
                        name: displayName || null,
                        phoneVerified: true,
                        lastLoginMethod: "sms",
                        credits: welcomeCredits,
                    },
                });
            } catch (createError: unknown) {
                // Email zaten varsa, email ile bul
                if (
                    createError &&
                    typeof createError === "object" &&
                    "code" in createError &&
                    (createError as { code: string }).code === "P2002"
                ) {
                    // P2002 phone unique conflict — try finding by phone
                    user = await prisma.user.findFirst({
                        where: { OR: [{ phone: normalizedPhone }, { phoneNumber: normalizedPhone }] },
                    });
                    if (user) {
                        // Telefon alanlarını normalize edilmiş halde güncelle
                        user = await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                phone: normalizedPhone,
                                phoneNumber: normalizedPhone,
                                phoneVerified: true,
                                lastLoginMethod: "sms",
                            },
                        });
                    }
                }
                if (!user) throw createError;
            }
        } else {
            // Mevcut kullanıcı — giriş bilgilerini güncelle + telefonu normalize et
            // Hesap dondurulmuşsa otomatik uyandır
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    phone: normalizedPhone,
                    phoneNumber: normalizedPhone,
                    phoneVerified: true,
                    lastLoginMethod: "sms",
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
                lastLoginMethod: "sms",
            },
            message: "Giriş başarılı!",
        });
    } catch (error) {
        console.error("WhatsApp OTP verify error:", error);
        return NextResponse.json(
            { error: "Sunucu hatası" },
            { status: 500 }
        );
    }
}
