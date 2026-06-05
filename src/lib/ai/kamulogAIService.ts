/**
 * KamulogAI — OpenAI AI Servisi
 * Tek sağlayıcı: OpenAI gpt-4o-mini
 */

import OpenAI from "openai";
import { callWithFailover } from "./keyProvider";

// ─── Client ────────────────────────────────────────────────
// OpenAI client artik keyProvider uzerinden dinamik olusturulur (callWithFailover)

// ─── Tip Tanımları ─────────────────────────────────────────

export interface AdUserProfile {
    name?: string;
    currentCity?: string;
    targetCity?: string;
    kurum?: string;
    bakanlik?: string;
    role?: string; // istihdamTuru
    unvan?: string;
    atamaUsulu?: string;
    yearsWorking?: number;
}

export interface AdDraftResult {
    isValid: boolean;
    suggestedTitle: string;
    suggestedDescription: string;
    extractedCities: string[];
    provider?: "openai";
}

export interface WorkInfoDraftResult {
    isValid: boolean;
    istihdamTuru: string;
    bakanlik: string;
    kurum: string;
    unvan: string;
    atamaUsulu: string;
    provider?: "openai";
}

export interface ProfileAndBecayisDraftResult {
    isValid: boolean;
    workInfo: {
        istihdamTuru: string;
        bakanlik: string;
        kurum: string;
        unvan: string;
        atamaUsulu: string;
    };
    targetCities: string[];
    becayisText: string;
    provider?: "openai";
}

// ─── Sistem Promptları ─────────────────────────────────────

const AD_SYSTEM_PROMPT = `Sen KamulogAI asistanısın. Kısa ve net cevaplar ver. Kullanıcının notunu ve (izin verildiyse) profilindeki çalışma bilgilerini referans alarak, sistemin mevcut ilan verme parametrelerine tam uyumlu bir becayiş ilan taslağı oluştur. Gereksiz sohbetleri reddet.

Kurallar:
- Başlık 80 karakteri geçmemeli
- Açıklama en fazla 500 karakter olmalı, profesyonel ve resmi bir dil kullan
- Şehir isimlerini doğru yazımla çıkar
- Eğer kullanıcının notu yeterli değilse isValid: false dön ve suggestedDescription'da eksik bilgileri belirt

Çıktı formatı (strict JSON):
{
  "isValid": true/false,
  "suggestedTitle": "Başlık metni",
  "suggestedDescription": "Açıklama metni",
  "extractedCities": ["Ankara", "İstanbul"]
}`;

const WORK_INFO_SYSTEM_PROMPT = `Sen KamulogAI çalışma bilgileri asistanısın. Kullanıcının serbest metin olarak yazdığı çalışma bilgilerini analiz et ve yapılandırılmış hale getir.

Kurallar:
- istihdamTuru: "Memur", "Sürekli İşçi", "Geçici İşçi", "Sözleşmeli", "Özel Sektör", "İş Arayan" değerlerinden biri
- bakanlik: Bakanlık adını tam olarak yaz (örn: "Sağlık Bakanlığı", "Milli Eğitim Bakanlığı")
- kurum: Kurum/kuruluş adını tam yaz
- unvan: Kadro/ünvan bilgisi (örn: VHKİ, Güvenlik Görevlisi, Hemşire)
- atamaUsulu: "Merkezi", "Mahalli", "696 KHK", "İŞKUR", "Diğer" değerlerinden biri
- Çıkaramadığın alanları boş string ("") olarak bırak
- Eğer metin anlamlı değilse isValid: false dön

Çıktı formatı (strict JSON):
{
  "isValid": true/false,
  "istihdamTuru": "",
  "bakanlik": "",
  "kurum": "",
  "unvan": "",
  "atamaUsulu": ""
}`;

