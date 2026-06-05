const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const testUsers = [
  {
    email: "test1@kamulog.net",
    name: "Test Kullanıcı 1",
    firstName: "Ahmet",
    lastName: "Yılmaz",
    password: "Test123!",
    phone: "+905001000001",
    phoneNumber: "5001000001",
    employmentType: "MEMUR",
    istihdamTuru: "Memur",
    bakanlik: "Sağlık Bakanlığı",
    kurum: "Ankara Şehir Hastanesi",
    unvan: "VHKİ",
    city: "Ankara",
    district: "Çankaya",
  },
  {
    email: "test2@kamulog.net",
    name: "Test Kullanıcı 2",
    firstName: "Fatma",
    lastName: "Demir",
    password: "Test123!",
    phone: "+905001000002",
    phoneNumber: "5001000002",
    employmentType: "MEMUR",
    istihdamTuru: "Memur",
    bakanlik: "Milli Eğitim Bakanlığı",
    kurum: "Atatürk İlkokulu",
    unvan: "Öğretmen",
    city: "İstanbul",
    district: "Kadıköy",
  },
  {
    email: "test3@kamulog.net",
    name: "Test Kullanıcı 3",
    firstName: "Mehmet",
    lastName: "Kaya",
    password: "Test123!",
    phone: "+905001000003",
    phoneNumber: "5001000003",
    employmentType: "ISCI",
    istihdamTuru: "Sürekli İşçi",
    bakanlik: "Çevre ve Şehircilik Bakanlığı",
    kurum: "Büyükşehir Belediyesi",
    unvan: "Şoför",
    city: "İzmir",
    district: "Bornova",
  },
  {
    email: "test4@kamulog.net",
    name: "Test Kullanıcı 4",
    firstName: "Ayşe",
    lastName: "Çelik",
    password: "Test123!",
    phone: "+905001000004",
    phoneNumber: "5001000004",
    employmentType: "SOZLESMELI",
    istihdamTuru: "Sözleşmeli",
    bakanlik: "Adalet Bakanlığı",
    kurum: "Ankara Adliyesi",
    unvan: "Zabıt Katibi",
    city: "Ankara",
    district: "Sincan",
  },
  {
    email: "test5@kamulog.net",
    name: "Test Kullanıcı 5",
    firstName: "Mustafa",
    lastName: "Öztürk",
    password: "Test123!",
    phone: "+905001000005",
    phoneNumber: "5001000005",
    employmentType: "MEMUR",
    istihdamTuru: "Memur",
    bakanlik: "İçişleri Bakanlığı",
    kurum: "Emniyet Genel Müdürlüğü",
    unvan: "Polis Memuru",
    city: "Bursa",
    district: "Nilüfer",
  },
  {
    email: "test6@kamulog.net",
    name: "Test Kullanıcı 6",
    firstName: "Zeynep",
    lastName: "Arslan",
    password: "Test123!",
    phone: "+905001000006",
    phoneNumber: "5001000006",
    employmentType: "MEMUR",
    istihdamTuru: "Memur",
    bakanlik: "Hazine ve Maliye Bakanlığı",
    kurum: "Gelir İdaresi Başkanlığı",
    unvan: "Gelir Uzmanı",
    city: "Antalya",
    district: "Muratpaşa",
  },
  {
    email: "test7@kamulog.net",
    name: "Test Kullanıcı 7",
    firstName: "Ali",
    lastName: "Şahin",
    password: "Test123!",
    phone: "+905001000007",
    phoneNumber: "5001000007",
    employmentType: "ISCI",
    istihdamTuru: "Sürekli İşçi",
    bakanlik: "Ulaştırma ve Altyapı Bakanlığı",
    kurum: "Karayolları Genel Müdürlüğü",
    unvan: "Teknisyen",
    city: "Gaziantep",
    district: "Şahinbey",
  },
  {
    email: "test8@kamulog.net",
    name: "Test Kullanıcı 8",
    firstName: "Elif",
    lastName: "Doğan",
    password: "Test123!",
    phone: "+905001000008",
    phoneNumber: "5001000008",
    employmentType: "MEMUR",
    istihdamTuru: "Memur",
    bakanlik: "Tarım ve Orman Bakanlığı",
    kurum: "Orman Genel Müdürlüğü",
    unvan: "Orman Muhafaza Memuru",
    city: "Trabzon",
    district: "Ortahisar",
  },
  {
    email: "test9@kamulog.net",
    name: "Test Kullanıcı 9",
    firstName: "Hasan",
    lastName: "Aydın",
    password: "Test123!",
    phone: "+905001000009",
    phoneNumber: "5001000009",
    employmentType: "SOZLESMELI",
    istihdamTuru: "Sözleşmeli",
    bakanlik: "Sanayi ve Teknoloji Bakanlığı",
    kurum: "TÜBİTAK",
    unvan: "Araştırmacı",
    city: "Konya",
    district: "Selçuklu",
  },
  {
    email: "test10@kamulog.net",
    name: "Test Kullanıcı 10",
    firstName: "Merve",
    lastName: "Yıldız",
    password: "Test123!",
    phone: "+905001000010",
    phoneNumber: "5001000010",
    employmentType: "MEMUR",
    istihdamTuru: "Memur",
    bakanlik: "Aile ve Sosyal Hizmetler Bakanlığı",
    kurum: "Sosyal Hizmetler İl Müdürlüğü",
    unvan: "Sosyal Çalışmacı",
    city: "Eskişehir",
    district: "Tepebaşı",
  },
];

async function main() {
  console.log("🔄 Test kullanıcıları oluşturuluyor...\n");

  const hashedPassword = await bcrypt.hash("Test123!", 12);

  for (const user of testUsers) {
    try {
      // Önce var mı kontrol et
      const existing = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (existing) {
        console.log(`⚠️  ${user.email} zaten mevcut, güncelleniyor...`);
        await prisma.user.update({
          where: { email: user.email },
          data: {
            password: hashedPassword,
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            phoneNumber: user.phoneNumber,
            role: "USER",
            isVerified: true,
            isActive: true,
            phoneVerified: true,
            kvkkAccepted: true,
            userAgreementAccepted: true,
            employmentType: user.employmentType,
            istihdamTuru: user.istihdamTuru,
            bakanlik: user.bakanlik,
            kurum: user.kurum,
            unvan: user.unvan,
            city: user.city,
            district: user.district,
            subscriptionTier: "basic",
            credits: 10,
            aiTokens: 50,
          },
        });
        console.log(`✅ ${user.email} güncellendi`);
      } else {
        await prisma.user.create({
          data: {
            email: user.email,
            password: hashedPassword,
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            phoneNumber: user.phoneNumber,
            role: "USER",
            isVerified: true,
            isActive: true,
            phoneVerified: true,
            kvkkAccepted: true,
            userAgreementAccepted: true,
            employmentType: user.employmentType,
            istihdamTuru: user.istihdamTuru,
            bakanlik: user.bakanlik,
            kurum: user.kurum,
            unvan: user.unvan,
            city: user.city,
            district: user.district,
            subscriptionTier: "basic",
            credits: 10,
            aiTokens: 50,
          },
        });
        console.log(`✅ ${user.email} oluşturuldu`);
      }
    } catch (err) {
      console.error(`❌ ${user.email} hatası:`, err.message);
    }
  }

  console.log("\n🎉 Tüm test kullanıcıları işlendi!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
