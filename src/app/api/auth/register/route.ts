import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { generateSlug } from '@/lib/slug'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { accountType } = body

        // Ortak Alanlar
        const { email, password, name, phone } = body

        if (!email || !password || (accountType === 'individual' && !name)) {
            return NextResponse.json(
                { success: false, error: 'Eksik bilgi' },
                { status: 400 }
            )
        }

        // Faaliyet alanı/İlgi alanı kontrolü
        if (!body.interests || !Array.isArray(body.interests) || body.interests.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Lütfen en az bir faaliyet alanı seçiniz.' },
                { status: 400 }
            )
        }

        // Kullanıcı var mı kontrol et
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return NextResponse.json(
                { success: false, error: 'Bu e-posta adresi zaten kayıtlı.' },
                { status: 400 }
            )
        }

        const hashedPassword = await hash(password, 10)

        // Bireysel Kayıt
        if (accountType === 'individual') {
            const { surname, preferredCity, interests, occupation, education, gender, birthDate, registrationPurpose } = body

            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name: `${name} ${surname}`,
                    phone,
                    role: 'CITIZEN' as any,
                    status: 'ACTIVE',
                    preferredCity: preferredCity || null,
                    occupation: occupation || null,
                    education: education || null,
                    gender: gender || null,
                    birthDate: birthDate ? new Date(birthDate) : null,
                    registrationPurpose: registrationPurpose || null,
                    isStkOfficial: body.isStkOfficial || false,
                    stkOfficialRole: body.stkOfficialRole || null,
                    isStkMember: body.isStkMember || false,
                    memberStkName: body.memberStkName || null,
                    interests: interests?.length > 0 ? {
                        create: interests.map((sectorId: string) => ({
                            sectorId
                        }))
                    } : undefined
                }
            })

            // Hoş Geldiniz Bildirimi Oluştur
            await prisma.notification.create({
                data: {
                    userId: user.id,
                    title: "Hoş Geldiniz!",
                    message: "KamulogSTK platformuna katılımınız onaylanmıştır. İşlemlerinize devam etmek ve STK'ları keşfetmek için lütfen mobil uygulamamızı indirin.",
                    type: "info",
                    isRead: false
                }
            })

            return NextResponse.json({ success: true, user })
        }

        // Kurumsal (STK) Kayıt
        else if (accountType === 'corporate') {
            const {
                stkName,
                stkType,
                taxNumber,
                registrationNumber, // Kütük No
                foundationYear,
                address,
                city,
                district, // İlçe
                website,
                registrationPurpose // STK Yöneticisi için
            } = body

            // Transaction ile STK ve Yöneticisini birlikte oluştur
            // Not: STK Managers tablosu User ile STK arasında ilişki kurar.
            // Bu örnekte basitleştirilmiş bir create işlemi yapıyoruz.
            // Gerçek senaryoda STK modeli ve User modeli ilişkilerine dikkat edilmeli.

            const result = await prisma.$transaction(async (tx) => {
                // 1. Yönetici Kullanıcısını Oluştur
                const user = await tx.user.create({
                    data: {
                        email,
                        password: hashedPassword,
                        name: null as any, // Yetkili adı boş bırakılıyor, daha sonra atanacak
                        phone,
                        role: 'STK_MANAGER',
                        status: 'PENDING', // Onay bekliyor
                        registrationPurpose: registrationPurpose || null
                    }
                })

                // 2. STK Oluştur
                let baseSlug = generateSlug(stkName)
                let slug = baseSlug
                let counter = 1

                // Benzersiz slug kontrolü
                while (true) {
                    const existing = await tx.sTK.findUnique({
                        where: { slug } as any
                    })
                    if (!existing) break
                    slug = `${baseSlug}-${counter}`
                    counter++
                }

                const stk = await tx.sTK.create({
                    data: {
                        name: stkName,
                        slug: slug as any,
                        type: stkType === 'diger' ? 'DIGER' : stkType.toUpperCase(),
                        registrationNumber,
                        taxNumber,
                        email, // İletişim e-postası yönetici ile aynı olabilir
                        phone,
                        address,
                        city,
                        district,
                        website,
                        foundedAt: foundationYear ? new Date(Date.UTC(parseInt(foundationYear), 0, 1)) : null,
                        managerId: user.id,
                        stksectors: body.interests?.length > 0 ? {
                            create: body.interests.map((sectorId: string) => ({
                                sectorId,
                                isPrimary: true
                            }))
                        } : undefined
                    }
                })

                return { user, stk }
            })

            return NextResponse.json({ success: true, ...result })
        }

        return NextResponse.json(
            { success: false, error: 'Geçersiz hesap türü' },
            { status: 400 }
        )

    } catch (error) {
        console.error('Registration Error:', error)
        return NextResponse.json(
            { success: false, error: 'Kayıt oluşturulurken bir hata oluştu.' },
            { status: 500 }
        )
    }
}
