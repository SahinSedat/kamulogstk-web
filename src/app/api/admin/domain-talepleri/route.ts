import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

// Admin: Tüm domain taleplerini listele
export async function GET() {
    try {
        const requests = await prisma.domainRequest.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                stk: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        city: true,
                        manager: {
                            select: {
                                name: true,
                                email: true,
                                phone: true
                            }
                        }
                    }
                }
            }
        })

        // İstatistikler
        const stats = {
            total: requests.length,
            pending: requests.filter(r => r.status === 'PENDING').length,
            processing: requests.filter(r => r.status === 'PROCESSING').length,
            completed: requests.filter(r => r.status === 'COMPLETED').length,
            cancelled: requests.filter(r => r.status === 'CANCELLED').length
        }

        return NextResponse.json({ success: true, requests, stats })
    } catch (error) {
        console.error('Admin domain requests fetch error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}

// Admin: Talep durumunu güncelle
export async function PUT(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const body = await request.json()
        const { requestId, status, adminNotes } = body

        if (!requestId || !status) {
            return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 })
        }

        const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED']
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Geçersiz durum' }, { status: 400 })
        }

        const domainRequest = await prisma.domainRequest.update({
            where: { id: requestId },
            data: {
                status,
                adminNotes,
                processedAt: status === 'COMPLETED' || status === 'CANCELLED' ? new Date() : undefined,
                processedBy: userId || undefined
            }
        })

        // Audit log
        if (userId) {
            await prisma.auditLog.create({
                data: {
                    userId,
                    action: 'DOMAIN_REQUEST_UPDATE',
                    entityType: 'DomainRequest',
                    entityId: requestId,
                    newData: { status, adminNotes },
                    description: `Domain talebi durumu güncellendi: ${status}`
                }
            })
        }

        return NextResponse.json({ success: true, request: domainRequest })
    } catch (error) {
        console.error('Admin domain request update error:', error)
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
    }
}
