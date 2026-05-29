import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Oturum bulunamadı' },
                { status: 401 }
            )
        }

        return NextResponse.json({
            success: true,
            user: {
                ...user,
                // İsim formatlaması için frontend'e helper fonksiyon bırakacağız, 
                // ama istenirse burada da formatlanabilir. 
                // Şimdilik raw data dönüyoruz.
            }
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası' },
            { status: 500 }
        )
    }
}
