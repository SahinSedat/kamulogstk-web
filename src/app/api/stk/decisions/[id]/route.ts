import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/stk/decisions/[id] - Karar detayı
export async function GET(
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
            where: { id, stkId: stk.id },
            include: {
                relatedMembers: {
                    include: {
                        member: {
                            select: {
                                id: true,
                                name: true,
                                surname: true,
                                memberNumber: true
                            }
                        }
                    }
                }
            }
        })

        if (!decision) {
            return NextResponse.json({ error: 'Karar bulunamadı' }, { status: 404 })
        }

        return NextResponse.json({ decision })
    } catch (error) {
        console.error('Decision GET error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}

// PUT /api/stk/decisions/[id] - Karar güncelle
export async function PUT(
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

        const existing = await prisma.boardDecision.findFirst({
            where: { id, stkId: stk.id }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Karar bulunamadı' }, { status: 404 })
        }

        const body = await request.json()
        const { decisionNumber, decisionDate, subject, description } = body

        const decision = await prisma.boardDecision.update({
            where: { id },
            data: {
                ...(decisionNumber && { decisionNumber }),
                ...(decisionDate && { decisionDate: new Date(decisionDate) }),
                ...(subject && { subject }),
                ...(description !== undefined && { description })
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
                description: `Karar güncellendi: ${decision.decisionNumber}`,
                stkId: stk.id
            }
        })

        // Send notification to related members if decision is finalized
        if (decision.status === 'FINALIZED' && existing.status !== 'FINALIZED') {
            const relatedMembers = await prisma.decisionMemberRelation.findMany({
                where: { boardDecisionId: id },
                include: { member: true }
            })

            if (relatedMembers.length > 0) {
                await prisma.notification.createMany({
                    data: relatedMembers
                        .filter(rel => rel.member.userId)
                        .map(rel => ({
                            userId: rel.member.userId,
                            title: 'Karar Sonuçlandırıldı',
                            message: `Sizinle ilgili ${decision.decisionNumber} nolu karar sonuçlandırılmıştır: ${decision.subject}`,
                            type: 'decision',
                            link: `/stk/kararlar/${id}`,
                            isRead: false
                        }))
                })
            }
        }

        return NextResponse.json({ decision })
    } catch (error) {
        console.error('Decision PUT error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}

// DELETE /api/stk/decisions/[id] - Karar sil
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

        const existing = await prisma.boardDecision.findFirst({
            where: { id, stkId: stk.id }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Karar bulunamadı' }, { status: 404 })
        }

        await prisma.boardDecision.delete({ where: { id } })

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'BOARD_DECISION',
                entityType: 'BoardDecision',
                entityId: id,
                userId: user.id,
                userEmail: user.email,
                userName: user.name,
                description: `Karar silindi: ${existing.decisionNumber}`,
                stkId: stk.id
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Decision DELETE error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
