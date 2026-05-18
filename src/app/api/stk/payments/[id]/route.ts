import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE /api/stk/payments/[id] - Ödemeyi soft-delete yap (loglu güvenli silme)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const stkId = request.headers.get('x-stk-id')
        const userId = request.headers.get('x-user-id')
        const userName = request.headers.get('x-user-name')

        const stk = stkId
            ? await prisma.sTK.findUnique({ where: { id: stkId } })
            : await prisma.sTK.findFirst()
        if (!stk) return NextResponse.json({ error: 'STK bulunamadı' }, { status: 404 })

        // Ödemeyi bul
        const payment = await prisma.payment.findUnique({
            where: { id },
            include: {
                member: {
                    select: { id: true, name: true, surname: true, email: true }
                }
            }
        })

        if (!payment) {
            return NextResponse.json({ error: 'Ödeme bulunamadı' }, { status: 404 })
        }

        if (payment.stkId !== stk.id) {
            return NextResponse.json({ error: 'Bu ödeme sizin STK\'nıza ait değil' }, { status: 403 })
        }

        if (payment.status === 'DELETED') {
            return NextResponse.json({ error: 'Bu ödeme zaten silinmiş' }, { status: 400 })
        }

        // 1. Ödemenin TÜM verilerini AuditLog'a kaydet (JSON olarak)
        const paymentSnapshot = {
            ...payment,
            amount: payment.amount ? Number(payment.amount) : 0,
            deletedAt: new Date().toISOString(),
            deletedBy: userName || userId || 'STK_MANAGER',
            previousStatus: payment.status,
        }

        const memberInfo = payment.member
            ? `${payment.member.name} ${payment.member.surname}`
            : 'Bilinmeyen Üye'

        await prisma.auditLog.create({
            data: {
                action: 'PAYMENT_DELETE',
                entityType: 'Payment',
                entityId: payment.id,
                userId: userId || undefined,
                userName: userName || 'STK Yöneticisi',
                description: `Ödeme soft-delete edildi: ${memberInfo} - ${Number(payment.amount)} TL (${payment.type})`,
                oldData: paymentSnapshot as any,
                newData: { status: 'DELETED' },
                stkId: stk.id,
            }
        })

        // 2. Ödemeyi DELETED olarak güncelle (hard-delete YAPMA!)
        await prisma.payment.update({
            where: { id },
            data: {
                status: 'DELETED',
                notes: `${payment.notes || ''}\n[SOFT-DELETE] ${new Date().toISOString()} - ${userName || 'STK Yöneticisi'} tarafından silindi`.trim(),
            }
        })

        console.log(`[SOFT-DELETE] Ödeme silindi (loglandı): ${memberInfo} - ${Number(payment.amount)} TL (${payment.id})`)

        return NextResponse.json({
            success: true,
            message: `${memberInfo} - ${Number(payment.amount)} TL ödeme başarıyla silindi (log kaydı oluşturuldu)`
        })

    } catch (error) {
        console.error('Payment soft-delete error:', error)
        return NextResponse.json({ error: 'Ödeme silinemedi' }, { status: 500 })
    }
}

// PATCH /api/stk/payments/[id] - Silinen ödemeyi geri aktif et
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const stkId = request.headers.get('x-stk-id')
        const userId = request.headers.get('x-user-id')
        const userName = request.headers.get('x-user-name')

        const stk = stkId
            ? await prisma.sTK.findUnique({ where: { id: stkId } })
            : await prisma.sTK.findFirst()
        if (!stk) return NextResponse.json({ error: 'STK bulunamadı' }, { status: 404 })

        const payment = await prisma.payment.findUnique({ where: { id } })
        if (!payment) return NextResponse.json({ error: 'Ödeme bulunamadı' }, { status: 404 })
        if (payment.stkId !== stk.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

        if (body.action === 'restore') {
            if (payment.status !== 'DELETED') {
                return NextResponse.json({ error: 'Bu ödeme silinmiş değil' }, { status: 400 })
            }

            // AuditLog'dan eski durumu bul
            const lastLog = await prisma.auditLog.findFirst({
                where: {
                    entityId: payment.id,
                    entityType: 'Payment',
                    action: 'PAYMENT_DELETE',
                },
                orderBy: { createdAt: 'desc' },
            })

            const previousStatus = (lastLog?.oldData as any)?.previousStatus || 'PENDING'

            await prisma.auditLog.create({
                data: {
                    action: 'PAYMENT_CREATE',
                    entityType: 'Payment',
                    entityId: payment.id,
                    userId: userId || undefined,
                    userName: userName || 'STK Yöneticisi',
                    description: `Ödeme geri aktif edildi (önceki durum: ${previousStatus})`,
                    oldData: { status: 'DELETED' },
                    newData: { status: previousStatus },
                    stkId: stk.id,
                }
            })

            await prisma.payment.update({
                where: { id },
                data: { status: previousStatus }
            })

            return NextResponse.json({
                success: true,
                message: 'Ödeme başarıyla geri aktif edildi'
            })
        }

        return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
    } catch (error) {
        console.error('Payment patch error:', error)
        return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 })
    }
}
