import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PUT /api/stk/board-members/[id] - YK üyesi güncelle
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
        const body = await request.json()
        const { name, email, phone, tcKimlik, position, startDate, endDate, hasSignature, isActive } = body

        const existing = await prisma.boardMember.findFirst({
            where: { id, stkId: stk.id }
        })

        if (!existing) {
            return NextResponse.json({ error: 'YK üyesi bulunamadı' }, { status: 404 })
        }

        const updated = await prisma.boardMember.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(email !== undefined && { email: email || null }),
                ...(phone !== undefined && { phone: phone || null }),
                ...(tcKimlik !== undefined && { tcKimlik: tcKimlik || null }),
                ...(position !== undefined && { position }),
                ...(startDate !== undefined && { startDate: new Date(startDate) }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                ...(hasSignature !== undefined && { hasSignature }),
                ...(isActive !== undefined && { isActive })
            }
        })

        return NextResponse.json({ success: true, boardMember: updated })
    } catch (error) {
        console.error('Board member update error:', error)
        return NextResponse.json({ error: 'YK üyesi güncellenemedi' }, { status: 500 })
    }
}

// DELETE /api/stk/board-members/[id] - YK üyesi sil
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

        const existing = await prisma.boardMember.findFirst({
            where: { id, stkId: stk.id }
        })

        if (!existing) {
            return NextResponse.json({ error: 'YK üyesi bulunamadı' }, { status: 404 })
        }

        await prisma.boardMember.delete({ where: { id } })

        // Audit log (best-effort)
        try {
            await prisma.auditLog.create({
                data: {
                    action: 'BOARD_MEMBER_REMOVE' as any,
                    entityType: 'BoardMember',
                    entityId: id,
                    userId: user.id,
                    userEmail: user.email,
                    userName: user.name,
                    description: `YK üyesi silindi: ${existing.name} (${existing.position})`,
                    stkId: stk.id
                }
            })
        } catch (logErr) {
            console.error('Audit log error (non-blocking):', logErr)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Board member delete error:', error)
        return NextResponse.json({ error: 'YK üyesi silinemedi' }, { status: 500 })
    }
}
