import { NextResponse } from 'next/server'
import { logout, getCurrentUser } from '@/lib/auth'
import { logUserLogout } from '@/lib/logger'

export async function POST() {
    try {
        const user = await getCurrentUser()

        if (user) {
            await logUserLogout(user.id, user.email, user.name)
        }

        await logout()

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Logout error:', error)
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası' },
            { status: 500 }
        )
    }
}

export async function GET() {
    try {
        await logout()
        return NextResponse.redirect(new URL('/auth/giris', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
    } catch {
        return NextResponse.redirect(new URL('/auth/giris', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
    }
}
