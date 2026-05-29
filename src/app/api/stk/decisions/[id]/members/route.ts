import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST /api/stk/decisions/[id]/members - Üye ilişkilendir
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

        if (decision.status === 'FINALIZED') {
            return NextResponse.json({ error: 'Kesinleşmiş karara üye eklenemez' }, { status: 400 })
        }

        const body = await request.json()
        const { memberId, memberIds, type, notes } = body

        const idsToProcess = memberIds || (memberId ? [memberId] : [])

        if (idsToProcess.length === 0 || !type) {
            return NextResponse.json(
                { error: 'Üye seçimi ve ilişki tipi zorunludur' },
                { status: 400 }
            )
        }

        // Üyelerin STK'ya ait olduğunu doğrula
        const validMembers = await prisma.member.findMany({
            where: {
                id: { in: idsToProcess },
                stkId: stk.id
            },
            select: { id: true, name: true, surname: true }
        })

        if (validMembers.length === 0) {
            return NextResponse.json({ error: 'Geçerli üye bulunamadı' }, { status: 404 })
        }

        const validIds = validMembers.map(m => m.id)

        // Toplu oluştur (varsa atla)
        const result = await prisma.decisionMember.createMany({
            data: validIds.map(mid => ({
                decisionId: id,
                memberId: mid,
                type,
                notes: notes || null
            })),
            skipDuplicates: true
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
                description: `Karara ${result.count} üye ilişkilendirildi (${type})`,
                stkId: stk.id
            }
        })

        return NextResponse.json({ count: result.count, success: true }, { status: 201 })
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

        if (decision.status === 'FINALIZED') {
            return NextResponse.json({ error: 'Kesinleşmiş karardan üye çıkarılamaz' }, { status: 400 })
        }

        const body = await request.json()
        const { decisionMemberId } = body

        if (!decisionMemberId) {
            return NextResponse.json({ error: 'İlişki ID zorunludur' }, { status: 400 })
        }

        await prisma.decisionMember.delete({
            where: { id: decisionMemberId }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Decision member unlink error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
