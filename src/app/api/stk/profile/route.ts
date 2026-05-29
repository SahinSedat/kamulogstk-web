import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: Request) {
    console.log('STK Profile API: Request received')
    try {
        let userId: string | undefined

        // 1. Try getting user from secure cookie (getCurrentUser)
        const user = await getCurrentUser()
        if (user && user.id) {
            console.log('STK Profile API: User fetched via Cookie:', user.id)
            userId = user.id
            if (user.role !== 'STK_MANAGER') {
                return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 403 })
            }
        }

        // 2. If cookie fails, check for middleware headers
        if (!userId) {
            console.log('STK Profile API: Cookie auth failed, checking headers...')
            const headers = req.headers as Headers
            const headerUserId = headers.get('x-user-id')
            const headerUserRole = headers.get('x-user-role')

            if (headerUserId && headerUserRole === 'STK_MANAGER') {
                console.log('STK Profile API: User fetched via Headers:', headerUserId)
                userId = headerUserId
            }
        }

        if (!userId) {
            console.log('STK Profile API: Unauthorized - No valid auth method found')
            return NextResponse.json({ success: false, error: 'Oturum açılmamış' }, { status: 401 })
        }

        const stk = await prisma.sTK.findFirst({
            where: {
                managerId: userId
            },
            include: {
                manager: {
                    select: {
                        name: true,
                        email: true,
                        phone: true
                    }
                }
            }
        })
        console.log('STK Profile API: STK query result:', stk ? `ID=${stk.id}` : 'Not found')

        if (!stk) {
            return NextResponse.json({ success: false, error: 'STK kaydı bulunamadı' }, { status: 404 })
        }

        return NextResponse.json({ success: true, stk })

    } catch (error) {
        console.error('STK Profile API Fatal Error:', error)
        return NextResponse.json({ success: false, error: 'Sunucu hatası oluştu' }, { status: 500 })
    }
}
