import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Kanal → kredi alanı eşleştirmesi
const CHANNEL_CREDIT_MAP: Record<string, string> = {
    SMS: 'smsCredits',
    WHATSAPP: 'whatsappCredits',
    EMAIL: 'emailCredits',
    PUSH: 'pushCredits',
}

// ============================================
// GET: Kampanya listesi + kredi bakiyeleri
// ============================================
export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const stkId = request.headers.get('x-stk-id')

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Yetkisiz erişim' },
                { status: 403 }
            )
        }

        let orgStkId: string | null = stkId
        let branchCredits: { smsCredits: number; whatsappCredits: number; emailCredits: number; pushCredits: number } | null = null

        // STK ID'yi bul
        if (!orgStkId) {
            if (userRole === 'BRANCH_MANAGER') {
                const branch = await prisma.sTKBranch.findFirst({
                    where: { branchManagers: { some: { id: userId } } },
                    select: { id: true, stkId: true, smsCredits: true, whatsappCredits: true, emailCredits: true, pushCredits: true }
                })
                if (!branch) {
                    return NextResponse.json({ success: false, error: 'Bağlı şube bulunamadı' }, { status: 404 })
                }
                orgStkId = branch.stkId
                branchCredits = {
                    smsCredits: branch.smsCredits,
                    whatsappCredits: branch.whatsappCredits,
                    emailCredits: branch.emailCredits,
                    pushCredits: branch.pushCredits,
                }
            } else {
                const stk = await prisma.sTK.findFirst({
                    where: { managerId: userId },
                    select: { id: true }
                })
                if (!stk) {
                    return NextResponse.json({ success: false, error: 'Bağlı STK bulunamadı' }, { status: 404 })
                }
                orgStkId = stk.id
            }
        }

        // Kredi bakiyelerini getir
        const stk = await prisma.sTK.findUnique({
            where: { id: orgStkId },
            select: {
                smsCredits: true,
                whatsappCredits: true,
                emailCredits: true,
                pushCredits: true,
            }
        })

        // Kampanya listesi
        const campaigns = await prisma.messageCampaign.findMany({
            where: { stkId: orgStkId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                title: true,
                channel: true,
                content: true,
                status: true,
                recipientCount: true,
                deliveredCount: true,
                failedCount: true,
                smsCost: true,
                createdAt: true,
                sentAt: true,
                createdBy: {
                    select: { name: true, role: true }
                }
            }
        })

        // BRANCH_MANAGER ise şube kredilerini, değilse merkez kredilerini döndür
        const credits = userRole === 'BRANCH_MANAGER' && branchCredits
            ? branchCredits
            : {
                smsCredits: stk?.smsCredits || 0,
                whatsappCredits: stk?.whatsappCredits || 0,
                emailCredits: stk?.emailCredits || 0,
                pushCredits: stk?.pushCredits || 0,
            }

        return NextResponse.json({
            success: true,
            credits,
            campaigns,
            total: campaigns.length,
        })

    } catch (error) {
        console.error('[STK-CAMPAIGNS-GET] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Kampanyalar yüklenirken hata oluştu' },
            { status: 500 }
        )
    }
}

