import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'

// Dokümanları listele
export async function GET(request: NextRequest) {
    try {
        const stkId = request.headers.get('x-stk-id')

        if (!stkId) {
            return NextResponse.json({ error: 'STK ID bulunamadı' }, { status: 400 })
        }

        const documents = await prisma.document.findMany({
            where: { stkId },
            orderBy: { createdAt: 'desc' },
            include: {
                createdBy: { select: { name: true } }
            }
        })

        // İstatistikler
        const stats = {
            total: documents.length,
            published: documents.filter(d => d.isPublished).length,
            draft: documents.filter(d => !d.isPublished).length,
            byType: {
                ANNOUNCEMENT: documents.filter(d => d.type === 'ANNOUNCEMENT').length,
                DOCUMENT: documents.filter(d => d.type === 'DOCUMENT').length,
                INFORMATION: documents.filter(d => d.type === 'INFORMATION').length
            }
        }

        return NextResponse.json({ success: true, documents, stats })
    } catch (error) {
        console.error('Documents fetch error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}

// Yeni doküman yükle
export async function POST(request: NextRequest) {
    try {
        const stkId = request.headers.get('x-stk-id')
        const userId = request.headers.get('x-user-id')

        if (!stkId || !userId) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const title = formData.get('title') as string
        const description = formData.get('description') as string | null
        const type = formData.get('type') as string || 'ANNOUNCEMENT'

        if (!file || !title) {
            return NextResponse.json({ error: 'Dosya ve başlık zorunludur' }, { status: 400 })
        }

        // Sadece PDF kabul et
        if (file.type !== 'application/pdf') {
            return NextResponse.json({ error: 'Sadece PDF dosyası yükleyebilirsiniz' }, { status: 400 })
        }

        // Maksimum 10MB
        if (file.size > 1000 * 1024 * 1024) {
            return NextResponse.json({ error: 'Dosya boyutu maksimum 1GB olabilir' }, { status: 400 })
        }

        // Dosyayı kaydet
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents', stkId)
        await mkdir(uploadDir, { recursive: true })

        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const filePath = path.join(uploadDir, fileName)
        await writeFile(filePath, buffer)

        const fileUrl = `/uploads/documents/${stkId}/${fileName}`

        const document = await prisma.document.create({
            data: {
                stkId,
                title,
                description,
                type: type as 'ANNOUNCEMENT' | 'DOCUMENT' | 'INFORMATION',
                fileUrl,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                createdById: userId
            }
        })

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'DOCUMENT_CREATE',
                entityType: 'Document',
                entityId: document.id,
                newData: { title, type },
                description: `Doküman yüklendi: ${title}`
            }
        })

        return NextResponse.json({ success: true, document })
    } catch (error) {
        console.error('Document upload error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}

// Doküman sil (ayrı endpoint olarak da kullanılabilir)
export async function DELETE(request: NextRequest) {
    try {
        const stkId = request.headers.get('x-stk-id')
        const userId = request.headers.get('x-user-id')

        if (!stkId || !userId) {
            return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const documentId = searchParams.get('id')

        if (!documentId) {
            return NextResponse.json({ error: 'Doküman ID gerekli' }, { status: 400 })
        }

        const document = await prisma.document.findFirst({
            where: { id: documentId, stkId }
        })

        if (!document) {
            return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 })
        }

        // Dosyayı sil
        try {
            const filePath = path.join(process.cwd(), 'public', document.fileUrl)
            await unlink(filePath)
        } catch {
            // Dosya zaten silinmiş olabilir
        }

        await prisma.document.delete({ where: { id: documentId } })

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'DOCUMENT_DELETE',
                entityType: 'Document',
                entityId: documentId,
                oldData: { title: document.title },
                description: `Doküman silindi: ${document.title}`
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Document delete error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
