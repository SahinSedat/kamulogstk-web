import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Default plans with tokens (fallback)
const DEFAULT_PLAN_TOKENS: Record<string, number> = {
    FREE: 10,
    BASIC: 100,
    PREMIUM: 500
}

// Get plan tokens from settings (returns both credits and cvChatTokens)
async function getPlanTokens(planId: string): Promise<{ tokens: number; cvChatTokens: number }> {
    console.log(`[admin/users getPlanTokens] Looking for plan: ${planId}`)

    try {
        const setting = await prisma.siteSettings.findUnique({
            where: { key: 'subscription_plans' }
        })

        console.log(`[admin/users getPlanTokens] SiteSettings found: ${!!setting}`)

        if (setting?.value) {
            const plans = JSON.parse(setting.value)
            console.log(`[admin/users getPlanTokens] Parsed plans count: ${plans.length}`)

            const plan = plans.find((p: any) => p.id === planId)
            console.log(`[admin/users getPlanTokens] Found plan for ${planId}:`, plan ? `tokens=${plan.tokens}, cvChatTokens=${plan.cvChatTokens}` : 'NOT FOUND')

            if (plan) {
                return {
                    tokens: plan.tokens ?? DEFAULT_PLAN_TOKENS[planId] ?? 0,
                    cvChatTokens: plan.cvChatTokens ?? 20
                }
            }
        }
    } catch (error) {
        console.error('[admin/users getPlanTokens] Error fetching plan tokens:', error)
    }

    const fallbackTokens = DEFAULT_PLAN_TOKENS[planId] || 0
    console.log(`[admin/users getPlanTokens] Using fallback tokens for ${planId}: ${fallbackTokens}`)
    return { tokens: fallbackTokens, cvChatTokens: 20 }
}

// Admin middleware
// ADMIN ve MODERATOR erişimi (MODERATOR sadece okuma yapabilir)
async function checkAdminOrModerator() {
    const session = await getServerSession(authOptions)
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
        return null
    }
    return session
}

// Sadece ADMIN erişimi (düzenleme için)
async function checkAdmin() {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
        return null
    }
    return session
}

// Kullanıcı listesi - MODERATOR da görüntüleyebilir
export async function GET(req: NextRequest) {
    const session = await checkAdminOrModerator()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const search = searchParams.get('search') || ''
        const skip = (page - 1) * limit

        const where = search
            ? {
                OR: [
                    { name: { contains: search } },
                    { email: { contains: search } },
                    { phoneNumber: { contains: search } },
                ],
            }
            : {}

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phoneNumber: true,
                    credits: true,
                    cvChatTokens: true,
                    role: true,
                    createdAt: true,
                    emailVerified: true,
                    kariyerSubscription: {
                        select: {
                            plan: true,
                            status: true,
                            expiresAt: true,
                        },
                    },
                    _count: {
                        select: { cvs: true },
                    },
                },
            }),
            prisma.user.count({ where }),
        ])

        return NextResponse.json({
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error('Admin users error:', error)
        return NextResponse.json({ error: 'Kullanıcılar yüklenemedi' }, { status: 500 })
    }
}

