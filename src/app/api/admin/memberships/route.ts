import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser()
        if (!currentUser || currentUser.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 })
        }

        const body = await request.json()
        const { memberId, status, reviewNotes } = body

        if (!memberId || !status) {
            return NextResponse.json({ success: false, error: 'Eksik parametreler' }, { status: 400 })
        }

        const data: any = { status }
        const now = new Date()

        if (status === 'ACTIVE') {
            data.joinDate = now
        } else if (status === 'REJECTED') {
            data.application = {
                update: {
                    reviewDate: now,
                    reviewNotes: reviewNotes || null,
                    status: 'REJECTED'
                }
            }
        } else if (status === 'RESIGNED') {
            data.leaveDate = now
        }

        // Check if application exists and update it for consistency
        const member = await prisma.member.findUnique({
            where: { id: memberId },
            include: { application: true }
        })

        if (member?.application) {
            const appData: any = {
                status: status as any,
                reviewDate: now
            }

            if (status === 'REJECTED' && reviewNotes) {
                appData.reviewNotes = reviewNotes
            }

            await prisma.membershipApplication.update({
                where: { memberId },
                data: appData
            })
        }

        // Update the member status
        await prisma.member.update({
            where: { id: memberId },
            data: { ...data, status: status as any }
        })

        return NextResponse.json({ success: true, message: 'Üyelik durumu güncellendi' })

    } catch (error) {
        console.error('Membership update error:', error)
        return NextResponse.json({ success: false, error: 'Güncelleme hatası' }, { status: 500 })
    }
}
