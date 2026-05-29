import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

// GET: Genel kurulları listele
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
        const includeDetails = searchParams.get('details') === 'true'

        const assemblies = await prisma.generalAssembly.findMany({
            where: { stkId: payload.stkId },
            orderBy: { assemblyDate: 'desc' },
            include: includeDetails ? {
                agendaItems: { orderBy: { orderNumber: 'asc' } },
                attendees: true,
                proxies: true,
                _count: {
                    select: {
                        attendees: true,
                        proxies: true
                    }
                }
            } : {
                _count: {
                    select: {
                        attendees: true,
                        proxies: true
                    }
                }
            }
        })

        return NextResponse.json({ assemblies })
    } catch (error) {
        console.error('Error fetching assemblies:', error)
        return NextResponse.json({ error: 'Genel kurullar yüklenemedi' }, { status: 500 })
    }
}

// POST: Yeni genel kurul oluştur
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
        const { assemblyType, assemblyNumber, assemblyDate, location, quorumRequired, agendaItems } = body

        if (!assemblyType || !assemblyNumber || !assemblyDate || !location || !quorumRequired) {
            return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 })
        }

        // Aynı numaralı genel kurul var mı kontrol et
        const existing = await prisma.generalAssembly.findFirst({
            where: {
                stkId: payload.stkId,
                assemblyNumber: parseInt(assemblyNumber)
            }
        })

        if (existing) {
            return NextResponse.json({ error: 'Bu numaralı genel kurul zaten mevcut' }, { status: 400 })
        }

        const assembly = await prisma.generalAssembly.create({
            data: {
                stkId: payload.stkId,
                assemblyType,
                assemblyNumber: parseInt(assemblyNumber),
                assemblyDate: new Date(assemblyDate),
                location,
                quorumRequired: parseInt(quorumRequired),
                status: 'PLANNED',
                agendaItems: agendaItems?.length > 0 ? {
                    create: agendaItems.map((item: { title: string; description?: string }, index: number) => ({
                        orderNumber: index + 1,
                        title: item.title,
                        description: item.description || null
                    }))
                } : undefined
            },
            include: {
                agendaItems: { orderBy: { orderNumber: 'asc' } }
            }
        })

        // Send notifications to all active members
        const activeMembers = await prisma.member.findMany({
            where: {
                stkId: payload.stkId,
                status: 'ACTIVE',
                userId: { not: null }
            },
            select: { userId: true }
        })

        if (activeMembers.length > 0) {
            await prisma.notification.createMany({
                data: activeMembers.map(member => ({
                    userId: member.userId!,
                    title: 'Yeni Genel Kurul',
                    message: `${assemblyNumber}. Genel Kurul ${new Date(assemblyDate).toLocaleDateString('tr-TR')} tarihinde ${location} adresinde yapılacaktır.`,
                    type: 'general_assembly',
                    link: `/uyegirisi`,
                    isRead: false
                }))
            })
        }

        return NextResponse.json({ success: true, assembly })
    } catch (error) {
        console.error('Error creating assembly:', error)
        return NextResponse.json({ error: 'Genel kurul oluşturulamadı' }, { status: 500 })
    }
}

// PUT: Genel kurulu güncelle
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
        const { id, assemblyType, assemblyDate, location, quorumRequired, status, minutesContent, attendeeCount, proxyCount } = body

        if (!id) {
            return NextResponse.json({ error: 'Genel kurul ID gerekli' }, { status: 400 })
        }

        // Genel kurulun bu STK'ya ait olduğunu doğrula
        const existing = await prisma.generalAssembly.findFirst({
            where: { id, stkId: payload.stkId }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Genel kurul bulunamadı' }, { status: 404 })
        }

        const updateData: Record<string, unknown> = {}
        if (assemblyType) updateData.assemblyType = assemblyType
        if (assemblyDate) updateData.assemblyDate = new Date(assemblyDate)
        if (location) updateData.location = location
        if (quorumRequired) updateData.quorumRequired = parseInt(quorumRequired)
        if (status) updateData.status = status
        if (minutesContent !== undefined) updateData.minutesContent = minutesContent
        if (attendeeCount !== undefined) updateData.attendeeCount = parseInt(attendeeCount)
        if (proxyCount !== undefined) updateData.proxyCount = parseInt(proxyCount)

        const assembly = await prisma.generalAssembly.update({
            where: { id },
            data: updateData,
            include: {
                agendaItems: { orderBy: { orderNumber: 'asc' } },
                _count: { select: { attendees: true, proxies: true } }
            }
        })

        // Send status change notification if status changed
        if (status && status !== existing.status) {
            const activeMembers = await prisma.member.findMany({
                where: {
                    stkId: payload.stkId,
                    status: 'ACTIVE',
                    userId: { not: null }
                },
                select: { userId: true }
            })

            let notificationTitle = 'Genel Kurul Durum Değişimi'
            let notificationMessage = 'Genel kurul durumu güncellendi.'

            if (status === 'IN_PROGRESS') {
                notificationTitle = 'Genel Kurul Başladı'
                notificationMessage = `${existing.assemblyNumber}. Genel Kurul başlamıştır.`
            } else if (status === 'COMPLETED') {
                notificationTitle = 'Genel Kurul Tamamlandı'
                notificationMessage = `${existing.assemblyNumber}. Genel Kurul tamamlanmıştır.`
            } else if (status === 'POSTPONED') {
                notificationTitle = 'Genel Kurul Ertelendi'
                notificationMessage = `${existing.assemblyNumber}. Genel Kurul ertelenmiştir.`
            }

            if (activeMembers.length > 0) {
                await prisma.notification.createMany({
                    data: activeMembers.map(member => ({
                        userId: member.userId!,
                        title: notificationTitle,
                        message: notificationMessage,
                        type: 'general_assembly',
                        link: `/uyegirisi`,
                        isRead: false
                    }))
                })
            }
        }

        return NextResponse.json({ success: true, assembly })
    } catch (error) {
        console.error('Error updating assembly:', error)
        return NextResponse.json({ error: 'Genel kurul güncellenemedi' }, { status: 500 })
    }
}

// DELETE: Genel kurulu sil
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
            return NextResponse.json({ error: 'Genel kurul ID gerekli' }, { status: 400 })
        }

        // Genel kurulun bu STK'ya ait olduğunu ve silinebilir durumda olduğunu doğrula
        const existing = await prisma.generalAssembly.findFirst({
            where: { id, stkId: payload.stkId }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Genel kurul bulunamadı' }, { status: 404 })
        }

        // Katılımcısı olan tamamlanmış genel kurullar silinemez
        if (existing.status === 'COMPLETED') {
            const attendeeCount = await prisma.assemblyAttendee.count({
                where: { assemblyId: id }
            })
            if (attendeeCount > 0) {
                return NextResponse.json({ error: 'Katılımcısı olan tamamlanmış genel kurullar silinemez' }, { status: 400 })
            }
        }

        await prisma.generalAssembly.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting assembly:', error)
        return NextResponse.json({ error: 'Genel kurul silinemedi' }, { status: 500 })
    }
}
