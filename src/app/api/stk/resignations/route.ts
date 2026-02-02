import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/stk/resignations - İstifa taleplerini listele
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
        const status = searchParams.get('status') || 'RESIGNATION_REQ'

        const resignations = await prisma.member.findMany({
            where: {
                stkId: stk.id,
                status: status as 'RESIGNATION_REQ' | 'RESIGNED'
            },
            orderBy: { updatedAt: 'desc' }
        })

        // Aktif ve bekleyen istifa sayıları
        const [pendingCount, resignedCount] = await Promise.all([
            prisma.member.count({
                where: { stkId: stk.id, status: 'RESIGNATION_REQ' }
            }),
            prisma.member.count({
                where: { stkId: stk.id, status: 'RESIGNED' }
            })
        ])

        return NextResponse.json({
            resignations,
            stats: {
                pending: pendingCount,
                resigned: resignedCount
            }
        })
    } catch (error) {
        console.error('Resignations GET error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}

// POST /api/stk/resignations - İstifa talebi oluştur (üye adına)
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
        const { memberId, reason } = body

        if (!memberId) {
            return NextResponse.json({ error: 'Üye ID zorunludur' }, { status: 400 })
        }

        const member = await prisma.member.findFirst({
            where: { id: memberId, stkId: stk.id }
        })

        if (!member) {
            return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
        }

        if (member.status !== 'ACTIVE') {
            return NextResponse.json(
                { error: 'Sadece aktif üyeler için istifa talebi oluşturulabilir' },
                { status: 400 }
            )
        }

        const updated = await prisma.member.update({
            where: { id: memberId },
            data: {
                status: 'RESIGNATION_REQ',
                leaveReason: reason || 'İstifa talebi'
            }
        })

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'MEMBER_RESIGN',
                entityType: 'Member',
                entityId: memberId,
                userId: user.id,
                userEmail: user.email,
                userName: user.name,
                description: `İstifa talebi oluşturuldu: ${member.name} ${member.surname}`,
                stkId: stk.id
            }
        })

        return NextResponse.json({ member: updated }, { status: 201 })
    } catch (error) {
        console.error('Resignations POST error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
