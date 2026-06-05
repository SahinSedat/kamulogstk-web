// FCM Token ve Telefon Numarası İstatistikleri
// Kullanım: node scripts/check-tokens.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Kullanıcı İstatistikleri Kontrol Ediliyor...\n');
  console.log('='.repeat(60));

  // Toplam kullanıcı sayısı
  const totalUsers = await prisma.user.count();
  console.log(`👥 Toplam Kayıtlı Kullanıcı: ${totalUsers}`);

  // Aktif kullanıcı sayısı
  const activeUsers = await prisma.user.count({
    where: { isActive: true, accountDeleted: false },
  });
  console.log(`✅ Aktif Kullanıcı: ${activeUsers}`);

  console.log('\n' + '-'.repeat(60));
  console.log('📱 FCM TOKEN İSTATİSTİKLERİ (Push Bildirim)');
  console.log('-'.repeat(60));

  // FCM Token'ı dolu olan kullanıcılar
  const withFcmToken = await prisma.user.count({
    where: {
      fcmToken: { not: null },
      isActive: true,
      accountDeleted: false,
    },
  });
  console.log(`🔔 FCM Token'ı DOLU (bildirim alabilir): ${withFcmToken}`);

  // FCM Token'ı boş olan aktif kullanıcılar
  const withoutFcmToken = activeUsers - withFcmToken;
  console.log(`🔕 FCM Token'ı BOŞ (bildirim ALAMAZ): ${withoutFcmToken}`);
  console.log(`📊 Token Oranı: %${((withFcmToken / activeUsers) * 100).toFixed(1)}`);

  // Token uzunlukları (geçerliliği anlamak için)
  const shortTokens = await prisma.user.count({
    where: {
      fcmToken: { not: null },
      isActive: true,
      accountDeleted: false,
    },
  });

  // Geçerli token'ları say (10 karakterden uzun)
  const validTokenUsers = await prisma.user.findMany({
    where: {
      fcmToken: { not: null },
      isActive: true,
      accountDeleted: false,
    },
    select: { fcmToken: true },
  });
  
  const validTokens = validTokenUsers.filter(u => u.fcmToken && u.fcmToken.length > 10);
  const invalidTokens = validTokenUsers.filter(u => u.fcmToken && u.fcmToken.length <= 10);
  console.log(`\n✅ Geçerli Token (>10 karakter): ${validTokens.length}`);
  console.log(`❌ Kısa/Geçersiz Token (≤10 karakter): ${invalidTokens.length}`);

  console.log('\n' + '-'.repeat(60));
  console.log('📞 TELEFON NUMARASI İSTATİSTİKLERİ (SMS)');
  console.log('-'.repeat(60));

  // phone alanı dolu
  const withPhone = await prisma.user.count({
    where: {
      phone: { not: null, notIn: [''] },
    },
  });
  console.log(`📱 "phone" alanı dolu: ${withPhone}`);

  // phoneNumber alanı dolu
  const withPhoneNumber = await prisma.user.count({
    where: {
      phoneNumber: { not: null, notIn: [''] },
    },
  });
  console.log(`📱 "phoneNumber" alanı dolu: ${withPhoneNumber}`);

  // En az birinde telefon olan
  const withAnyPhone = await prisma.user.count({
    where: {
      OR: [
        { phone: { not: null, notIn: [''] } },
        { phoneNumber: { not: null, notIn: [''] } },
      ],
    },
  });
  console.log(`📞 Telefon numarası olan (herhangi alan): ${withAnyPhone}`);

  console.log('\n' + '-'.repeat(60));
  console.log('📊 KARŞILAŞTIRMA');
  console.log('-'.repeat(60));
  console.log(`👥 Toplam Kullanıcı:     ${totalUsers}`);
  console.log(`✅ Aktif Kullanıcı:      ${activeUsers}`);
  console.log(`🔔 Push Alabilir:        ${withFcmToken} (%${((withFcmToken / activeUsers) * 100).toFixed(1)})`);
  console.log(`📞 SMS Alabilir:         ${withAnyPhone} (%${((withAnyPhone / totalUsers) * 100).toFixed(1)})`);
  console.log(`🔕 Push ALAMAZ:          ${withoutFcmToken}`);
  console.log('='.repeat(60));
  console.log('\n✨ Kontrol tamamlandı!\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
