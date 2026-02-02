import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

// GET /api/stk/decisions/[id] - Karar detayı
export async function GET(
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
                                memberNumber: true,
                                email: true,
                                status: true
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

        // Kesinleşmiş kararlar düzenlenemez
        if (existing.status === 'FINALIZED') {
            return NextResponse.json(
                { error: 'Kesinleşmiş kararlar düzenlenemez' },
                { status: 400 }
            )
        }

        const body = await request.json()
        const { decisionNumber, decisionDate, subject, content, description } = body

        // Karar numarası değiştiyse benzersizlik kontrolü
        if (decisionNumber && decisionNumber !== existing.decisionNumber) {
            const duplicate = await prisma.boardDecision.findUnique({
                where: {
                    stkId_decisionNumber: {
                        stkId: stk.id,
                        decisionNumber
                    }
                }
            })
            if (duplicate) {
                return NextResponse.json(
                    { error: 'Bu karar numarası zaten kullanılıyor' },
                    { status: 400 }
                )
            }
        }

        const decision = await prisma.boardDecision.update({
            where: { id },
            data: {
                ...(decisionNumber && { decisionNumber }),
                ...(decisionDate && { decisionDate: new Date(decisionDate) }),
                ...(subject && { subject }),
                ...(content !== undefined && { content }),
                ...(description !== undefined && { description }),
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
                description: `Karar güncellendi: ${decision.decisionNumber}`,
                oldData: existing as object,
                newData: decision as object,
                stkId: stk.id
            }
        })

        return NextResponse.json({ decision })
    } catch (error) {
        console.error('Decision PUT error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}

// DELETE /api/stk/decisions/[id] - Karar sil (sadece taslak)
export async function DELETE(
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
                { error: 'Kesinleşmiş kararlar silinemez' },
                { status: 400 }
            )
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
                oldData: existing as object,
                stkId: stk.id
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Decision DELETE error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
