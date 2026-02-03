import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/stk/applications/[id] - Tek başvuru detayı
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
        }

        const stk = await prisma.sTK.findFirst({
            where: { managerId: user.id }
        })

        if (!stk) {
            return NextResponse.json({ error: 'STK bulunamadı' }, { status: 404 })
        }

        const application = await prisma.membershipApplication.findFirst({
            where: { id, stkId: stk.id },
            include: {
                member: true
            }
        })

        if (!application) {
            return NextResponse.json({ error: 'Başvuru bulunamadı' }, { status: 404 })
        }

        return NextResponse.json({ success: true, application })
    } catch (error) {
        console.error('Application fetch error:', error)
        return NextResponse.json({ error: 'Başvuru alınamadı' }, { status: 500 })
    }
}

// PUT /api/stk/applications/[id] - Başvuru güncelle (onay/red)
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
        }

        const stk = await prisma.sTK.findFirst({
            where: { managerId: user.id }
        })

        if (!stk) {
            return NextResponse.json({ error: 'STK bulunamadı' }, { status: 404 })
        }

        const body = await request.json()
        const { action, boardDecisionNumber, boardDecisionDate, rejectionReason, reviewNotes } = body

        const application = await prisma.membershipApplication.findFirst({
            where: { id, stkId: stk.id },
            include: { member: true }
        })

        if (!application) {
            return NextResponse.json({ error: 'Başvuru bulunamadı' }, { status: 404 })
        }

        if (action === 'approve') {
            // Onay için karar numarası ve tarihi zorunlu
            if (!boardDecisionNumber || !boardDecisionDate) {
                return NextResponse.json({
                    error: 'Onay için YK karar numarası ve tarihi zorunludur'
                }, { status: 400 })
            }

            // Update application
            await prisma.membershipApplication.update({
                where: { id },
                data: {
                    status: 'ACTIVE',
                    boardDecisionNumber,
                    boardDecisionDate: new Date(boardDecisionDate),
                    reviewedBy: user.id,
                    reviewDate: new Date(),
                    reviewNotes
                }
            })

            // Activate member
            await prisma.member.update({
                where: { id: application.memberId },
                data: {
                    status: 'ACTIVE',
                    membershipStartDate: new Date()
                }
            })

            // Log
            await prisma.auditLog.create({
                data: {
                    action: 'MEMBERSHIP_APPROVED',
                    entityType: 'MembershipApplication',
                    entityId: id,
                    userId: user.id,
                    userEmail: user.email,
                    userName: user.name,
                    description: `Üyelik onaylandı: ${application.member.name} ${application.member.surname} (Karar: ${boardDecisionNumber})`,
                    stkId: stk.id
                }
            })

            return NextResponse.json({
                success: true,
                message: 'Üyelik başvurusu onaylandı'
            })

        } else if (action === 'reject') {
            if (!rejectionReason) {
                return NextResponse.json({
                    error: 'Red için gerekçe zorunludur'
                }, { status: 400 })
            }

            // Update application
            await prisma.membershipApplication.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    rejectionReason,
                    reviewedBy: user.id,
                    reviewDate: new Date(),
                    reviewNotes
                }
            })

            // Update member status
            await prisma.member.update({
                where: { id: application.memberId },
                data: { status: 'REJECTED' }
            })

            // Log
            await prisma.auditLog.create({
                data: {
                    action: 'MEMBERSHIP_REJECTED',
                    entityType: 'MembershipApplication',
                    entityId: id,
                    userId: user.id,
                    userEmail: user.email,
                    userName: user.name,
                    description: `Üyelik reddedildi: ${application.member.name} ${application.member.surname}`,
                    stkId: stk.id
                }
            })

            return NextResponse.json({
                success: true,
                message: 'Üyelik başvurusu reddedildi'
            })
        }

        return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
    } catch (error) {
        console.error('Application update error:', error)
        return NextResponse.json({ error: 'Başvuru güncellenemedi' }, { status: 500 })
    }
}
