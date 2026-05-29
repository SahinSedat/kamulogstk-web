import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// ============================================
// GET: STK'ya yapılan üye başvurularını getir
// (Admin panelindeki STKApplication tablosundan)
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

        let orgStkId: string | null = stkId

        if (!orgStkId) {
            if (userRole === 'BRANCH_MANAGER') {
                const branch = await prisma.sTKBranch.findFirst({
                    where: { branchManagers: { some: { id: userId } } },
                    select: { stkId: true }
                })
                if (!branch) {
                    return NextResponse.json({ success: false, error: 'Bağlı şube bulunamadı' }, { status: 404 })
                }
                orgStkId = branch.stkId
            } else {
                const stk = await prisma.sTK.findFirst({
                    where: { managerId: userId },
                    select: { id: true }
                })
                if (!stk) {
                    return NextResponse.json({ success: false, error: 'Bağlı STK bulunamadı' }, { status: 404 })
                }
                orgStkId = stk.id
            }
        }

        // STKApplication tablosundan bu STK'ya ait başvuruları çek
        // Not: Bu tablo admin panelinin kullandığı üye başvuru tablosu
        const applications = await prisma.$queryRaw<Array<{
            id: string
            stkId: string
            userId: string | null
            name: string
            tcKimlik: string
            phone: string
            email: string
            status: string
            createdAt: Date
            updatedAt: Date
            approvedAt: Date | null
            consentGiven: boolean | null
            signatureType: string | null
            signatureUrl: string | null
            documentUrl: string | null
            membershipStatus: string | null
            expiryDate: Date | null
            startDate: Date | null
        }>>`
            SELECT 
                id, "stkId", "userId", name, "tcKimlik", phone, email, status,
                "createdAt", "updatedAt", "approvedAt",
                "consentGiven", "signatureType", "signatureUrl", "documentUrl",
                "membershipStatus", "expiryDate", "startDate"
            FROM "STKApplication"
            WHERE "stkId" = ${orgStkId}
            ORDER BY "createdAt" DESC
        `

        // İstatistikler
        const stats = {
            total: applications.length,
            pending: applications.filter(a => a.status === 'PENDING').length,
            approved: applications.filter(a => a.status === 'APPROVED').length,
            rejected: applications.filter(a => a.status === 'REJECTED').length,
            resigned: applications.filter(a => a.status === 'RESIGNED' || a.status === 'RESIGN_PENDING').length,
        }

        return NextResponse.json({
            success: true,
            applications,
            stats,
            total: applications.length,
        })

    } catch (error) {
        console.error('[STK-APPLICATIONS-LEGACY] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Başvurular yüklenirken hata oluştu' },
            { status: 500 }
        )
    }
}

// ============================================
// PATCH: Başvuru durumunu güncelle
// ============================================
export async function PATCH(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId || (userRole !== 'STK_MANAGER' && userRole !== 'ADMIN')) {
            return NextResponse.json(
                { success: false, error: 'Yetkisiz erişim' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { applicationId, status } = body

        if (!applicationId) {
            return NextResponse.json({ success: false, error: 'Başvuru ID gerekli' }, { status: 400 })
        }

        if (!status || !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
            return NextResponse.json({ success: false, error: 'Geçersiz durum' }, { status: 400 })
        }

        const now = new Date()

        if (status === 'APPROVED') {
            // Onayla + memberCount artır
            await prisma.$executeRaw`
                UPDATE "STKApplication" 
                SET status = ${status}, "approvedAt" = ${now}, "membershipStatus" = 'ACTIVE', "startDate" = ${now}, "updatedAt" = ${now}
                WHERE id = ${applicationId}
            `
            // STK üye sayısını artır
            const app = await prisma.$queryRaw<Array<{ stkId: string }>>`SELECT "stkId" FROM "STKApplication" WHERE id = ${applicationId}`
            if (app.length > 0) {
                await prisma.$executeRaw`UPDATE "STKOrganization" SET "memberCount" = "memberCount" + 1 WHERE id = ${app[0].stkId}`
            }
        } else if (status === 'REJECTED') {
            await prisma.$executeRaw`
                UPDATE "STKApplication" 
                SET status = ${status}, "updatedAt" = ${now}
                WHERE id = ${applicationId}
            `
        } else {
            await prisma.$executeRaw`
                UPDATE "STKApplication" 
                SET status = ${status}, "updatedAt" = ${now}
                WHERE id = ${applicationId}
            `
        }

        return NextResponse.json({
            success: true,
            message: status === 'APPROVED' ? 'Başvuru onaylandı' : status === 'REJECTED' ? 'Başvuru reddedildi' : 'Başvuru güncellendi',
        })

    } catch (error) {
        console.error('[STK-APPLICATIONS-LEGACY-PATCH] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Başvuru güncellenirken hata oluştu' },
            { status: 500 }
        )
    }
}
