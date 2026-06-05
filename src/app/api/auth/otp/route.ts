import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:3101";

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST — Generate OTP, try to send via WhatsApp bot, fallback to on-screen display
export async function POST(req: Request) {
    try {
        const { phone } = await req.json();
        if (!phone || phone.length < 10) {
            return NextResponse.json({ error: "Geçerli bir telefon numarası girin." }, { status: 400 });
        }

        const code = generateOtp();
        const message = `Kamulog Doğrulama Kodunuz: ${code}\n\nBu kodu kimseyle paylaşmayın. 5 dakika geçerlidir.`;

        // Try to send via WhatsApp bot
        let sent = false;
        try {
            const res = await fetch(`${BOT_URL}/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, message }),
            });
            const data = await res.json();
            sent = data.sent === true;
        } catch { sent = false; }

        // Log to database
        await prisma.whatsAppLog.create({
            data: {
                phoneNumber: phone,
                message: code,
                messageType: "OTP",
                status: sent ? "SENT" : "FAILED",
                errorMessage: sent ? null : "Bot bağlı değil — kod ekranda gösterildi.",
            },
        });

        return NextResponse.json({
            success: true,
            sent,
            code, // Always return code for on-screen display (fallback)
            message: sent ? "OTP WhatsApp ile gönderildi." : "Kod oluşturuldu.",
        });
    } catch (error) {
        console.error("OTP error:", error);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

// PUT — Verify OTP
export async function PUT(req: Request) {
    try {
        const { phone, code } = await req.json();
        if (!phone || !code || code.length !== 6) {
            return NextResponse.json({ error: "Geçersiz doğrulama kodu." }, { status: 400 });
        }

        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const record = await prisma.whatsAppLog.findFirst({
            where: { phoneNumber: phone, messageType: "OTP", status: { in: ["SENT", "FAILED"] }, createdAt: { gte: fiveMinutesAgo } },
            orderBy: { createdAt: "desc" },
        });

        if (!record) return NextResponse.json({ error: "Kod süresi dolmuş." }, { status: 400 });
        if (record.message !== code) return NextResponse.json({ error: "Kod hatalı." }, { status: 400 });

        await prisma.whatsAppLog.update({ where: { id: record.id }, data: { status: "VERIFIED" } });
        return NextResponse.json({ verified: true, message: "Doğrulama başarılı!" });
    } catch (error) {
        console.error("OTP verify error:", error);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}
