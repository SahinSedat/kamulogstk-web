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

        // Send merged notification to attendee with accept/reject capability
        if (member.userId) {
            const assemblyTypeName = assembly.assemblyType === 'OLAGAN' ? 'Olağan' : 'Olağanüstü'
            const assemblyDate = new Date(assembly.assemblyDate).toLocaleDateString('tr-TR')

            await prisma.notification.create({
                data: {
                    userId: member.userId,
                    title: 'Genel Kurul Katılım Daveti',
                    message: `${assemblyTypeName} Genel Kurula katılımcı olarak eklenmiş bulunmaktasınız ve ${assemblyDate} tarihinde ${assembly.location} adresinde yapılacaktır.`,
                    type: 'assembly_attendance',
                    link: `/uyegirisi`,
                    isRead: false,
                    metadata: {
                        assemblyId: assembly.id,
                        attendeeId: attendee.id,
                        assemblyNumber: assembly.assemblyNumber
                    }
                }
            })
        }

        return NextResponse.json({ success: true, attendee })
    } catch (error) {
        console.error('Error adding attendee:', error)
        return NextResponse.json({ error: 'Katılımcı eklenemedi' }, { status: 500 })
    }
}

// PUT: Katılımcı güncelle (imza durumu, onay/ret vb.)
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
        const { id, signature, attendType, status, rejectionReason } = body

        if (!id) {
            return NextResponse.json({ error: 'Katılımcı ID gerekli' }, { status: 400 })
        }

        // Katılımcının bu STK'ya ait genel kurulda olduğunu doğrula
        const attendee = await prisma.assemblyAttendee.findFirst({
            where: { id },
            include: {
                assembly: true,
            }
        })

        if (!attendee || attendee.assembly.stkId !== payload.stkId) {
            return NextResponse.json({ error: 'Katılımcı bulunamadı' }, { status: 404 })
        }

        // Fetch member manually to ensure we have user info for notification
        const member = await prisma.member.findUnique({
            where: { id: attendee.memberId },
            select: {
                name: true,
                surname: true,
                userId: true
            }
        })

        // Also add the member to the attendee object for downstream logic using 'attendee.member'
        const attendeeWithMember = { ...attendee, member }

        const updateData: Record<string, unknown> = {}
        if (signature !== undefined) updateData.signature = signature
        if (attendType) updateData.attendType = attendType
        if (status) {
            updateData.status = status
            updateData.respondedAt = new Date()
        }
        if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason

        const updated = await prisma.assemblyAttendee.update({
            where: { id },
            data: updateData
        })

        // Eğer status değiştirilmişse (onay/ret cevapı verilmişse) → STK yöneticisine bildirim gönder
        if (status && member) {
            const assemblyTypeName = attendee.assembly.assemblyType === 'OLAGAN' ? 'Olağan' : 'Olağanüstü'
            let notificationMessage = ''
            let notificationTitle = ''

            if (status === 'ACCEPTED') {
                notificationTitle = 'Genel Kurul Katılımı Onaylandı'
                notificationMessage = `${member.name} ${member.surname} - ${assemblyTypeName} Genel Kurul katılımını onaylamıştır.`
            } else if (status === 'REJECTED') {
                notificationTitle = 'Genel Kurul Katılımı Reddedildi'
                notificationMessage = `${member.name} ${member.surname} - ${assemblyTypeName} Genel Kurul katılımını reddetmiştir.${rejectionReason ? ` Nedeni: ${rejectionReason}` : ''
                    }`
            }

            if (notificationMessage && notificationTitle) {
                // STK founder/manager bulup bildirim gönder
                const stk = await prisma.sTK.findUnique({
                    where: { id: payload.stkId },
                    select: { managerId: true }
                })

                if (stk && stk.managerId) {
                    await prisma.notification.create({
                        data: {
                            userId: stk.managerId,
                            title: notificationTitle,
                            message: notificationMessage,
                            type: 'assembly_attendance_response',
                            link: `/stk/genel-kurul/${attendee.assembly.id}`,
                            isRead: false,
                            metadata: {
                                assemblyId: attendee.assembly.id,
                                attendeeId: id,
                                memberId: attendee.memberId,
                                responseStatus: status
                            }
                        }
                    })
                }
            }
        }

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
