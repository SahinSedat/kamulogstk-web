import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

// GET: STK ayarlarını getir
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

        const stk = await prisma.sTK.findUnique({
            where: { id: payload.stkId },
            include: {
                manager: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        phone: true,
                        notifEmail: true,
                        notifSms: true,
                        notifSystem: true,
                    }
                },
                boardMembers: {
                    where: { position: 'PRESIDENT', isActive: true },
                    select: { name: true, phone: true, email: true }
                }
            }
        })

        if (!stk) {
            return NextResponse.json({ error: 'STK bulunamadı' }, { status: 404 })
        }

        // Başkanın bilgilerini al (varsa)
        const president = stk.boardMembers?.[0]

        return NextResponse.json({
            success: true,
            settings: {
                // STK Bilgileri
                stkName: stk.name,
                stkEmail: stk.email,
                stkPhone: stk.phone,
                taxNumber: stk.taxNumber,
                website: stk.website,
                address: stk.address,
                city: stk.city,
                district: stk.district,
                
                // Yönetici Bilgileri (Başkan veya Manager)
                managerName: president?.name || stk.manager?.name || '',
                managerEmail: president?.email || stk.manager?.email || '',
                managerPhone: president?.phone || stk.manager?.phone || '',
                
                // Bildirim Tercihleri
                emailNotifications: stk.manager?.notifEmail || true,
                smsNotifications: stk.manager?.notifSms || false,
                systemNotifications: stk.manager?.notifSystem || true,
            }
        })
    } catch (error) {
        console.error('Error fetching settings:', error)
        return NextResponse.json({ error: 'Ayarlar yüklenemedi' }, { status: 500 })
    }
}

// PUT: STK ayarlarını güncelle
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
        const {
            stkName,
            stkEmail,
            stkPhone,
            website,
            address,
            city,
            district,
            managerName,
            managerPhone,
            emailNotifications,
            smsNotifications,
            systemNotifications,
        } = body

        // STK bilgilerini güncelle
        const updatedStk = await prisma.sTK.update({
            where: { id: payload.stkId },
            data: {
                ...(stkName && { name: stkName }),
                ...(stkEmail && { email: stkEmail }),
                ...(stkPhone && { phone: stkPhone }),
                ...(website !== undefined && { website: website || null }),
                ...(address && { address }),
                ...(city && { city }),
                ...(district && { district: district || null }),
            }
        })

        // Yönetici bilgilerini güncelle
        await prisma.user.update({
            where: { id: payload.userId },
            data: {
                ...(managerName && { name: managerName }),
                ...(managerPhone && { phone: managerPhone }),
                ...(emailNotifications !== undefined && { notifEmail: emailNotifications }),
                ...(smsNotifications !== undefined && { notifSms: smsNotifications }),
                ...(systemNotifications !== undefined && { notifSystem: systemNotifications }),
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Ayarlar başarıyla kaydedildi'
        })
    } catch (error) {
        console.error('Error updating settings:', error)
        return NextResponse.json({ error: 'Ayarlar güncellenemedi' }, { status: 500 })
    }
}
