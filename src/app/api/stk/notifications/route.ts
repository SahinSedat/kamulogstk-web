import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

// GET: Bildirimleri getir
export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || !payload.userId) {
            return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
        }

        // Tüm bildirimler
        const notifications = await prisma.notification.findMany({
            where: { userId: payload.userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        // Okunmamış bildirim sayısı
        const unreadCount = await prisma.notification.count({
            where: { userId: payload.userId, isRead: false }
        })

        return NextResponse.json({
            success: true,
            notifications,
            unreadCount
        })
    } catch (error) {
        console.error('Error fetching notifications:', error)
        return NextResponse.json({ error: 'Bildirimler yüklenemedi' }, { status: 500 })
    }
}

// PUT: Bildirimi okundu olarak işaretle
export async function PUT(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || !payload.userId) {
            return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
        }

        const body = await request.json()
        const { notificationId, markAllAsRead } = body

        if (markAllAsRead) {
            // Tüm bildirimleri okundu olarak işaretle
            await prisma.notification.updateMany({
                where: { userId: payload.userId },
                data: { isRead: true, readAt: new Date() }
            })
        } else if (notificationId) {
            // Tek bildirimi okundu olarak işaretle
            await prisma.notification.update({
                where: { id: notificationId },
                data: { isRead: true, readAt: new Date() }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating notification:', error)
        return NextResponse.json({ error: 'Bildirim güncellenemedi' }, { status: 500 })
    }
}

// DELETE: Bildirimi sil
export async function DELETE(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || !payload.userId) {
            return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
        }

        const body = await request.json()
        const { notificationId, deleteAll } = body

        if (deleteAll) {
            // Tüm bildirimleri sil
            await prisma.notification.deleteMany({
                where: { userId: payload.userId }
            })
        } else if (notificationId) {
            // Tek bildirimi sil
            await prisma.notification.delete({
                where: { id: notificationId }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting notification:', error)
        return NextResponse.json({ error: 'Bildirim silinemedi' }, { status: 500 })
    }
}

