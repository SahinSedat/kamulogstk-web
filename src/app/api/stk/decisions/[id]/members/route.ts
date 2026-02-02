import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

// POST /api/stk/decisions/[id]/members - Üye ilişkilendir
export async function POST(
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
            where: { id, stkId: stk.id }
        })

        if (!decision) {
            return NextResponse.json({ error: 'Karar bulunamadı' }, { status: 404 })
        }

        const body = await request.json()
        const { memberId, type, notes } = body

        if (!memberId || !type) {
            return NextResponse.json(
                { error: 'Üye ID ve ilişki tipi zorunludur' },
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

        // Zaten bağlı mı?
        const existing = await prisma.decisionMember.findUnique({
            where: {
                decisionId_memberId: {
                    decisionId: id,
                    memberId
                }
            }
        })

        if (existing) {
            return NextResponse.json(
                { error: 'Bu üye zaten bu karara bağlı' },
                { status: 400 }
            )
        }

        const decisionMember = await prisma.decisionMember.create({
            data: {
                decisionId: id,
                memberId,
                type,
                notes
            },
            include: {
                member: {
                    select: { id: true, name: true, surname: true, memberNumber: true }
                }
            }
        })

        // Karar tipine göre üye durumunu güncelle
        if (type === 'MEMBERSHIP_ACCEPT' && decision.status === 'FINALIZED') {
            await prisma.member.update({
                where: { id: memberId },
                data: {
                    status: 'ACTIVE',
                    joinDate: decision.decisionDate
                }
            })
        } else if (type === 'RESIGNATION_ACCEPT' && decision.status === 'FINALIZED') {
            await prisma.member.update({
                where: { id: memberId },
                data: {
                    status: 'RESIGNED',
                    leaveDate: decision.decisionDate,
                    leaveReason: 'İstifa (YK Kararı: ' + decision.decisionNumber + ')'
                }
            })
        } else if (type === 'EXPULSION' && decision.status === 'FINALIZED') {
            await prisma.member.update({
                where: { id: memberId },
                data: {
                    status: 'EXPELLED',
                    leaveDate: decision.decisionDate,
                    leaveReason: 'İhraç (YK Kararı: ' + decision.decisionNumber + ')'
                }
            })
        }

        return NextResponse.json({ decisionMember }, { status: 201 })
    } catch (error) {
        console.error('Decision members POST error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}

// DELETE /api/stk/decisions/[id]/members - Üye ilişkisini kaldır
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
        const { searchParams } = new URL(request.url)
        const memberId = searchParams.get('memberId')

        if (!memberId) {
            return NextResponse.json({ error: 'Üye ID gerekli' }, { status: 400 })
        }

        const stk = await prisma.sTK.findFirst({
            where: { managerId: user.id }
        })

        if (!stk) {
            return NextResponse.json({ error: 'STK bulunamadı' }, { status: 404 })
        }

        const decision = await prisma.boardDecision.findFirst({
            where: { id, stkId: stk.id }
        })

        if (!decision) {
            return NextResponse.json({ error: 'Karar bulunamadı' }, { status: 404 })
        }

        if (decision.status === 'FINALIZED') {
            return NextResponse.json(
                { error: 'Kesinleşmiş kararlardaki üye ilişkileri kaldırılamaz' },
                { status: 400 }
            )
        }

        await prisma.decisionMember.delete({
            where: {
                decisionId_memberId: {
                    decisionId: id,
                    memberId
                }
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Decision members DELETE error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
