import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// POST /api/stk/association/statute - Tüzük yükle
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

        // Sadece PDF kabul et
        if (file.type !== 'application/pdf') {
            return NextResponse.json(
                { error: 'Sadece PDF dosyaları kabul edilir' },
                { status: 400 }
            )
        }

        // Maksimum 10MB
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'Dosya boyutu maksimum 10MB olabilir' },
                { status: 400 }
            )
        }

        // Dosya kaydet
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'statutes')
        await mkdir(uploadsDir, { recursive: true })

        const fileName = `${stk.id}-statute-${Date.now()}.pdf`
        const filePath = path.join(uploadsDir, fileName)

        const bytes = await file.arrayBuffer()
        await writeFile(filePath, Buffer.from(bytes))

        const statuteUrl = `/uploads/statutes/${fileName}`

        // Note: After migration, statuteFile field will be available
        // For now, just log the action

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'STK_UPDATE',
                entityType: 'STK',
                entityId: stk.id,
                userId: user.id,
                userEmail: user.email,
                userName: user.name,
                description: 'Tüzük dosyası yüklendi',
                stkId: stk.id
            }
        })

        return NextResponse.json({
            statuteFile: statuteUrl,
            statuteUploadedAt: new Date().toISOString(),
            message: 'Dosya yüklendi (migration sonrası DB kaydı aktif olacak)'
        })
    } catch (error) {
        console.error('Statute upload error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
