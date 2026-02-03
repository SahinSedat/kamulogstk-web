import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/stk/messages - Mesaj kampanyalarını listele
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
        const type = searchParams.get('type')

        const where: Record<string, unknown> = { stkId: stk.id }
        if (status) where.status = status
        if (type) where.messageType = type

        const campaigns = await prisma.messageCampaign.findMany({
            where,
            include: {
                createdBy: {
                    select: { id: true, name: true, email: true }
                },
                _count: {
                    select: { recipients: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Stats
        const [total, draft, sent, pending] = await Promise.all([
            prisma.messageCampaign.count({ where: { stkId: stk.id } }),
            prisma.messageCampaign.count({ where: { stkId: stk.id, status: 'DRAFT' } }),
            prisma.messageCampaign.count({ where: { stkId: stk.id, status: 'SENT' } }),
            prisma.messageCampaign.count({ where: { stkId: stk.id, status: 'SCHEDULED' } })
        ])

        return NextResponse.json({
            success: true,
            campaigns,
            stats: { total, draft, sent, pending }
        })
    } catch (error) {
        console.error('Messages fetch error:', error)
        return NextResponse.json({ error: 'Mesajlar alınamadı' }, { status: 500 })
    }
}

// POST /api/stk/messages - Yeni mesaj kampanyası oluştur
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
        const {
            title,
            messageType,
            subject,
            content,
            targetAudience,
            scheduledAt
        } = body

        if (!title || !messageType || !content) {
            return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 })
        }

        // Hedef kitleyi hesapla
        let recipientQuery: Record<string, unknown> = { stkId: stk.id, status: 'ACTIVE' }

        if (targetAudience === 'DUES_PAID') {
            // Aidatı ödenmiş (basitleştirilmiş - gerçek implementasyonda payment kontrolü yapılır)
            recipientQuery = { stkId: stk.id, status: 'ACTIVE' }
        } else if (targetAudience === 'DUES_UNPAID') {
            recipientQuery = { stkId: stk.id, status: 'ACTIVE' }
        }

        const activeMembers = await prisma.member.findMany({
            where: recipientQuery,
            select: { id: true, phone: true, email: true }
        })

        // Kampanya oluştur
        const campaign = await prisma.messageCampaign.create({
            data: {
                stkId: stk.id,
                title,
                messageType,
                subject,
                content,
                targetAudience: targetAudience || 'ALL_ACTIVE',
                status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                recipientCount: activeMembers.length,
                createdById: user.id,
                recipients: {
                    create: activeMembers.map(m => ({
                        memberId: m.id,
                        phone: m.phone,
                        email: m.email
                    }))
                }
            },
            include: {
                _count: { select: { recipients: true } }
            }
        })

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'SETTINGS_UPDATE', // Mesaj için uygun action eklenebilir
                entityType: 'MessageCampaign',
                entityId: campaign.id,
                userId: user.id,
                userEmail: user.email,
                userName: user.name,
                description: `Mesaj kampanyası oluşturuldu: ${title} (${messageType})`,
                stkId: stk.id
            }
        })

        return NextResponse.json({ success: true, campaign }, { status: 201 })
    } catch (error) {
        console.error('Message create error:', error)
        return NextResponse.json({ error: 'Mesaj oluşturulamadı' }, { status: 500 })
    }
}
