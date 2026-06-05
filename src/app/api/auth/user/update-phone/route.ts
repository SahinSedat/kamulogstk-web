import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Telefon değişikliği route.
 * Flutter `Authorization: Token <userId>` gönderir.
 * OTP: WhatsAppLog tablosunu kullanır.
 */

const BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:3101";

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

// POST — Telefon değişikliği için OTP gönder
export async function POST(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json(
                { error: "Kullanıcı bulunamadı.", reauth: true },
                { status: 401 }
            );
        }

        const { newPhone, isFirstTime } = await req.json();

        if (!newPhone || newPhone.length < 10) {
            return NextResponse.json(
                { error: "Geçerli bir telefon numarası girin." },
                { status: 400 }
            );
        }

        // Normalize phone
        let cleaned = newPhone.replace(/\D/g, "");
        if (cleaned.startsWith("0")) cleaned = "90" + cleaned.slice(1);
        else if (!cleaned.startsWith("90") && cleaned.length === 10)
            cleaned = "90" + cleaned;

        // Bu telefon başka kullanıcıda varsa hata
        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: cleaned },
                    { phoneNumber: cleaned },
                    { phone: "+" + cleaned },
                ],
                NOT: { id: user.id },
            },
        });
        if (existing) {
            return NextResponse.json(
                {
                    error: "Bu telefon numarası başka bir hesapta kullanılıyor.",
                },
                { status: 409 }
            );
        }

        // Jeton kontrolü kaldırıldı — telefon değiştirme ücretsiz

        // OTP oluştur
        const code = generateOtp();
        const message = `Kamulog Telefon Değişikliği Doğrulama Kodunuz: ${code}\n\nBu kodu kimseyle paylaşmayın. 5 dakika geçerlidir.`;

        // WhatsApp bot üzerinden gönder
        let sent = false;
        try {
            const res = await fetch(`${BOT_URL}/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: cleaned, message }),
            });
            const data = await res.json();
            sent = data.sent === true;
        } catch {
            sent = false;
        }

        // WhatsAppLog'a kaydet
        await prisma.whatsAppLog.create({
            data: {
                phoneNumber: cleaned,
                message: code,
                messageType: "PHONE_CHANGE_OTP",
                status: sent ? "SENT" : "FAILED",
                errorMessage: sent
                    ? null
                    : "Bot bağlı değil — kod ekranda gösterildi.",
            },
        });

        return NextResponse.json({
            success: true,
            sent,
            phone: cleaned,
            isFirstTime: !!isFirstTime,
            message: sent
                ? "Doğrulama kodu yeni telefon numarasına gönderildi."
                : "WhatsApp gönderilemedi.",
            ...(!sent && { code }),
        });
    } catch (error: unknown) {
        const msg =
            error instanceof Error ? error.message : "Sunucu hatası";
        console.error("Update phone OTP error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// PUT — OTP doğrula + telefonu güncelle
export async function PUT(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json(
                { error: "Kullanıcı bulunamadı.", reauth: true },
                { status: 401 }
            );
        }

        const { phone, code } = await req.json();

        if (!phone || !code) {
            return NextResponse.json(
                { error: "Telefon ve doğrulama kodu gerekli." },
                { status: 400 }
            );
        }

        // Normalize
        let cleaned = phone.replace(/\D/g, "");
        if (cleaned.startsWith("0")) cleaned = "90" + cleaned.slice(1);
        else if (!cleaned.startsWith("90") && cleaned.length === 10)
            cleaned = "90" + cleaned;

        // OTP doğrula (son 5 dakika)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const record = await prisma.whatsAppLog.findFirst({
            where: {
                phoneNumber: cleaned,
                messageType: "PHONE_CHANGE_OTP",
                status: { in: ["SENT", "FAILED"] },
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
            phone: cleaned,
            phoneNumber: cleaned,
        };

        // Jeton düşürme kaldırıldı

        // Eski telefon numarasını log'a kaydet (audit trail)
        if (user.phone && user.phone !== cleaned) {
            await prisma.whatsAppLog.create({
                data: {
                    phoneNumber: user.id,
                    message: `Eski telefon: ${user.phone} → Yeni telefon: ${cleaned}`,
                    messageType: "PHONE_CHANGE_LOG",
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
            phone: updated.phone,
            credits: updated.credits,
            token: updated.id,
            message: "Telefon numaranız başarıyla güncellendi.",
        });
    } catch (error: unknown) {
        const msg =
            error instanceof Error ? error.message : "Sunucu hatası";
        console.error("Update phone verify error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
