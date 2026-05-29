import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// STK Başvuru API Endpoint'i (Public - Auth gerektirmez)
// Landing page'den gelen yeni STK kayıt başvurularını işler

const STK_TYPES = ['DERNEK', 'VAKIF', 'SENDIKA', 'MESLEK_ODA', 'KOOPERATIF', 'DIGER'] as const

export async function POST(request: Request) {
    try {
        const body = await request.json()

        const { stkName, stkType, contactName, contactPhone, contactEmail, description } = body

        // --- Validasyon ---
        const errors: string[] = []

        if (!stkName || typeof stkName !== 'string' || stkName.trim().length < 3) {
            errors.push('STK adı en az 3 karakter olmalıdır.')
        }
        if (!stkType || !STK_TYPES.includes(stkType)) {
            errors.push('Geçerli bir STK türü seçiniz.')
        }
        if (!contactName || typeof contactName !== 'string' || contactName.trim().length < 2) {
            errors.push('Yetkili ad soyad en az 2 karakter olmalıdır.')
        }
        if (!contactPhone || typeof contactPhone !== 'string' || contactPhone.trim().length < 10) {
            errors.push('Geçerli bir telefon numarası giriniz.')
        }
        if (!contactEmail || typeof contactEmail !== 'string' || !contactEmail.includes('@')) {
            errors.push('Geçerli bir e-posta adresi giriniz.')
        }

        if (errors.length > 0) {
            return NextResponse.json(
                { success: false, errors },
                { status: 400 }
            )
        }

        // --- Mükerrer kontrol ---
        const existingApp = await prisma.sTKPlatformApplication.findFirst({
            where: {
                OR: [
                    { contactEmail: contactEmail.trim().toLowerCase() },
                    { contactPhone: contactPhone.trim() },
                ]
            }
        })

        if (existingApp) {
            return NextResponse.json(
                {
                    success: false,
                    errors: ['Bu e-posta veya telefon numarası ile daha önce başvuru yapılmıştır.']
                },
                { status: 409 }
            )
        }

        // --- Veritabanına kaydet ---
        const application = await prisma.sTKPlatformApplication.create({
            data: {
                stkName: stkName.trim(),
                stkType: stkType,
                contactName: contactName.trim(),
                contactPhone: contactPhone.trim(),
                contactEmail: contactEmail.trim().toLowerCase(),
                description: description?.trim() || null,
                status: 'PENDING',
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Başvurunuz başarıyla alındı. Yöneticilerimiz en kısa sürede sizinle iletişime geçecektir.',
            applicationId: application.id,
        }, { status: 201 })

    } catch (error) {
        console.error('[STK-APPLY] Error:', error)
        return NextResponse.json(
            { success: false, errors: ['Bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.'] },
            { status: 500 }
        )
    }
}
