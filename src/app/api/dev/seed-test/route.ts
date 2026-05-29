import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Test Verisi Oluşturucu (Seeder) — Sadece development/test için
// GET /api/dev/seed-test
// Tarayıcıdan bir kez çağrıldığında hiyerarşik test verilerini oluşturur

export async function GET() {
    const results: string[] = []

    try {
        // =============================================
        // 1. SÜPER ADMİN HESABI
        // =============================================
        const adminEmail = 'admin@kamulog.net'
        const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })

        let adminUser
        if (existingAdmin) {
            results.push(`⚠️ Admin zaten mevcut: ${adminEmail} (ID: ${existingAdmin.id})`)
            adminUser = existingAdmin
        } else {
            const hashedPassword = await bcrypt.hash('Admin2026!', 12)
            adminUser = await prisma.user.create({
                data: {
                    email: adminEmail,
                    password: hashedPassword,
                    name: 'Sistem Yöneticisi',
                    phone: '05001000000',
                    role: 'ADMIN',
                    status: 'ACTIVE',
                    emailVerified: new Date(),
                    city: 'Ankara',
                }
            })
            results.push(`✅ Admin oluşturuldu: ${adminEmail} (ID: ${adminUser.id})`)
        }

        // =============================================
        // 2. TEST SENDİKASI (STK + GENEL MERKEZ YÖNETİCİSİ)
        // =============================================
        const managerEmail = 'merkez@testsendika.org'
        const existingManager = await prisma.user.findUnique({ where: { email: managerEmail } })

        let managerUser
        if (existingManager) {
            results.push(`⚠️ Merkez yöneticisi zaten mevcut: ${managerEmail} (ID: ${existingManager.id})`)
            managerUser = existingManager
        } else {
            const hashedPassword = await bcrypt.hash('Merkez2026!', 12)
            managerUser = await prisma.user.create({
                data: {
                    email: managerEmail,
                    password: hashedPassword,
                    name: 'Merkez Yöneticisi',
                    phone: '05002000000',
                    role: 'STK_MANAGER',
                    status: 'ACTIVE',
                    emailVerified: new Date(),
                    city: 'Ankara',
                    isStkOfficial: true,
                    stkOfficialRole: 'Genel Başkan',
                }
            })
            results.push(`✅ Merkez yöneticisi oluşturuldu: ${managerEmail} (ID: ${managerUser.id})`)
        }

        // STK oluştur
        const existingSTK = await prisma.sTK.findFirst({
            where: { OR: [{ adCode: 'TEST-1000' }, { managerId: managerUser.id }] }
        })

        let testSTK
        if (existingSTK) {
            results.push(`⚠️ Test Sendikası zaten mevcut: ${existingSTK.name} (ID: ${existingSTK.id})`)
            testSTK = existingSTK
        } else {
            testSTK = await prisma.sTK.create({
                data: {
                    name: 'Test Sendikası',
                    slug: 'test-sendikasi',
                    adCode: 'TEST-1000',
                    type: 'SENDIKA',
                    status: 'ACTIVE',
                    registrationNumber: 'TST-2026-001',
                    email: 'info@testsendika.org',
                    phone: '03121234567',
                    website: 'https://testsendika.org',
                    address: 'Atatürk Bulvarı No: 100, Kızılay',
                    city: 'Ankara',
                    district: 'Çankaya',
                    description: 'KamulogSTK platformu test amaçlı oluşturulmuş örnek sendika. Tüm modülleri test etmek için kullanılır.',
                    foundedAt: new Date('2020-01-01'),
                    managerId: managerUser.id,
                    approvedAt: new Date(),
                    // Kredi/Kota — Her kanala 1000'er kredi
                    smsCredits: 1000,
                    whatsappCredits: 1000,
                    emailCredits: 1000,
                    pushCredits: 1000,
                }
            })
            results.push(`✅ Test Sendikası oluşturuldu: ${testSTK.name} (adCode: TEST-1000, ID: ${testSTK.id})`)
            results.push(`   📊 Kotalar: SMS=1000, WhatsApp=1000, Email=1000, Push=1000`)
        }

        // =============================================
        // 3. TEST ŞUBESİ + ŞUBE BAŞKANI
        // =============================================
        const branchManagerEmail = 'ankara@testsendika.org'
        const existingBranchManager = await prisma.user.findUnique({ where: { email: branchManagerEmail } })

        let branchManagerUser
        if (existingBranchManager) {
            results.push(`⚠️ Şube başkanı zaten mevcut: ${branchManagerEmail} (ID: ${existingBranchManager.id})`)
            branchManagerUser = existingBranchManager
        } else {
            const hashedPassword = await bcrypt.hash('Sube2026!', 12)
            branchManagerUser = await prisma.user.create({
                data: {
                    email: branchManagerEmail,
                    password: hashedPassword,
                    name: 'Ankara Şube Başkanı',
                    phone: '05003000000',
                    role: 'BRANCH_MANAGER',
                    status: 'ACTIVE',
                    emailVerified: new Date(),
                    city: 'Ankara',
                    isStkOfficial: true,
                    stkOfficialRole: 'Şube Başkanı',
                }
            })
            results.push(`✅ Şube başkanı oluşturuldu: ${branchManagerEmail} (ID: ${branchManagerUser.id})`)
        }

        // Şube oluştur
        const existingBranch = await prisma.sTKBranch.findFirst({
            where: { stkId: testSTK.id, city: 'Ankara' }
        })

        let testBranch
        if (existingBranch) {
            results.push(`⚠️ Ankara Şubesi zaten mevcut: ${existingBranch.name} (ID: ${existingBranch.id})`)
            testBranch = existingBranch
        } else {
            testBranch = await prisma.sTKBranch.create({
                data: {
                    stkId: testSTK.id,
                    name: 'Ankara 1 Nolu Şube',
                    code: 'ANK-01',
                    adCode: 'TEST-1000-ANK01',
                    city: 'Ankara',
                    district: 'Çankaya',
                    address: 'Ziya Gökalp Cad. No: 50, Kızılay',
                    phone: '03125551234',
                    email: 'ankara@testsendika.org',
                    managerName: 'Ankara Şube Başkanı',
                    managerPhone: '05003000000',
                    managerEmail: branchManagerEmail,
                    isActive: true,
                    // Şube bazlı kotalar
                    smsCredits: 500,
                    whatsappCredits: 500,
                    emailCredits: 500,
                    pushCredits: 500,
                }
            })
            results.push(`✅ Ankara Şubesi oluşturuldu: ${testBranch.name} (adCode: TEST-1000-ANK01, ID: ${testBranch.id})`)
            results.push(`   📊 Şube Kotaları: SMS=500, WhatsApp=500, Email=500, Push=500`)
        }

        // Şube başkanını şubeye bağla
        if (branchManagerUser.managedBranchId !== testBranch.id) {
            await prisma.user.update({
                where: { id: branchManagerUser.id },
                data: { managedBranchId: testBranch.id }
            })
            results.push(`✅ Şube başkanı → Ankara Şubesine bağlandı`)
        }

        // =============================================
        // ÖZET
        // =============================================
        const summary = {
            success: true,
            message: 'Test verileri başarıyla oluşturuldu!',
            accounts: [
                {
                    role: '🔴 SÜPER ADMİN',
                    email: 'admin@kamulog.net',
                    password: 'Admin2026!',
                    id: adminUser.id,
                },
                {
                    role: '🟢 GENEL MERKEZ YÖNETİCİSİ',
                    email: 'merkez@testsendika.org',
                    password: 'Merkez2026!',
                    stk: testSTK.name,
                    adCode: 'TEST-1000',
                    id: managerUser.id,
                },
                {
                    role: '🔵 ŞUBE BAŞKANI',
                    email: 'ankara@testsendika.org',
                    password: 'Sube2026!',
                    branch: 'Ankara 1 Nolu Şube',
                    adCode: 'TEST-1000-ANK01',
                    id: branchManagerUser.id,
                },
            ],
            credits: {
                headquarters: { sms: 1000, whatsapp: 1000, email: 1000, push: 1000 },
                branch: { sms: 500, whatsapp: 500, email: 500, push: 500 },
            },
            logs: results,
        }

        return NextResponse.json(summary, { status: 200 })

    } catch (error: unknown) {
        console.error('[SEED-TEST] Error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Bilinmeyen hata',
            logs: results,
        }, { status: 500 })
    }
}