const PROFILE_BECAYIS_SYSTEM_PROMPT = `Sen KamulogAI asistanısın. Kullanıcının girdiği kısa metni analiz et.
1) SADECE şu 5 çalışma bilgisini çıkar: İstihdam Türü, Bakanlık, Kurum, Unvan, Atama Usulü.
2) Gitmek istediği şehirleri (targetCities) bul.
3) Gelecekte ilan verirken kullanması için çok profesyonel bir becayiş taslak metni yaz.
4) Metni analiz ederken kullanıcının mühürlü becayiş profiline 'İstihdam Türü' (Memur, İşçi vb.) bilgisini de ekle.

Kurallar:
- istihdamTuru: "Memur", "Sürekli İşçi", "Geçici İşçi", "Sözleşmeli", "Özel Sektör", "İş Arayan" değerlerinden biri
- bakanlik: Bakanlık adını tam olarak yaz (örn: "Sağlık Bakanlığı")
- kurum: Kurum/kuruluş adını tam yaz
- unvan: Kadro/ünvan bilgisi
- atamaUsulu: "Merkezi", "Mahalli", "696 KHK", "İŞKUR", "Diğer" değerlerinden biri
- targetCities: Kullanıcının gitmek istediği şehirleri dizi olarak döndür
- becayisText: Profesyonel, resmi ve kapsamlı bir becayiş ilan taslağı yaz (200-500 karakter). İstihdam Türü bilgisini de metnin içine dahil et.
- Çıkaramadığın alanları boş string ("") veya boş dizi ([]) olarak bırak

Çıktı formatı (strict JSON):
{
  "workInfo": {
    "istihdamTuru": "...",
    "bakanlik": "...",
    "kurum": "...",
    "unvan": "...",
    "atamaUsulu": "..."
  },
  "targetCities": ["Ankara"],
  "becayisText": "Profesyonel metin..."
}`;

// ─── OpenAI İle Üretim ────────────────────────────────────

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    return callWithFailover("OPENAI", async (apiKey) => {
        const client = new OpenAI({ apiKey });
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 1024,
        });
        return response.choices[0]?.message?.content || "{}";
    });
}

// ─── OpenAI Çağrı Wrapper ─────────────────────────────────

async function hybridCall(systemPrompt: string, userPrompt: string): Promise<{ text: string; provider: "openai" }> {
    const text = await callOpenAI(systemPrompt, userPrompt);
    return { text, provider: "openai" };
}

// ─── Fonksiyon 1: Becayiş İlan Taslağı ───────────────────

export async function generateBecayisAdDraft(
    userProfile: AdUserProfile | null,
    userNote: string,
    useProfileAsReference: boolean = true
): Promise<AdDraftResult> {
    let profileContext = "";

    if (useProfileAsReference && userProfile) {
        profileContext = `
Kullanıcı Profil Bilgileri:
- İsim: ${userProfile.name || "Belirtilmemiş"}
- Mevcut Şehir: ${userProfile.currentCity || "Belirtilmemiş"}
- Hedef Şehir: ${userProfile.targetCity || "Belirtilmemiş"}
- Kurum: ${userProfile.kurum || "Belirtilmemiş"}
- Bakanlık: ${userProfile.bakanlik || "Belirtilmemiş"}
- İstihdam Türü: ${userProfile.role || "Belirtilmemiş"}
- Ünvan: ${userProfile.unvan || "Belirtilmemiş"}
- Atama Usulü: ${userProfile.atamaUsulu || "Belirtilmemiş"}
- Çalışma Süresi: ${userProfile.yearsWorking ?? "Belirtilmemiş"} yıl
`;
    }

    const userPrompt = `${profileContext}\nKullanıcının notu:\n${userNote}`;

    const { text, provider } = await hybridCall(AD_SYSTEM_PROMPT, userPrompt);

    try {
        const parsed = JSON.parse(text) as AdDraftResult;
        return {
            isValid: parsed.isValid ?? false,
            suggestedTitle: parsed.suggestedTitle || "",
            suggestedDescription: parsed.suggestedDescription || "",
            extractedCities: Array.isArray(parsed.extractedCities) ? parsed.extractedCities : [],
            provider,
        };
    } catch {
        return {
            isValid: false,
            suggestedTitle: "",
            suggestedDescription: "AI yanıtı ayrıştırılamadı.",
            extractedCities: [],
            provider,
        };
    }
}

