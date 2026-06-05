import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Benzersiz ilan kodu üretici
function generateJobCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // O, 0, I, 1 karıştırılabilir karakterler çıkarıldı
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return `KMG-${code}`
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type') // PUBLIC, PRIVATE, ALL
        const search = searchParams.get('search') // Arama terimi (başlık, şirket veya kod)

        // Arama ve tip filtreleri
        const where: any = {}

        if (type && type !== 'ALL') {
            where.type = type
        }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
                { code: { contains: search.toUpperCase(), mode: 'insensitive' } }
            ]
        }

        const jobs = await prisma.jobListing.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        })

        // Kullanıcının Premium olup olmadığını kontrol et
        const session = await getServerSession(authOptions)
        let isPremium = false

        if (session?.user?.id) {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: {
                    kariyerSubscription: {
                        select: { plan: true, status: true }
                    }
                }
            })

            // Sadece PREMIUM ve aktif abonelik
            isPremium = user?.kariyerSubscription?.status === 'ACTIVE' && user?.kariyerSubscription?.plan === 'PREMIUM'
        }

        // employerPhone'u sadece Premium kullanıcılara göster
        const safeJobs = jobs.map(job => ({
            ...job,
            employerPhone: isPremium ? job.employerPhone : null
        }))

        return NextResponse.json({ jobs: safeJobs, isPremium })
    } catch (error) {
        console.error('Get jobs error:', error)
        return NextResponse.json({ error: 'İş ilanları yüklenemedi' }, { status: 500 })
    }
}

// Sadece admin ilan ekleyebilir
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()

        // Benzersiz kod üret
        let code = generateJobCode()
        let attempts = 0
        while (attempts < 10) {
            const existing = await prisma.jobListing.findUnique({ where: { code } })
            if (!existing) break
            code = generateJobCode()
            attempts++
        }

        // Veri temizleme - boş stringleri null yap, deadline'ı DateTime formatına çevir
        const jobData = {
            code,
            title: body.title,
            company: body.company,
            location: body.location || null,
            type: body.type || 'PRIVATE',
            description: body.description,
            requirements: body.requirements || null,
            sourceUrl: body.sourceUrl || null,
            applicationUrl: body.applicationUrl || null,
            salary: body.salary || null,
            deadline: body.deadline ? new Date(body.deadline) : null,
            employerPhone: body.employerPhone || null,
        }

        const job = await prisma.jobListing.create({
            data: jobData,
        })
        return NextResponse.json({ job })
    } catch (error: any) {
        console.error('Job create error:', error)
        return NextResponse.json({ error: error?.message || 'İlan oluşturulamadı' }, { status: 500 })
    }
}
