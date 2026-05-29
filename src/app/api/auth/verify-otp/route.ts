import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createToken } from '@/lib/auth'
import { otpStore } from '../send-otp/route'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userId, code } = body

        if (!userId || !code) {
            return NextResponse.json({ error: 'Kullanıcı ID ve doğrulama kodu gerekli' }, { status: 400 })
        }

        // OTP'yi kontrol et
        const storedOtp = otpStore.get(userId)

        if (!storedOtp) {
            return NextResponse.json({
                error: 'Doğrulama kodu bulunamadı. Lütfen yeni kod talep edin.'
            }, { status: 400 })
        }

        if (storedOtp.expiresAt < Date.now()) {
            otpStore.delete(userId)
            return NextResponse.json({
                error: 'Doğrulama kodunun süresi dolmuş. Lütfen yeni kod talep edin.'
            }, { status: 400 })
        }

        if (storedOtp.code !== code.trim()) {
            return NextResponse.json({
                error: 'Doğrulama kodu hatalı. Lütfen tekrar deneyin.'
            }, { status: 401 })
        }

        // OTP doğrulandı — temizle
        otpStore.delete(userId)

        // Kullanıcıyı getir
        let user: any
        try {
            user = await prisma.user.findUnique({
                where: { id: userId },
                include: { stk: { select: { id: true, status: true } } }
            })
        } catch {
            user = await prisma.user.findUnique({ where: { id: userId } })
        }

        if (!user) {
            return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
        }

        // ⚠️ SON YETKI KONTROLU
        if (user.role !== 'STK_MANAGER' && user.role !== 'ADMIN') {
            return NextResponse.json({
                error: 'Bu platforma erişim yetkiniz bulunmamaktadır.'
            }, { status: 403 })
        }

        if (user.status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Hesabınız aktif değil.' }, { status: 403 })
        }

        // JWT Token oluştur
        const stkId = user.stk?.id || undefined
        const token = await createToken({
            userId: user.id,
            email: user.email || '',
            role: user.role,
            stkId,
        })

        // Son giriş zamanını güncelle
        try {
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() }
            })
        } catch (e) {
            console.warn('[VERIFY-OTP] lastLoginAt güncelenemedi:', e)
        }

        // AuditLog
        try {
            await prisma.auditLog.create({
                data: {
                    action: 'LOGIN' as any,
                    entityType: 'User',
                    entityId: user.id,
                    userId: user.id,
                    userEmail: user.email,
                    userName: user.name,
                    description: `OTP ile giriş yapıldı (${storedOtp.method})`,
                    stkId: stkId,
                }
            })
        } catch (logErr) {
            console.warn('[VERIFY-OTP] AuditLog yazılamadı:', logErr)
        }

        console.log(`[LOGIN] OTP doğrulandı: ${user.name} (${user.id}) - ${storedOtp.method}`)

        // Response + Cookie
        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                status: user.status,
                stkId,
            }
        })

        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 gün
            path: '/'
        })

        return response

    } catch (error) {
        console.error('[VERIFY-OTP] Error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
