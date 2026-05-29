import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/stk/board-members - Yönetim kurulu üyelerini listele
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
        const activeOnly = searchParams.get('active') === 'true'

        const where: any = { stkId: stk.id }
        if (activeOnly) {
            where.isActive = true
        }

        const boardMembers = await prisma.boardMember.findMany({
            where,
            orderBy: [
                { isActive: 'desc' },
                { position: 'asc' },
                { startDate: 'desc' }
            ]
        })

        // İstatistikler
        const stats = {
            total: boardMembers.length,
            active: boardMembers.filter(m => m.isActive).length,
            withSignature: boardMembers.filter(m => m.hasSignature && m.isActive).length
        }

        return NextResponse.json({ success: true, boardMembers, stats })
    } catch (error) {
        console.error('Board members fetch error:', error)
        return NextResponse.json({ error: 'YK üyeleri alınamadı' }, { status: 500 })
    }
}

// POST /api/stk/board-members - Yeni YK üyesi ekle
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
        const { name, email, phone, tcKimlik, position, startDate, endDate, hasSignature } = body

        if (!name || !position || !startDate) {
            return NextResponse.json({ error: 'Ad, görev ve başlangıç tarihi zorunludur' }, { status: 400 })
        }

        const boardMember = await prisma.boardMember.create({
            data: {
                stkId: stk.id,
                name,
                email: email || null,
                phone: phone || null,
                tcKimlik: tcKimlik || null,
                position,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                hasSignature: hasSignature || false,
                isActive: true
            }
        })

        // Audit log (best-effort, hata verirse kayıt yine başarılı sayılır)
        try {
            await prisma.auditLog.create({
                data: {
                    action: 'BOARD_MEMBER_ADD' as any,
                    entityType: 'BoardMember',
                    entityId: boardMember.id,
                    userId: user.id,
                    userEmail: user.email,
                    userName: user.name,
                    description: `YK üyesi eklendi: ${name} (${position})`,
                    stkId: stk.id
                }
            })
        } catch (logErr) {
            console.error('Audit log error (non-blocking):', logErr)
        }

        return NextResponse.json({ success: true, boardMember })
    } catch (error) {
        console.error('Board member create error:', error)
        return NextResponse.json({ error: 'YK üyesi eklenemedi' }, { status: 500 })
    }
}