// ─── Fonksiyon 2: Çalışma Bilgisi Taslağı ────────────────

export async function generateWorkInfoDraft(
    userNote: string
): Promise<WorkInfoDraftResult> {
    const { text, provider } = await hybridCall(WORK_INFO_SYSTEM_PROMPT, userNote);

    try {
        const parsed = JSON.parse(text) as WorkInfoDraftResult;
        return {
            isValid: parsed.isValid ?? false,
            istihdamTuru: parsed.istihdamTuru || "",
            bakanlik: parsed.bakanlik || "",
            kurum: parsed.kurum || "",
            unvan: parsed.unvan || "",
            atamaUsulu: parsed.atamaUsulu || "",
            provider,
        };
    } catch {
        return {
            isValid: false,
            istihdamTuru: "",
            bakanlik: "",
            kurum: "",
            unvan: "",
            atamaUsulu: "",
            provider,
        };
    }
}

// ─── Fonksiyon 3: Profil + Becayiş Taslağı (Komple) ──────

export async function generateProfileAndBecayisDraft(
    userNote: string
): Promise<ProfileAndBecayisDraftResult> {
    const { text, provider } = await hybridCall(PROFILE_BECAYIS_SYSTEM_PROMPT, userNote);

    try {
        const parsed = JSON.parse(text) as ProfileAndBecayisDraftResult;
        return {
            isValid: true,
            workInfo: {
                istihdamTuru: parsed.workInfo?.istihdamTuru || "",
                bakanlik: parsed.workInfo?.bakanlik || "",
                kurum: parsed.workInfo?.kurum || "",
                unvan: parsed.workInfo?.unvan || "",
                atamaUsulu: parsed.workInfo?.atamaUsulu || "",
            },
            targetCities: Array.isArray(parsed.targetCities) ? parsed.targetCities : [],
            becayisText: parsed.becayisText || "",
            provider,
        };
    } catch {
        return {
            isValid: false,
            workInfo: { istihdamTuru: "", bakanlik: "", kurum: "", unvan: "", atamaUsulu: "" },
            targetCities: [],
            becayisText: "",
            provider,
        };
    }
}

// ─── Tip Tanımları: AI Arama Motoru ───────────────────────

export interface SearchUserProfile {
    currentCity?: string;
    targetCities?: string[];
    unvan?: string;
    istihdamTuru?: string;
    aiExtractedEmploymentType?: string;
    bakanlik?: string;
    kurum?: string;
    atamaUsulu?: string;
    aiGeneratedBecayisText?: string;
}

export interface SearchListing {
    id: string;
    title: string;
    currentCity: string;
    targetCity: string;
    branch: string;
    role: string;
    description: string;
    assignmentMethod?: string;
    institutionName?: string;
    ownerName?: string;
}

export interface AiSearchMatch {
    listingId: string;
    matchPercentage: number;
    reason: string;
    matchType: "perfect" | "proximity";
}

export interface AiSearchResponse {
    perfectMatches: AiSearchMatch[];
    proximityMatches: AiSearchMatch[];
    recommendationText: string;
}

// ─── Fonksiyon 4: AI Arama Motoru (Hibrit + Proximity) ────

