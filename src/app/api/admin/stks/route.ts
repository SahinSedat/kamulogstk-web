import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { UserRole, AuditAction } from '@prisma/client'

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== UserRole.ADMIN) {
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const type = searchParams.get('type') || 'all'
        const city = searchParams.get('city') || 'all'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = 10

        const where: any = {}

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { taxNumber: { contains: search, mode: 'insensitive' } },
                { registrationNumber: { contains: search, mode: 'insensitive' } }
            ]
        }

        if (type !== 'all') where.type = type
        if (city !== 'all') where.city = city

        const [stks, total] = await Promise.all([
            prisma.sTK.findMany({
                where,
                include: {
                    manager: {
                        select: { id: true, name: true, email: true, phone: true, registrationPurpose: true }
                    },
                    members: {
                        select: { id: true, status: true }
                    },
                    package: {
                        select: { id: true, name: true, monthlyPrice: true, yearlyPrice: true, currency: true }
                    },
                    boardMembers: {
                        where: { isActive: true },
                        select: {
                            id: true,
                            name: true,
                            position: true,
                            startDate: true
                        }
                    },
                    stksectors: {
                        include: { sector: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.sTK.count({ where })
        ])

        // STK verilerini zenginleştir
        const enrichedSTKs = await Promise.all(stks.map(async (stk) => {
            // Aktif üye sayısı
            const activeMemberCount = stk.members.filter(m => m.status === 'ACTIVE').length
            // Gerçek üye sayısı (başvuru bekleyenler ve reddedilenler hariç)
            const realMemberCount = stk.members.filter(m => !['APPLIED', 'PENDING', 'REJECTED'].includes(m.status)).length

            // Yönetici değişikliği geçmişini bul (AuditLog üzerinden)
            // AuditLog `stkId` alanına sahip ama relation olmayabilir.
            // Manuel sorgu:
            const managerChanges = await prisma.auditLog.findMany({
                where: {
                    stkId: stk.id,
                    action: 'STK_UPDATE', // Veya yönetici değişimi için spesifik bir action yoksa update'lere bakacağız
                    description: { contains: 'Yönetici' } // Basit bir filtre
                },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { user: { select: { name: true } } }
            })

            return {
                ...stk,
                stats: {
                    totalMembers: realMemberCount,
                    activeMembers: activeMemberCount,
                },
                managerHistory: managerChanges.map(log => ({
                    date: log.createdAt,
                    description: log.description || '',
                    changedBy: log.user?.name || 'Sistem'
                })),
                packageInfo: stk.package ? {
                    name: stk.package.name,
                    price: stk.package.monthlyPrice, // Varsayılan olarak aylık fiyatı gösterelim
                    currency: stk.package.currency
                } : null,
                fileStatus: {
                    uploaded: !!stk.statuteUploadedAt,
                    approved: stk.status === 'APPROVED' || stk.status === 'ACTIVE' // Basit bir onay mantığı
                }
            }
        }))

        return NextResponse.json({
            success: true,
            stks: enrichedSTKs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        })

    } catch (error) {
        console.error('STK listesi hatası:', error)
        return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== UserRole.ADMIN) {
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 })
        }

        const body = await request.json()
        const { id, status } = body

        if (!id || !status) {
            return NextResponse.json({ success: false, error: 'Eksik bilgi' }, { status: 400 })
        }

        const stk = await prisma.sTK.update({
            where: { id },
            data: { status },
            include: { manager: true }
        })

        // Map status to AuditAction
        let auditAction: AuditAction = AuditAction.STK_UPDATE
        if (status === 'APPROVED') auditAction = AuditAction.STK_APPROVE
        if (status === 'REJECTED') auditAction = AuditAction.STK_REJECT
        if (status === 'SUSPENDED') auditAction = AuditAction.STK_SUSPEND
        if (status === 'ACTIVE') auditAction = AuditAction.STK_ACTIVATE

        // Audit Log oluştur
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                stkId: id,
                action: auditAction,
                entityType: 'STK',
                entityId: id,
                description: `STK durumu "${status}" olarak güncellendi.`,
            }
        })

        return NextResponse.json({ success: true, stk })

    } catch (error) {
        console.error('STK güncelleme hatası:', error)
        return NextResponse.json({ success: false, error: 'Sunucu hatası' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== UserRole.ADMIN) {
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID eksik' }, { status: 400 })
        }

        // Önce STK'yı ve yöneticisini bul
        const stk = await prisma.sTK.findUnique({
            where: { id },
            select: { id: true, name: true, managerId: true }
        })

        if (!stk) {
            return NextResponse.json({ success: false, error: 'STK bulunamadı' }, { status: 404 })
        }

        const managerId = stk.managerId
        const stkName = stk.name
        console.log(`Deleting STK: ${stkName}, Manager ID: ${managerId}`)

        // Transaction ile STK ve ilişkili verileri sil
        await prisma.$transaction(async (tx) => {
            console.log('1. Deleting AuditLogs for STK...')
            await tx.auditLog.deleteMany({ where: { stkId: id } })

            console.log('2. Deleting STK record...')
            // Cascade ile otomatik silinecekler: members, stksectors, boardMembers,
            // boardDecisions, application, payments, duesPlans, paymentAccounts,
            // messageCampaigns, memberNotifications, domainRequests, documents,
            // competitors, monthlySnapshots, membershipApps, duesDiscounts,
            // generalAssemblies, documentTemplates, stkroles, archives
            await tx.sTK.delete({ where: { id } })

            // 3. Yönetici kullanıcı hesabını sil
            // Cascade ile otomatik silinecekler: sessions, notifications, interests
            // AuditLog.userId → SetNull (kayıt korunur ama userId null olur)
            if (managerId) {
                console.log(`3. Deleting Manager User record: ${managerId}...`)
                await tx.user.delete({ where: { id: managerId } })
            } else {
                console.log('3. Skipped Manager User deletion (managerId is null)')
            }
        })
        console.log('Transaction completed successfully.')

        // Audit Log: Silinen STK kaydı (transaction dışında, çünkü stkId artık yok)
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: AuditAction.STK_UPDATE,
                entityType: 'STK',
                entityId: id,
                description: `STK "${stkName}" ve yönetici hesabı sistemden silindi.`,
            }
        })

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('STK silme hatası:', error)
        return NextResponse.json({
            success: false,
            error: `Silme hatası: ${error.message || 'Bilinmeyen hata'}`,
            details: error.meta || error.code || null
        }, { status: 500 })
    }
}
