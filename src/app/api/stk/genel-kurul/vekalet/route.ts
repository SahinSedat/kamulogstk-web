import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

// GET: Vekaletleri listele
export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || !payload.stkId) {
            return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const assemblyId = searchParams.get('assemblyId')

        if (!assemblyId) {
            return NextResponse.json({ error: 'Genel kurul ID gerekli' }, { status: 400 })
        }

        // Genel kurulun bu STK'ya ait olduğunu doğrula
        const assembly = await prisma.generalAssembly.findFirst({
            where: { id: assemblyId, stkId: payload.stkId }
        })

        if (!assembly) {
            return NextResponse.json({ error: 'Genel kurul bulunamadı' }, { status: 404 })
        }

        const proxies = await prisma.assemblyProxy.findMany({
            where: { assemblyId }
        })

        // Üye bilgilerini çek
        const giverIds = proxies.map(p => p.giverId)
        const receiverIds = proxies.map(p => p.receiverId)
        const allMemberIds = [...new Set([...giverIds, ...receiverIds])]

        const members = await prisma.member.findMany({
            where: { id: { in: allMemberIds } },
            select: { id: true, name: true, surname: true, memberNumber: true }
        })

        const proxiesWithMembers = proxies.map(proxy => ({
            ...proxy,
            giver: members.find(m => m.id === proxy.giverId),
            receiver: members.find(m => m.id === proxy.receiverId)
        }))

        return NextResponse.json({ proxies: proxiesWithMembers })
    } catch (error) {
        console.error('Error fetching proxies:', error)
        return NextResponse.json({ error: 'Vekaletler yüklenemedi' }, { status: 500 })
    }
}

// POST: Vekalet ekle
export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || !payload.stkId) {
            return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
        }

        const body = await request.json()
        const { assemblyId, giverId, receiverId, proxyDoc } = body

        if (!assemblyId || !giverId || !receiverId) {
            return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 })
        }

        if (giverId === receiverId) {
            return NextResponse.json({ error: 'Vekalet veren ve alan aynı kişi olamaz' }, { status: 400 })
        }

        // Genel kurulun bu STK'ya ait olduğunu doğrula
        const assembly = await prisma.generalAssembly.findFirst({
            where: { id: assemblyId, stkId: payload.stkId }
        })

        if (!assembly) {
            return NextResponse.json({ error: 'Genel kurul bulunamadı' }, { status: 404 })
        }

        // Her iki üyenin de bu STK'ya ait olduğunu doğrula
        const members = await prisma.member.findMany({
            where: {
                id: { in: [giverId, receiverId] },
                stkId: payload.stkId,
                status: 'ACTIVE'
            }
        })

        if (members.length !== 2) {
            return NextResponse.json({ error: 'İki aktif üye de aynı STK\'ya ait olmalı' }, { status: 400 })
        }

        // Bu üyenin zaten vekaleti var mı kontrol et
        const existingProxy = await prisma.assemblyProxy.findFirst({
            where: { assemblyId, giverId }
        })

        if (existingProxy) {
            return NextResponse.json({ error: 'Bu üyenin zaten bir vekaleti mevcut' }, { status: 400 })
        }

        const proxy = await prisma.assemblyProxy.create({
            data: {
                assemblyId,
                giverId,
                receiverId,
                proxyDoc,
                isApproved: false
            }
        })

        return NextResponse.json({ success: true, proxy })
    } catch (error) {
        console.error('Error creating proxy:', error)
        return NextResponse.json({ error: 'Vekalet eklenemedi' }, { status: 500 })
    }
}

// PUT: Vekalet onayla/güncelle
export async function PUT(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || !payload.stkId) {
            return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
        }

        const body = await request.json()
        const { id, isApproved } = body

        if (!id) {
            return NextResponse.json({ error: 'Vekalet ID gerekli' }, { status: 400 })
        }

        // Vekaletin bu STK'ya ait genel kurulda olduğunu doğrula
        const proxy = await prisma.assemblyProxy.findFirst({
            where: { id },
            include: { assembly: true }
        })

        if (!proxy || proxy.assembly.stkId !== payload.stkId) {
            return NextResponse.json({ error: 'Vekalet bulunamadı' }, { status: 404 })
        }

        const updated = await prisma.assemblyProxy.update({
            where: { id },
            data: {
                isApproved,
                approvedBy: isApproved ? payload.userId : null,
                approvedAt: isApproved ? new Date() : null
            }
        })

        return NextResponse.json({ success: true, proxy: updated })
    } catch (error) {
        console.error('Error updating proxy:', error)
        return NextResponse.json({ error: 'Vekalet güncellenemedi' }, { status: 500 })
    }
}

// DELETE: Vekalet sil
export async function DELETE(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || !payload.stkId) {
            return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
        }

        const body = await request.json()
        const { id } = body

        if (!id) {
            return NextResponse.json({ error: 'Vekalet ID gerekli' }, { status: 400 })
        }

        // Vekaletin bu STK'ya ait genel kurulda olduğunu doğrula
        const proxy = await prisma.assemblyProxy.findFirst({
            where: { id },
            include: { assembly: true }
        })

        if (!proxy || proxy.assembly.stkId !== payload.stkId) {
            return NextResponse.json({ error: 'Vekalet bulunamadı' }, { status: 404 })
        }

        await prisma.assemblyProxy.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting proxy:', error)
        return NextResponse.json({ error: 'Vekalet silinemedi' }, { status: 500 })
    }
}