const AI_SEARCH_SYSTEM_PROMPT = `Sen uzman bir Becayiş Eşleştirme asistanısın. Kullanıcının profil verilerini (bulunduğu şehir, gitmek istediği şehir, unvan, istihdam türü, bakanlık, kurum) al. Veritabanındaki tüm ilanları tara.

Eşleştirme Kuralları:
1. **Mükemmel Ters Eşleşme (%90+)**: İlanın mevcut şehri = kullanıcının hedef şehri VE ilanın hedef şehri = kullanıcının mevcut şehri VE unvan/kadro benzer.
2. **Unvan Benzer / Şehir Uyumlu (%80-90)**: Unvan veya branş benzer ama sadece şehir kısmı tam uyumlu (tek yönlü).
3. **Proximity Fallback**: Eğer gitmek istediği şehirde tam uyum yoksa, kullanıcının gitmek istediği şehrin coğrafi olarak yakınındaki (komşu iller, aynı bölge) şehirlerden, kullanıcının bulunduğu şehre gelmek isteyen ilanları tara. Neden uygun olduğunu açıkla (örn: "Ankara yerine Eskişehir — 250 km mesafe, aynı İç Anadolu Bölgesi").

Önemli:
- İstihdam türü uyumuna dikkat et (Memur↔Memur, İşçi↔İşçi eşleşmeli).
- Uyumsuz istihdam türleri varsa matchPercentage düşür.
- matchType alanı: mükemmel veya unvan-benzer eşleşmeler için "perfect", proximity eşleşmeleri için "proximity".
- recommendationText: Genel tavsiye metni (kullanıcıya yönelik 2-3 cümle).
- Sadece %60 ve üzeri eşleşmeleri dahil et.

Çıktı formatı (strict JSON):
{
  "perfectMatches": [
    { "listingId": "...", "matchPercentage": 92, "reason": "...", "matchType": "perfect" }
  ],
  "proximityMatches": [
    { "listingId": "...", "matchPercentage": 72, "reason": "...", "matchType": "proximity" }
  ],
  "recommendationText": "Genel tavsiye metni..."
}`;

export async function searchAiMatches(
    userProfile: SearchUserProfile,
    allListings: SearchListing[]
): Promise<AiSearchResponse> {
    if (!allListings.length) {
        return {
            perfectMatches: [],
            proximityMatches: [],
            recommendationText: "Şu anda veritabanında aktif ilan bulunmamaktadır.",
        };
    }

    const employmentType =
        userProfile.aiExtractedEmploymentType ||
        userProfile.istihdamTuru ||
        "Belirtilmemiş";

    const targetCitiesStr =
        userProfile.targetCities && userProfile.targetCities.length > 0
            ? userProfile.targetCities.join(", ")
            : "Belirtilmemiş";

    const userPrompt = `
Kullanıcı Profili:
- Bulunduğu Şehir: ${userProfile.currentCity || "Belirtilmemiş"}
- Gitmek İstediği Şehir(ler): ${targetCitiesStr}
- Unvan: ${userProfile.unvan || "Belirtilmemiş"}
- İstihdam Türü: ${employmentType}
- Bakanlık: ${userProfile.bakanlik || "Belirtilmemiş"}
- Kurum: ${userProfile.kurum || "Belirtilmemiş"}
- Atama Usulü: ${userProfile.atamaUsulu || "Belirtilmemiş"}
${userProfile.aiGeneratedBecayisText ? `- AI Profil Özeti: ${userProfile.aiGeneratedBecayisText.substring(0, 300)}` : ""}

Veritabanındaki İlanlar (${allListings.length} adet):
${allListings
            .map(
                (l, i) => `
[${i + 1}] ID: ${l.id}
    Başlık: ${l.title}
    Mevcut Şehir: ${l.currentCity}
    Hedef Şehir: ${l.targetCity}
    Branş: ${l.branch}
    Kadro: ${l.role}
    Kurum: ${l.institutionName || "Belirtilmemiş"}
    Atama Yöntemi: ${l.assignmentMethod || "Belirtilmemiş"}
    Açıklama: ${l.description.substring(0, 150)}`
            )
            .join("\n")}

Yukarıdaki ilanları analiz et ve JSON formatında perfectMatches, proximityMatches ve recommendationText dön.`;

    const { text, provider } = await hybridCall(AI_SEARCH_SYSTEM_PROMPT, userPrompt);

    try {
        const parsed = JSON.parse(text) as AiSearchResponse;

        const validateMatch = (m: AiSearchMatch): boolean =>
            typeof m.listingId === "string" &&
            typeof m.matchPercentage === "number" &&
            typeof m.reason === "string" &&
            m.matchPercentage >= 0 &&
            m.matchPercentage <= 100;

        return {
            perfectMatches: Array.isArray(parsed.perfectMatches)
                ? parsed.perfectMatches.filter(validateMatch).sort((a, b) => b.matchPercentage - a.matchPercentage)
                : [],
            proximityMatches: Array.isArray(parsed.proximityMatches)
                ? parsed.proximityMatches.filter(validateMatch).sort((a, b) => b.matchPercentage - a.matchPercentage)
                : [],
            recommendationText: parsed.recommendationText || "Analiz tamamlandı.",
        };
    } catch {
        console.error(`[KamulogAI] AI Search JSON parse hatası (provider: ${provider})`);
        return {
            perfectMatches: [],
            proximityMatches: [],
            recommendationText: "AI yanıtı işlenemedi. Lütfen tekrar deneyin.",
        };
    }
}

