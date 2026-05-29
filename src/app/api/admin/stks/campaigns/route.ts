import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET: Belirli STK'nın kampanyalarını listele
export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser || currentUser.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const stkId = searchParams.get('stkId')

        if (!stkId) {
            return NextResponse.json({ success: false, error: 'STK ID gerekli' }, { status: 400 })
        }

        const campaigns = await prisma.messageCampaign.findMany({
            where: { stkId },
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

        return NextResponse.json({
            success: true,
            campaigns,
            total: campaigns.length,
        })

    } catch (error) {
        console.error('[ADMIN-STK-CAMPAIGNS-GET] Error:', error)
        return NextResponse.json({ success: false, error: 'Kampanyalar yüklenemedi' }, { status: 500 })
    }
}

// POST: Admin olarak STK adına kampanya oluştur (kredi düşmeden)
export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser || currentUser.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 })
        }

        const body = await request.json()
        const { stkId, title, content, channel, recipientCount } = body

        // Validasyon
        if (!stkId) {
            return NextResponse.json({ success: false, error: 'STK ID gerekli' }, { status: 400 })
        }
        if (!title || !title.trim()) {
            return NextResponse.json({ success: false, error: 'Kampanya başlığı gerekli' }, { status: 400 })
        }
        if (!content || !content.trim()) {
            return NextResponse.json({ success: false, error: 'Mesaj içeriği gerekli' }, { status: 400 })
        }

        const validChannels = ['SMS', 'WHATSAPP', 'EMAIL', 'PUSH']
        if (!channel || !validChannels.includes(channel)) {
            return NextResponse.json({ success: false, error: 'Geçersiz kanal' }, { status: 400 })
        }
        if (!recipientCount || recipientCount < 1) {
            return NextResponse.json({ success: false, error: 'Alıcı sayısı en az 1 olmalı' }, { status: 400 })
        }

        // STK mevcut mu kontrol et
        const stk = await prisma.sTK.findUnique({
            where: { id: stkId },
            select: { id: true, name: true }
        })

        if (!stk) {
            return NextResponse.json({ success: false, error: 'STK bulunamadı' }, { status: 404 })
        }

        // Admin kampanyası oluştur — kredi düşülmez
        const campaign = await prisma.messageCampaign.create({
            data: {
                stkId,
                title: title.trim(),
                content: content.trim(),
                subject: title.trim(),
                channel,
                messageType: 'SMS',
                targetAudience: 'ALL_MEMBERS',
                status: 'SENT',
                recipientCount: Number(recipientCount),
                smsCost: 0, // Admin kampanyası — kredi düşülmez
                sentAt: new Date(),
                createdById: currentUser.id,
            },
            select: {
                id: true,
                title: true,
                channel: true,
                recipientCount: true,
                createdAt: true,
                createdBy: {
                    select: { name: true, role: true }
                }
            }
        })

        // Audit Log
        await prisma.auditLog.create({
            data: {
                action: 'SETTINGS_UPDATE',
                entityType: 'MessageCampaign',
                entityId: campaign.id,
                userId: currentUser.id,
                userName: currentUser.name || 'Admin',
                description: `Admin tarafından "${stk.name}" STK'sı adına kampanya oluşturuldu: "${title}" - ${channel} kanalı, ${recipientCount} alıcı`,
                newData: { channel, recipientCount, adminCreated: true } as any,
                stkId,
            }
        })

        return NextResponse.json({
            success: true,
            message: `"${stk.name}" STK'sı adına kampanya başarıyla oluşturuldu!`,
            campaign,
        }, { status: 201 })

    } catch (error) {
        console.error('[ADMIN-STK-CAMPAIGNS-POST] Error:', error)
        return NextResponse.json({ success: false, error: 'Kampanya oluşturulurken hata oluştu' }, { status: 500 })
    }
}
