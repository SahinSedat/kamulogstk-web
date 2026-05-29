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
        const status = searchParams.get('status')

        const resignations = await prisma.member.findMany({
            where: {
                stkId: stk.id,
                status: status && status !== 'all'
                    ? status as 'RESIGNATION_REQ' | 'RESIGNED'
                    : { in: ['RESIGNATION_REQ', 'RESIGNED'] }
            },
            include: {
                relatedDecisions: {
                    include: {
                        decision: {
                            select: {
                                id: true,
                                decisionNumber: true,
                                decisionDate: true,
                                subject: true,
                                status: true
                            }
                        }
                    }
                }
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

        // Resignation History fetch
        const history = await prisma.resignationHistory.findMany({
            where: {
                stkId: stk.id,
                // Status filtering could be applied here if needed across types
            },
            include: {
                member: true
            },
            orderBy: { resignationDate: 'desc' }
        })

        // Transform Member items
        const currentItems = await Promise.all(resignations.map(async (m) => {
            // ... existing map logic if any transformation needed ...
            // Actually prisma returns object, frontend expects object.
            // We just need to ensure shape matches.
            return m;
        }));

        // Transform History items to match Member/Resignation shape
        const historyItems = history.map(h => {
            return {
                id: h.id, // History ID
                // Member details
                name: h.member.name,
                surname: h.member.surname,
                memberNumber: h.member.memberNumber,
                email: h.member.email,
                phone: h.member.phone,
                // Resignation details from Snapshot
                status: h.status,
                leaveReason: h.leaveReason,
                leaveDate: h.resignationDate,
                joinDate: h.member.joinDate, // Might be new join date?
                updatedAt: h.createdAt,
                // decisions
                relatedDecisions: h.boardDecisionNumber ? [{
                    decision: {
                        id: 'history-decision', // Dummy ID
                        decisionNumber: h.boardDecisionNumber,
                        decisionDate: h.boardDecisionDate,
                        subject: 'İstifa Kabulü (Geçmiş)',
                        status: 'FINALIZED'
                    }
                }] : []
            }
        })

        // Merge and Sort
        // Note: resignations from prisma is Member[]
        // historyItems is mapped object.
        // We need to verify frontend Resignation interface matches what prisma Member returns?
        // Frontend expects member properties + relatedDecisions.
        // Prisma Member query included relatedDecisions.
        // So types are compatible-ish.

        const combined = [...resignations, ...historyItems].sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.leaveDate || 0).getTime();
            const dateB = new Date(b.updatedAt || b.leaveDate || 0).getTime();
            return dateB - dateA;
        })

        return NextResponse.json({
            resignations: combined,
            stats: {
                pending: pendingCount,
                resigned: resignedCount + history.length // Include history in stats? Maybe separate?
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
        const { memberId, action, reason, decisionNumber, decisionDate } = body

        if (!memberId) {
            return NextResponse.json({ error: 'Üye ID zorunludur' }, { status: 400 })
        }

        const member = await prisma.member.findFirst({
            where: { id: memberId, stkId: stk.id }
        })

        if (!member) {
            return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
        }

        // Action: Approve Resignation
        if (action === 'approve') {
            // Status check: Should be RESIGNATION_REQ (or ACTIVE if direct info?)
            // User says "istifa talebi onaylama". Usually implies request exists.
            // But we can be flexible.

            // Archive Application to ApplicationHistory (preserve the ACTIVE record)
            const application = await prisma.membershipApplication.findFirst({
                where: { memberId: member.id, stkId: stk.id }
            })
            if (application) {
                await prisma.applicationHistory.create({
                    data: {
                        stkId: stk.id,
                        applicationId: application.id,
                        status: application.status, // e.g. ACTIVE
                        applicationDate: application.applicationDate,
                        boardDecisionNumber: application.boardDecisionNumber,
                        boardDecisionDate: application.boardDecisionDate,
                        rejectionReason: application.rejectionReason,
                        reviewNotes: application.reviewNotes,
                        reviewedBy: application.reviewedBy,
                        reviewDate: application.reviewDate || new Date(),
                    }
                })

                // Update application status to RESIGNED
                await prisma.membershipApplication.update({
                    where: { id: application.id },
                    data: {
                        status: 'RESIGNED' as any,
                        reviewNotes: reason || 'İstifa',
                        reviewDate: new Date()
                    }
                })
            }

            // Create Resignation History
            await prisma.resignationHistory.create({
                data: {
                    stkId: stk.id,
                    memberId: member.id,
                    status: 'RESIGNED',
                    leaveReason: member.leaveReason || reason || 'İstifa Onayı',
                    resignationDate: new Date(),
                    boardDecisionNumber: decisionNumber,
                    boardDecisionDate: decisionDate ? new Date(decisionDate) : undefined
                }
            })

            // Update Member
            const updated = await prisma.member.update({
                where: { id: memberId },
                data: {
                    status: 'RESIGNED',
                    leaveDate: new Date(),
                    // leaveReason might already be set from request.
                    // If not, use generic? 
                    // No, usually kept as is or updated.
                }
            })

            // Audit
            await prisma.auditLog.create({
                data: {
                    action: 'MEMBER_UPDATE',
                    entityType: 'Member',
                    entityId: memberId,
                    userId: user.id,
                    userEmail: user.email,
                    userName: user.name,
                    description: `İstifa onaylandı: ${member.name} ${member.surname}`,
                    stkId: stk.id
                }
            })

            // Create notification for resigned member
            if (member.userId) {
                await prisma.notification.create({
                    data: {
                        userId: member.userId,
                        title: 'İstifanız Kabul Edildi',
                        message: `${stk.name} derneğinden istifanız kabul edilmiştir. Tüm işlemleri tamamlanmış sayılmıştır.`,
                        type: 'resignation',
                        link: `/uyegirisi`,
                        isRead: false
                    }
                })
            }

            return NextResponse.json({ success: true, member: updated })
        }

        // Default: Create Resignation Request
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
