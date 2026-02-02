import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

// POST /api/stk/decisions/[id]/finalize - Kararı kesinleştir
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyAuth(request)
        if (!user || user.role !== 'STK_MANAGER') {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const { id } = await params

        const stk = await prisma.sTK.findFirst({
            where: { managerId: user.id }
        })

        if (!stk) {
            return NextResponse.json({ error: 'STK bulunamadı' }, { status: 404 })
        }

        const existing = await prisma.boardDecision.findFirst({
            where: { id, stkId: stk.id }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Karar bulunamadı' }, { status: 404 })
        }

        if (existing.status === 'FINALIZED') {
            return NextResponse.json(
                { error: 'Karar zaten kesinleşmiş' },
                { status: 400 }
            )
        }

        const decision = await prisma.boardDecision.update({
            where: { id },
            data: {
                status: 'FINALIZED',
                updatedBy: user.id
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
                description: `Karar kesinleştirildi: ${decision.decisionNumber} - ${decision.subject}`,
                stkId: stk.id
            }
        })

        return NextResponse.json({ decision })
    } catch (error) {
        console.error('Decision finalize error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
