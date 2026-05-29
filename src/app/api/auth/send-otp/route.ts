import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import nodemailer from 'nodemailer'

// In-memory OTP store (production'da Redis kullanılmalı)
// Global scope'ta tutuyoruz ki verify-otp da erişebilsin
const otpStore = new Map<string, { code: string; expiresAt: number; userId: string; method: string }>()

// OTP Store'u export et
export { otpStore }

function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

// Email ile OTP gönder
async function sendEmailOTP(email: string, code: string): Promise<boolean> {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
            port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '25'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER || process.env.EMAIL_USER,
                pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
            },
            tls: { rejectUnauthorized: false },
        })

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'destek@kamulog.net',
            to: email,
            subject: 'KamulogSTK - Giriş Doğrulama Kodu',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #1e293b; margin: 0;">KamulogSTK</h2>
                        <p style="color: #64748b; font-size: 14px;">STK Yönetim Platformu</p>
                    </div>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center;">
                        <p style="color: #475569; font-size: 14px; margin-bottom: 16px;">Giriş doğrulama kodunuz:</p>
                        <div style="background: #1e293b; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 24px; border-radius: 8px; display: inline-block;">
                            ${code}
                        </div>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">Bu kod 5 dakika geçerlidir.</p>
                    </div>
                    <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 16px;">Bu kodu siz talep etmediyseniz, lütfen bu mesajı görmezden gelin.</p>
                </div>
            `,
        })
        return true
    } catch (error) {
        console.error('[EMAIL-OTP] Gönderim hatası:', error)
        return false
    }
}

// WhatsApp ile OTP gönder
async function sendWhatsAppOTP(phone: string, code: string): Promise<boolean> {
    try {
        const botUrl = process.env.WHATSAPP_BOT_URL || 'http://91.151.95.75:3101'
        // Telefon numarasını normalize et (905XXXXXXXXX formatına çevir)
        let normalizedPhone = phone.replace(/\D/g, '').replace(/^0+/, '')
        if (!normalizedPhone.startsWith('90')) {
            normalizedPhone = `90${normalizedPhone}`
        }
        
        const response = await fetch(`${botUrl}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: normalizedPhone,
                message: `🔐 *KamulogSTK Giriş Doğrulama*\n\nDoğrulama kodunuz: *${code}*\n\nBu kod 5 dakika geçerlidir.\n\n⚠️ Bu kodu kimseyle paylaşmayın.`,
            }),
        })
        const data = await response.json()
        console.log('[WA-OTP] Bot response:', JSON.stringify(data))
        return data.sent === true
    } catch (error) {
        console.error('[WA-OTP] Gönderim hatası:', error)
        return false
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { identifier, method } = body // identifier: email veya telefon, method: 'email' | 'whatsapp'

        if (!identifier || !method) {
            return NextResponse.json({ error: 'Email/telefon ve doğrulama yöntemi gerekli' }, { status: 400 })
        }

        // Kullanıcıyı bul
        let user: any = null

        if (method === 'email') {
            user = await prisma.user.findFirst({
                where: { email: identifier.toLowerCase().trim() },
                select: { id: true, email: true, phone: true, name: true, role: true, status: true }
            })
        } else if (method === 'whatsapp') {
            // Telefon numarasını normalize et
            const normalizedPhone = identifier.replace(/\D/g, '').replace(/^0+/, '').replace(/^90/, '')
            user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { phone: { contains: normalizedPhone } },
                        { phone: normalizedPhone },
                        { phone: `0${normalizedPhone}` },
                        { phone: `90${normalizedPhone}` },
                        { phone: `+90${normalizedPhone}` },
                    ]
                },
                select: { id: true, email: true, phone: true, name: true, role: true, status: true }
            })
        }

        if (!user) {
            return NextResponse.json({
                error: 'Bu bilgilere sahip yetkili bir kullanıcı bulunamadı. Lütfen admin ile iletişime geçin.'
            }, { status: 404 })
        }

        // ⚠️ YETKI KONTROLU: Sadece STK_MANAGER ve ADMIN girebilir
        if (user.role !== 'STK_MANAGER' && user.role !== 'ADMIN') {
            return NextResponse.json({
                error: 'Bu platforma erişim yetkiniz bulunmamaktadır. STK yöneticisi olarak atanmanız gerekiyor.'
            }, { status: 403 })
        }

        if (user.status !== 'ACTIVE') {
            return NextResponse.json({
                error: 'Hesabınız aktif değil. Lütfen admin ile iletişime geçin.'
            }, { status: 403 })
        }

        // Rate limiting: son 60sn içinde gönderilmişse engelle
        const existingOtp = otpStore.get(user.id)
        if (existingOtp && existingOtp.expiresAt > Date.now() && (existingOtp.expiresAt - Date.now()) > 240000) {
            return NextResponse.json({
                error: 'Lütfen bir dakika bekleyip tekrar deneyin.',
            }, { status: 429 })
        }

        // OTP oluştur
        const code = generateOTP()
        const expiresAt = Date.now() + 5 * 60 * 1000 // 5 dakika

        // OTP gönder
        let sent = false
        if (method === 'whatsapp' && user.phone) {
            sent = await sendWhatsAppOTP(user.phone, code)
        } else if (method === 'email' && user.email) {
            sent = await sendEmailOTP(user.email, code)
        }

        if (!sent) {
            return NextResponse.json({
                error: `Doğrulama kodu gönderilemedi. ${method === 'whatsapp' ? 'WhatsApp servisi' : 'Email servisi'} şu an erişilemiyor.`
            }, { status: 500 })
        }

        // OTP'yi kaydet
        otpStore.set(user.id, { code, expiresAt, userId: user.id, method })

        // Temizlik: süresi geçmiş OTP'leri temizle
        for (const [key, val] of otpStore.entries()) {
            if (val.expiresAt < Date.now()) otpStore.delete(key)
        }

        console.log(`[OTP] ${method} ile gönderildi: ${user.name} (${user.id})`)

        return NextResponse.json({
            success: true,
            message: method === 'whatsapp'
                ? 'WhatsApp doğrulama kodu gönderildi'
                : 'E-posta doğrulama kodu gönderildi',
            userId: user.id,
            maskedContact: method === 'whatsapp'
                ? `***${(user.phone || '').slice(-4)}`
                : `${(user.email || '').slice(0, 3)}***@${(user.email || '').split('@')[1]}`
        })

    } catch (error) {
        console.error('[SEND-OTP] Error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
