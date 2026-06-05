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

// Genel dosyaları listele
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
                { description: { contains: search, mode: 'insensitive' } },
            ]
        }
        if (role) where.role = role

        const files = await prisma.tISFile.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ files })
    } catch (error) {
        console.error('TIS files error:', error)
        return NextResponse.json({ error: 'Dosyalar yüklenemedi' }, { status: 500 })
    }
}

// Yeni dosya oluştur
export async function POST(req: NextRequest) {
    const session = await checkAdmin()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { role, title, description, fileUrl, fileName, fileSize } = body

        if (!title || !fileUrl) {
            return NextResponse.json({ error: 'Başlık ve dosya zorunludur' }, { status: 400 })
        }

        const file = await prisma.tISFile.create({
            data: {
                role: role || '',
                title,
                description: description || '',
                fileUrl,
                fileName: fileName || '',
                fileSize: fileSize || 0,
            }
        })

        return NextResponse.json({ file })
    } catch (error) {
        console.error('Create TIS file error:', error)
        return NextResponse.json({ error: 'Dosya oluşturulamadı' }, { status: 500 })
    }
}

// Dosya sil
export async function DELETE(req: NextRequest) {
    const session = await checkAdmin()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

        await prisma.tISFile.delete({ where: { id } })
        return NextResponse.json({ message: 'Dosya silindi' })
    } catch (error) {
        console.error('Delete TIS file error:', error)
        return NextResponse.json({ error: 'Silinemedi' }, { status: 500 })
    }
}
