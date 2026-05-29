import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ============================================
// Faaliyet/Etkinlik Listeleme API (Mobil)
// ============================================
// GET /api/public/mobile/activities
//
// Query Parametreleri:
//   stkId     (zorunlu*)   — STK ID'si
//   branchId  (opsiyonel)  — Şube ID'si (verilirse sadece şube faaliyetleri)
//   upcoming  (opsiyonel)  — 'true' ise sadece gelecek tarihli faaliyetler
//   limit     (opsiyonel)  — Sonuç limiti (varsayılan 20)
//   offset    (opsiyonel)  — Sayfalama offset'i
//
// * stkId veya branchId'den en az biri zorunlu

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)

        const stkId = searchParams.get('stkId')
        const branchId = searchParams.get('branchId')
        const upcoming = searchParams.get('upcoming') === 'true'
        const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 50)
        const offset = parseInt(searchParams.get('offset') || '0') || 0

        if (!stkId && !branchId) {
            return NextResponse.json(
                { success: false, error: 'stkId veya branchId parametresi gereklidir.' },
                { status: 400 }
            )
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { isPublished: true }

        if (branchId) {
            // Belirli bir şubenin faaliyetleri
            where.branchId = branchId
        } else if (stkId) {
            // STK'nın tüm faaliyetleri (merkez + tüm şubeler)
            where.stkId = stkId
        }

        // Sadece gelecek tarihli faaliyetler
        if (upcoming) {
            where.date = { gte: new Date() }
        }

        const [activities, total] = await Promise.all([
            prisma.sTKActivity.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    content: true,
                    date: true,
                    location: true,
                    imageUrl: true,
                    createdAt: true,
                    branch: {
                        select: {
                            id: true,
                            name: true,
                            city: true,
                        }
                    },
                    stk: {
                        select: {
                            id: true,
                            name: true,
                            adCode: true,
                            logo: true,
                        }
                    },
                },
                take: limit,
                skip: offset,
                orderBy: { date: upcoming ? 'asc' : 'desc' },
            }),
            prisma.sTKActivity.count({ where }),
        ])

        return NextResponse.json({
            success: true,
            filters: { stkId, branchId, upcoming },
            pagination: { total, limit, offset, hasMore: offset + limit < total },
            results: activities.map(a => ({
                id: a.id,
                title: a.title,
                content: a.content,
                date: a.date,
                location: a.location,
                imageUrl: a.imageUrl,
                createdAt: a.createdAt,
                branch: a.branch,
                stk: a.stk,
            })),
        })

    } catch (error) {
        console.error('[MOBILE-ACTIVITIES] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Faaliyetler yüklenirken bir hata oluştu.' },
            { status: 500 }
        )
    }
}
