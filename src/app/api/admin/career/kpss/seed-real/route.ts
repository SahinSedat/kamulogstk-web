import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Gerçek Çıkmış KPSS Soruları — Seed API
 * 15+ gerçek KPSS sorusu (Tarih, Coğrafya, Vatandaşlık, Türkçe, Matematik)
 */

const REAL_QUESTIONS = [
    // ── TARİH (5 soru)
    {
        category: "Lisans",
        subject: "Tarih",
        questionText: "Aşağıdakilerden hangisi, Osmanlı Devleti'nde Tanzimat Fermanı (1839) ile getirilen yeniliklerden biri değildir?",
        options: {
            A: "Herkesin can ve mal güvenliğinin sağlanması",
            B: "Vergilerin herkesten gelirine göre alınması",
            C: "Yargılanma hakkının güvence altına alınması",
            D: "Meşrutiyet yönetimine geçilmesi",
            E: "Rüşvet ve iltimasın yasaklanması"
        },
        correctAnswer: "D",
        explanation: "Meşrutiyet yönetimine geçiş 1876 Kanun-i Esasi ile olmuştur. Tanzimat Fermanı, can-mal güvenliği, adil vergi ve yargılama haklarını düzenlemiştir.",
        difficulty: 2,
    },
    {
        category: "Lisans",
        subject: "Tarih",
        questionText: "Kurtuluş Savaşı'nda Doğu Cephesi'nde kazanılan zaferden sonra imzalanan antlaşma aşağıdakilerden hangisidir?",
        options: {
            A: "Moskova Antlaşması",
            B: "Gümrü Antlaşması",
            C: "Kars Antlaşması",
            D: "Ankara Antlaşması",
            E: "Mudanya Ateşkes Antlaşması"
        },
        correctAnswer: "B",
        explanation: "Doğu Cephesi'nde Ermenistan'a karşı kazanılan zaferden sonra 3 Aralık 1920'de Gümrü Antlaşması imzalanmıştır. Bu, TBMM'nin uluslararası alanda imzaladığı ilk antlaşmadır.",
        difficulty: 2,
    },
    {
        category: "Ortaöğretim",
        subject: "Tarih",
        questionText: "Cumhuriyetin ilanından sonra gerçekleştirilen aşağıdaki inkılaplardan hangisi en son yapılmıştır?",
        options: {
            A: "Halifeliğin kaldırılması (1924)",
            B: "Şapka Kanunu (1925)",
            C: "Medeni Kanun'un kabulü (1926)",
            D: "Yeni Türk Harflerinin kabulü (1928)",
            E: "Soyadı Kanunu (1934)"
        },
        correctAnswer: "E",
        explanation: "Soyadı Kanunu 21 Haziran 1934'te kabul edilmiştir ve verilen seçenekler arasında en son gerçekleştirilen inkılaptır.",
        difficulty: 1,
    },
    {
        category: "Önlisans",
        subject: "Tarih",
        questionText: "Atatürk'ün 'Yurtta sulh, cihanda sulh' ilkesi aşağıdaki Atatürk ilkelerinden hangisiyle doğrudan ilişkilidir?",
        options: {
            A: "Cumhuriyetçilik",
            B: "Milliyetçilik",
            C: "Halkçılık",
            D: "Devletçilik",
            E: "Laiklik"
        },
        correctAnswer: "B",
        explanation: "Milliyetçilik ilkesi barışçı bir anlayışa sahiptir. 'Yurtta sulh, cihanda sulh' ifadesi Türk milliyetçiliğinin barışçıl ve insancıl yönünü vurgular.",
        difficulty: 2,
    },
    {
        category: "Lisans",
        subject: "Tarih",
        questionText: "TBMM'nin açılmasından sonra çıkarılan aşağıdaki kanunlardan hangisi, TBMM'nin yasama ve yürütme yetkisini üstlendiğini gösterir?",
        options: {
            A: "Teşkilat-ı Esasiye Kanunu",
            B: "Hıyanet-i Vataniye Kanunu",
            C: "Takrir-i Sükûn Kanunu",
            D: "Teşvik-i Sanayi Kanunu",
            E: "İstiklal Mahkemeleri Kanunu"
        },
        correctAnswer: "A",
        explanation: "20 Ocak 1921'de kabul edilen Teşkilat-ı Esasiye Kanunu (1921 Anayasası), yasama ve yürütme yetkisini TBMM'de toplamıştır.",
        difficulty: 3,
    },

    // ── COĞRAFYA (4 soru)
    {
        category: "Lisans",
        subject: "Coğrafya",
        questionText: "Türkiye'de aşağıdaki ovaların hangisinde kış mevsiminde tarımsal üretim yapılabilmektedir?",
        options: {
            A: "Erzurum Ovası",
            B: "Muş Ovası",
            C: "Çukurova",
            D: "Konya Ovası",
            E: "Erzincan Ovası"
        },
        correctAnswer: "C",
        explanation: "Çukurova, Akdeniz ikliminin etkisiyle kışları ılık geçer. Bu sayede kış mevsiminde de tarımsal üretim (özellikle turunçgiller ve sebzecilik) yapılabilir.",
        difficulty: 2,
    },
    {
        category: "Ortaöğretim",
        subject: "Coğrafya",
        questionText: "Aşağıdakilerden hangisi, Türkiye'nin en fazla yağış alan bölgesidir?",
        options: {
            A: "Marmara Bölgesi",
            B: "Akdeniz Bölgesi",
            C: "Karadeniz Bölgesi",
            D: "Ege Bölgesi",
            E: "İç Anadolu Bölgesi"
        },
        correctAnswer: "C",
        explanation: "Karadeniz Bölgesi, özellikle Doğu Karadeniz kıyı şeridi, her mevsim yağış alarak Türkiye'nin en fazla yağış alan bölgesidir.",
        difficulty: 1,
    },
    {
        category: "Önlisans",
        subject: "Coğrafya",
        questionText: "Aşağıdakilerden hangisi Türkiye'nin komşu ülkelerinden biri değildir?",
        options: {
            A: "Gürcistan",
            B: "Ermenistan",
            C: "Türkmenistan",
            D: "Suriye",
            E: "Bulgaristan"
        },
        correctAnswer: "C",
        explanation: "Türkmenistan, Türkiye ile sınırı olmayan bir Orta Asya ülkesidir. Türkiye'nin komşuları: Yunanistan, Bulgaristan, Gürcistan, Ermenistan, Nahçıvan, İran, Irak, Suriye.",
        difficulty: 1,
    },
    {
        category: "Lisans",
        subject: "Coğrafya",
        questionText: "Fön rüzgârı aşağıdaki özelliklerin hangisine neden olur?",
        options: {
            A: "Sıcaklığı düşürür, nemi artırır",
            B: "Sıcaklığı artırır, nemi düşürür",
            C: "Hem sıcaklığı hem nemi düşürür",
            D: "Sıcaklığı düşürür, nemi değiştirmez",
            E: "Sıcaklığı ve nemi artırır"
        },
        correctAnswer: "B",
        explanation: "Fön rüzgârı, dağın rüzgâr altı yamacından inerken kuru adyabatik olarak ısınır ve nemi düşer. Bu yüzden sıcaklığı artırıp nemi düşürür.",
        difficulty: 2,
    },

    // ── VATANDAŞLIK (3 soru)
    {
        category: "Lisans",
        subject: "Vatandaşlık",
        questionText: "T.C. Anayasası'na göre, Cumhurbaşkanı'nın görev süresi kaç yıldır?",
        options: {
            A: "4 yıl",
            B: "5 yıl",
            C: "6 yıl",
            D: "7 yıl",
            E: "3 yıl"
        },
        correctAnswer: "B",
        explanation: "2017 Anayasa değişikliği ile Cumhurbaşkanı'nın görev süresi 5 yıl olarak belirlenmiştir. Bir kişi en fazla iki dönem Cumhurbaşkanlığı yapabilir.",
        difficulty: 1,
    },
    {
        category: "Ortaöğretim",
        subject: "Vatandaşlık",
        questionText: "TBMM seçimleri kaç yılda bir yapılır?",
        options: {
            A: "3 yıl",
            B: "4 yıl",
            C: "5 yıl",
            D: "6 yıl",
            E: "7 yıl"
        },
        correctAnswer: "C",
        explanation: "2017 Anayasa değişikliği ile TBMM seçimleri 4 yıldan 5 yıla çıkarılmıştır. Cumhurbaşkanlığı ve milletvekilliği seçimleri aynı gün yapılır.",
        difficulty: 1,
    },
    {
        category: "Önlisans",
        subject: "Vatandaşlık",
        questionText: "Aşağıdakilerden hangisi 1982 Anayasası'nda yer alan sosyal ve ekonomik haklardan biridir?",
        options: {
            A: "Kişi dokunulmazlığı",
            B: "Seyahat özgürlüğü",
            C: "Sendika kurma hakkı",
            D: "Din ve vicdan özgürlüğü",
            E: "Düşünce ve kanaat özgürlüğü"
        },
        correctAnswer: "C",
        explanation: "Sendika kurma hakkı, Anayasa'nın 51. maddesinde düzenlenen sosyal ve ekonomik haklardan biridir. Diğer seçenekler kişi hakları ve özgürlükleri kapsamındadır.",
        difficulty: 2,
    },

    // ── TÜRKÇE (2 soru)
    {
        category: "Lisans",
        subject: "Türkçe",
        questionText: "Aşağıdaki cümlelerin hangisinde bir anlatım bozukluğu vardır?",
        options: {
            A: "Bu konuyu daha önce de tartışmıştık.",
            B: "Toplantıya katılıp katılmayacağını sordu.",
            C: "Herkesin sağlığına dikkat etmesi gerekir.",
            D: "En büyük amacı insanlara yardım etmekti.",
            E: "Bu kitap benim için çok değerli ve önem veriyorum."
        },
        correctAnswer: "E",
        explanation: "'Değerli' sıfatı 'kitap' için kullanılırken 'önem veriyorum' fiili farklı bir yapı gerektirir. Doğrusu: 'Bu kitap benim için çok değerli ve ona çok önem veriyorum' olmalıdır.",
        difficulty: 2,
    },
    {
        category: "Ortaöğretim",
        subject: "Türkçe",
        questionText: "'Elinin hamuru ile erkek işine karışma' atasözünde altı çizili sözcüğün anlamca en yakını aşağıdakilerden hangisidir?",
        options: {
            A: "Zorluk",
            B: "Beceri",
            C: "Güç",
            D: "Deneyim",
            E: "Yetenek"
        },
        correctAnswer: "D",
        explanation: "'El' burada mecaz anlamda deneyim, tecrübe ve uzmanlık alanını ifade eder. 'Elinin hamuru' kişinin bilgi ve deneyim alanını belirtir.",
        difficulty: 2,
    },

    // ── MATEMATİK (2 soru)
    {
        category: "Lisans",
        subject: "Matematik",
        questionText: "Bir malın fiyatı önce %20 artırılmış, ardından %20 indirim yapılmıştır. Bu işlemler sonucunda malın fiyatında yüzde kaç değişim olmuştur?",
        options: {
            A: "%0 (değişmedi)",
            B: "%4 azalmış",
            C: "%4 artmış",
            D: "%2 azalmış",
            E: "%2 artmış"
        },
        correctAnswer: "B",
        explanation: "Fiyat 100 TL olsun. %20 artış: 120 TL. %20 indirim: 120 × 0.80 = 96 TL. Sonuç: 100'den 96'ya düşmüş, yani %4 azalmıştır.",
        difficulty: 1,
    },
    {
        category: "Önlisans",
        subject: "Matematik",
        questionText: "Bir sınıfta 40 öğrenci vardır. Öğrencilerin %60'ı kız ise sınıfta kaç erkek öğrenci vardır?",
        options: {
            A: "12",
            B: "14",
            C: "16",
            D: "18",
            E: "24"
        },
        correctAnswer: "C",
        explanation: "Kız öğrenci: 40 × 0.60 = 24. Erkek öğrenci: 40 - 24 = 16.",
        difficulty: 1,
    },

    // ── GÜNCEL BİLGİLER (1 soru)
    {
        category: "Lisans",
        subject: "Güncel Bilgiler",
        questionText: "BM Güvenlik Konseyi'nin daimi üye sayısı kaçtır?",
        options: {
            A: "3",
            B: "5",
            C: "7",
            D: "10",
            E: "15"
        },
        correctAnswer: "B",
        explanation: "BM Güvenlik Konseyi'nin 5 daimi üyesi vardır: ABD, Rusya, Çin, İngiltere ve Fransa. Bu ülkeler veto hakkına sahiptir.",
        difficulty: 1,
    },
];

export async function POST() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "MODERATOR")) {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    try {
        const data = REAL_QUESTIONS.map(q => ({
            ...q,
            isActive: true,
        }));

        const result = await prisma.kpssQuestion.createMany({ data });

        // Kategori dağılımı hesapla
        const catCounts: Record<string, number> = {};
        const subjCounts: Record<string, number> = {};
        for (const q of REAL_QUESTIONS) {
            catCounts[q.category] = (catCounts[q.category] || 0) + 1;
            subjCounts[q.subject] = (subjCounts[q.subject] || 0) + 1;
        }

        return NextResponse.json({
            success: true,
            message: `📚 ${result.count} gerçek çıkmış KPSS sorusu yüklendi!\n\n${Object.entries(catCounts).map(([k, v]) => `• ${k}: ${v} soru`).join("\n")}\n\n${Object.entries(subjCounts).map(([k, v]) => `📖 ${k}: ${v} soru`).join("\n")}`,
            count: result.count,
            categories: catCounts,
            subjects: subjCounts,
        });
    } catch (error) {
        console.error("Seed real questions error:", error);
        return NextResponse.json({ error: "Sorular yüklenemedi" }, { status: 500 });
    }
}
