import { NextRequest, NextResponse } from 'next/server'
import { login } from '@/lib/auth'
import { logUserLogin } from '@/lib/logger'

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

        const result = await login(email, password)

        if (result.success && result.user) {
            // Log the login
            await logUserLogin(result.user.id, result.user.email, result.user.name)

            return NextResponse.json({
                success: true,
                user: result.user,
            })
        }

        return NextResponse.json(
            { success: false, error: result.error },
            { status: 401 }
        )
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası' },
            { status: 500 }
        )
    }
}
