import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST /api/stk/decisions/[id]/members - Üye ilişkilendir
// Note: This endpoint will be fully functional after DecisionMember table migration
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

        const body = await request.json()
        const { memberId, type } = body

        if (!memberId || !type) {
            return NextResponse.json(
                { error: 'Üye ve ilişki tipi zorunludur' },
                { status: 400 }
            )
        }

        // Üye kontrolü
        const member = await prisma.member.findFirst({
            where: { id: memberId, stkId: stk.id }
        })

        if (!member) {
            return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
        }

        // Note: After migration, use DecisionMember model
        // const decisionMember = await prisma.decisionMember.create({...})

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'BOARD_DECISION',
                entityType: 'BoardDecision',
                entityId: decision.id,
                userId: user.id,
                userEmail: user.email,
                userName: user.name,
                description: `Karara üye ilişkilendirildi: ${member.name} ${member.surname} (${type})`,
                stkId: stk.id
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Migration sonrası tam aktif olacak'
        })
    } catch (error) {
        console.error('Decision member link error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}

// DELETE /api/stk/decisions/[id]/members - Üye ilişkisini kaldır
export async function DELETE(
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

        const body = await request.json()
        const { memberId } = body

        if (!memberId) {
            return NextResponse.json({ error: 'Üye ID zorunludur' }, { status: 400 })
        }

        // Note: After migration, delete from DecisionMember

        return NextResponse.json({
            success: true,
            message: 'Migration sonrası tam aktif olacak'
        })
    } catch (error) {
        console.error('Decision member unlink error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
