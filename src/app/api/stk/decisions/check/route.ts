import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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
        const number = searchParams.get('number')

        if (!number) {
            return NextResponse.json({ error: 'Numara gerekli' }, { status: 400 })
        }

        const decision = await prisma.boardDecision.findFirst({
            where: {
                stkId: stk.id,
                decisionNumber: number,
                status: 'FINALIZED'
            },
            select: { id: true }
        })

        return NextResponse.json({ exists: !!decision })
    } catch (error) {
        console.error('Check decision number error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
