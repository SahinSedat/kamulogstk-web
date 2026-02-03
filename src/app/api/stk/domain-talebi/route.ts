import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

// Domain taleplerini listele
export async function GET(request: NextRequest) {
    try {
        const stkId = request.headers.get('x-stk-id')

        if (!stkId) {
            return NextResponse.json({ error: 'STK ID bulunamadı' }, { status: 400 })
        }

        // STK'nın aktif paketi var mı kontrol et
        const stk = await prisma.sTK.findUnique({
            where: { id: stkId },
            select: {
                id: true,
                packageId: true,
                package: { select: { name: true, status: true } }
            }
        })

        if (!stk?.packageId) {
            return NextResponse.json({
                error: 'Bu modülü kullanabilmek için aktif bir üyelik paketi gereklidir',
                code: 'NO_PACKAGE'
            }, { status: 403 })
        }

        const requests = await prisma.domainRequest.findMany({
            where: { stkId },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ success: true, requests })
    } catch (error) {
        console.error('Domain requests fetch error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}

// Yeni domain talebi oluştur
export async function POST(request: NextRequest) {
    try {
        const stkId = request.headers.get('x-stk-id')
        const userId = request.headers.get('x-user-id')

        if (!stkId || !userId) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
        }

        // STK'nın aktif paketi var mı kontrol et
        const stk = await prisma.sTK.findUnique({
            where: { id: stkId },
            select: { id: true, packageId: true, name: true }
        })

        if (!stk?.packageId) {
            return NextResponse.json({
                error: 'Bu modülü kullanabilmek için aktif bir üyelik paketi gereklidir',
                code: 'NO_PACKAGE'
            }, { status: 403 })
        }

        // Bekleyen talep var mı kontrol et
        const existingPending = await prisma.domainRequest.findFirst({
            where: {
                stkId,
                status: { in: ['PENDING', 'PROCESSING'] }
            }
        })

        if (existingPending) {
            return NextResponse.json({
                error: 'Zaten bekleyen veya işlemde bir talebiniz bulunmaktadır',
                code: 'EXISTING_REQUEST'
            }, { status: 400 })
        }

        const body = await request.json()
        const { domain, wantsWebsite, notes } = body

        if (!domain) {
            return NextResponse.json({ error: 'Domain alanı zorunludur' }, { status: 400 })
        }

        // Domain formatını kontrol et
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/
        if (!domainRegex.test(domain)) {
            return NextResponse.json({ error: 'Geçersiz domain formatı' }, { status: 400 })
        }

        const domainRequest = await prisma.domainRequest.create({
            data: {
                stkId,
                domain: domain.toLowerCase(),
                wantsWebsite: wantsWebsite ?? true,
                notes
            }
        })

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'DOMAIN_REQUEST_CREATE',
                entityType: 'DomainRequest',
                entityId: domainRequest.id,
                newData: { domain, wantsWebsite },
                description: `${stk.name} için domain talebi oluşturuldu: ${domain}`
            }
        })

        return NextResponse.json({ success: true, request: domainRequest })
    } catch (error) {
        console.error('Domain request create error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