// ─── Fonksiyon 5: Profilden Otomatik İlan Taslağı ─────────

interface ProfileAdInput {
    istihdamTuru: string;
    bakanlik: string;
    kurum: string;
    unvan: string;
    atamaUsulu: string;
    city: string;
}

interface ProfileAdDraftResult {
    title: string;
    description: string;
    provider: "openai";
}

const PROFILE_AD_SYSTEM_PROMPT = `Sen uzman bir Becayiş İlan Yazarı asistanısın. Kullanıcının mevcut çalışma bilgilerini (Bakanlık, Kurum, Ünvan, Mevcut Şehir vb.) ve "Hedef Şehir" notunu harmanlayarak profesyonel, dikkat çekici bir İlan Başlığı ve detaylı bir Açıklama metni yaz.

KURALLAR:
- Başlık kısa, öz ve dikkat çekici olmalı (örn: "İstanbul'dan Ankara'ya Sağlık Bakanlığı VHKİ Becayiş")
- Açıklama resmi, profesyonel ve bilgilendirici olmalı (150-400 karakter)
- Açıklamada kullanıcının mevcut çalışma bilgileri, mevcut şehri ve hedef şehir bilgileri yer almalı
- Açıklamaya becayiş isteğini ve iletişime geçme davetini ekle
- Türkçe yaz

Çıktıyı KESİNLİKLE aşağıdaki JSON formatında dön, başka hiçbir metin ekleme:
{
  "title": "İlan Başlığı",
  "description": "Profesyonel açıklama metni..."
}`;

export async function generateAdFromProfile(
    profile: ProfileAdInput,
    targetCityOrNote: string
): Promise<ProfileAdDraftResult> {
    const userPrompt = `Kullanıcının Becayiş Profili:
- İstihdam Türü: ${profile.istihdamTuru}
- Bakanlık: ${profile.bakanlik}
- Kurum: ${profile.kurum}
- Ünvan: ${profile.unvan}
- Atama Usulü: ${profile.atamaUsulu}
- Mevcut Şehir: ${profile.city}

Kullanıcının Hedef Şehir / Notu: ${targetCityOrNote}`;

    const { text, provider } = await hybridCall(PROFILE_AD_SYSTEM_PROMPT, userPrompt);

    try {
        // JSON bloğunu bul ve parse et
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        return {
            title: parsed.title || "",
            description: parsed.description || "",
            provider,
        };
    } catch {
        console.error(`[KamulogAI] Ad-from-profile JSON parse hatası (provider: ${provider})`);
        return {
            title: "",
            description: "AI yanıtı işlenemedi. Lütfen tekrar deneyin.",
            provider,
        };
    }
}
