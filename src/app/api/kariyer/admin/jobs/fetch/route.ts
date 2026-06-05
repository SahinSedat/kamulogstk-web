import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSampleJobs } from '@/lib/job-scraper'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// POST - Yeni ilanları çek ve kaydet
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const body = await request.json()
        const { count = 10, source = 'sample' } = body

        let jobs

        if (source === 'sample') {
            // Örnek ilanlar oluştur
            jobs = generateSampleJobs(count)
        } else {
            // İleride gerçek web scraping eklenebilir
            jobs = generateSampleJobs(count)
        }

        // Veritabanına kaydet
        const created = await prisma.jobListing.createMany({
            data: jobs.map(job => ({
                title: job.title,
                company: job.company,
                location: job.location,
                description: job.description,
                requirements: job.requirements,
                type: job.type,
                sourceUrl: job.sourceUrl,
                applicationUrl: job.applicationUrl,
                salary: job.salary,
                deadline: job.deadline ? new Date(job.deadline) : null,
            })),
        })

        // Admin log
        await prisma.adminLog.create({
            data: {
                adminId: session.user.id,
                action: 'CREATE',
                targetType: 'JOB',
                details: JSON.stringify({
                    count: created.count,
                    source,
                    message: `${created.count} yeni ilan oluşturuldu`
                }),
            }
        })

        return NextResponse.json({
            success: true,
            created: created.count,
            message: `${created.count} yeni iş ilanı oluşturuldu`,
        })
    } catch (error) {
        console.error('Error fetching jobs:', error)
        return NextResponse.json({ error: 'İlanlar çekilirken hata oluştu' }, { status: 500 })
    }
}

// DELETE - Tüm ilanları sil (opsiyonel)
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // PUBLIC, PRIVATE veya ALL

        let where = {}
        if (type && type !== 'ALL') {
            where = { type }
        }

        const { count } = await prisma.jobListing.deleteMany({ where })

        // Admin log
        await prisma.adminLog.create({
            data: {
                adminId: session.user.id,
                action: 'DELETE',
                targetType: 'JOB',
                details: JSON.stringify({ deletedCount: count, type }),
            }
        })

        return NextResponse.json({ deleted: count })
    } catch (error) {
        console.error('Error deleting jobs:', error)
        return NextResponse.json({ error: 'İlanlar silinirken hata oluştu' }, { status: 500 })
    }
}