// ============================================
// POST: Yeni kampanya oluştur (Kredi düşme)
// ============================================
export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const stkId = request.headers.get('x-stk-id')

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Yetkisiz erişim' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { title, content, channel, recipientCount } = body

        // Validasyon
        if (!title || !title.trim()) {
            return NextResponse.json({ success: false, error: 'Kampanya başlığı gerekli' }, { status: 400 })
        }
        if (!content || !content.trim()) {
            return NextResponse.json({ success: false, error: 'Mesaj içeriği gerekli' }, { status: 400 })
        }
        if (!channel || !CHANNEL_CREDIT_MAP[channel]) {
            return NextResponse.json({ success: false, error: 'Geçersiz kanal. SMS, WHATSAPP, EMAIL veya PUSH olmalı' }, { status: 400 })
        }
        if (!recipientCount || recipientCount < 1) {
            return NextResponse.json({ success: false, error: 'Alıcı sayısı en az 1 olmalı' }, { status: 400 })
        }

        const creditField = CHANNEL_CREDIT_MAP[channel]

        // Kullanıcının hangi kaynaktan kredi düşeceğini belirle
        if (userRole === 'BRANCH_MANAGER') {
            // ---- ŞUBE BAŞKANI: Şube kredisinden düş ----
            const branch = await prisma.sTKBranch.findFirst({
                where: { branchManagers: { some: { id: userId } } },
                select: { id: true, stkId: true, smsCredits: true, whatsappCredits: true, emailCredits: true, pushCredits: true }
            })

            if (!branch) {
                return NextResponse.json({ success: false, error: 'Bağlı şube bulunamadı' }, { status: 404 })
            }

            const currentCredit = (branch as Record<string, unknown>)[creditField] as number
            if (currentCredit < recipientCount) {
                return NextResponse.json({
                    success: false,
                    error: `Bakiye yetersiz! Mevcut ${channel} kredisi: ${currentCredit}, Gerekli: ${recipientCount}`,
                    currentCredit,
                    required: recipientCount,
                }, { status: 400 })
            }

            // Transaction: kredi düş + kampanya oluştur
            const [campaign] = await prisma.$transaction([
                prisma.messageCampaign.create({
                    data: {
                        stkId: branch.stkId,
                        title: title.trim(),
                        content: content.trim(),
                        subject: title.trim(),
                        channel,
                        messageType: 'SMS',
                        targetAudience: 'ALL_MEMBERS',
                        status: 'SENT',
                        recipientCount,
                        smsCost: recipientCount,
                        sentAt: new Date(),
                        createdById: userId,
                    },
                }),
                prisma.sTKBranch.update({
                    where: { id: branch.id },
                    data: {
                        [creditField]: { decrement: recipientCount },
                    },
                }),
            ])

            // Güncel krediler
            const updatedBranch = await prisma.sTKBranch.findUnique({
                where: { id: branch.id },
                select: { smsCredits: true, whatsappCredits: true, emailCredits: true, pushCredits: true }
            })

            // AuditLog: Kampanya gönderildi (Şube)
            await prisma.auditLog.create({
                data: {
                    action: 'SETTINGS_UPDATE',
                    entityType: 'MessageCampaign',
                    entityId: campaign.id,
                    userId: userId,
                    userName: 'Şube Yöneticisi',
                    description: `Kampanya gönderildi: "${title}" - ${channel} kanalı, ${recipientCount} alıcı`,
                    oldData: { creditBefore: currentCredit } as any,
                    newData: { creditAfter: currentCredit - recipientCount, channel, recipientCount } as any,
                    stkId: branch.stkId,
                }
            })

            return NextResponse.json({
                success: true,
                message: `${recipientCount} alıcıya ${channel} kampanyası başarıyla gönderildi!`,
                campaign: {
                    id: campaign.id,
                    title: campaign.title,
                    channel: campaign.channel,
                    recipientCount: campaign.recipientCount,
                    createdAt: campaign.createdAt,
                },
                credits: updatedBranch,
            }, { status: 201 })

        } else if (userRole === 'STK_MANAGER' || userRole === 'ADMIN') {
            // ---- GENEL MERKEZ: STK kredisinden düş ----
            let orgStkId = stkId

            if (!orgStkId) {
                const stk = await prisma.sTK.findFirst({
                    where: { managerId: userId },
                    select: { id: true }
                })
                if (!stk) {
                    return NextResponse.json({ success: false, error: 'Bağlı STK bulunamadı' }, { status: 404 })
                }
                orgStkId = stk.id
            }

            // Mevcut krediyi kontrol et
            const stk = await prisma.sTK.findUnique({
                where: { id: orgStkId },
                select: { smsCredits: true, whatsappCredits: true, emailCredits: true, pushCredits: true }
            })

            if (!stk) {
                return NextResponse.json({ success: false, error: 'STK bulunamadı' }, { status: 404 })
            }

            const currentCredit = (stk as Record<string, unknown>)[creditField] as number
            if (currentCredit < recipientCount) {
                return NextResponse.json({
                    success: false,
                    error: `Bakiye yetersiz! Mevcut ${channel} kredisi: ${currentCredit}, Gerekli: ${recipientCount}`,
                    currentCredit,
                    required: recipientCount,
                }, { status: 400 })
            }

            // Transaction: kredi düş + kampanya oluştur
            const [campaign] = await prisma.$transaction([
                prisma.messageCampaign.create({
                    data: {
                        stkId: orgStkId,
                        title: title.trim(),
                        content: content.trim(),
                        subject: title.trim(),
                        channel,
                        messageType: 'SMS',
                        targetAudience: 'ALL_MEMBERS',
                        status: 'SENT',
                        recipientCount,
                        smsCost: recipientCount,
                        sentAt: new Date(),
                        createdById: userId,
                    },
                }),
                prisma.sTK.update({
                    where: { id: orgStkId },
                    data: {
                        [creditField]: { decrement: recipientCount },
                    },
                }),
            ])

            // Güncel krediler
            const updatedSTK = await prisma.sTK.findUnique({
                where: { id: orgStkId },
                select: { smsCredits: true, whatsappCredits: true, emailCredits: true, pushCredits: true }
            })

            // AuditLog: Kampanya gönderildi (Merkez)
            await prisma.auditLog.create({
                data: {
                    action: 'SETTINGS_UPDATE',
                    entityType: 'MessageCampaign',
                    entityId: campaign.id,
                    userId: userId,
                    userName: 'STK Yöneticisi',
                    description: `Kampanya gönderildi: "${title}" - ${channel} kanalı, ${recipientCount} alıcı`,
                    oldData: { creditBefore: currentCredit } as any,
                    newData: { creditAfter: currentCredit - recipientCount, channel, recipientCount } as any,
                    stkId: orgStkId,
                }
            })

            return NextResponse.json({
                success: true,
                message: `${recipientCount} alıcıya ${channel} kampanyası başarıyla gönderildi!`,
                campaign: {
                    id: campaign.id,
                    title: campaign.title,
                    channel: campaign.channel,
                    recipientCount: campaign.recipientCount,
                    createdAt: campaign.createdAt,
                },
                credits: updatedSTK,
            }, { status: 201 })

        } else {
            return NextResponse.json(
                { success: false, error: 'Bu işlem için yetkiniz yok' },
                { status: 403 }
            )
        }

    } catch (error) {
        console.error('[STK-CAMPAIGNS-POST] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Kampanya oluşturulurken hata oluştu' },
            { status: 500 }
        )
    }
}
