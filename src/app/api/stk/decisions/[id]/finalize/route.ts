import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST /api/stk/decisions/[id]/finalize - Kararı kesinleştir
// Handles MEMBERSHIP_ACCEPT, RESIGNATION_ACCEPT, RESIGNATION_REJECT, EXPULSION
export async function POST(
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
                        member: true
                    }
                }
            }
        })

        if (!decision) {
            return NextResponse.json({ error: 'Karar bulunamadı' }, { status: 404 })
        }

        if (decision.status === 'FINALIZED') {
            return NextResponse.json({ error: 'Karar zaten kesinleşmiş' }, { status: 400 })
        }

        // Üye ilişkilendirmesi zorunlu
        if (decision.relatedMembers.length === 0) {
            return NextResponse.json(
                { error: 'Karara en az bir üye ilişkilendirilmelidir. Lütfen önce üye ekleyin.' },
                { status: 400 }
            )
        }

        // Kararı kesinleştir
        const updated = await prisma.boardDecision.update({
            where: { id },
            data: {
                status: 'FINALIZED',
                updatedBy: user.id
            }
        })

        // İlişkili üyelerin durumlarını güncelle
        for (const rm of decision.relatedMembers) {
            if (rm.type === 'RESIGNATION_ACCEPT') {
                // İstifa tarihçesine ekle
                await prisma.resignationHistory.create({
                    data: {
                        stkId: stk.id,
                        memberId: rm.memberId,
                        status: 'RESIGNED',
                        leaveReason: rm.member.leaveReason,
                        resignationDate: new Date(),
                        boardDecisionNumber: decision.decisionNumber,
                        boardDecisionDate: decision.decisionDate
                    }
                })

                await prisma.member.update({
                    where: { id: rm.memberId },
                    data: {
                        status: 'RESIGNED',
                        leaveDate: new Date()
                    }
                })
            } else if (rm.type === 'RESIGNATION_REJECT') {
                // İstifa reddi: Üyeyi tekrar ACTIVE durumuna al
                // Tarihçeye 'REJECTED' olarak ekle (İstifa reddedildi anlamında)
                await prisma.resignationHistory.create({
                    data: {
                        stkId: stk.id,
                        memberId: rm.memberId,
                        status: 'REJECTED', // İstifa talebi reddedildi
                        leaveReason: rm.member.leaveReason,
                        resignationDate: new Date(),
                        boardDecisionNumber: decision.decisionNumber,
                        boardDecisionDate: decision.decisionDate
                    }
                })

                await prisma.member.update({
                    where: { id: rm.memberId },
                    data: {
                        status: 'ACTIVE', // Geri aktif
                        leaveReason: null // Talebi temizle
                    }
                })
            } else if (rm.type === 'MEMBERSHIP_ACCEPT') {
                // Üyelik kabulü kararı: PENDING durumuna al
                // Son onay başvurular sayfasında yapılacak
                await prisma.member.update({
                    where: { id: rm.memberId },
                    data: {
                        status: 'PENDING'
                    }
                })
                // Başvuru kaydını da güncelle
                await prisma.membershipApplication.updateMany({
                    where: { memberId: rm.memberId, status: 'APPLIED' },
                    data: {
                        status: 'PENDING',
                        boardDecisionNumber: decision.decisionNumber,
                        boardDecisionDate: decision.decisionDate
                    }
                })
            } else if (rm.type === 'EXPULSION') {
                await prisma.member.update({
                    where: { id: rm.memberId },
                    data: {
                        status: 'EXPELLED',
                        leaveDate: new Date()
                    }
                })

                // Notify expelled member
                const memberToExpel = await prisma.member.findUnique({ where: { id: rm.memberId } })
                if (memberToExpel?.userId) {
                    await prisma.notification.create({
                        data: {
                            userId: memberToExpel.userId,
                            title: 'Üyeliğiniz Sonlandırıldı',
                            message: `${stk.name} derneği üyeliğiniz, alınan YK kararı ile sonlandırılmıştır. (Karar No: ${decision.decisionNumber})`,
                            type: 'expulsion',
                            isRead: false
                        }
                    })
                }
            }
        }

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'BOARD_DECISION',
                entityType: 'BoardDecision',
                entityId: decision.id,
                userId: user.id,
                userEmail: user.email,
                userName: user.name,
                description: `Karar kesinleştirildi: ${decision.decisionNumber}`,
                stkId: stk.id
            }
        })

        return NextResponse.json({ decision: updated })
    } catch (error) {
        console.error('Decision finalize error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
