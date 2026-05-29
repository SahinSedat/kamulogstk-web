import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// ============================================
// GET: Yöneticinin faaliyetlerini getir
// ============================================
export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const stkId = request.headers.get('x-stk-id')

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Yetkisiz erişim' },
                { status: 403 }
            )
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let where: any = {}

        if (userRole === 'BRANCH_MANAGER') {
            // Şube başkanı → sadece kendi şubesinin faaliyetlerini görür
            const branch = await prisma.sTKBranch.findFirst({
                where: { branchManagers: { some: { id: userId } } },
                select: { id: true, stkId: true }
            })
            if (!branch) {
                return NextResponse.json(
                    { success: false, error: 'Bağlı şube bulunamadı' },
                    { status: 404 }
                )
            }
            where = { branchId: branch.id, stkId: branch.stkId }
        } else if (userRole === 'STK_MANAGER' || userRole === 'ADMIN') {
            // Genel merkez yöneticisi → STK'ya ait tüm faaliyetler
            if (stkId) {
                where = { stkId }
            } else {
                // JWT'de stkId yoksa DB'den bul
                const stk = await prisma.sTK.findFirst({
                    where: { managerId: userId },
                    select: { id: true }
                })
                if (!stk) {
                    return NextResponse.json(
                        { success: false, error: 'Bağlı STK bulunamadı' },
                        { status: 404 }
                    )
                }
                where = { stkId: stk.id }
            }
        } else {
            return NextResponse.json(
                { success: false, error: 'Bu işlem için yetkiniz yok' },
                { status: 403 }
            )
        }

        const activities = await prisma.sTKActivity.findMany({
            where,
            select: {
                id: true,
                title: true,
                content: true,
                date: true,
                location: true,
                imageUrl: true,
                isPublished: true,
                createdAt: true,
                updatedAt: true,
                branch: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                    }
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        })

        return NextResponse.json({
            success: true,
            activities,
            total: activities.length,
        })

    } catch (error) {
        console.error('[STK-ACTIVITIES-GET] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Faaliyetler yüklenirken hata oluştu' },
            { status: 500 }
        )
    }
}

// ============================================
// POST: Yeni faaliyet ekle
// ============================================
export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const stkId = request.headers.get('x-stk-id')

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Yetkisiz erişim' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { title, content, date, location, imageUrl } = body

        // Validasyon
        if (!title || title.trim().length < 2) {
            return NextResponse.json(
                { success: false, error: 'Faaliyet başlığı en az 2 karakter olmalıdır.' },
                { status: 400 }
            )
        }

        let assignedStkId: string | null = null
        let assignedBranchId: string | null = null

        if (userRole === 'BRANCH_MANAGER') {
            // Şube başkanı → faaliyeti kendi şubesine bağlar
            const branch = await prisma.sTKBranch.findFirst({
                where: { branchManagers: { some: { id: userId } } },
                select: { id: true, stkId: true }
            })
            if (!branch) {
                return NextResponse.json(
                    { success: false, error: 'Bağlı şube bulunamadı' },
                    { status: 404 }
                )
            }
            assignedStkId = branch.stkId
            assignedBranchId = branch.id
        } else if (userRole === 'STK_MANAGER' || userRole === 'ADMIN') {
            // Genel merkez → faaliyeti STK'ya bağlar (şubesiz = merkez faaliyeti)
            if (stkId) {
                assignedStkId = stkId
            } else {
                const stk = await prisma.sTK.findFirst({
                    where: { managerId: userId },
                    select: { id: true }
                })
                if (!stk) {
                    return NextResponse.json(
                        { success: false, error: 'Bağlı STK bulunamadı' },
                        { status: 404 }
                    )
                }
                assignedStkId = stk.id
            }
        } else {
            return NextResponse.json(
                { success: false, error: 'Bu işlem için yetkiniz yok' },
                { status: 403 }
            )
        }

        const activity = await prisma.sTKActivity.create({
            data: {
                stkId: assignedStkId!,
                branchId: assignedBranchId,
                title: title.trim(),
                content: content?.trim() || null,
                date: date ? new Date(date) : null,
                location: location?.trim() || null,
                imageUrl: imageUrl?.trim() || null,
                isPublished: true,
            },
            select: {
                id: true,
                title: true,
                content: true,
                date: true,
                location: true,
                imageUrl: true,
                isPublished: true,
                createdAt: true,
                branch: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                    }
                },
            }
        })

        // AuditLog: Faaliyet oluşturuldu
        try {
            await prisma.auditLog.create({
                data: {
                    action: 'STK_UPDATE' as any,
                    entityType: 'STKActivity',
                    entityId: activity.id,
                    userId: userId,
                    userName: userRole === 'BRANCH_MANAGER' ? 'Şube Yöneticisi' : 'STK Yöneticisi',
                    description: `Faaliyet oluşturuldu: "${activity.title}"${activity.branch ? ` (${activity.branch.name})` : ''}`,
                    newData: { title: activity.title, date: activity.date, location: activity.location } as any,
                    stkId: assignedStkId!,
                }
            })
        } catch (logErr) {
            console.error('Audit log error (non-blocking):', logErr)
        }

        return NextResponse.json({
            success: true,
            message: `"${activity.title}" faaliyeti başarıyla oluşturuldu`,
            activity,
        }, { status: 201 })

    } catch (error) {
        console.error('[STK-ACTIVITIES-POST] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Faaliyet oluşturulurken hata oluştu' },
            { status: 500 }
        )
    }
}
