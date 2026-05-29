import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PUT: STK'ya paket ata veya ücretsiz tanımla
export async function PUT(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser || currentUser.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 })
        }

        const body = await request.json()
        const { stkId, packageId } = body

        if (!stkId) {
            return NextResponse.json({ success: false, error: 'STK ID gerekli' }, { status: 400 })
        }

        // STK mevcut mu kontrol et
        const stk = await prisma.sTK.findUnique({
            where: { id: stkId },
            select: { id: true, name: true, packageId: true, package: { select: { name: true } } }
        })

        if (!stk) {
            return NextResponse.json({ success: false, error: 'STK bulunamadı' }, { status: 404 })
        }

        // packageId null ise paket kaldır, değilse yeni paket ata
        let newPackageName = 'Paket kaldırıldı'
        if (packageId) {
            const pkg = await prisma.package.findUnique({
                where: { id: packageId },
                select: { id: true, name: true, status: true }
            })
            if (!pkg) {
                return NextResponse.json({ success: false, error: 'Paket bulunamadı' }, { status: 404 })
            }
            newPackageName = pkg.name
        }

        const oldPackageName = stk.package?.name || 'Paket yok'

        const updatedSTK = await prisma.sTK.update({
            where: { id: stkId },
            data: { packageId: packageId || null },
            select: {
                id: true,
                name: true,
                package: {
                    select: { id: true, name: true, monthlyPrice: true, yearlyPrice: true, status: true }
                }
            }
        })

        // Audit Log
        await prisma.auditLog.create({
            data: {
                action: 'SETTINGS_UPDATE',
                entityType: 'STK',
                entityId: stkId,
                userId: currentUser.id,
                userName: currentUser.name || 'Admin',
                description: `Admin tarafından "${stk.name}" STK'sının paketi değiştirildi: "${oldPackageName}" → "${newPackageName}"`,
                oldData: { packageName: oldPackageName, packageId: stk.packageId } as any,
                newData: { packageName: newPackageName, packageId: packageId || null } as any,
                stkId,
            }
        })

        return NextResponse.json({
            success: true,
            message: `Paket başarıyla ${packageId ? 'atandı' : 'kaldırıldı'}`,
            package: updatedSTK.package,
        })

    } catch (error) {
        console.error('[ADMIN-STK-PACKAGES] Error:', error)
        return NextResponse.json({ success: false, error: 'Paket atama hatası' }, { status: 500 })
    }
}
