/**
 * Türkçe Küfür / Argo Filtresi
 * Basit kelime eşleştirmesi — normalize edilmiş metin üzerinde çalışır.
 */

const PROFANITY_LIST: string[] = [
  "amk", "aq", "amına", "amina", "amınakoyayım",
  "orospu", "oç", "oc",
  "sik", "sikerim", "sikeyim", "sikim", "siktir",
  "piç", "pic",
  "göt", "got", "götünü",
  "yarak", "yarrak",
  "meme",
  "kaltak",
  "pezevenk",
  "ibne", "top",
  "dangalak", "gerizekalı", "aptal", "salak", "mal",
  "haysiyetsiz", "şerefsiz", "serefsiz",
  "kahpe",
  "gavat",
  "döl", "dol",
  "bok",
  "lan", // agresif bağlamda
];

/**
 * Metin içinde küfür/argo olup olmadığını kontrol eder.
 * Türkçe karakterler normalize edilerek karşılaştırılır.
 */
export function containsProfanity(text: string): boolean {
  // Türkçe karakterleri normalize et
  const normalized = text
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\\s]/g, ""); // özel karakterleri kaldır

  const words = normalized.split(/\\s+/);

  for (const word of words) {
    const normalizedWord = word.trim();
    if (!normalizedWord) continue;

    for (const profane of PROFANITY_LIST) {
      const normalizedProfane = profane
        .replace(/ı/g, "i")
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c");

      // Tam kelime eşleşmesi veya kelimenin içinde geçmesi
      if (normalizedWord === normalizedProfane || normalizedWord.includes(normalizedProfane)) {
        return true;
      }
    }
  }

  return false;
}
