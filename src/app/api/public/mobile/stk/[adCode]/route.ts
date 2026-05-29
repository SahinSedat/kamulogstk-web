import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// STK Detay API (adCode ile)
// STK'nın genel bilgilerini ve altındaki şubeleri döner
// GET /api/public/mobile/stk/TEST-1000

export async function GET(
    request: Request,
    { params }: { params: Promise<{ adCode: string }> }
) {
    try {
        const { adCode } = await params

        if (!adCode) {
            return NextResponse.json(
                { success: false, error: 'adCode parametresi gereklidir.' },
                { status: 400 }
            )
        }

        const stk = await prisma.sTK.findFirst({
            where: {
                adCode: {
                    equals: adCode.toUpperCase(),
                    mode: 'insensitive',
                },
                status: 'ACTIVE',
            },
            select: {
                id: true,
                name: true,
                adCode: true,
                slug: true,
                type: true,
                status: true,
                email: true,
                phone: true,
                website: true,
                address: true,
                city: true,
                district: true,
                logo: true,
                description: true,
                foundedAt: true,
                registrationNumber: true,
                // Şubeler
                branches: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        name: true,
                        adCode: true,
                        code: true,
                        city: true,
                        district: true,
                        address: true,
                        phone: true,
                        email: true,
                        managerName: true,
                    },
                    orderBy: [
                        { city: 'asc' },
                        { name: 'asc' },
                    ]
                },
            },
        })

        if (!stk) {
            return NextResponse.json(
                { success: false, error: 'Bu kod ile eşleşen aktif bir STK bulunamadı.' },
                { status: 404 }
            )
        }

        const response = {
            ...stk,
            stats: {
                memberCount: 0,
                branchCount: stk.branches.length,
                boardMemberCount: 0,
                decisionCount: 0,
                assemblyCount: 0,
            },
            branches: stk.branches.map(b => ({
                ...b,
                memberCount: 0,
            })),
        }

        return NextResponse.json({
            success: true,
            data: response,
        })

    } catch (error) {
        console.error('[MOBILE-STK-DETAIL] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Bilgiler yüklenirken bir hata oluştu.' },
            { status: 500 }
        )
    }
}
