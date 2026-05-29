import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser || currentUser.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const status = searchParams.get('status') || 'all'
        const type = searchParams.get('type') || 'all'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')

        const where: Prisma.PaymentWhereInput = {}

        if (search) {
            where.OR = [
                { member: { name: { contains: search, mode: 'insensitive' } } },
                { member: { surname: { contains: search, mode: 'insensitive' } } },
                { stk: { name: { contains: search, mode: 'insensitive' } } },
                { transactionRef: { contains: search, mode: 'insensitive' } }
            ]
        }

        if (status !== 'all') {
            where.status = status as any
        }

        if (type !== 'all') {
            where.type = type as any
        }

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: {
                    stk: {
                        select: { id: true, name: true }
                    },
                    member: {
                        select: { id: true, name: true, surname: true, email: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.payment.count({ where })
        ])

        return NextResponse.json({
            success: true,
            payments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Payments fetch error:', error)
        return NextResponse.json({ success: false, error: 'Ödemeler yüklenemedi' }, { status: 500 })
    }
}
