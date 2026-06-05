// Örnek iş ilanı üretici — admin panelden toplu ilan oluşturmak için
const SAMPLE_TITLES_PUBLIC = [
    "Devlet Hastanesi Hemşire Alımı",
    "İl Milli Eğitim Müdürlüğü Öğretmen Alımı",
    "Belediye Zabıta Memuru Alımı",
    "Tapu Kadastro Müdürlüğü Memur Alımı",
    "Sosyal Hizmetler Müdürlüğü Personel Alımı",
    "Adalet Bakanlığı Katip Alımı",
    "Çevre ve Şehircilik İl Müdürlüğü Mühendis Alımı",
    "Vergi Dairesi Başkanlığı Memur Alımı",
    "İŞKUR Personel Alımı",
    "SGK İl Müdürlüğü Memur Alımı",
];

const SAMPLE_TITLES_PRIVATE = [
    "Yazılım Geliştirme Uzmanı",
    "İnsan Kaynakları Müdürü",
    "Dijital Pazarlama Uzmanı",
    "Muhasebe ve Finans Sorumlusu",
    "Lojistik Operasyon Yöneticisi",
    "Satış ve Pazarlama Temsilcisi",
    "Kalite Kontrol Mühendisi",
    "Proje Yöneticisi",
    "Müşteri İlişkileri Uzmanı",
    "Üretim Planlama Sorumlusu",
];

const COMPANIES_PUBLIC = [
    "Sağlık Bakanlığı", "Milli Eğitim Bakanlığı", "İçişleri Bakanlığı",
    "Adalet Bakanlığı", "Ankara Büyükşehir Belediyesi", "İstanbul Valiliği",
    "Karayolları Genel Müdürlüğü", "SGK Genel Müdürlüğü", "İŞKUR",
    "Devlet Su İşleri", "Maliye Bakanlığı", "Çevre Bakanlığı",
];

const COMPANIES_PRIVATE = [
    "Kamulog Teknoloji A.Ş.", "TechSoft Yazılım", "DigiMark Pazarlama",
    "FinPro Danışmanlık", "LogiTrans Lojistik", "PrimeSales Tic.",
    "QualityFirst Mühendislik", "ProManage Yönetim", "ClientCare Hizmetler",
    "ProdPlan Endüstri", "InnoTech Solutions", "DataFlow Bilişim",
];

const CITIES = [
    "Ankara", "İstanbul", "İzmir", "Bursa", "Antalya",
    "Konya", "Adana", "Gaziantep", "Kayseri", "Trabzon",
    "Eskişehir", "Samsun", "Diyarbakır", "Mersin", "Denizli",
];

const SALARY_RANGES = [
    "25.000 - 35.000 TL", "30.000 - 45.000 TL", "35.000 - 50.000 TL",
    "40.000 - 55.000 TL", "45.000 - 65.000 TL", "50.000 - 70.000 TL",
    "55.000 - 80.000 TL", "60.000 - 90.000 TL", null, null,
];

function randomPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export interface SampleJob {
    title: string;
    company: string;
    location: string;
    description: string;
    requirements: string;
    type: "PUBLIC" | "PRIVATE";
    sourceUrl: string | null;
    applicationUrl: string | null;
    salary: string | null;
    deadline: string | null;
}

export function generateSampleJobs(count: number = 10): SampleJob[] {
    const jobs: SampleJob[] = [];

    for (let i = 0; i < count; i++) {
        const isPublic = Math.random() > 0.5;
        const type = isPublic ? "PUBLIC" : "PRIVATE";
        const title = randomPick(isPublic ? SAMPLE_TITLES_PUBLIC : SAMPLE_TITLES_PRIVATE);
        const company = randomPick(isPublic ? COMPANIES_PUBLIC : COMPANIES_PRIVATE);
        const city = randomPick(CITIES);
        const salary = randomPick(SALARY_RANGES);

        // Deadline: 30-90 gün sonra
        const deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + Math.floor(Math.random() * 60 + 30));

        jobs.push({
            title,
            company,
            location: city,
            description: `${company} bünyesinde ${title} pozisyonu için personel aranmaktadır. ${city} ilinde görev yapılacaktır. Detaylı bilgi için başvuru yapınız.`,
            requirements: isPublic
                ? "KPSS puanı gereklidir. En az lisans mezuniyeti. İlgili alanda deneyim tercih sebebidir."
                : "En az 2 yıl deneyim. İlgili bölüm mezuniyeti. Takım çalışmasına yatkınlık. İyi derecede iletişim becerileri.",
            type,
            sourceUrl: null,
            applicationUrl: null,
            salary,
            deadline: deadlineDate.toISOString(),
        });
    }

    return jobs;
}
