import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// POST /api/stk/association/logo - Logo/profil resmi yükle
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'STK_MANAGER') {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const stk = await prisma.sTK.findFirst({
            where: { managerId: user.id }
        })

        if (!stk) {
            return NextResponse.json({ error: 'STK bulunamadı' }, { status: 404 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'Dosya zorunludur' }, { status: 400 })
        }

        // Sadece resim kabul et
        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { error: 'Sadece resim dosyaları kabul edilir' },
                { status: 400 }
            )
        }

        // Maksimum 5MB
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'Dosya boyutu maksimum 5MB olabilir' },
                { status: 400 }
            )
        }

        // Dosya kaydet
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'logos')
        await mkdir(uploadsDir, { recursive: true })

        const ext = file.name.split('.').pop() || 'png'
        const fileName = `${stk.id}-logo-${Date.now()}.${ext}`
        const filePath = path.join(uploadsDir, fileName)

        const bytes = await file.arrayBuffer()
        await writeFile(filePath, Buffer.from(bytes))

        const logoUrl = `/uploads/logos/${fileName}`

        // DB güncelle
        await prisma.sTK.update({
            where: { id: stk.id },
            data: { logo: logoUrl }
        })

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'STK_UPDATE',
                entityType: 'STK',
                entityId: stk.id,
                userId: user.id,
                userEmail: user.email,
                userName: user.name,
                description: 'Dernek logosu güncellendi',
                stkId: stk.id
            }
        })

        return NextResponse.json({ logo: logoUrl })
    } catch (error) {
        console.error('Logo upload error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
