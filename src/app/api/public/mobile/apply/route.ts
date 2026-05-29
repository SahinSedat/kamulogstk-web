import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mobil Üye Başvuru API (Otomatik Şube Atama)
// Kullanıcının il bilgisine göre doğru şubeye otomatik yönlendirme
// POST /api/public/mobile/apply

export async function POST(request: Request) {
    try {
        const body = await request.json()

        const {
            stkId,       // Başvurulan STK ID'si (veya adCode)
            adCode,      // Alternatif: adCode ile başvuru
            branchId: directBranchId, // Doğrudan şube sayfasından başvuru
            name,
            surname,
            email,
            phone,
            tcKimlik,
            city,        // Kullanıcının il bilgisi (oto şube atama için kritik)
            district,
            address,
            occupation,
            workplace,
            birthDate,
            gender,
        } = body

        // --- Validasyon ---
        const errors: string[] = []
        if (!name || name.trim().length < 2) errors.push('Ad en az 2 karakter olmalıdır.')
        if (!surname || surname.trim().length < 2) errors.push('Soyad en az 2 karakter olmalıdır.')
        if (!email || !email.includes('@')) errors.push('Geçerli bir e-posta adresi giriniz.')
        if (!phone || phone.trim().length < 10) errors.push('Geçerli bir telefon numarası giriniz.')
        if (!city) errors.push('İl bilgisi zorunludur.')
        if (!stkId && !adCode) errors.push('STK ID veya ilan kodu gereklidir.')

        if (errors.length > 0) {
            return NextResponse.json({ success: false, errors }, { status: 400 })
        }

        // --- STK'yı bul ---
        let targetSTK
        if (stkId) {
            targetSTK = await prisma.sTK.findUnique({
                where: { id: stkId },
                select: { id: true, name: true, status: true }
            })
        } else if (adCode) {
            targetSTK = await prisma.sTK.findFirst({
                where: { adCode: { equals: adCode.toUpperCase(), mode: 'insensitive' } },
                select: { id: true, name: true, status: true }
            })
        }

        if (!targetSTK) {
            return NextResponse.json(
                { success: false, errors: ['Belirtilen STK bulunamadı.'] },
                { status: 404 }
            )
        }

        if (targetSTK.status !== 'ACTIVE') {
            return NextResponse.json(
                { success: false, errors: ['Bu STK şu anda aktif değil, başvuru kabul etmemektedir.'] },
                { status: 403 }
            )
        }

        // --- Mükerrer Kontrol ---
        const existingMember = await prisma.member.findFirst({
            where: {
                stkId: targetSTK.id,
                OR: [
                    { email: email.trim().toLowerCase() },
                    ...(tcKimlik ? [{ tcKimlik: tcKimlik.trim() }] : []),
                ]
            }
        })

        if (existingMember) {
            return NextResponse.json(
                { success: false, errors: ['Bu e-posta veya TC kimlik ile zaten bir üyelik kaydı bulunmaktadır.'] },
                { status: 409 }
            )
        }

        // =============================================
        // ŞUBE ATAMA ALGORİTMASI
        // =============================================
        let assignedBranchId: string | null = null
        let assignedBranchName: string | null = null

        if (directBranchId) {
            // DOĞRUDAN ATAMA: Kullanıcı şube sayfasından başvuruyor
            const directBranch = await prisma.sTKBranch.findFirst({
                where: {
                    id: directBranchId,
                    stkId: targetSTK.id,
                    isActive: true,
                },
                select: { id: true, name: true },
            })
            if (directBranch) {
                assignedBranchId = directBranch.id
                assignedBranchName = directBranch.name
            }
        } else if (city) {
            // OTOMATİK ATAMA: İl bilgisine göre eşleşen şubeyi bul
            const matchingBranch = await prisma.sTKBranch.findFirst({
                where: {
                    stkId: targetSTK.id,
                    isActive: true,
                    city: {
                        equals: city.trim(),
                        mode: 'insensitive',
                    },
                },
                select: { id: true, name: true, city: true },
                orderBy: { createdAt: 'asc' },
            })
            if (matchingBranch) {
                assignedBranchId = matchingBranch.id
                assignedBranchName = matchingBranch.name
            }
        }
        // else: Eşleşme yok → branchId null kalır, doğrudan merkeze düşer

        // --- Üye Kaydını Oluştur ---
        const member = await prisma.member.create({
            data: {
                stkId: targetSTK.id,
                branchId: assignedBranchId,
                name: name.trim(),
                surname: surname.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim(),
                tcKimlik: tcKimlik?.trim() || null,
                city: city.trim(),
                district: district?.trim() || null,
                address: address?.trim() || null,
                occupation: occupation?.trim() || null,
                workplace: workplace?.trim() || null,
                birthDate: birthDate ? new Date(birthDate) : null,
                gender: gender || null,
                status: 'APPLIED',
                category: 'ASIL',
                registrationSource: 'MOBILE',
                kvkkConsent: true,
                kvkkConsentDate: new Date(),
            },
            select: {
                id: true,
                name: true,
                surname: true,
                email: true,
                status: true,
                branchId: true,
                branch: {
                    select: { name: true, city: true }
                }
            }
        })

        // --- Başvuru Kaydını Oluştur (Panel'de görünmesi için) ---
        await prisma.membershipApplication.create({
            data: {
                stkId: targetSTK.id,
                memberId: member.id,
                status: 'APPLIED',
                applicationDate: new Date(),
            }
        })

        return NextResponse.json({
            success: true,
            message: assignedBranchId
                ? `Başvurunuz "${assignedBranchName}" şubesine yönlendirildi. Başvurunuz incelendikten sonra bilgilendirileceksiniz.`
                : `Başvurunuz "${targetSTK.name}" genel merkezine iletildi. İnceleme sonrası bilgilendirileceksiniz.`,
            data: {
                memberId: member.id,
                memberName: `${member.name} ${member.surname}`,
                status: member.status,
                assignedTo: member.branch
                    ? { type: 'branch', name: member.branch.name, city: member.branch.city }
                    : { type: 'headquarters', name: targetSTK.name },
            }
        }, { status: 201 })

    } catch (error) {
        console.error('[MOBILE-APPLY] Error:', error)
        return NextResponse.json(
            { success: false, errors: ['Başvuru sırasında bir hata oluştu. Lütfen tekrar deneyiniz.'] },
            { status: 500 }
        )
    }
}
