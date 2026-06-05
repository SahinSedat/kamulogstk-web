/**
 * fix-emails.js — Tek seferlik migration scripti
 * @kamulog.net ile biten sahte email adreslerini null'a çevirir
 * admin@kamulog.net HARİÇ
 *
 * Kullanım: node fix-emails.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🔍 @kamulog.net ile biten sahte email adresleri aranıyor...\n");

  const dummyUsers = await prisma.user.findMany({
    where: {
      email: { endsWith: "@kamulog.net" },
      NOT: { email: "admin@kamulog.net" },
    },
    select: { id: true, email: true, phone: true, name: true },
  });

  console.log(`📊 Toplam ${dummyUsers.length} adet sahte email bulundu.\n`);

  if (dummyUsers.length === 0) {
    console.log("✅ Temizlenecek kayıt yok.");
    return;
  }

  // İlk 5 kaydı örnek göster
  console.log("📋 Örnek kayıtlar:");
  dummyUsers.slice(0, 5).forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.email} → null (tel: ${u.phone || "—"}, ad: ${u.name || "—"})`);
  });
  if (dummyUsers.length > 5) console.log(`  ... ve ${dummyUsers.length - 5} kayıt daha\n`);

  // Toplu güncelleme
  const result = await prisma.user.updateMany({
    where: {
      email: { endsWith: "@kamulog.net" },
      NOT: { email: "admin@kamulog.net" },
    },
    data: { email: null },
  });

  console.log(`\n✅ ${result.count} adet kullanıcının email adresi null'a çevrildi.`);
  console.log("🎯 Migration tamamlandı!");
}

main()
  .catch((e) => {
    console.error("❌ Hata:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
