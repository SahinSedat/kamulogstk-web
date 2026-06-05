import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Logları listele
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const action = searchParams.get('action')
        const targetType = searchParams.get('targetType')
        const adminId = searchParams.get('adminId')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const search = searchParams.get('search')

        // Filtreler
        const where: any = {}

        if (action) where.action = action
        if (targetType) where.targetType = targetType
        if (adminId) where.adminId = adminId

        if (startDate || endDate) {
            where.createdAt = {}
            if (startDate) where.createdAt.gte = new Date(startDate)
            if (endDate) where.createdAt.lte = new Date(endDate)
        }

        if (search) {
            where.OR = [
                { details: { contains: search } },
                { targetId: { contains: search } },
            ]
        }

        const [logs, total] = await Promise.all([
            prisma.adminLog.findMany({
                where,
                include: {
                    admin: {
                        select: { id: true, name: true, email: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.adminLog.count({ where }),
        ])

        // İstatistikler
        const stats = await prisma.adminLog.groupBy({
            by: ['action'],
            _count: { id: true },
            where: {
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Son 24 saat
                }
            }
        })

        return NextResponse.json({
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
            stats: stats.reduce((acc, s) => {
                acc[s.action] = s._count.id
                return acc
            }, {} as Record<string, number>)
        })
    } catch (error) {
        console.error('Error fetching logs:', error)
        return NextResponse.json({ error: 'Loglar yüklenirken hata oluştu' }, { status: 500 })
    }
}

// POST - Yeni log kaydı oluştur (internal use)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const body = await request.json()
        const { action, targetType, targetId, details } = body

        // IP ve User Agent bilgilerini al
        const forwarded = request.headers.get('x-forwarded-for')
        const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
        const userAgent = request.headers.get('user-agent') || 'unknown'

        const log = await prisma.adminLog.create({
            data: {
                adminId: session.user.id,
                action,
                targetType,
                targetId,
                details: details ? JSON.stringify(details) : null,
                ipAddress: ip,
                userAgent,
            }
        })

        return NextResponse.json({ log })
    } catch (error) {
        console.error('Error creating log:', error)
        return NextResponse.json({ error: 'Log kaydı oluşturulurken hata oluştu' }, { status: 500 })
    }
}

// DELETE - Eski logları temizle (opsiyonel)
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const olderThan = searchParams.get('olderThan') // Gün sayısı

        if (!olderThan) {
            return NextResponse.json({ error: 'olderThan parametresi gerekli' }, { status: 400 })
        }

        const days = parseInt(olderThan)
        const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

        const { count } = await prisma.adminLog.deleteMany({
            where: {
                createdAt: { lt: date }
            }
        })

        // Bu işlemi de logla
        await prisma.adminLog.create({
            data: {
                adminId: session.user.id,
                action: 'DELETE',
                targetType: 'LOGS',
                details: JSON.stringify({ deletedCount: count, olderThanDays: days }),
            }
        })

        return NextResponse.json({ deleted: count })
    } catch (error) {
        console.error('Error deleting logs:', error)
        return NextResponse.json({ error: 'Loglar silinirken hata oluştu' }, { status: 500 })
    }
}
