import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/stk/members - STK üyelerini listele
export async function GET(request: NextRequest) {
    try {
        /*
        const user = await getCurrentUser()
        if (!user || user.role !== 'STK_MANAGER') {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const stk = await prisma.sTK.findFirst({
            where: { managerId: user.id }
        })

        if (!stk) {
            return NextResponse.json({ error: 'STK bulunamadı' }, { status: 404 })
        }
        */

        // Use STK ID from middleware headers, fallback to findFirst for dev
        const stkId = request.headers.get('x-stk-id')
        const stk = stkId
            ? await prisma.sTK.findUnique({ where: { id: stkId } })
            : await prisma.sTK.findFirst()
        if (!stk) return NextResponse.json({ error: 'STK bulunamadı' }, { status: 404 })

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const search = searchParams.get('search')
        const showDeleted = searchParams.get('showDeleted') === 'true'

        const where: any = {
            stkId: stk.id
        }

        // Varsayılan: DELETED üyeleri gösterme
        if (showDeleted) {
            where.status = 'DELETED'
        } else if (status && status !== 'all') {
            // Virgülle ayrılmış birden fazla status destekle
            const statuses = status.split(',').map(s => s.trim())
            if (statuses.length === 1) {
                where.status = statuses[0]
            } else {
                where.status = { in: statuses }
            }
        } else {
            // Varsayılan: DELETED hariç tüm üyeler
            where.status = { not: 'DELETED' }
        }

        console.log('Members API Debug:', {
            url: request.url,
            statusParam: status,
            whereClause: JSON.stringify(where, null, 2)
        })

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { surname: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { memberNumber: { contains: search, mode: 'insensitive' } }
            ]
        }

        const members = await prisma.member.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        })

        console.log(`Members found: ${members.length}`)

        return NextResponse.json({ success: true, members })
    } catch (error) {
        console.error('Members fetch error:', error)
        return NextResponse.json({ error: 'Üyeler alınamadı' }, { status: 500 })
    }
}
