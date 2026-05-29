import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET: Tüm sektörleri listele (Public)
export async function GET() {
    try {
        const sectors = await prisma.sector.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                _count: {
                    select: { stkSectors: true }
                }
            }
        })

        // Format data to match expected frontend structure
        const formattedSectors = sectors.map(s => ({
            id: s.id,
            name: s.name,
            stkCount: s._count.stkSectors
        }))

        return NextResponse.json({ success: true, sectors: formattedSectors })
    } catch (error) {
        console.error('Error fetching sectors:', error)
        return NextResponse.json({ error: 'Sektörler yüklenemedi' }, { status: 500 })
    }
}
