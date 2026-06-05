import OpenAI from "openai";
import { callWithFailover, getApiKey } from "./keyProvider";

// ─── Tip Tanımları ─────────────────────────────────────────
export interface UserProfile {
    id: string;
    name?: string;
    currentCity?: string;
    targetCity?: string;
    alternativeCities?: string[];
    kurum?: string;
    branch?: string;
    role?: string;
    bakanlik?: string;
    unvan?: string;
    istihdamTuru?: string;
    atamaUsulu?: string;
    yearsWorking?: number;
}

export interface CandidateListing {
    id: string;
    title: string;
    role: string;
    branch: string;
    currentCity: string;
    targetCity: string;
    assignmentMethod?: string;
    description: string;
    institutionName?: string;
    ownerName?: string;
}

export interface MatchResult {
    listingId: string;
    matchPercentage: number;
    reason: string;
}

// ─── Becayiş Eşleştirme Fonksiyonu ────────────────────────
export async function analyzeBecayisMatches(
    userProfile: UserProfile,
    candidateListings: CandidateListing[]
): Promise<MatchResult[]> {
    if (!candidateListings.length) return [];

    const prompt = `
## KULLANICI BECAYİŞ PROFİLİ:
- Mevcut Şehir: ${userProfile.currentCity || "Belirtilmemiş"}
- Gitmek İstediği Şehir: ${userProfile.targetCity || "Belirtilmemiş"}
- Bakanlık/Kurum: ${userProfile.bakanlik || "Belirtilmemiş"} / ${userProfile.kurum || "Belirtilmemiş"}
- Unvan/Meslek: ${userProfile.unvan || "Belirtilmemiş"}
- İstihdam Türü: ${userProfile.istihdamTuru || "Belirtilmemiş"}
- Atama Usulü: ${userProfile.atamaUsulu || "Belirtilmemiş"}
- Branş: ${userProfile.branch || "Belirtilmemiş"}
- Kadro: ${userProfile.role || "Belirtilmemiş"}
- Alternatif Şehirler: ${userProfile.alternativeCities && userProfile.alternativeCities.length > 0 ? userProfile.alternativeCities.join(", ") : "Yok"}

## SİSTEMDEKİ TÜM UYGUN İLANLAR (${candidateListings.length} adet):
${candidateListings
            .map(
                (l, i) => `
[${i + 1}] ID: ${l.id}
    Şehir: ${l.currentCity} → ${l.targetCity}
    Kadro/Branş: ${l.role || "-"} / ${l.branch || "-"}
    Kurum: ${l.institutionName || "-"}
    Atama: ${l.assignmentMethod || "-"}
    Açıklama: ${l.description.substring(0, 120)}`
            )
            .join("\n")}

## PUANLAMA KURALLARI (KESİNLİKLE UYULMALI):

Becayiş = Karşılıklı yer değiştirme. İki kamu görevlisi birbirinin yerine geçer.

### ŞEHİR UYUMU (Temel kriter):
- İlan sahibinin mevcut şehri = Kullanıcının hedef şehri VE İlan sahibinin hedef şehri = Kullanıcının mevcut şehri → TAM EŞLEŞMEdir
- Sadece tek yön uyuyorsa → KISMİ EŞLEŞMEdir
- Kullanıcının ALTERNATİF ŞEHİRLERİ varsa, bu şehirler de hedef şehir olarak kabul edilir ancak ana hedef şehirden daha düşük önceliklidir
- Alternatif şehir eşleşmesi → ALTERNATİF EŞLEŞMEdir (tam eşleşmeden düşük puan)

### MESLEK/UNVAN UYUMU (Çok önemli):
- Aynı meslek/unvan (örn: ikisi de Güvenlik Görevlisi) → +20 puan bonus
- Benzer meslek kategorisi (örn: ikisi de sağlık personeli) → +10 puan bonus  
- Tamamen farklı meslek (örn: Güvenlik Görevlisi vs Temizlik Personeli) → MAKSIMUM %60 puan verebilirsin, asla daha fazla değil!

### İSTİHDAM TÜRÜ UYUMU:
- Aynı istihdam türü (örn: ikisi de 4/D Sürekli İşçi) → +10 puan bonus
- Farklı istihdam türü → -15 puan ceza

### PUAN DAĞILIMI:
%90-100: Tam şehir eşleşmesi + aynı meslek/unvan + aynı istihdam türü
%80-89: Tam şehir eşleşmesi + aynı veya benzer meslek
%70-79: Tam şehir eşleşmesi ama farklı meslek (dikkat: farklı meslekse max %75!)
%60-69: Kısmi şehir eşleşmesi + aynı meslek
%50-59: Kısmi şehir eşleşmesi + farklı meslek

### KRİTİK KURALLAR:
1. Farklı meslek/unvan ise asla %80 üzeri verme!
2. Şehir eşleşmesi yoksa o ilanı DAHİL ETME
3. %50 altı sonuçları DAHİL ETME
4. Her ilan için "reason" alanında neden bu puanı verdiğini Türkçe açıkla (aynı meslek mi, şehirler uyuyor mu vs.)

JSON formatında döndür:
[
  {
    "listingId": "ilanin_id_si",
    "matchPercentage": 88,
    "reason": "Kısa Türkçe açıklama"
  }
]
`;

    // ─── callWithFailover ile otomatik anahtar rotasyonu ───
    return callWithFailover("OPENAI", async (apiKey) => {
        const openai = new OpenAI({ apiKey });

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
                        "Sen bir kamu personeli Becayiş (karşılıklı yer değiştirme) uzmanısın. " +
                        "Kullanıcının becayiş profilindeki TÜM bilgileri (şehir, meslek, unvan, istihdam türü, atama usulü, kurum) baz alarak ilanları analiz ediyorsun. " +
                        "MESLEK/UNVAN UYUMU ÇOK ÖNEMLİDİR — farklı meslekteki kişiler becayiş yapamaz! " +
                        "Güvenlik Görevlisi ile Temizlik Personeli, Şoför ile Hemşire gibi farklı meslekler asla yüksek puan alamaz. " +
                        "Her zaman JSON formatında bir DİZİ (Array) döndür. Sadece JSON döndür, başka metin ekleme.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.2,
            max_tokens: 4096,
            response_format: { type: "json_object" },
        });

        const text = completion.choices[0]?.message?.content || "[]";
        let parsed: MatchResult[];

        // OpenAI json_object mode may wrap in an object
        const raw = JSON.parse(text);
        if (Array.isArray(raw)) {
            parsed = raw;
        } else if (raw.matches && Array.isArray(raw.matches)) {
            parsed = raw.matches;
        } else if (raw.results && Array.isArray(raw.results)) {
            parsed = raw.results;
        } else {
            const firstArray = Object.values(raw).find(Array.isArray);
            parsed = (firstArray as MatchResult[]) || [];
        }

        return parsed
            .filter(
                (m) =>
                    typeof m.listingId === "string" &&
                    typeof m.matchPercentage === "number" &&
                    typeof m.reason === "string" &&
                    m.matchPercentage >= 0 &&
                    m.matchPercentage <= 100
            )
            .sort((a, b) => b.matchPercentage - a.matchPercentage);
    });
}
