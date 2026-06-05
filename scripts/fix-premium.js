/**
 * Kamulog — Premium Düzeltme Scripti v2
 * Kullanım: node scripts/fix-premium.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== Kamulog Premium Düzeltme v2 ===\n");

  // 1. Sedat Şahin kullanıcısını bul
  const users = await prisma.user.findMany({
    where: { name: { contains: "Sedat" } },
    select: { id: true, name: true, phone: true, isPremium: true },
  });

  console.log("Bulunan 'Sedat' kullanıcıları:");
  users.forEach((u) => console.log(`  - ${u.name} (${u.phone}) isPremium=${u.isPremium} id=${u.id}`));

  // Sedat Şahin veya Sahin olanı seç
  const user = users.find((u) => u.name.includes("Şahin") || u.name.includes("Sahin") || u.name.includes("Şahin"));
  if (!user && users.length > 0) {
    // Tek Sedat varsa onu al
    console.log("\n⚠️ 'Şahin' bulunamadı, son bulunan kullanıcı alınıyor...");
  }
  const target = user || users[users.length - 1];

  if (!target) {
    console.log("❌ Kullanıcı bulunamadı");
    await prisma.$disconnect();
    return;
  }

  console.log(`\n🎯 Hedef: ${target.name} (${target.id})`);

  // 2. Plan var mı kontrol et, yoksa oluştur
  let plan = await prisma.subscriptionPlan.findFirst({ where: { isActive: true } });

  if (!plan) {
    console.log("\n📦 Abonelik planı bulunamadı — 3 plan oluşturuluyor...");

    await prisma.subscriptionPlan.createMany({
      data: [
        { name: "Aylık Premium", interval: "monthly", price: 79.99, isActive: true, includedQuota: 50, features: ["Acil İlan", "Öne Çıkar", "AI Becayiş", "Premium Rozet"] },
        { name: "Yıllık Premium", interval: "yearly", price: 599.99, isActive: true, includedQuota: 200, features: ["Acil İlan", "Öne Çıkar", "AI Becayiş", "Premium Rozet", "Sınırsız Mesaj"] },
        { name: "Ömür Boyu Premium", interval: "lifetime", price: 999.99, isActive: true, includedQuota: 500, features: ["Tüm Özellikler", "Ömür Boyu Erişim"] },
      ],
    });

    console.log("✅ 3 plan oluşturuldu (Aylık, Yıllık, Ömür Boyu)");
    plan = await prisma.subscriptionPlan.findFirst({ where: { isActive: true }, orderBy: { price: "desc" } });
  }

  // 3. Abonelik oluştur + isPremium=true
  const endsAt = new Date();
  endsAt.setFullYear(endsAt.getFullYear() + 1);

  await prisma.$transaction([
    prisma.subscription.create({
      data: { userId: target.id, planId: plan.id, status: "active", endsAt },
    }),
    prisma.user.update({
      where: { id: target.id },
      data: { isPremium: true, premiumUntil: endsAt, subscriptionTier: plan.name },
    }),
  ]);

  console.log(`\n✅ Abonelik oluşturuldu: ${plan.name}`);
  console.log(`✅ Bitiş: ${endsAt.toISOString()}`);
  console.log(`✅ isPremium = true yapıldı!`);

  // 4. Doğrulama
  const check = await prisma.user.findUnique({
    where: { id: target.id },
    select: { name: true, isPremium: true, premiumUntil: true },
  });
  console.log(`\n🔍 Kontrol: ${check?.name} — isPremium=${check?.isPremium}, premiumUntil=${check?.premiumUntil}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error("Hata:", e); prisma.$disconnect(); });
