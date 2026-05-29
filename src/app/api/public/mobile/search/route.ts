import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ============================================
// Mobil Akıllı Arama & Listeleme API
// ============================================
// GET /api/public/mobile/search
//
// Query Parametreleri:
//   q         (opsiyonel)  — İsim veya adCode araması. Boşsa tüm listeyi döner.
//   type      (opsiyonel)  — 'DERNEK' | 'SENDIKA' | 'VAKIF' vb. Ana STK türü filtresi.
//   isBranch  (opsiyonel)  — 'true' ise SADECE şubelerde arar, yoksa ana STK'larda arar.
//   limit     (opsiyonel)  — Sonuç limiti (varsayılan 20, max 50).
//   offset    (opsiyonel)  — Sayfalama offset'i (varsayılan 0).
//
// Örnek kullanım:
//   /api/public/mobile/search?type=SENDIKA              → Tüm sendikaları listele
//   /api/public/mobile/search?type=SENDIKA&isBranch=true → Sendika şubelerini listele
//   /api/public/mobile/search?type=DERNEK&q=Ankara       → Ankara derneklerini ara
//   /api/public/mobile/search?q=TEST-1000                → adCode ile ara

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)

        // --- Parametreleri oku ---
        const query = searchParams.get('q')?.trim() || null
        const type = searchParams.get('type')?.toUpperCase() || null
        const isBranch = searchParams.get('isBranch') === 'true'
        const limit = Math.min(parseInt(searchParams.get('limit') || '20') || 20, 50)
        const offset = parseInt(searchParams.get('offset') || '0') || 0

        // Arama terimi varsa en az 2 karakter olmalı
        if (query && query.length < 2) {
            return NextResponse.json(
                { success: false, error: 'Arama terimi en az 2 karakter olmalıdır.' },
                { status: 400 }
            )
        }

        // adCode formatı tespiti (SND-1234 gibi)
        const isAdCode = query ? /^[A-Za-z]{2,5}-\d+/.test(query) : false

        // ============================================
        // ŞUBE ARAMASI (isBranch=true)
        // ============================================
        if (isBranch) {
            // Şube where koşulları
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const branchWhere: any = { isActive: true }

            // Tür filtresi: Şubenin bağlı olduğu STK'nın türüne göre filtrele
            if (type) {
                branchWhere.stk = { type, status: 'ACTIVE' }
            }

            // Arama terimi
            if (query) {
                branchWhere.OR = isAdCode
                    ? [
                        { adCode: { equals: query.toUpperCase(), mode: 'insensitive' } },
                        { adCode: { startsWith: query.toUpperCase(), mode: 'insensitive' } },
                    ]
                    : [
                        { name: { contains: query, mode: 'insensitive' } },
                        { adCode: { contains: query, mode: 'insensitive' } },
                        { city: { contains: query, mode: 'insensitive' } },
                    ]
            }

            const [branches, total] = await Promise.all([
                prisma.sTKBranch.findMany({
                    where: branchWhere,
                    select: {
                        id: true,
                        name: true,
                        adCode: true,
                        city: true,
                        district: true,
                        phone: true,
                        email: true,
                        managerName: true,
                        stk: {
                            select: {
                                id: true,
                                name: true,
                                adCode: true,
                                type: true,
                                logo: true,
                            }
                        },
                    },
                    take: limit,
                    skip: offset,
                    orderBy: [{ city: 'asc' }, { name: 'asc' }],
                }),
                prisma.sTKBranch.count({ where: branchWhere }),
            ])

            return NextResponse.json({
                success: true,
                query,
                filters: { type, isBranch: true },
                pagination: { total, limit, offset, hasMore: offset + limit < total },
                results: branches.map(b => ({
                    id: b.id,
                    resultType: 'branch' as const,
                    name: b.name,
                    adCode: b.adCode,
                    city: b.city,
                    district: b.district,
                    phone: b.phone,
                    email: b.email,
                    managerName: b.managerName,
                    parentSTK: b.stk,
                    memberCount: 0,
                })),
            })
        }

        // ============================================
        // ANA STK ARAMASI (varsayılan)
        // ============================================
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stkWhere: any = { status: 'ACTIVE' }

        // Tür filtresi
        if (type) {
            stkWhere.type = type
        }

        // Arama terimi
        if (query) {
            stkWhere.OR = isAdCode
                ? [
                    { adCode: { equals: query.toUpperCase(), mode: 'insensitive' } },
                    { adCode: { startsWith: query.toUpperCase(), mode: 'insensitive' } },
                ]
                : [
                    { name: { contains: query, mode: 'insensitive' } },
                    { adCode: { contains: query, mode: 'insensitive' } },
                    { city: { contains: query, mode: 'insensitive' } },
                ]
        }

        const [stks, total] = await Promise.all([
            prisma.sTK.findMany({
                where: stkWhere,
                select: {
                    id: true,
                    name: true,
                    adCode: true,
                    type: true,
                    city: true,
                    district: true,
                    logo: true,
                    description: true,
                    _count: {
                        select: { branches: true }
                    }
                },
                take: limit,
                skip: offset,
                orderBy: { name: 'asc' },
            }),
            prisma.sTK.count({ where: stkWhere }),
        ])

        return NextResponse.json({
            success: true,
            query,
            filters: { type, isBranch: false },
            pagination: { total, limit, offset, hasMore: offset + limit < total },
            results: stks.map(s => ({
                id: s.id,
                resultType: 'stk' as const,
                name: s.name,
                adCode: s.adCode,
                stkType: s.type,
                city: s.city,
                district: s.district,
                logo: s.logo,
                description: s.description,
                memberCount: 0,
                branchCount: s._count.branches,
            })),
        })

    } catch (error) {
        console.error('[MOBILE-SEARCH] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Arama sırasında bir hata oluştu.' },
            { status: 500 }
        )
    }
}
