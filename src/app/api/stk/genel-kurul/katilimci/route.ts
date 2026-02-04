import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

// GET: Katılımcıları listele
export async function GET(request: NextRequest) {
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

        const searchParams = request.nextUrl.searchParams
        const assemblyId = searchParams.get('assemblyId')

        if (!assemblyId) {
            return NextResponse.json({ error: 'Genel kurul ID gerekli' }, { status: 400 })
        }

        // Genel kurulun bu STK'ya ait olduğunu doğrula
        const assembly = await prisma.generalAssembly.findFirst({
            where: { id: assemblyId, stkId: payload.stkId }
        })

        if (!assembly) {
            return NextResponse.json({ error: 'Genel kurul bulunamadı' }, { status: 404 })
        }

        const attendees = await prisma.assemblyAttendee.findMany({
            where: { assemblyId }
        })

        // Üye bilgilerini de çek
        const memberIds = attendees.map(a => a.memberId)
        const members = await prisma.member.findMany({
            where: { id: { in: memberIds } },
            select: { id: true, name: true, surname: true, memberNumber: true }
        })

        const attendeesWithMembers = attendees.map(attendee => ({
            ...attendee,
            member: members.find(m => m.id === attendee.memberId)
        }))

        return NextResponse.json({ attendees: attendeesWithMembers })
    } catch (error) {
        console.error('Error fetching attendees:', error)
        return NextResponse.json({ error: 'Katılımcılar yüklenemedi' }, { status: 500 })
    }
}

// POST: Katılımcı ekle
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
        const { assemblyId, memberId, attendType } = body

        if (!assemblyId || !memberId) {
            return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 })
        }

        // Genel kurulun bu STK'ya ait olduğunu doğrula
        const assembly = await prisma.generalAssembly.findFirst({
            where: { id: assemblyId, stkId: payload.stkId }
        })

        if (!assembly) {
            return NextResponse.json({ error: 'Genel kurul bulunamadı' }, { status: 404 })
        }

        // Üyenin bu STK'ya ait olduğunu doğrula
        const member = await prisma.member.findFirst({
            where: { id: memberId, stkId: payload.stkId, status: 'ACTIVE' }
        })

        if (!member) {
            return NextResponse.json({ error: 'Aktif üye bulunamadı' }, { status: 404 })
        }

        // Zaten katılımcı mı kontrol et
        const existing = await prisma.assemblyAttendee.findFirst({
            where: { assemblyId, memberId }
        })

        if (existing) {
            return NextResponse.json({ error: 'Bu üye zaten katılımcı olarak eklenmiş' }, { status: 400 })
        }

        const attendee = await prisma.assemblyAttendee.create({
            data: {
                assemblyId,
                memberId,
                attendType: attendType || 'IN_PERSON',
                checkinTime: new Date()
            }
        })

        return NextResponse.json({ success: true, attendee })
    } catch (error) {
        console.error('Error adding attendee:', error)
        return NextResponse.json({ error: 'Katılımcı eklenemedi' }, { status: 500 })
    }
}

// PUT: Katılımcı güncelle (imza durumu vb.)
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
        const { id, signature, attendType } = body

        if (!id) {
            return NextResponse.json({ error: 'Katılımcı ID gerekli' }, { status: 400 })
        }

        // Katılımcının bu STK'ya ait genel kurulda olduğunu doğrula
        const attendee = await prisma.assemblyAttendee.findFirst({
            where: { id },
            include: { assembly: true }
        })

        if (!attendee || attendee.assembly.stkId !== payload.stkId) {
            return NextResponse.json({ error: 'Katılımcı bulunamadı' }, { status: 404 })
        }

        const updateData: Record<string, unknown> = {}
        if (signature !== undefined) updateData.signature = signature
        if (attendType) updateData.attendType = attendType

        const updated = await prisma.assemblyAttendee.update({
            where: { id },
            data: updateData
        })

        return NextResponse.json({ success: true, attendee: updated })
    } catch (error) {
        console.error('Error updating attendee:', error)
        return NextResponse.json({ error: 'Katılımcı güncellenemedi' }, { status: 500 })
    }
}

// DELETE: Katılımcı sil
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
            return NextResponse.json({ error: 'Katılımcı ID gerekli' }, { status: 400 })
        }

        // Katılımcının bu STK'ya ait genel kurulda olduğunu doğrula
        const attendee = await prisma.assemblyAttendee.findFirst({
            where: { id },
            include: { assembly: true }
        })

        if (!attendee || attendee.assembly.stkId !== payload.stkId) {
            return NextResponse.json({ error: 'Katılımcı bulunamadı' }, { status: 404 })
        }

        await prisma.assemblyAttendee.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting attendee:', error)
        return NextResponse.json({ error: 'Katılımcı silinemedi' }, { status: 500 })
    }
}
