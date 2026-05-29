import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser || currentUser.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const role = searchParams.get('role') || 'all'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const membershipStatus = searchParams.get('membershipStatus')

        const where: any = {}

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } }
            ]
        }

        // Rol filtresi - STK yöneticilerini bu listede gösterme
        if (role !== 'all') {
            where.role = role
        } else if (!membershipStatus) {
            where.role = { not: 'STK_MANAGER' }
        }

        // Üyelik durumuna göre filtreleme
        if (membershipStatus) {
            // Önce bu statüdeki üyeleri bul
            const members = await prisma.member.findMany({
                where: { status: membershipStatus as any },
                select: { userId: true, email: true }
            })

            const userIds = members.map(m => m.userId).filter(Boolean) as string[]
            const emails = members.map(m => m.email)

            where.OR = [
                ...(where.OR || []), // Mevcut OR varsa koru (search gibi)
                { id: { in: userIds } },
                { email: { in: emails } }
            ]

            // Eğer search varsa, yukarıdaki OR ile çakışabilir. 
            // Prisma'da AND içinde OR kullanımı gerekebilir ama şimdilik basit tutalım.
            // Eğer hem search hem membershipStatus varsa, ikisini AND ile birleştirmeliyiz.
            // Ancak yukarıdaki yapı (where.OR) search'in OR'u ile karışır.
            // Düzeltme:
            if (search) {
                // Search zaten where.OR'a atandı. 
                // Bizim membership kısıtlamamız bir AND koşulu olmalı.
                // Ancak Prisma'da top-level OR varken başka bir top-level koşul AND olarak davranır.
                // Yani: { OR: [search_conditions], AND: [membership_conditions] }

                // Mevcut where.OR (search) kalsın.
                // Membership kısıtlamasını ayrı bir OR ile AND'leyelim.
                where.AND = [
                    {
                        OR: [
                            { id: { in: userIds } },
                            { email: { in: emails } }
                        ]
                    }
                ]
            } else {
                // Search yoksa direkt OR olarak ekle (UserId YA DA Email eşleşmeli)
                where.OR = [
                    { id: { in: userIds } },
                    { email: { in: emails } }
                ]
            }
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    role: true,
                    status: true,
                    address: true,
                    city: true,
                    district: true,
                    occupation: true,
                    workplace: true,
                    education: true,
                    preferredCity: true,
                    createdAt: true,
                    gender: true,
                    birthDate: true,
                    registrationPurpose: true,
                    isStkOfficial: true,
                    stkOfficialRole: true,
                    isStkMember: true,
                    memberStkName: true,
                    emailVerified: true,
                    lastLoginAt: true,
                    stk: {
                        select: { id: true, name: true }
                    },
                    interests: {
                        select: {
                            sector: { select: { name: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.user.count({ where })
        ])

        // Bireysel üyelerin STK üyeliklerini ve ödemelerini e-posta üzerinden bul
        const userIds = users.map(u => u.id)
        const userEmails = users.map(u => u.email)

        const [members, boardMembers] = await Promise.all([
            prisma.member.findMany({
                where: {
                    OR: [
                        { email: { in: userEmails } },
                        { userId: { in: userIds } as any }
                    ]
                },
                include: {
                    stk: { select: { id: true, name: true } },
                    payments: {
                        select: {
                            amount: true,
                            type: true,
                            status: true,
                            paymentDate: true
                        }
                    }
                }
            }),
            // Yönetim kurulu üyelerini e-posta ile eşleştir
            prisma.boardMember.findMany({
                where: {
                    email: { in: userEmails },
                    isActive: true
                },
                select: { email: true, position: true, stkId: true }
            })
        ])

        // Board member e-postalarını ve pozisyonlarını map olarak tut
        const positionLabels: Record<string, string> = {
            PRESIDENT: 'Başkan',
            VICE_PRESIDENT: 'Başkan Yardımcısı',
            SECRETARY: 'Genel Sekreter',
            TREASURER: 'Sayman',
            MEMBER: 'Üye',
            AUDITOR: 'Denetçi',
        }
        const boardMemberMap = new Map<string, string>()
        boardMembers.forEach(bm => {
            if (bm.email) boardMemberMap.set(bm.email.toLowerCase(), positionLabels[bm.position] || bm.position)
        })

        // Kullanıcı verilerini zenginleştir
        const enrichedUsers = users.map(user => {
            const userMemberships = members.filter(m => (m as any).userId === user.id || m.email === user.email)
            const activeMemberships = userMemberships.filter(m => m.status === 'ACTIVE' || m.status === 'APPLIED')

            // Toplam bağış hesapla
            const totalDonations = userMemberships.reduce((sum, m) => {
                const memberDonations = ((m as any).payments || [])
                    .filter((p: any) => p.type === 'DONATION' && p.status === 'CONFIRMED')
                    .reduce((total: any, p: any) => total + Number(p.amount), 0)
                return sum + memberDonations
            }, 0)

            // Sistemdeki süresi (yıl)
            const yearsInSystem = (new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)

            // Gerçek üyelik varsa isStkMember true yap
            const isStkMember = activeMemberships.length > 0 || user.isStkMember
            // STK yönetiyorsa veya YK üyesiyse isStkOfficial true yap
            const boardPosition = boardMemberMap.get(user.email.toLowerCase()) || null
            const isOnBoard = !!boardPosition
            const isStkOfficial = !!user.stk || user.isStkOfficial || user.role === 'STK_MANAGER' || isOnBoard
            const memberStkNames = Array.from(new Set([
                ...(user.memberStkName ? [user.memberStkName] : []),
                ...activeMemberships.map(m => (m as any).stk.name)
            ])).join(', ')

            return {
                ...user,
                isStkMember,
                isStkOfficial,
                boardPosition,
                memberStkName: memberStkNames,
                memberships: userMemberships.map(m => ({
                    id: m.id,
                    stkName: (m as any).stk.name,
                    status: m.status,
                    joinDate: m.joinDate,
                    leaveDate: m.leaveDate,
                    leaveReason: m.leaveReason
                })),
                stats: {
                    totalDonations,
                    yearsInSystem: yearsInSystem.toFixed(1),
                    membershipCount: userMemberships.length,
                    isDonor: totalDonations > 0
                }
            }
        })

        return NextResponse.json({
            success: true,
            users: enrichedUsers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Users fetch error:', error)
        return NextResponse.json({ success: false, error: 'Kullanıcılar yüklenemedi' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser || currentUser.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 })
        }

        const body = await request.json()
        const { id, name, email, phone, role, address, city, district, occupation, workplace, education, preferredCity, status } = body

        if (!id) {
            return NextResponse.json({ success: false, error: 'Kullanıcı ID gerekli' }, { status: 400 })
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(email && { email }),
                ...(phone && { phone }),
                ...(role && { role }),
                ...(address && { address }),
                ...(city && { city }),
                ...(district && { district }),
                ...(occupation && { occupation }),
                ...(workplace && { workplace }),
                ...(education && { education }),
                ...(preferredCity && { preferredCity }),
                ...(status && { status })
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                status: true
            }
        })

        return NextResponse.json({ success: true, user: updatedUser })
    } catch (error) {
        console.error('User update error:', error)
        return NextResponse.json({ success: false, error: 'Kullanıcı güncellenemedi' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser || currentUser.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ success: false, error: 'Kullanıcı ID gerekli' }, { status: 400 })
        }

        // Prevent self-deletion
        if (id === currentUser.id) {
            return NextResponse.json({ success: false, error: 'Kendinizi silemezsiniz' }, { status: 400 })
        }

        // Check if user manages an STK
        const managedStk = await prisma.sTK.findFirst({
            where: { managerId: id }
        })

        if (managedStk) {
            return NextResponse.json({
                success: false,
                error: `Bu kullanıcı "${managedStk.name}" kurumunun yöneticisidir. Silmek için önce kurum yöneticisini değiştirin.`
            }, { status: 400 })
        }

        await prisma.user.delete({ where: { id } })

        return NextResponse.json({ success: true, message: 'Kullanıcı silindi' })
    } catch (error) {
        console.error('User delete error:', error)
        return NextResponse.json({ success: false, error: 'Kullanıcı silinemedi' }, { status: 500 })
    }
}
