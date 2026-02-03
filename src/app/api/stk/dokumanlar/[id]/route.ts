import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

interface RouteParams {
    params: Promise<{ id: string }>
}

// Doküman detayı
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const stkId = request.headers.get('x-stk-id')

        if (!stkId) {
            return NextResponse.json({ error: 'STK ID bulunamadı' }, { status: 400 })
        }

        const doc = await prisma.document.findFirst({
            where: { id, stkId },
            include: {
                createdBy: { select: { name: true } }
            }
        })

        if (!document) {
            return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 })
        }

        return NextResponse.json({ success: true, document: doc })
    } catch (error) {
        console.error('Document fetch error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}

// Doküman yayınla / güncelle
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const stkId = request.headers.get('x-stk-id')
        const userId = request.headers.get('x-user-id')

        if (!stkId || !userId) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
        }

        const doc = await prisma.document.findFirst({
            where: { id, stkId }
        })

        if (!doc) {
            return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 })
        }

        const body = await request.json()
        const { action, title, description, type } = body

        if (action === 'publish') {
            // Dokümanı yayınla ve bildirim gönder
            const updatedDoc = await prisma.document.update({
                where: { id },
                data: {
                    isPublished: true,
                    publishedAt: new Date()
                }
            })

            // Tüm aktif üyelere bildirim oluştur
            const members = await prisma.member.findMany({
                where: { stkId, status: 'ACTIVE' },
                select: { id: true }
            })

            // MemberNotification oluştur (mobil için)
            if (members.length > 0) {
                await prisma.notification.createMany({
                    data: members.map(member => ({
                        userId: member.id,
                        title: `Yeni ${doc.type === 'ANNOUNCEMENT' ? 'Duyuru' : 'Doküman'}: ${doc.title}`,
                        message: doc.description || doc.title,
                        type: 'SYSTEM' as const,
                    }))
                })
            }

            // Audit log
            await prisma.auditLog.create({
                data: {
                    userId,
                    action: 'DOCUMENT_PUBLISH',
                    entityType: 'Document',
                    entityId: id,
                    newData: { isPublished: true, notifiedMembers: members.length },
                    description: `Doküman yayınlandı ve ${members.length} üyeye bildirim gönderildi: ${doc.title}`
                }
            })

            return NextResponse.json({
                success: true,
                document: updatedDoc,
                notifiedCount: members.length
            })
        }

        // Normal güncelleme
        const updatedDoc = await prisma.document.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(description !== undefined && { description }),
                ...(type && { type })
            }
        })

        return NextResponse.json({ success: true, document: updatedDoc })
    } catch (error) {
        console.error('Document update error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}

// Doküman sil
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const stkId = request.headers.get('x-stk-id')
        const userId = request.headers.get('x-user-id')

        if (!stkId || !userId) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
        }

        const doc = await prisma.document.findFirst({
            where: { id, stkId }
        })

        if (!doc) {
            return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 })
        }

        await prisma.document.delete({ where: { id } })

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'DOCUMENT_DELETE',
                entityType: 'Document',
                entityId: id,
                oldData: { title: doc.title },
                description: `Doküman silindi: ${doc.title}`
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Document delete error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
