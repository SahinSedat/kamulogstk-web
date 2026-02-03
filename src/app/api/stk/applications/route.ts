import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/stk/applications - Üyelik başvurularını listele
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
        }

        const stk = await prisma.sTK.findFirst({
            where: { managerId: user.id }
        })

        if (!stk) {
            return NextResponse.json({ error: 'STK bulunamadı' }, { status: 404 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')

        const where: Record<string, unknown> = { stkId: stk.id }
        if (status && status !== 'all') {
            where.status = status
        }

        const [applications, total] = await Promise.all([
            prisma.membershipApplication.findMany({
                where,
                include: {
                    member: {
                        select: {
                            id: true,
                            name: true,
                            surname: true,
                            email: true,
                            phone: true,
                            tcKimlik: true,
                            memberNumber: true
                        }
                    }
                },
                orderBy: { applicationDate: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.membershipApplication.count({ where })
        ])

        return NextResponse.json({
            success: true,
            applications,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Applications fetch error:', error)
        return NextResponse.json({ error: 'Başvurular alınamadı' }, { status: 500 })
    }
}

// POST /api/stk/applications - Yeni başvuru (mobil/web)
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
        }

        const body = await request.json()
        const { stkId, name, surname, email, phone, tcKimlik, birthDate, address } = body

        // Validate required fields
        if (!stkId || !name || !surname || !email || !tcKimlik) {
            return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 })
        }

        // Check if STK exists
        const stk = await prisma.sTK.findUnique({ where: { id: stkId } })
        if (!stk) {
            return NextResponse.json({ error: 'STK bulunamadı' }, { status: 404 })
        }

        // Check if member already exists with this TC
        const existingMember = await prisma.member.findFirst({
            where: { stkId, tcKimlik }
        })
        if (existingMember) {
            return NextResponse.json({ error: 'Bu TC numarası ile kayıtlı üye mevcut' }, { status: 400 })
        }

        // Create member with APPLIED status
        const member = await prisma.member.create({
            data: {
                stkId,
                name,
                surname,
                email,
                phone,
                tcKimlik,
                birthDate: birthDate ? new Date(birthDate) : null,
                address,
                status: 'APPLIED',
                memberNumber: `UYE-${Date.now().toString(36).toUpperCase()}`
            }
        })

        // Create application
        const application = await prisma.membershipApplication.create({
            data: {
                stkId,
                memberId: member.id,
                applicationDate: new Date(),
                status: 'APPLIED'
            }
        })

        // Log
        await prisma.auditLog.create({
            data: {
                action: 'MEMBER_CREATE',
                entityType: 'MembershipApplication',
                entityId: application.id,
                userId: user.id,
                userEmail: user.email,
                userName: user.name,
                description: `Yeni üyelik başvurusu: ${name} ${surname}`,
                stkId
            }
        })

        return NextResponse.json({ success: true, application, member })
    } catch (error) {
        console.error('Application create error:', error)
        return NextResponse.json({ error: 'Başvuru oluşturulamadı' }, { status: 500 })
    }
}
