import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// ============================================
// GET: STK Yöneticisinin şubelerini getir
// ============================================
export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId || !['ADMIN', 'STK_MANAGER'].includes(userRole || '')) {
            return NextResponse.json(
                { success: false, error: 'Yetkisiz erişim' },
                { status: 403 }
            )
        }

        // Kullanıcının bağlı olduğu STK'yı bul
        const stk = await prisma.sTK.findFirst({
            where: { managerId: userId },
            select: {
                id: true,
                name: true,
                adCode: true,
                smsCredits: true,
                whatsappCredits: true,
                emailCredits: true,
                pushCredits: true,
            }
        })

        if (!stk) {
            return NextResponse.json(
                { success: false, error: 'Bağlı STK bulunamadı' },
                { status: 404 }
            )
        }

        // Şubeleri getir
        const branches = await prisma.sTKBranch.findMany({
            where: { stkId: stk.id },
            select: {
                id: true,
                name: true,
                code: true,
                adCode: true,
                city: true,
                district: true,
                address: true,
                phone: true,
                email: true,
                managerName: true,
                isActive: true,
                smsCredits: true,
                whatsappCredits: true,
                emailCredits: true,
                pushCredits: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({
            success: true,
            stk: {
                id: stk.id,
                name: stk.name,
                adCode: stk.adCode,
                credits: {
                    sms: stk.smsCredits,
                    whatsapp: stk.whatsappCredits,
                    email: stk.emailCredits,
                    push: stk.pushCredits,
                }
            },
            branches: branches.map(b => ({
                ...b,
                memberCount: 0, // Member tablosu aktif olduğunda güncellenecek
            })),
            totalBranches: branches.length,
        })

    } catch (error) {
        console.error('[STK-BRANCHES-GET] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Şubeler yüklenirken hata oluştu' },
            { status: 500 }
        )
    }
}

// ============================================
// POST: Yeni şube ekle
// ============================================
export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId || !['ADMIN', 'STK_MANAGER'].includes(userRole || '')) {
            return NextResponse.json(
                { success: false, error: 'Yetkisiz erişim' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { name, city, district, address, phone, email, managerName } = body

        // Validasyon
        if (!name || !city) {
            return NextResponse.json(
                { success: false, error: 'Şube adı ve il zorunludur' },
                { status: 400 }
            )
        }

        // Kullanıcının STK'sını bul
        const stk = await prisma.sTK.findFirst({
            where: { managerId: userId },
            select: { id: true, adCode: true, name: true }
        })

        if (!stk) {
            return NextResponse.json(
                { success: false, error: 'Bağlı STK bulunamadı' },
                { status: 404 }
            )
        }

        // Mevcut şube sayısını al (kod üretimi için)
        const branchCount = await prisma.sTKBranch.count({
            where: { stkId: stk.id }
        })

        // Otomatik kod üretimi
        const cityPrefix = city.substring(0, 3).toUpperCase()
        const branchCode = `${cityPrefix}-${String(branchCount + 1).padStart(2, '0')}`
        const adCode = `${stk.adCode}-${cityPrefix}${String(branchCount + 1).padStart(2, '0')}`

        // Şube oluştur
        const branch = await prisma.sTKBranch.create({
            data: {
                stkId: stk.id,
                name,
                code: branchCode,
                adCode,
                city,
                district: district || null,
                address: address || null,
                phone: phone || null,
                email: email || null,
                managerName: managerName || null,
                isActive: true,
                smsCredits: 0,
                whatsappCredits: 0,
                emailCredits: 0,
                pushCredits: 0,
            },
            select: {
                id: true,
                name: true,
                code: true,
                adCode: true,
                city: true,
                district: true,
                address: true,
                phone: true,
                email: true,
                managerName: true,
                isActive: true,
                smsCredits: true,
                whatsappCredits: true,
                emailCredits: true,
                pushCredits: true,
                createdAt: true,
            }
        })

        return NextResponse.json({
            success: true,
            message: `${branch.name} şubesi başarıyla oluşturuldu`,
            branch: {
                ...branch,
                memberCount: 0,
            },
        }, { status: 201 })

    } catch (error) {
        console.error('[STK-BRANCHES-POST] Error:', error)
        return NextResponse.json(
            { success: false, error: 'Şube oluşturulurken hata oluştu' },
            { status: 500 }
        )
    }
}
