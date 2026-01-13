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

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: { stk: { select: { id: true, status: true } } }
        })

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

        // Create JWT token
        const token = await createToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            stkId: user.stk?.id
        })

        // Log the login
        await logUserLogin(user.id, user.email, user.name)

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
