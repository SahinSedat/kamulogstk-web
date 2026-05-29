import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET: List all packages
export async function GET() {
    try {
        const packages = await prisma.package.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { stks: true }
                }
            }
        })

        return NextResponse.json({ packages })
    } catch (error) {
        console.error('Error fetching packages:', error)
        return NextResponse.json({ error: 'Paketler yüklenemedi' }, { status: 500 })
    }
}

// POST: Create new package
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, description, monthlyPrice, yearlyPrice, maxMembers, maxBoardMembers, status, features } = body

        if (!name || monthlyPrice === undefined || yearlyPrice === undefined) {
            return NextResponse.json({ error: 'Gerekli alanlar eksik' }, { status: 400 })
        }

        const newPackage = await prisma.package.create({
            data: {
                name,
                description,
                monthlyPrice,
                yearlyPrice,
                maxMembers,
                maxBoardMembers,
                status: status || 'ACTIVE',
                features
            }
        })

        return NextResponse.json({ success: true, package: newPackage })
    } catch (error) {
        console.error('Error creating package:', error)
        return NextResponse.json({ error: 'Paket oluşturulamadı' }, { status: 500 })
    }
}

// PUT: Update package
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { id, name, description, monthlyPrice, yearlyPrice, maxMembers, maxBoardMembers, status, features } = body

        if (!id) {
            return NextResponse.json({ error: 'Paket ID gerekli' }, { status: 400 })
        }

        const updatedPackage = await prisma.package.update({
            where: { id },
            data: {
                name,
                description,
                monthlyPrice,
                yearlyPrice,
                maxMembers,
                maxBoardMembers,
                status,
                features
            }
        })

        return NextResponse.json({ success: true, package: updatedPackage })
    } catch (error) {
        console.error('Error updating package:', error)
        return NextResponse.json({ error: 'Paket güncellenemedi' }, { status: 500 })
    }
}

// DELETE: Delete package
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json()
        const { id } = body

        if (!id) {
            return NextResponse.json({ error: 'Paket ID gerekli' }, { status: 400 })
        }

        // Check if package has subscribers
        const packageWithStks = await prisma.package.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { stks: true }
                }
            }
        })

        if (packageWithStks?._count?.stks && packageWithStks._count.stks > 0) {
            return NextResponse.json({
                error: 'Bu pakete abone olan STK\'lar var. Önce abonelikleri değiştirin.'
            }, { status: 400 })
        }

        await prisma.package.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting package:', error)
        return NextResponse.json({ error: 'Paket silinemedi' }, { status: 500 })
    }
}
