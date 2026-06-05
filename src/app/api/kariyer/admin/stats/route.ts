import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Admin middleware
async function checkAdmin() {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
        return null
    }
    return session
}

// Dashboard istatistikleri
export async function GET(req: NextRequest) {
    const session = await checkAdmin()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const startOfWeek = new Date(startOfToday)
        startOfWeek.setDate(startOfWeek.getDate() - 7)
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        // Paralel sorgular
        const [
            totalUsers,
            todaySignups,
            weeklySignups,
            monthlySignups,
            totalCVs,
            totalSubscriptions,
            activeSubscriptions,
            pendingSubscriptions,
            planDistribution,
            // Yeni istatistikler
            totalJobs,
            publicJobs,
            privateJobs,
            totalSales,
            salesRevenue,
            todayLogs,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
            prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
            prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
            prisma.cV.count(),
            prisma.subscription.count(),
            prisma.subscription.count({ where: { status: 'ACTIVE' } }),
            prisma.subscription.count({ where: { status: 'PENDING' } }),
            prisma.subscription.groupBy({
                by: ['planId'],
                _count: { planId: true },
            }),
            // Job listings
            prisma.jobListing.count(),
            prisma.jobListing.count({ where: { type: 'PUBLIC' } }),
            prisma.jobListing.count({ where: { type: 'PRIVATE' } }),
            // Sales
            prisma.salesRecord.count({ where: { status: 'COMPLETED' } }),
            prisma.salesRecord.aggregate({
                where: { status: 'COMPLETED' },
                _sum: { amount: true },
            }),
            // Logs
            prisma.adminLog.count({ where: { createdAt: { gte: startOfToday } } }),
        ])

        const planStats = planDistribution.reduce((acc, item) => {
            acc[item.planId] = item._count.planId
            return acc
        }, {} as Record<string, number>)

        return NextResponse.json({
            users: {
                total: totalUsers,
                today: todaySignups,
                weekly: weeklySignups,
                monthly: monthlySignups,
            },
            cvs: {
                total: totalCVs,
            },
            subscriptions: {
                total: totalSubscriptions,
                active: activeSubscriptions,
                pending: pendingSubscriptions,
                byPlan: planStats,
            },
            jobs: {
                total: totalJobs,
                public: publicJobs,
                private: privateJobs,
            },
            sales: {
                total: totalSales,
                revenue: salesRevenue._sum.amount || 0,
            },
            logs: {
                today: todayLogs,
            },
        })
    } catch (error) {
        console.error('Admin stats error:', error)
        return NextResponse.json({ error: 'İstatistikler yüklenemedi' }, { status: 500 })
    }
}
