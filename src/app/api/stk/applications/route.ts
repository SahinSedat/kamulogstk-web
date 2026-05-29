import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET /api/stk/applications - Üyelik başvurularını listele
// Note: This endpoint joins MembershipApplication with ApplicationHistory for a complete log.
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

        // Query for History
        // We use the same 'where' logic but adapted for History fields if needed
        // Since ApplicationHistory has 'stkId', we use that.
        // Status filter applies to history.status
        const historyWhere: any = { stkId: stk.id }
        if (status && status !== 'all') {
            historyWhere.status = status
        }
        // Search term logic needs to filter on related member
        // ApplicationHistory -> application -> member
        // But prisma doesn't support deep filtering easily on relation.
        // If we want search, we might need to filter manually or use separate query.
        // For now, let's assuming strict filtering only on Status.
        // If 'searchTerm' is complex, history search might be limited.

        const [applications, totalApp, pendingCount, activeCount, rejectedCount] = await Promise.all([
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
                            memberNumber: true,
                        }
                    }
                },
                orderBy: { applicationDate: 'desc' },
                take: limit,
                skip: (page - 1) * limit,
            }),
            prisma.membershipApplication.count({ where: { stkId: stk.id } }),
            prisma.membershipApplication.count({ where: { stkId: stk.id, status: { in: ['APPLIED', 'PENDING'] } } }),
            prisma.membershipApplication.count({ where: { stkId: stk.id, status: 'ACTIVE' } }),
            prisma.membershipApplication.count({ where: { stkId: stk.id, status: 'REJECTED' } }),
        ])

        return NextResponse.json({
            success: true,
            applications: applications.map(app => ({
                ...app,
                boardDecisionNumber: app.boardDecisionNumber || null,
                boardDecisionDate: app.boardDecisionDate || null,
            })),
            pagination: {
                page,
                limit,
                total: totalApp,
                totalPages: Math.ceil(totalApp / limit)
            },
            stats: {
                total: pendingCount + activeCount + rejectedCount,
                pending: pendingCount,
                approved: activeCount,
                rejected: rejectedCount,
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

        // Check if member already exists with this TC or Email
        const existingMember = await prisma.member.findFirst({
            where: {
                stkId,
                OR: [
                    { tcKimlik },
                    { email }
                ]
            },
            include: { application: true }
        })

        let member;
        let application;

        if (existingMember) {
            // Aktif veya beklemede olan üyeler için yeni başvuru yapılamaz
            if (['ACTIVE', 'PENDING', 'APPLIED', 'RESIGNATION_REQ'].includes(existingMember.status)) {
                return NextResponse.json({
                    error: 'Bu bilgilere sahip aktif veya işlemde olan bir üye zaten mevcut.'
                }, { status: 400 })
            }

            // Reddedilmiş veya ayrılmış üyeler için yeniden başvuru (Re-apply)
            // Önceki durumu tarihçeye kaydet
            if (existingMember.application) {
                await prisma.applicationHistory.create({
                    data: {
                        stkId,
                        applicationId: existingMember.application.id,
                        status: existingMember.application.status,
                        applicationDate: existingMember.application.applicationDate,
                        boardDecisionNumber: existingMember.application.boardDecisionNumber,
                        boardDecisionDate: existingMember.application.boardDecisionDate,
                        rejectionReason: existingMember.application.rejectionReason,
                        reviewNotes: existingMember.application.reviewNotes,
                        reviewedBy: existingMember.application.reviewedBy,
                        reviewDate: existingMember.application.reviewDate || new Date(),
                    }
                })

                // Mevcut başvuruyu güncelle
                application = await prisma.membershipApplication.update({
                    where: { id: existingMember.application.id },
                    data: {
                        status: 'APPLIED',
                        applicationDate: new Date(),
                        // Dokümanlar güncellenebilir mi? Evet ama burada basitleştirdik
                        rejectionReason: null, // Temizle
                        boardDecisionNumber: null,
                        boardDecisionDate: null,
                        reviewNotes: null,
                        reviewedBy: null,
                        reviewDate: null
                    }
                })
            } else {
                // Application kaydı yoksa oluştur (Edge case)
                application = await prisma.membershipApplication.create({
                    data: {
                        stkId,
                        memberId: existingMember.id,
                        status: 'APPLIED',
                        applicationDate: new Date()
                    }
                })
            }

            // Üye bilgilerini güncelle
            member = await prisma.member.update({
                where: { id: existingMember.id },
                data: {
                    status: 'APPLIED',
                    name,
                    surname,
                    email,
                    phone,
                    birthDate: birthDate ? new Date(birthDate) : undefined,
                    address,
                    updatedAt: new Date()
                }
            })

        } else {
            // Create member with APPLIED status
            member = await prisma.member.create({
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
            application = await prisma.membershipApplication.create({
                data: {
                    stkId,
                    memberId: member.id,
                    applicationDate: new Date(),
                    status: 'APPLIED'
                }
            })
        }

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
