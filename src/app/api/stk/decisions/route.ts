import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/stk/decisions - Kararları listele
export async function GET(request: NextRequest) {
    try {
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

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')

        const where = { stkId: stk.id }

        const [decisions, total] = await Promise.all([
            prisma.boardDecision.findMany({
                where,
                orderBy: { decisionDate: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.boardDecision.count({ where })
        ])

        return NextResponse.json({
            decisions,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Decisions GET error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}

// POST /api/stk/decisions - Yeni karar oluştur
export async function POST(request: NextRequest) {
    try {
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

        const body = await request.json()
        const { decisionNumber, decisionDate, subject, description } = body

        if (!decisionNumber || !decisionDate || !subject) {
            return NextResponse.json(
                { error: 'Karar numarası, tarihi ve konusu zorunludur' },
                { status: 400 }
            )
        }

        // Karar numarası benzersiz mi kontrol et
        const existing = await prisma.boardDecision.findUnique({
            where: {
                stkId_decisionNumber: {
                    stkId: stk.id,
                    decisionNumber
                }
            }
        })

        if (existing) {
            return NextResponse.json(
                { error: 'Bu karar numarası zaten kullanılıyor' },
                { status: 400 }
            )
        }

        const decision = await prisma.boardDecision.create({
            data: {
                stkId: stk.id,
                decisionNumber,
                decisionDate: new Date(decisionDate),
                subject,
                description
            }
        })

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'BOARD_DECISION',
                entityType: 'BoardDecision',
                entityId: decision.id,
                userId: user.id,
                userEmail: user.email,
                userName: user.name,
                description: `Karar oluşturuldu: ${decisionNumber} - ${subject}`,
                stkId: stk.id
            }
        })

        return NextResponse.json({ decision }, { status: 201 })
    } catch (error) {
        console.error('Decisions POST error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
