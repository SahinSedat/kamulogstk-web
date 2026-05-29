import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user || (user.role !== UserRole.STK_MANAGER && user.role !== UserRole.ADMIN)) {
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 })
        }

        const stk = await prisma.sTK.findFirst({
            where: user.role === UserRole.STK_MANAGER ? { managerId: user.id } : {},
            include: {
                _count: {
                    select: {
                        members: true,
                        membershipApps: { where: { status: 'PENDING' } as any },
                    }
                }
            }
        })

        if (!stk) {
            return NextResponse.json({ success: false, error: 'STK bulunamadı' }, { status: 404 })
        }

        // Aktif üye sayısı
        const activeMembers = await prisma.member.count({
            where: { stkId: stk.id, status: 'ACTIVE' }
        })

        // Bekleyen başvuru sayısı
        const pendingApplications = await prisma.membershipApplication.count({
            where: { stkId: stk.id, status: { in: ['APPLIED', 'PENDING'] } }
        })

        // Aidat Planları İstatistikleri
        const activePlans = await prisma.duesPlan.findMany({
            where: { stkId: stk.id, isActive: true },
            select: { amount: true, period: true, isDefault: true }
        })

        const totalActivePlansAmount = activePlans.reduce((sum, plan) => sum + Number(plan.amount), 0)
        
        // Sadece varsayılan planın fiyatını al
        const defaultPlan = activePlans.find(p => p.isDefault)
        const monthlyPlansAmount = defaultPlan ? Number(defaultPlan.amount) : 0

        // Finansal özet
        const targetCollection = totalActivePlansAmount * activeMembers
        // monthlyCollection artık sadece varsayılan planı temsil ediyor (üye ile çarpılmıyor, birim fiyat)
        
        const stats = {
            totalMembers: activeMembers,
            activeMembers: activeMembers,
            pendingApplications: pendingApplications,
            monthlyDues: targetCollection, // Hedef Tahsilat (Tüm Aktif Planlar * Aktif Üye Sayısı)
            collectedDues: monthlyPlansAmount, // Aylık Tahsilat (Sadece Varsayılan Planın Birim Fiyatı)
            pendingDues: targetCollection - monthlyPlansAmount, // Fark
        }

        return NextResponse.json({ success: true, stats, stkName: stk.name })

    } catch (error) {
        console.error('STK stats error:', error)
        return NextResponse.json({ success: false, error: 'İstatistikler alınırken hata oluştu' }, { status: 500 })
    }
}
