import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Tek bir ilanı getir
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const job = await prisma.jobListing.findUnique({
            where: { id }
        })

        if (!job) {
            return NextResponse.json({ error: 'İlan bulunamadı' }, { status: 404 })
        }

        return NextResponse.json({ job })
    } catch (error) {
        console.error('Get job error:', error)
        return NextResponse.json({ error: 'İlan yüklenemedi' }, { status: 500 })
    }
}

// PUT - İlanı güncelle (sadece admin)
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params
        const body = await req.json()

        // Güncellenebilir alanlar
        const updateData: any = {}
        if (body.title !== undefined) updateData.title = body.title
        if (body.company !== undefined) updateData.company = body.company
        if (body.location !== undefined) updateData.location = body.location || null
        if (body.type !== undefined) updateData.type = body.type
        if (body.description !== undefined) updateData.description = body.description
        if (body.requirements !== undefined) updateData.requirements = body.requirements || null
        if (body.sourceUrl !== undefined) updateData.sourceUrl = body.sourceUrl || null
        if (body.applicationUrl !== undefined) updateData.applicationUrl = body.applicationUrl || null
        if (body.salary !== undefined) updateData.salary = body.salary || null
        if (body.deadline !== undefined) updateData.deadline = body.deadline ? new Date(body.deadline) : null

        const job = await prisma.jobListing.update({
            where: { id },
            data: updateData
        })

        return NextResponse.json({ job })
    } catch (error) {
        console.error('Update job error:', error)
        return NextResponse.json({ error: 'İlan güncellenemedi' }, { status: 500 })
    }
}

// DELETE - İlanı sil (sadece admin)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { id } = await params

        await prisma.jobListing.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete job error:', error)
        return NextResponse.json({ error: 'İlan silinemedi' }, { status: 500 })
    }
}
