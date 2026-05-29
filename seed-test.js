const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
    console.log('🌱 KamulogSTK Test Verisi Oluşturucu v2.0\n');
    console.log('📋 DB Mapping: STK → STKOrganization, UserRole → Role\n');

    // ============================================
    // 1. SÜPER ADMİN
    // ============================================
    const adminPw = await bcrypt.hash('Admin2026!', 12);
    const adminExists = await prisma.$queryRaw`SELECT id, email FROM "User" WHERE email = 'admin@kamulog.net'`;
    let adminId;
    if (adminExists.length > 0) {
        adminId = adminExists[0].id;
        // Şifreyi güncelle (eski hash uyumsuzluğu için)
        await prisma.$executeRaw`UPDATE "User" SET password = ${adminPw} WHERE id = ${adminId}`;
        console.log('⚠️  Admin zaten mevcut, şifre güncellendi:', 'admin@kamulog.net');
    } else {
        await prisma.$executeRaw`
            INSERT INTO "User" (id, email, password, name, phone, role, city, "isActive", "isVerified", status, "createdAt", "updatedAt")
            VALUES (gen_random_uuid()::text, 'admin@kamulog.net', ${adminPw}, 'Sistem Yöneticisi', '05001000000', 'ADMIN'::"Role", 'Ankara', true, true, 'ACTIVE', NOW(), NOW())
        `;
        const admin = await prisma.$queryRaw`SELECT id FROM "User" WHERE email = 'admin@kamulog.net'`;
        adminId = admin[0].id;
        console.log('✅ Admin oluşturuldu: admin@kamulog.net');
    }
    console.log('   🔑 Şifre: Admin2026! | Rol: ADMIN | ID:', adminId);

    // ============================================
    // 2. MERKEZ YÖNETİCİSİ
    // ============================================
    const mgrPw = await bcrypt.hash('Merkez2026!', 12);
    const mgrExists = await prisma.$queryRaw`SELECT id FROM "User" WHERE email = 'merkez@testsendika.org'`;
    let mgrId;
    if (mgrExists.length > 0) {
        mgrId = mgrExists[0].id;
        await prisma.$executeRaw`UPDATE "User" SET password = ${mgrPw}, role = 'STK_MANAGER'::"Role" WHERE id = ${mgrId}`;
        console.log('⚠️  Merkez yöneticisi zaten mevcut, güncellendi');
    } else {
        await prisma.$executeRaw`
            INSERT INTO "User" (id, email, password, name, phone, role, city, "isActive", "isVerified", status, "isStkOfficial", "stkOfficialRole", "createdAt", "updatedAt")
            VALUES (gen_random_uuid()::text, 'merkez@testsendika.org', ${mgrPw}, 'Merkez Yöneticisi', '05002000000', 'STK_MANAGER'::"Role", 'Ankara', true, true, 'ACTIVE', true, 'Genel Başkan', NOW(), NOW())
        `;
        const mgr = await prisma.$queryRaw`SELECT id FROM "User" WHERE email = 'merkez@testsendika.org'`;
        mgrId = mgr[0].id;
        console.log('✅ Merkez yöneticisi oluşturuldu: merkez@testsendika.org');
    }
    console.log('   🔑 Şifre: Merkez2026! | Rol: STK_MANAGER | ID:', mgrId);

    // ============================================
    // 3. TEST SENDİKASI (STKOrganization tablosuna)
    // ============================================
    const stkExists = await prisma.$queryRaw`SELECT id, name FROM "STKOrganization" WHERE "adCode" = 'TEST-1000'`;
    let stkId;
    if (stkExists.length > 0) {
        stkId = stkExists[0].id;
        // Kredileri güncelle
        await prisma.$executeRaw`UPDATE "STKOrganization" SET "smsCredits" = 1000, "whatsappCredits" = 1000, "emailCredits" = 1000, "pushCredits" = 1000, "managerId" = ${mgrId} WHERE id = ${stkId}`;
        console.log('⚠️  Test Sendikası zaten mevcut, kotalar güncellendi');
    } else {
        await prisma.$executeRaw`
            INSERT INTO "STKOrganization" (id, name, slug, "adCode", type, status, email, phone, address, city, district, description, "managerId", "approvedAt", "smsCredits", "whatsappCredits", "emailCredits", "pushCredits", "memberCount", "topicCount", "createdAt", "updatedAt")
            VALUES (gen_random_uuid()::text, 'Test Sendikası', 'test-sendikasi', 'TEST-1000', 'SENDIKA'::"OrganizationType", 'ACTIVE'::"OrganizationStatus", 'info@testsendika.org', '03121234567', 'Atatürk Bulvarı No: 100, Kızılay', 'Ankara', 'Çankaya', 'KamulogSTK platformu test amaçlı oluşturulmuş örnek sendika. Tüm modülleri test etmek için kullanılır.', ${mgrId}, NOW(), 1000, 1000, 1000, 1000, 0, 0, NOW(), NOW())
        `;
        const stk = await prisma.$queryRaw`SELECT id FROM "STKOrganization" WHERE "adCode" = 'TEST-1000'`;
        stkId = stk[0].id;
        console.log('✅ Test Sendikası oluşturuldu: Test Sendikası (adCode: TEST-1000)');
    }
    console.log('   📊 Kotalar: SMS=1000, WhatsApp=1000, Email=1000, Push=1000');
    console.log('   🏢 STK ID:', stkId);

    // ============================================
    // 4. ŞUBE BAŞKANI
    // ============================================
    const brPw = await bcrypt.hash('Sube2026!', 12);
    const brMgrExists = await prisma.$queryRaw`SELECT id FROM "User" WHERE email = 'ankara@testsendika.org'`;
    let brMgrId;
    if (brMgrExists.length > 0) {
        brMgrId = brMgrExists[0].id;
        await prisma.$executeRaw`UPDATE "User" SET password = ${brPw}, role = 'BRANCH_MANAGER'::"Role" WHERE id = ${brMgrId}`;
        console.log('⚠️  Şube başkanı zaten mevcut, güncellendi');
    } else {
        await prisma.$executeRaw`
            INSERT INTO "User" (id, email, password, name, phone, role, city, "isActive", "isVerified", status, "isStkOfficial", "stkOfficialRole", "createdAt", "updatedAt")
            VALUES (gen_random_uuid()::text, 'ankara@testsendika.org', ${brPw}, 'Ankara Şube Başkanı', '05003000000', 'BRANCH_MANAGER'::"Role", 'Ankara', true, true, 'ACTIVE', true, 'Şube Başkanı', NOW(), NOW())
        `;
        const brMgr = await prisma.$queryRaw`SELECT id FROM "User" WHERE email = 'ankara@testsendika.org'`;
        brMgrId = brMgr[0].id;
        console.log('✅ Şube başkanı oluşturuldu: ankara@testsendika.org');
    }
    console.log('   🔑 Şifre: Sube2026! | Rol: BRANCH_MANAGER | ID:', brMgrId);

    // ============================================
    // 5. ANKARA ŞUBESİ (STKBranch tablosu)
    // ============================================
    const branchExists = await prisma.$queryRaw`SELECT id, name FROM "STKBranch" WHERE "stkId" = ${stkId} AND city = 'Ankara'`;
    let branchId;
    if (branchExists.length > 0) {
        branchId = branchExists[0].id;
        await prisma.$executeRaw`UPDATE "STKBranch" SET "smsCredits" = 500, "whatsappCredits" = 500, "emailCredits" = 500, "pushCredits" = 500 WHERE id = ${branchId}`;
        console.log('⚠️  Ankara Şubesi zaten mevcut, kotalar güncellendi');
    } else {
        await prisma.$executeRaw`
            INSERT INTO "STKBranch" (id, "stkId", name, code, "adCode", city, district, address, phone, email, "managerName", "isActive", "smsCredits", "whatsappCredits", "emailCredits", "pushCredits", "createdAt", "updatedAt")
            VALUES (gen_random_uuid()::text, ${stkId}, 'Ankara 1 Nolu Şube', 'ANK-01', 'TEST-1000-ANK01', 'Ankara', 'Çankaya', 'Ziya Gökalp Cad. No: 50, Kızılay', '03125551234', 'ankara@testsendika.org', 'Ankara Şube Başkanı', true, 500, 500, 500, 500, NOW(), NOW())
        `;
        const branch = await prisma.$queryRaw`SELECT id FROM "STKBranch" WHERE "stkId" = ${stkId} AND city = 'Ankara'`;
        branchId = branch[0].id;
        console.log('✅ Ankara Şubesi oluşturuldu: Ankara 1 Nolu Şube (adCode: TEST-1000-ANK01)');
    }
    console.log('   📊 Şube Kotaları: SMS=500, WhatsApp=500, Email=500, Push=500');
    console.log('   🏠 Branch ID:', branchId);

    // Şube başkanını şubeye bağla
    await prisma.$executeRaw`UPDATE "User" SET "managedBranchId" = ${branchId} WHERE id = ${brMgrId}`;
    console.log('✅ Şube başkanı → Ankara Şubesine bağlandı');

    // ============================================
    // FINAL ÖZET
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SEED TAMAMLANDI — Hiyerarşik Test Sistemi Hazır!');
    console.log('='.repeat(60));
    console.log('\n📋 GİRİŞ BİLGİLERİ:');
    console.log('┌─────────────────┬──────────────────────────────┬─────────────┐');
    console.log('│ Rol             │ E-posta                      │ Şifre       │');
    console.log('├─────────────────┼──────────────────────────────┼─────────────┤');
    console.log('│ 🔴 ADMIN        │ admin@kamulog.net             │ Admin2026!  │');
    console.log('│ 🟢 STK_MANAGER  │ merkez@testsendika.org        │ Merkez2026! │');
    console.log('│ 🔵 BRANCH_MGR   │ ankara@testsendika.org        │ Sube2026!   │');
    console.log('└─────────────────┴──────────────────────────────┴─────────────┘');
    console.log('\n📊 KREDİ DURUMU:');
    console.log('   Genel Merkez: SMS=1000 | WA=1000 | Email=1000 | Push=1000');
    console.log('   Ankara Şube:  SMS=500  | WA=500  | Email=500  | Push=500');
}

seed()
    .catch(e => { console.error('\n❌ HATA:', e.message || e); process.exit(1); })
    .finally(() => prisma.$disconnect());
