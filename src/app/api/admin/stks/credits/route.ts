import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PUT: STK'ya kredi ekle veya ayarla
export async function PUT(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser || currentUser.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 })
        }

        const body = await request.json()
        const { stkId, smsCredits, whatsappCredits, emailCredits, pushCredits, mode } = body

        if (!stkId) {
            return NextResponse.json({ success: false, error: 'STK ID gerekli' }, { status: 400 })
        }

        // STK mevcut mu kontrol et
        const stk = await prisma.sTK.findUnique({
            where: { id: stkId },
            select: { id: true, name: true, smsCredits: true, whatsappCredits: true, emailCredits: true, pushCredits: true }
        })

        if (!stk) {
            return NextResponse.json({ success: false, error: 'STK bulunamadı' }, { status: 404 })
        }

        const oldCredits = {
            smsCredits: stk.smsCredits,
            whatsappCredits: stk.whatsappCredits,
            emailCredits: stk.emailCredits,
            pushCredits: stk.pushCredits,
        }

        // mode: 'increment' (varsayılan) veya 'set'
        const updateMode = mode === 'set' ? 'set' : 'increment'

        const updateData: any = {}
        if (smsCredits !== undefined && smsCredits !== null) {
            updateData.smsCredits = updateMode === 'set'
                ? Math.max(0, Number(smsCredits))
                : { increment: Math.max(0, Number(smsCredits)) }
        }
        if (whatsappCredits !== undefined && whatsappCredits !== null) {
            updateData.whatsappCredits = updateMode === 'set'
                ? Math.max(0, Number(whatsappCredits))
                : { increment: Math.max(0, Number(whatsappCredits)) }
        }
        if (emailCredits !== undefined && emailCredits !== null) {
            updateData.emailCredits = updateMode === 'set'
                ? Math.max(0, Number(emailCredits))
                : { increment: Math.max(0, Number(emailCredits)) }
        }
        if (pushCredits !== undefined && pushCredits !== null) {
            updateData.pushCredits = updateMode === 'set'
                ? Math.max(0, Number(pushCredits))
                : { increment: Math.max(0, Number(pushCredits)) }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ success: false, error: 'En az bir kredi alanı belirtilmeli' }, { status: 400 })
        }

        const updatedSTK = await prisma.sTK.update({
            where: { id: stkId },
            data: updateData,
            select: { id: true, name: true, smsCredits: true, whatsappCredits: true, emailCredits: true, pushCredits: true }
        })

        // Audit Log
        await prisma.auditLog.create({
            data: {
                action: 'SETTINGS_UPDATE',
                entityType: 'STK',
                entityId: stkId,
                userId: currentUser.id,
                userName: currentUser.name || 'Admin',
                description: `Admin tarafından "${stk.name}" STK'sına kredi ${updateMode === 'set' ? 'ayarlandı' : 'eklendi'}`,
                oldData: oldCredits as any,
                newData: {
                    smsCredits: updatedSTK.smsCredits,
                    whatsappCredits: updatedSTK.whatsappCredits,
                    emailCredits: updatedSTK.emailCredits,
                    pushCredits: updatedSTK.pushCredits,
                } as any,
                stkId,
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Krediler başarıyla güncellendi',
            credits: {
                smsCredits: updatedSTK.smsCredits,
                whatsappCredits: updatedSTK.whatsappCredits,
                emailCredits: updatedSTK.emailCredits,
                pushCredits: updatedSTK.pushCredits,
            }
        })

    } catch (error) {
        console.error('[ADMIN-STK-CREDITS] Error:', error)
        return NextResponse.json({ success: false, error: 'Kredi güncelleme hatası' }, { status: 500 })
    }
}

// GET: STK'nın mevcut kredi bakiyelerini getir
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

        const stk = await prisma.sTK.findUnique({
            where: { id: stkId },
            select: {
                id: true,
                name: true,
                smsCredits: true,
                whatsappCredits: true,
                emailCredits: true,
                pushCredits: true,
                package: {
                    select: { id: true, name: true, monthlyPrice: true, yearlyPrice: true, status: true }
                }
            }
        })

        if (!stk) {
            return NextResponse.json({ success: false, error: 'STK bulunamadı' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            credits: {
                smsCredits: stk.smsCredits,
                whatsappCredits: stk.whatsappCredits,
                emailCredits: stk.emailCredits,
                pushCredits: stk.pushCredits,
            },
            package: stk.package,
        })

    } catch (error) {
        console.error('[ADMIN-STK-CREDITS-GET] Error:', error)
        return NextResponse.json({ success: false, error: 'Kredi bilgisi alınamadı' }, { status: 500 })
    }
}
