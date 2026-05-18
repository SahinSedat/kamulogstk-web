import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE /api/stk/members/[id] - Üyeyi soft-delete yap (loglu güvenli silme)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const stkId = request.headers.get('x-stk-id')
        const userId = request.headers.get('x-user-id')
        const userName = request.headers.get('x-user-name')

        // STK'yı bul
        const stk = stkId
            ? await prisma.sTK.findUnique({ where: { id: stkId } })
            : await prisma.sTK.findFirst()
        if (!stk) return NextResponse.json({ error: 'STK bulunamadı' }, { status: 404 })

        // Üyeyi bul
        const member = await prisma.member.findUnique({
            where: { id },
            include: {
                payments: true,
                notes: true,
            }
        })

        if (!member) {
            return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
        }

        // STK izolasyonu kontrol
        if (member.stkId !== stk.id) {
            return NextResponse.json({ error: 'Bu üye sizin STK\'nıza ait değil' }, { status: 403 })
        }

        // Zaten silinmiş mi?
        if (member.status === 'DELETED') {
            return NextResponse.json({ error: 'Bu üye zaten silinmiş' }, { status: 400 })
        }

        // 1. Üyenin TÜM verilerini AuditLog'a kaydet (JSON olarak)
        const memberSnapshot = {
            ...member,
            deletedAt: new Date().toISOString(),
            deletedBy: userName || userId || 'STK_MANAGER',
            previousStatus: member.status,
        }

        await prisma.auditLog.create({
            data: {
                action: 'MEMBER_DELETE',
                entityType: 'Member',
                entityId: member.id,
                userId: userId || undefined,
                userEmail: undefined,
                userName: userName || 'STK Yöneticisi',
                description: `Üye soft-delete edildi: ${member.name} ${member.surname} (${member.email})`,
                oldData: memberSnapshot as any,
                newData: { status: 'DELETED' },
                stkId: stk.id,
            }
        })

        // 2. Üyeyi DELETED olarak güncelle (hard-delete YAPMA!)
        await prisma.member.update({
            where: { id },
            data: {
                status: 'DELETED',
                leaveDate: new Date(),
                leaveReason: `Soft-delete: ${userName || 'STK Yöneticisi'} tarafından silindi`,
            }
        })

        console.log(`[SOFT-DELETE] Üye silindi (loglandı): ${member.name} ${member.surname} (${member.id})`)

        return NextResponse.json({
            success: true,
            message: `${member.name} ${member.surname} başarıyla silindi (log kaydı oluşturuldu)`
        })

    } catch (error) {
        console.error('Member soft-delete error:', error)
        return NextResponse.json({ error: 'Üye silinemedi' }, { status: 500 })
    }
}

// PATCH /api/stk/members/[id] - Silinen üyeyi geri aktif et
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

        const member = await prisma.member.findUnique({ where: { id } })
        if (!member) return NextResponse.json({ error: 'Üye bulunamadı' }, { status: 404 })
        if (member.stkId !== stk.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })

        // Geri aktif etme işlemi
        if (body.action === 'restore') {
            if (member.status !== 'DELETED') {
                return NextResponse.json({ error: 'Bu üye silinmiş değil' }, { status: 400 })
            }

            await prisma.auditLog.create({
                data: {
                    action: 'MEMBER_UPDATE',
                    entityType: 'Member',
                    entityId: member.id,
                    userId: userId || undefined,
                    userName: userName || 'STK Yöneticisi',
                    description: `Üye geri aktif edildi: ${member.name} ${member.surname}`,
                    oldData: { status: 'DELETED' },
                    newData: { status: 'ACTIVE' },
                    stkId: stk.id,
                }
            })

            await prisma.member.update({
                where: { id },
                data: {
                    status: 'ACTIVE',
                    leaveDate: null,
                    leaveReason: null,
                }
            })

            return NextResponse.json({
                success: true,
                message: `${member.name} ${member.surname} başarıyla geri aktif edildi`
            })
        }

        return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
    } catch (error) {
        console.error('Member patch error:', error)
        return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 })
    }
}
