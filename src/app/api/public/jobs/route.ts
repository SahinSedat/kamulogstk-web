import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Public API: İş ilanlarını listele (auth gerektirmez)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search') || ''
        const type = searchParams.get('type') || ''
        const city = searchParams.get('city') || ''

        const where: any = { isActive: true }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
            ]
        }
        if (type && type !== 'ALL') where.type = type
        if (city) where.location = { contains: city, mode: 'insensitive' }

        const jobs = await prisma.jobListing.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100,
        })

        return NextResponse.json({ jobs })
    } catch (error) {
        console.error('Public jobs error:', error)
        return NextResponse.json({ error: 'İlanlar yüklenemedi' }, { status: 500 })
    }
}
