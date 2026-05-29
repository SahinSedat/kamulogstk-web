import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, createToken } from '@/lib/auth'
import { logUserLogin } from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, password } = body

        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: 'E-posta ve şifre gerekli' },
                { status: 400 }
            )
        }

        // Find user (STK include opsiyonel — tablo yoksa düz user çek)
        let user;
        try {
            user = await prisma.user.findUnique({
                where: { email },
                include: { stk: { select: { id: true, status: true } } }
            })
        } catch {
            // STK tablosu yoksa fallback
            user = await prisma.user.findUnique({ where: { email } })
        }

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Kullanıcı bulunamadı' },
                { status: 401 }
            )
        }

        // Verify password
        const isValidPassword = await verifyPassword(password, user.password)
        if (!isValidPassword) {
            return NextResponse.json(
                { success: false, error: 'Geçersiz şifre' },
                { status: 401 }
            )
        }

        // Create JWT token (stk ilişkisi opsiyonel)
        const stkId = (user as Record<string, unknown>).stk
            ? ((user as Record<string, unknown>).stk as Record<string, string>)?.id
            : undefined
        const token = await createToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            stkId
        })

        // Log the login (hata olursa login'i engellemez)
        try {
            await logUserLogin(user.id, user.email, user.name || "Bilinmeyen")
        } catch {
            console.warn('[LOGIN] Audit log yazılamadı, devam ediliyor')
        }

        // Create response with cookie
        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                status: user.status
            }
        })

        // Set auth cookie
        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/'
        })

        return response
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası' },
            { status: 500 }
        )
    }
}
