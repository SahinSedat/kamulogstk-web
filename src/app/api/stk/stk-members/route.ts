import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// ============================================
// GET: STK'nın üyelerini getir
// Admin panelindeki STKApplication (APPROVED) + yeni Member tablosu
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

        // Kaynak 1: Admin panelinden onaylanmış STKApplication üyeleri
        const legacyMembers = await prisma.$queryRaw<Array<{
            id: string
            name: string
            tcKimlik: string
            phone: string
            email: string
            status: string
            membershipStatus: string | null
            approvedAt: Date | null
            startDate: Date | null
            expiryDate: Date | null
            createdAt: Date
        }>>`
            SELECT 
                id, name, "tcKimlik", phone, email, status,
                "membershipStatus", "approvedAt", "startDate", "expiryDate", "createdAt"
            FROM "STKApplication"
            WHERE "stkId" = ${orgStkId} AND status = 'APPROVED'
            ORDER BY "approvedAt" DESC NULLS LAST
        `

        // Kaynak 2: Yeni Member tablosundan üyeler
        const newMembers = await prisma.member.findMany({
            where: { stkId: orgStkId, status: { in: ['ACTIVE', 'APPLIED', 'PENDING'] } },
            select: {
                id: true,
                name: true,
                surname: true,
                email: true,
                phone: true,
                tcKimlik: true,
                city: true,
                status: true,
                category: true,
                registrationSource: true,
                createdAt: true,
                branch: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        })

        // Birleştir
        const combinedMembers = [
            // Eski (admin panel) üyeleri
            ...legacyMembers.map(m => ({
                id: m.id,
                name: m.name,
                surname: '',
                fullName: m.name,
                email: m.email,
                phone: m.phone,
                tcKimlik: m.tcKimlik,
                status: m.membershipStatus || 'ACTIVE',
                source: 'ADMIN_PANEL' as const,
                approvedAt: m.approvedAt,
                startDate: m.startDate,
                expiryDate: m.expiryDate,
                createdAt: m.createdAt,
                branch: null,
                city: null,
                category: null,
            })),
            // Yeni üyeler
            ...newMembers.map(m => ({
                id: m.id,
                name: m.name,
                surname: m.surname,
                fullName: `${m.name} ${m.surname}`,
                email: m.email,
                phone: m.phone,
                tcKimlik: m.tcKimlik,
                status: m.status,
                source: 'STK_PANEL' as const,
                approvedAt: null,
                startDate: m.createdAt,
                expiryDate: null,
                createdAt: m.createdAt,
                branch: m.branch,
                city: m.city,
                category: m.category,
            })),
        ]

        // E-posta bazlı deduplicate (aynı kişi iki kaynakta varsa, admin paneli öncelikli)
        const seen = new Set<string>()
        const uniqueMembers = combinedMembers.filter(m => {
            const key = m.email?.toLowerCase()
            if (key && seen.has(key)) return false
            if (key) seen.add(key)
            return true
        })

        return NextResponse.json({
            success: true,
            members: uniqueMembers,
            stats: {
                total: uniqueMembers.length,
                fromAdminPanel: legacyMembers.length,
                fromSTKPanel: newMembers.length,
            },
        })

    } catch (error) {
        console.error('[STK-MEMBERS-COMBINED] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Üyeler yüklenirken hata oluştu' },
            { status: 500 }
        )
    }
}
