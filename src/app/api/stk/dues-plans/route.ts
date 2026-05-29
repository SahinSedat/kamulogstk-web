import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

// GET: Aidat planlarını listele
export async function GET() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || !payload.stkId) {
            return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
        }

        // Otomatik pasife alma: Bitiş tarihi geçmiş olan aktif planları pasife al
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        await prisma.duesPlan.updateMany({
            where: {
                stkId: payload.stkId,
                isActive: true,
                validUntil: {
                    lt: today // validUntil bugünden küçükse (geçmişse)
                }
            },
            data: { isActive: false }
        })

        const plans = await prisma.duesPlan.findMany({
            where: { stkId: payload.stkId },
            orderBy: [
                { isDefault: 'desc' },
                { isActive: 'desc' },
                { createdAt: 'desc' }
            ]
        })

        return NextResponse.json({ plans })
    } catch (error) {
        console.error('Error fetching dues plans:', error)
        return NextResponse.json({ error: 'Aidat planları yüklenemedi' }, { status: 500 })
    }
}

// POST: Yeni aidat planı oluştur
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || !payload.stkId) {
            return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
        }

        const body = await request.json()
        const { name, description, amount, period, customPeriodDays, isDefault, validFrom, validUntil } = body

        if (!name || !amount || !period) {
            return NextResponse.json({ error: 'Ad, tutar ve periyot zorunludur' }, { status: 400 })
        }

        // Eğer varsayılan plan yapılıyorsa, diğerlerinin varsayılan durumunu kaldır
        if (isDefault) {
            await prisma.duesPlan.updateMany({
                where: { stkId: payload.stkId, isDefault: true },
                data: { isDefault: false }
            })
        }

        const plan = await prisma.duesPlan.create({
            data: {
                stkId: payload.stkId,
                name,
                description: description || null,
                amount: parseFloat(amount),
                period,
                customPeriodDays: period === 'CUSTOM' ? parseInt(customPeriodDays) : null,
                isDefault: isDefault || false,
                validFrom: validFrom ? new Date(validFrom) : new Date(),
                validUntil: validUntil ? new Date(validUntil) : null
            }
        })

        // Notify all active members
        const members = await prisma.member.findMany({
            where: {
                stkId: payload.stkId,
                status: 'ACTIVE',
                userId: { not: null }
            },
            select: { userId: true }
        })

        if (members.length > 0) {
            await prisma.notification.createMany({
                data: members.map(m => ({
                    userId: m.userId!,
                    title: 'Yeni Aidat Planı Oluşturuldu',
                    message: `${name} isminde yeni bir aidat planı oluşturuldu. Detayları inceleyebilirsiniz.`,
                    type: 'payment',
                    link: `/uyegirisi`,
                    isRead: false
                }))
            })
        }

        return NextResponse.json({ success: true, plan })
    } catch (error) {
        console.error('Error creating dues plan:', error)
        return NextResponse.json({ error: 'Plan oluşturulamadı' }, { status: 500 })
    }
}

// PUT: Aidat planını güncelle
export async function PUT(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || !payload.stkId) {
            return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
        }

        const body = await request.json()
        const { id, name, description, amount, period, customPeriodDays, isActive, isDefault, validFrom, validUntil } = body

        if (!id) {
            return NextResponse.json({ error: 'Plan ID gerekli' }, { status: 400 })
        }

        const existing = await prisma.duesPlan.findFirst({
            where: { id, stkId: payload.stkId }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 })
        }

        // Eğer varsayılan plan yapılıyorsa, diğerlerinin varsayılan durumunu kaldır
        if (isDefault && !existing.isDefault) {
            await prisma.duesPlan.updateMany({
                where: { stkId: payload.stkId, isDefault: true },
                data: { isDefault: false }
            })
        }

        const plan = await prisma.duesPlan.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description: description || null }),
                ...(amount !== undefined && { amount: parseFloat(amount) }),
                ...(period && { period }),
                ...(period === 'CUSTOM' && customPeriodDays !== undefined && { customPeriodDays: parseInt(customPeriodDays) }),
                ...(isActive !== undefined && { isActive }),
                ...(isDefault !== undefined && { isDefault }),
                ...(validFrom && { validFrom: new Date(validFrom) }),
                ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null })
            }
        })

        return NextResponse.json({ success: true, plan })
    } catch (error) {
        console.error('Error updating dues plan:', error)
        return NextResponse.json({ error: 'Plan güncellenemedi' }, { status: 500 })
    }
}

// DELETE: Aidat planını sil
export async function DELETE(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || !payload.stkId) {
            return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
        }

        const body = await request.json()
        const { id } = body

        if (!id) {
            return NextResponse.json({ error: 'Plan ID gerekli' }, { status: 400 })
        }

        const existing = await prisma.duesPlan.findFirst({
            where: { id, stkId: payload.stkId }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 })
        }

        await prisma.duesPlan.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting dues plan:', error)
        return NextResponse.json({ error: 'Plan silinemedi' }, { status: 500 })
    }
}
