import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST /api/stk/decisions/[id]/finalize - Kararı kesinleştir
// Note: This endpoint will be fully functional after schema migration
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params

        const decision = await prisma.boardDecision.findFirst({
            where: { id, stkId: stk.id }
        })

        if (!decision) {
            return NextResponse.json({ error: 'Karar bulunamadı' }, { status: 404 })
        }

        // Note: After migration, add status check and update
        // if (decision.status === 'FINALIZED') {
        //     return NextResponse.json({ error: 'Karar zaten kesinleşmiş' }, { status: 400 })
        // }

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'BOARD_DECISION',
                entityType: 'BoardDecision',
                entityId: decision.id,
                userId: user.id,
                userEmail: user.email,
                userName: user.name,
                description: `Karar kesinleştirildi: ${decision.decisionNumber}`,
                stkId: stk.id
            }
        })

        return NextResponse.json({
            decision,
            message: 'Karar kesinleştirildi (migration sonrası tam aktif olacak)'
        })
    } catch (error) {
        console.error('Decision finalize error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