// Generate order code
function generateOrderCode(): string {
    const prefix = 'ADM'
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${prefix}-${timestamp}-${random}`
}

// Kullanıcı güncelle (tam CRUD)
export async function PUT(req: NextRequest) {
    const session = await checkAdmin()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { userId, userIds, name, phoneNumber, credits, cvChatTokens, role, plan } = body

        // Toplu İşlem
        if (userIds && Array.isArray(userIds)) {
            let updatedCount = 0

            // Kredi Ekleme (Mevcut kredinin üzerine eklenir)
            if (credits !== undefined) {
                const result = await prisma.user.updateMany({
                    where: { id: { in: userIds } },
                    data: { credits: { increment: credits } }
                })
                updatedCount = result.count

                // Log
                await prisma.adminLog.create({
                    data: {
                        adminId: session.user.id,
                        action: 'BULK_UPDATE',
                        targetType: 'USER',
                        targetId: 'BULK',
                        details: JSON.stringify({
                            action: 'ADD_CREDITS',
                            count: updatedCount,
                            amount: credits,
                            userIds
                        }),
                    },
                })
            }

            return NextResponse.json({ message: `${updatedCount} kullanıcı güncellendi` })
        }

        if (!userId) {
            return NextResponse.json({ error: 'userId gerekli' }, { status: 400 })
        }

        // Kullanıcı bilgilerini güncelle
        const updateData: any = {}
        if (name !== undefined) updateData.name = name
        if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber
        if (credits !== undefined) updateData.credits = credits
        if (cvChatTokens !== undefined) updateData.cvChatTokens = cvChatTokens
        if (role && ['USER', 'MODERATOR', 'ADMIN'].includes(role)) updateData.role = role

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                credits: true,
                role: true,
            },
        })

        // MODERATOR rolü atandıysa otomatik danışman kaydı ve PREMIUM abonelik oluştur
        if (role === 'MODERATOR') {
            // Kullanıcıya bağlı danışman var mı kontrol et
            const existingConsultant = await prisma.kariyerConsultant.findUnique({
                where: { userId }
            })

            if (!existingConsultant) {
                // Yeni danışman oluştur
                await prisma.kariyerConsultant.create({
                    data: {
                        name: user.name || (user.email ? user.email.split('@')[0] : 'Danışman'),
                        phone: user.phoneNumber || '-',
                        title: 'Kariyer Danışmanı',
                        description: 'Kariyer danışmanlığı hizmeti',
                        isActive: true,
                        userId: userId
                    }
                })
                console.log(`[Users API] Auto-created consultant for MODERATOR user: ${userId}`)
            }

            // PREMIUM abonelik oluştur veya güncelle
            const existingSubscription = await prisma.kariyerSubscription.findUnique({
                where: { userId }
            })

            if (!existingSubscription) {
                // Yeni PREMIUM abonelik oluştur (10 yıl süre ile - pratik olarak sınırsız)
                await prisma.kariyerSubscription.create({
                    data: {
                        userId,
                        plan: 'PREMIUM',
                        status: 'ACTIVE',
                        expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 yıl
                    }
                })
                console.log(`[Users API] Auto-created PREMIUM subscription for MODERATOR user: ${userId}`)
            } else if (existingSubscription.plan !== 'PREMIUM') {
                // Mevcut aboneliği PREMIUM'a yükselt
                await prisma.kariyerSubscription.update({
                    where: { userId },
                    data: {
                        plan: 'PREMIUM',
                        status: 'ACTIVE',
                        expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
                    }
                })
                console.log(`[Users API] Upgraded subscription to PREMIUM for MODERATOR user: ${userId}`)
            }

            // PREMIUM abonelik yeterli - kullanıcı planı subscription tablosundan okunuyor
        }

        // Plan güncellemesi varsa subscription'ı da güncelle
        let tokensAdded = 0
        let cvChatTokensAdded = 0

        if (plan && plan !== 'FREE') {
            const existingSubscription = await prisma.kariyerSubscription.findUnique({
                where: { userId },
            })

            const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            const orderCode = generateOrderCode()

            // Get tokens from admin plan settings
            const planTokens = await getPlanTokens(plan)
            tokensAdded = planTokens.tokens
            cvChatTokensAdded = planTokens.cvChatTokens

            // Update or create subscription
            if (existingSubscription) {
                await prisma.kariyerSubscription.update({
                    where: { userId },
                    data: {
                        plan,
                        status: 'ACTIVE',
                        expiresAt: newExpiresAt,
                        orderCode: orderCode,
                    },
                })
            } else {
                await prisma.kariyerSubscription.create({
                    data: {
                        userId,
                        plan,
                        status: 'ACTIVE',
                        expiresAt: newExpiresAt,
                        orderCode: orderCode,
                    },
                })
            }

            // Add tokens to user (if not manually set)
            const tokenUpdateData: any = {}
            if (tokensAdded > 0 && credits === undefined) {
                tokenUpdateData.credits = { increment: tokensAdded }
            }
            if (cvChatTokensAdded > 0 && cvChatTokens === undefined) {
                tokenUpdateData.cvChatTokens = cvChatTokensAdded // SET - not increment
            }

            if (Object.keys(tokenUpdateData).length > 0) {
                await prisma.user.update({
                    where: { id: userId },
                    data: tokenUpdateData
                })
            }

            // Get plan info for sales record
            let planName = plan
            let planPrice = 0
            try {
                const setting = await prisma.siteSettings.findUnique({
                    where: { key: 'subscription_plans' }
                })
                if (setting?.value) {
                    const plans = JSON.parse(setting.value)
                    const planInfo = plans.find((p: any) => p.id === plan)
                    if (planInfo) {
                        planName = planInfo.name
                        planPrice = planInfo.price || 0
                    }
                }
            } catch (e) {
                console.error('Error fetching plan info:', e)
            }

            // Create sales record (COMPLETED - admin verified)
            await prisma.salesRecord.create({
                data: {
                    userId,
                    orderNumber: orderCode,
                    plan: planName,
                    amount: planPrice,
                    status: 'COMPLETED',
                    paymentMethod: 'ADMIN',
                    notes: `Admin tarafından verildi: ${session.user.email}. ${tokensAdded} kredi + ${cvChatTokensAdded} CV chat jetonu yüklendi.`
                }
            })
        } else if (plan === 'FREE') {
            // Downgrade to free - deactivate subscription
            const existingSubscription = await prisma.kariyerSubscription.findUnique({
                where: { userId },
            })

            if (existingSubscription) {
                await prisma.kariyerSubscription.update({
                    where: { userId },
                    data: {
                        plan: 'FREE',
                        status: 'INACTIVE',
                        expiresAt: null,
                    },
                })
            }
        }

        // Admin log kaydı
        await prisma.adminLog.create({
            data: {
                adminId: session.user.id,
                action: 'UPDATE',
                targetType: 'USER',
                targetId: userId,
                details: JSON.stringify({
                    changes: { name, phoneNumber, credits, cvChatTokens, role, plan },
                    tokensAdded,
                    cvChatTokensAdded,
                    updatedBy: session.user.email,
                }),
            },
        })

        return NextResponse.json({
            user,
            message: tokensAdded > 0 || cvChatTokensAdded > 0
                ? `Kullanıcı güncellendi. ${tokensAdded > 0 ? `${tokensAdded} kredi` : ''} ${cvChatTokensAdded > 0 ? `${cvChatTokensAdded} CV chat jetonu` : ''} yüklendi.`
                : 'Kullanıcı güncellendi',
            tokensAdded,
            cvChatTokensAdded
        })
    } catch (error) {
        console.error('Update user error:', error)
        return NextResponse.json({ error: 'Kullanıcı güncellenemedi' }, { status: 500 })
    }
}

// Kullanıcı sil
export async function DELETE(req: NextRequest) {
    const session = await checkAdmin()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Bulk Delete Support via JSON body
        let userIds: string[] = []

        try {
            const body = await req.json().catch(() => null)
            if (body && body.userIds) {
                userIds = body.userIds
            }
        } catch (e) { }

        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')
        if (userId) userIds.push(userId)

        if (userIds.length === 0) {
            return NextResponse.json({ error: 'userId veya userIds gerekli' }, { status: 400 })
        }

        // Admin kendini silemesin
        if (userIds.includes(session.user.id)) {
            return NextResponse.json({ error: 'Kendinizi silemezsiniz' }, { status: 400 })
        }

        // Silme işlemi
        const result = await prisma.user.deleteMany({
            where: { id: { in: userIds } }
        })

        // Admin log kaydı
        await prisma.adminLog.create({
            data: {
                adminId: session.user.id,
                action: 'BULK_DELETE',
                targetType: 'USER',
                targetId: 'BULK',
                details: JSON.stringify({
                    count: result.count,
                    deletedUserIds: userIds,
                    deletedBy: session.user.email,
                }),
            },
        })

        return NextResponse.json({ message: `${result.count} kullanıcı silindi` })
    } catch (error) {
        console.error('Delete user error:', error)
        return NextResponse.json({ error: 'Kullanıcı silinemedi' }, { status: 500 })
    }
}

// Yeni kullanıcı oluştur (Admin/Moderator)
export async function POST(req: NextRequest) {
    const session = await checkAdminOrModerator()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { name, email, phoneNumber, password, verified } = await req.json()

        if (!email) {
            return NextResponse.json({ error: 'E-posta adresi zorunludur' }, { status: 400 })
        }

        // Email kontrolü
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            return NextResponse.json({ error: 'Bu e-posta adresi zaten kullanımda' }, { status: 400 })
        }

        // Telefon kontrolü (opsiyonel)
        if (phoneNumber) {
            const existingPhone = await prisma.user.findFirst({ where: { phoneNumber } })
            if (existingPhone) {
                return NextResponse.json({ error: 'Bu telefon numarası zaten kullanımda' }, { status: 400 })
            }
        }

        // Şifre hash'le
        const bcrypt = await import('bcryptjs')
        const hashedPassword = password
            ? await bcrypt.hash(password, 12)
            : await bcrypt.hash('Kamulog123!', 12) // Varsayılan şifre

        // Kullanıcı oluştur
        const newUser = await prisma.user.create({
            data: {
                name: name || null,
                email,
                phoneNumber: phoneNumber || null,
                password: hashedPassword,
                emailVerified: verified ? new Date() : null,
                credits: 10, // FREE plan default
                cvChatTokens: 20,
                role: 'USER'
            }
        })

        // Admin log
        await prisma.adminLog.create({
            data: {
                adminId: session.user.id,
                action: 'CREATE',
                targetType: 'USER',
                targetId: newUser.id,
                details: JSON.stringify({
                    email,
                    name,
                    phoneNumber,
                    verified: !!verified,
                    createdBy: session.user.email
                }),
            },
        })

        return NextResponse.json({
            message: 'Kullanıcı başarıyla oluşturuldu',
            user: { id: newUser.id, email: newUser.email, name: newUser.name }
        })
    } catch (error) {
        console.error('Create user error:', error)
        return NextResponse.json({ error: 'Kullanıcı oluşturulamadı' }, { status: 500 })
    }
}

// Manuel doğrulama (Admin/Moderator)
export async function PATCH(req: NextRequest) {
    const session = await checkAdminOrModerator()
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { userId, action } = await req.json()

        if (!userId) {
            return NextResponse.json({ error: 'userId gerekli' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) {
            return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
        }

        if (action === 'verify') {
            // Manuel doğrulama
            await prisma.user.update({
                where: { id: userId },
                data: { emailVerified: new Date() }
            })

            // Admin log
            await prisma.adminLog.create({
                data: {
                    adminId: session.user.id,
                    action: 'VERIFY',
                    targetType: 'USER',
                    targetId: userId,
                    details: JSON.stringify({
                        email: user.email,
                        verifiedBy: session.user.email
                    }),
                },
            })

            return NextResponse.json({ message: 'Kullanıcı hesabı doğrulandı' })
        } else if (action === 'unverify') {
            // Doğrulamayı kaldır
            await prisma.user.update({
                where: { id: userId },
                data: { emailVerified: null }
            })

            // Admin log
            await prisma.adminLog.create({
                data: {
                    adminId: session.user.id,
                    action: 'UNVERIFY',
                    targetType: 'USER',
                    targetId: userId,
                    details: JSON.stringify({
                        email: user.email,
                        unverifiedBy: session.user.email
                    }),
                },
            })

            return NextResponse.json({ message: 'Kullanıcı doğrulaması kaldırıldı' })
        }

        return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
    } catch (error) {
        console.error('Patch user error:', error)
        return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 })
    }
}

