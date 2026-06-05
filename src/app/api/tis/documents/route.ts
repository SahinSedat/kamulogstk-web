import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function checkAdmin() {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
        return null
    }
    return session
}

// TİS Dökümanlarını listele
export async function GET(req: NextRequest) {
    const session = await checkAdmin()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const search = searchParams.get('search') || ''
        const role = searchParams.get('role') || ''

        const where: any = {}
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { institution: { contains: search, mode: 'insensitive' } },
            ]
        }
        if (role) where.role = role

        const documents = await prisma.tISDocument.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ documents })
    } catch (error) {
        console.error('TIS documents error:', error)
        return NextResponse.json({ error: 'Dökümanlar yüklenemedi' }, { status: 500 })
    }
}

// Yeni TİS dökümanı oluştur
export async function POST(req: NextRequest) {
    const session = await checkAdmin()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { institution, role, title, description, fileUrl, fileName, fileSize } = body

        if (!title || !institution || !fileUrl) {
            return NextResponse.json({ error: 'Başlık, kurum ve dosya zorunludur' }, { status: 400 })
        }

        const document = await prisma.tISDocument.create({
            data: {
                institution,
                role: role || '',
                title,
                description: description || '',
                fileUrl,
                fileName: fileName || '',
                fileSize: fileSize || 0,
            }
        })

        return NextResponse.json({ document })
    } catch (error) {
        console.error('Create TIS document error:', error)
        return NextResponse.json({ error: 'Döküman oluşturulamadı' }, { status: 500 })
    }
}

// TİS dökümanı sil
export async function DELETE(req: NextRequest) {
    const session = await checkAdmin()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

        await prisma.tISDocument.delete({ where: { id } })
        return NextResponse.json({ message: 'Döküman silindi' })
    } catch (error) {
        console.error('Delete TIS document error:', error)
        return NextResponse.json({ error: 'Silinemedi' }, { status: 500 })
    }
}
