import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/stk/payments - STK ödemelerini listele
export async function GET(request: NextRequest) {
    try {
        const stkId = request.headers.get('x-stk-id')
        const stk = stkId
            ? await prisma.sTK.findUnique({ where: { id: stkId } })
            : await prisma.sTK.findFirst()
        if (!stk) return NextResponse.json({ error: 'STK bulunamadı' }, { status: 404 })

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search')
        const status = searchParams.get('status')
        const showDeleted = searchParams.get('showDeleted') === 'true'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')

        const where: any = {
            stkId: stk.id,
        }

        // Varsayılan: DELETED olanları gösterme
        if (showDeleted) {
            where.status = 'DELETED'
        } else if (status && status !== 'all') {
            where.status = status
        } else {
            where.status = { not: 'DELETED' }
        }

        if (search) {
            where.OR = [
                { member: { name: { contains: search, mode: 'insensitive' } } },
                { member: { surname: { contains: search, mode: 'insensitive' } } },
                { transactionRef: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ]
        }

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: {
                    member: {
                        select: { id: true, name: true, surname: true, email: true, phone: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.payment.count({ where })
        ])

        // KRİTİK: Finansal özet hesaplamasında DELETED ödemeleri DAHİL ETME!
        const summaryWhere = {
            stkId: stk.id,
            status: { not: 'DELETED' as const },
        }

        const [confirmedSum, pendingSum, totalActivePayments] = await Promise.all([
            prisma.payment.aggregate({
                where: { ...summaryWhere, status: 'CONFIRMED' },
                _sum: { amount: true },
                _count: true,
            }),
            prisma.payment.aggregate({
                where: { ...summaryWhere, status: 'PENDING' },
                _sum: { amount: true },
                _count: true,
            }),
            prisma.payment.count({
                where: summaryWhere
            }),
        ])

        const deletedCount = await prisma.payment.count({
            where: { stkId: stk.id, status: 'DELETED' }
        })

        return NextResponse.json({
            success: true,
            payments: payments.map(p => ({
                ...p,
                amount: p.amount ? Number(p.amount) : 0,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            summary: {
                totalConfirmed: Number(confirmedSum._sum.amount || 0),
                confirmedCount: confirmedSum._count,
                totalPending: Number(pendingSum._sum.amount || 0),
                pendingCount: pendingSum._count,
                totalActivePayments,
                deletedCount,
            }
        })
    } catch (error) {
        console.error('STK Payments fetch error:', error)
        return NextResponse.json({ error: 'Ödemeler alınamadı' }, { status: 500 })
    }
}
