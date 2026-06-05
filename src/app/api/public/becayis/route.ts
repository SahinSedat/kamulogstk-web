import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Public API: Becayiş ilanlarını listele (auth gerektirmez)
 *
 * GÜVENLİK: Hassas veriler (email, telefon, TC kimlik, adres) ASLA döndürülmez.
 * SAYFALAMA: page + limit desteği, infinite scroll için meta veri.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search') || ''
        const role = searchParams.get('role') || ''
        const city = searchParams.get('city') || ''
        const institution = searchParams.get('institution') || ''
        const assignmentMethod = searchParams.get('assignmentMethod') || ''
        const ownerId = searchParams.get('ownerId') || ''
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))

        // ownerId varsa: o kullanıcının ilanları (removed hariç)
        // yoksa: public ilanlar (pending ve removed hariç)
        const where: any = {
            AND: ownerId
                ? [{ ownerId }, { status: { notIn: ['removed'] } }]
                : [{ status: { in: ['approved', 'published', 'active'] } }],
        }

        if (search) {
            where.AND.push({
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { branch: { contains: search, mode: 'insensitive' } },
                    { adNumber: { contains: search, mode: 'insensitive' } },
                    { currentCity: { contains: search, mode: 'insensitive' } },
                    { targetCity: { contains: search, mode: 'insensitive' } },
                ]
            })
        }
        if (role) {
            if (role === 'memur') {
                where.AND.push({ role: { in: ['memur', 'sozlesmeli'] } });
            } else {
                where.AND.push({ role });
            }
        }
        if (city) {
            where.AND.push({
                OR: [
                    { currentCity: { contains: city, mode: 'insensitive' } },
                    { targetCity: { contains: city, mode: 'insensitive' } },
                ]
            })
        }
        if (institution) {
            where.AND.push({
                institution: { name: { contains: institution, mode: 'insensitive' } }
            })
        }
        if (assignmentMethod) {
            where.AND.push({ assignmentMethod })
        }

        // Ayrı rol sayıları (filtresiz, sadece pending ve removed hariç)
        const baseWhere = { status: { notIn: ['pending', 'removed', 'matched', 'rejected'] } }
        const [listings, total, isciCount, memurCount, sozlesmeli] = await Promise.all([
            prisma.becayisListing.findMany({
                where,
                orderBy: [{ isPremium: 'desc' }, { createdAt: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    institution: { select: { name: true } },
                    owner: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            avatarUrl: true,
                            isPremium: true,
                        },
                    },
                },
            }),
            prisma.becayisListing.count({ where }),
            prisma.becayisListing.count({ where: { ...baseWhere, role: 'isci' } }),
            prisma.becayisListing.count({ where: { ...baseWhere, role: 'memur' } }),
            prisma.becayisListing.count({ where: { ...baseWhere, role: 'sozlesmeli' } }),
        ])

        // Jeton maliyetini oku
        let listingCost = 30
        try {
            const costSetting = await prisma.systemSetting.findUnique({ where: { key: 'becayis_listing_cost' } })
            if (costSetting) listingCost = parseInt(costSetting.value) || 30
        } catch { /* fallback */ }

        // avatarUrl'leri tam URL'ye çevir (Flutter için)
        const BASE_URL = "https://kamulog.net";
        const resolvedListings = listings.map((l: any) => ({
            ...l,
            owner: l.owner ? {
                ...l.owner,
                avatarUrl: l.owner.avatarUrl
                    ? (l.owner.avatarUrl.startsWith("http") ? l.owner.avatarUrl : `${BASE_URL}${l.owner.avatarUrl}`)
                    : null,
            } : l.owner,
        }));

        return NextResponse.json({
            listings: resolvedListings,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total,
            roleCounts: {
                isci: Number(isciCount),
                memur: Number(memurCount),
                sozlesmeli: Number(sozlesmeli),
            },
            listingCost,
        })
    } catch (error) {
        console.error('Public becayis error:', error)
        return NextResponse.json({ error: 'İlanlar yüklenemedi' }, { status: 500 })
    }
}
