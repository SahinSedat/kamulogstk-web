import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

interface RouteParams {
    params: Promise<{ id: string }>
}

// GET /api/stk/messages/[id] - Kampanya detayı
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
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

        const campaign = await prisma.messageCampaign.findFirst({
            where: { id, stkId: stk.id },
            include: {
                createdBy: { select: { id: true, name: true, email: true } },
                recipients: {
                    take: 100,
                    orderBy: { createdAt: 'desc' }
                },
                _count: { select: { recipients: true } }
            }
        })

        if (!campaign) {
            return NextResponse.json({ error: 'Kampanya bulunamadı' }, { status: 404 })
        }

        return NextResponse.json({ success: true, campaign })
    } catch (error) {
        console.error('Campaign fetch error:', error)
        return NextResponse.json({ error: 'Kampanya alınamadı' }, { status: 500 })
    }
}

// PUT /api/stk/messages/[id] - Kampanya güncelle veya gönder
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
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

        const campaign = await prisma.messageCampaign.findFirst({
            where: { id, stkId: stk.id }
        })

        if (!campaign) {
            return NextResponse.json({ error: 'Kampanya bulunamadı' }, { status: 404 })
        }

        const body = await request.json()
        const { action, title, subject, content } = body

        if (action === 'send') {
            // Gönderim simülasyonu (gerçek SMS/Push API entegrasyonu için placeholder)
            if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
                return NextResponse.json({ error: 'Bu kampanya gönderilemez' }, { status: 400 })
            }

            // Admin tarafından engellenmiş mi kontrol et
            if (campaign.isBlocked) {
                return NextResponse.json({
                    error: 'Bu kampanya admin tarafından engellenmiş'
                }, { status: 403 })
            }

            const updated = await prisma.messageCampaign.update({
                where: { id },
                data: {
                    status: 'SENT',
                    sentAt: new Date(),
                    deliveredCount: campaign.recipientCount // Simülasyon
                }
            })

            // Tüm recipients'ı sent olarak işaretle
            await prisma.messageRecipient.updateMany({
                where: { campaignId: id },
                data: {
                    status: 'SENT',
                    sentAt: new Date()
                }
            })

            // Audit log
            await prisma.auditLog.create({
                data: {
                    action: 'SETTINGS_UPDATE',
                    entityType: 'MessageCampaign',
                    entityId: id,
                    userId: user.id,
                    userEmail: user.email,
                    userName: user.name,
                    description: `Mesaj gönderildi: ${campaign.title} (${campaign.recipientCount} alıcı)`,
                    stkId: stk.id
                }
            })

            return NextResponse.json({
                success: true,
                message: 'Mesaj gönderildi',
                campaign: updated
            })
        }

        // Normal güncelleme
        if (campaign.status !== 'DRAFT') {
            return NextResponse.json({ error: 'Sadece taslaklar düzenlenebilir' }, { status: 400 })
        }

        const updated = await prisma.messageCampaign.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(subject && { subject }),
                ...(content && { content })
            }
        })

        return NextResponse.json({ success: true, campaign: updated })
    } catch (error) {
        console.error('Campaign update error:', error)
        return NextResponse.json({ error: 'Kampanya güncellenemedi' }, { status: 500 })
    }
}

// DELETE /api/stk/messages/[id] - Kampanya sil
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
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

        const campaign = await prisma.messageCampaign.findFirst({
            where: { id, stkId: stk.id }
        })

        if (!campaign) {
            return NextResponse.json({ error: 'Kampanya bulunamadı' }, { status: 404 })
        }

        if (campaign.status === 'SENT') {
            return NextResponse.json({ error: 'Gönderilmiş kampanyalar silinemez' }, { status: 400 })
        }

        await prisma.messageCampaign.delete({ where: { id } })

        return NextResponse.json({ success: true, message: 'Kampanya silindi' })
    } catch (error) {
        console.error('Campaign delete error:', error)
        return NextResponse.json({ error: 'Kampanya silinemedi' }, { status: 500 })
    }
}
