import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Kategori-bazlı Mock KPSS Soru Üretici
 * POST body: { category: "Lisans" | "Önlisans" | "Ortaöğretim" }
 * Seçilen kategori için 120 soru üretir (ÖSYM dağılımında)
 */

const SUBJECT_DISTRIBUTION = [
    { subject: "Türkçe", count: 30, area: "Genel Yetenek" },
    { subject: "Matematik", count: 30, area: "Genel Yetenek" },
    { subject: "Tarih", count: 27, area: "Genel Kültür" },
    { subject: "Coğrafya", count: 18, area: "Genel Kültür" },
    { subject: "Vatandaşlık", count: 9, area: "Genel Kültür" },
    { subject: "Güncel Bilgiler", count: 6, area: "Genel Kültür" },
];

const ANSWERS = ["A", "B", "C", "D", "E"];

const TEMPLATES: Record<string, string[]> = {
    "Türkçe": [
        "Aşağıdaki cümlelerin hangisinde yazım yanlışı vardır?",
        "Aşağıdaki cümlelerin hangisinde noktalama yanlışı vardır?",
        "Parçada geçen altı çizili sözcüğün anlamı hangisidir?",
        "Aşağıdaki cümlelerin hangisinde bir anlatım bozukluğu vardır?",
        "Verilen paragrafın ana düşüncesi hangisidir?",
        "Aşağıdaki sözcüklerin hangisi mecaz anlamda kullanılmıştır?",
        "Aşağıdaki cümlelerin hangisinde zarf kullanılmıştır?",
        "Altı çizili sözcüğün cümledeki görevi hangisidir?",
    ],
    "Matematik": [
        "x² - 5x + 6 = 0 denkleminin kökleri toplamı kaçtır?",
        "Bir üçgenin iç açıları oranı 2:3:4 ise en büyük açı kaç derecedir?",
        "3, 7, 11, 15, ... dizisinin 25. terimi kaçtır?",
        "Bir malın fiyatı %25 artırıldıktan sonra %20 indirim yapılırsa değişim yüzdesi nedir?",
        "120 sayısının asal çarpanlarına ayrılmış hali hangisidir?",
        "Bir işi A 6 günde, B 12 günde bitirir. Birlikte kaç günde bitirirler?",
        "log₂(32) ifadesinin değeri kaçtır?",
        "Yarıçapı 7 cm olan bir dairenin alanı kaç cm²'dir?",
    ],
    "Tarih": [
        "Aşağıdakilerden hangisi Kurtuluş Savaşı'nın cephelerinden biri değildir?",
        "Tanzimat Fermanı'nın ilan edilme amacı hangisidir?",
        "Atatürk İlkeleri'nden hangisi ekonomik alanla ilgilidir?",
        "Lozan Barış Antlaşması'nın önemi hangisidir?",
        "Osmanlı Devleti'nde ilk anayasa hangi dönemde ilan edilmiştir?",
        "Mudanya Mütarekesi'nin sonuçlarından biri hangisidir?",
        "Cumhuriyetin ilanından sonra yapılan ilk inkılap hangisidir?",
    ],
    "Coğrafya": [
        "Türkiye'nin en uzun nehri hangisidir?",
        "Akdeniz ikliminin özelliklerinden biri hangisidir?",
        "Türkiye'de en fazla yağış alan bölge hangisidir?",
        "Aşağıdakilerden hangisi iç kuvvetlerden biridir?",
        "Haritalarda eş yükselti eğrilerinin sık olması neyi gösterir?",
        "Dünya'nın kendi ekseni etrafında dönmesinin sonucu hangisidir?",
    ],
    "Vatandaşlık": [
        "Anayasa Mahkemesi'nin görevleri arasında hangisi yer almaz?",
        "TBMM'nin görevlerinden biri hangisidir?",
        "Cumhurbaşkanı'nın görev süresi kaç yıldır?",
        "Temel hak ve özgürlüklerden biri hangisidir?",
        "Mahalli idareler hangisini kapsamaz?",
    ],
    "Güncel Bilgiler": [
        "Türkiye'nin NATO'ya üye olduğu yıl hangisidir?",
        "G20 ülkelerinden biri hangisidir?",
        "BM Güvenlik Konseyi'nin daimi üye sayısı kaçtır?",
        "Avrupa Birliği'nin kurucu üyelerinden biri hangisidir?",
    ],
};

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "MODERATOR")) {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    let category: string;
    try {
        const body = await req.json();
        category = body.category || "Lisans";
    } catch {
        category = "Lisans";
    }

    if (!["Lisans", "Önlisans", "Ortaöğretim"].includes(category)) {
        return NextResponse.json({ error: "Geçersiz kategori" }, { status: 400 });
    }

    const questions: any[] = [];
    let qIndex = 1;

    for (const dist of SUBJECT_DISTRIBUTION) {
        const templates = TEMPLATES[dist.subject] || [`${dist.subject} ile ilgili hangisi doğrudur?`];
        for (let i = 0; i < dist.count; i++) {
            const correct = pick(ANSWERS);
            const template = templates[i % templates.length];
            questions.push({
                category,
                subject: dist.subject,
                questionText: `[${category} #${qIndex}] ${dist.area} — ${dist.subject}: ${template}`,
                options: {
                    A: `${dist.subject} — A şıkkı (S${qIndex})`,
                    B: `${dist.subject} — B şıkkı (S${qIndex})`,
                    C: `${dist.subject} — C şıkkı (S${qIndex})`,
                    D: `${dist.subject} — D şıkkı (S${qIndex})`,
                    E: `${dist.subject} — E şıkkı (S${qIndex})`,
                },
                correctAnswer: correct,
                explanation: `Doğru cevap ${correct}. [${dist.area} — ${dist.subject}]`,
                difficulty: Math.floor(Math.random() * 3) + 1,
                isActive: true,
            });
            qIndex++;
        }
    }

    // skipDuplicates ile mükerrer engeli
    const result = await prisma.kpssQuestion.createMany({
        data: questions,
        skipDuplicates: true,
    });

    const subjectSummary = SUBJECT_DISTRIBUTION.map(d => `• ${d.subject}: ${d.count}`).join("\n");

    return NextResponse.json({
        success: true,
        message: `🚀 ${category} için ${result.count} soru üretildi!\n\n${subjectSummary}\n\n(Mükerrer sorular otomatik atlandı)`,
        count: result.count,
        category,
    });
}
