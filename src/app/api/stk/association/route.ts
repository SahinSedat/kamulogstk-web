import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/stk/association - Dernek profil bilgileri
export async function GET() {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'STK_MANAGER') {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const stk = await prisma.sTK.findFirst({
            where: { managerId: user.id },
            include: {
                boardMembers: {
                    where: { isActive: true },
                    orderBy: [
                        { position: 'asc' },
                        { startDate: 'desc' }
                    ]
                },
                _count: {
                    select: {
                        members: { where: { status: 'ACTIVE' } },
                        boardDecisions: true
                    }
                }
            }
        })

        if (!stk) {
            return NextResponse.json({ error: 'STK bulunamadı' }, { status: 404 })
        }

        return NextResponse.json({ stk })
    } catch (error) {
        console.error('Association GET error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}

// PUT /api/stk/association - Dernek profil güncelle
export async function PUT(request: NextRequest) {
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
        const {
            name,
            registrationNumber,
            taxNumber,
            email,
            phone,
            website,
            address,
            city,
            district,
            postalCode,
            foundedAt,
            description
        } = body

        const updated = await prisma.sTK.update({
            where: { id: stk.id },
            data: {
                ...(name && { name }),
                ...(registrationNumber !== undefined && { registrationNumber }),
                ...(taxNumber !== undefined && { taxNumber }),
                ...(email && { email }),
                ...(phone && { phone }),
                ...(website !== undefined && { website }),
                ...(address && { address }),
                ...(city && { city }),
                ...(district !== undefined && { district }),
                ...(postalCode !== undefined && { postalCode }),
                ...(foundedAt && { foundedAt: new Date(foundedAt) }),
                ...(description !== undefined && { description })
            }
        })

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'STK_UPDATE',
                entityType: 'STK',
                entityId: stk.id,
                userId: user.id,
                userEmail: user.email,
                userName: user.name,
                description: 'Dernek profili güncellendi',
                stkId: stk.id
            }
        })

        return NextResponse.json({ stk: updated })
    } catch (error) {
        console.error('Association PUT error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
