/**
 * Kamulog İçerik Filtreleme Servisi
 * - Telefon numarası maskeleme
 * - Türkçe argo/küfür filtreleme
 */

// Türkçe küfür / argo kelime listesi (küçük harf, türkçe karakter dahil)
const PROFANITY_LIST: string[] = [
    // Ağır küfürler
    "amına", "amını", "amınız", "amına koyayım", "amk", "aq", "amq",
    "sikeyim", "sikerim", "siktiğimin", "siktir", "sikik", "sikim",
    "piç", "piçlik", "orospu", "orospuçocuğu", "oç",
    "yarrak", "yarrağı", "yarak", "taşak", "taşşak",
    "göt", "götünü", "götüne", "götoş",
    "ibne", "ibnelik",
    "pezevenk", "puşt", "kahpe", "kaltak", "kevaşe",
    "dangalak", "gerizekalı", "salak", "aptal", "mal", "embesil",
    "haysiyetsiz", "şerefsiz", "namussuz", "ahlaksız",
    "bok", "boktan", "sıçayım", "osur",
    "gavat", "döl", "meme", "am",
    "dalyarak", "dallama", "yavşak", "çüş",
    "hassiktir", "hasiktir", "hsktr",
    "ananı", "ananız", "anana", "bacını", "bacına",
    // Kısaltmalar
    "mk", "mq", "sg", "s2m", "s2ş",
    // İngilizce yaygın olanlar
    "fuck", "shit", "bitch", "asshole", "dick", "pussy", "bastard",
    "whore", "slut", "damn", "crap",
];

// Telefon numarası regex desenleri (Türkiye formatları)
const PHONE_PATTERNS: RegExp[] = [
    // +90 5XX XXX XX XX (boşluklu/boşluksuz/tireli)
    /\+?90[\s\-.]?5\d{2}[\s\-.]?\d{3}[\s\-.]?\d{2}[\s\-.]?\d{2}/g,
    // 05XX XXX XX XX
    /0[\s\-.]?5\d{2}[\s\-.]?\d{3}[\s\-.]?\d{2}[\s\-.]?\d{2}/g,
    // 5XX XXX XX XX (başında 0 olmadan)
    /(?<!\d)5\d{2}[\s\-.]?\d{3}[\s\-.]?\d{2}[\s\-.]?\d{2}(?!\d)/g,
    // Genel telefon numarası (10+ ardışık rakam)
    /(?<!\d)\d{10,13}(?!\d)/g,
    // Boşlukla ayrılmış numara: 555 123 45 67
    /(?<!\d)5\d{2}\s\d{3}\s\d{2}\s\d{2}(?!\d)/g,
];

/**
 * Küfür kelimelerini yıldızla (ilk ve son harf korunur)
 * Örn: "orospu" -> "o****u"
 */
function maskProfanity(word: string): string {
    if (word.length <= 2) return "*".repeat(word.length);
    return word[0] + "*".repeat(word.length - 2) + word[word.length - 1];
}

/**
 * Telefon numaralarını maskele
 * Örn: "05551234567" -> "0555***4567"
 */
function maskPhoneNumbers(text: string): { result: string; masked: boolean } {
    let masked = false;
    let result = text;

    for (const pattern of PHONE_PATTERNS) {
        // Her kullanımda regex'i resetle (global flag)
        pattern.lastIndex = 0;
        result = result.replace(pattern, (match) => {
            masked = true;
            // İlk 4 ve son 4 karakteri göster, arasını maskele
            const digits = match.replace(/[\s\-.]/g, "");
            if (digits.length >= 8) {
                return digits.slice(0, 4) + "***" + digits.slice(-2);
            }
            return "***";
        });
    }

    return { result, masked };
}

/**
 * Küfür/argo kelimeleri filtrele
 */
function filterProfanity(text: string): { result: string; filtered: boolean } {
    let filtered = false;
    let result = text;

    for (const word of PROFANITY_LIST) {
        // Kelime sınırlarını kontrol eden regex (Türkçe desteği ile)
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(?<![a-zA-ZçğıöşüÇĞİÖŞÜ])${escapedWord}(?![a-zA-ZçğıöşüÇĞİÖŞÜ])`, "gi");

        result = result.replace(regex, (match) => {
            filtered = true;
            return maskProfanity(match);
        });
    }

    return { result, filtered };
}

/**
 * Ana içerik filtreleme fonksiyonu
 * Mesaj göndermeden önce bu fonksiyondan geçirilmelidir
 *
 * @param text - Ham mesaj metni
 * @returns { filteredText, wasFiltered } - Filtrelenmiş metin ve filtre uygulanıp uygulanmadığı
 */
export function filterContent(text: string): {
    filteredText: string;
    wasFiltered: boolean;
} {
    if (!text || typeof text !== "string") {
        return { filteredText: text || "", wasFiltered: false };
    }

    // 1. Telefon numaralarını maskele
    const phoneResult = maskPhoneNumbers(text);

    // 2. Küfür/argo filtrele
    const profanityResult = filterProfanity(phoneResult.result);

    return {
        filteredText: profanityResult.result,
        wasFiltered: phoneResult.masked || profanityResult.filtered,
    };
}

/**
 * Sadece kontrol amaçlı - mesajda yasak içerik var mı?
 * (filtrelemeden sadece kontrol etmek için)
 */
export function hasProhibitedContent(text: string): {
    hasPhoneNumber: boolean;
    hasProfanity: boolean;
} {
    if (!text) return { hasPhoneNumber: false, hasProfanity: false };

    const phoneResult = maskPhoneNumbers(text);
    const profanityResult = filterProfanity(text);

    return {
        hasPhoneNumber: phoneResult.masked,
        hasProfanity: profanityResult.filtered,
    };
}
