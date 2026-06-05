/**
 * AI API Key Provider — Merkezi Anahtar Çözücü
 * 
 * Tüm AI servisleri bu modülden anahtar alır.
 * Öncelik sırası:
 *   1. Veritabanındaki ACTIVE anahtarlar (priority ASC)
 *   2. .env fallback (son çare)
 * 
 * Kota dolduğunda (429/quota error) anahtar otomatik DEPLETED yapılır
 * ve sıradaki anahtar denenir.
 */

import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

// ─── Tip Tanımları ──────────────────────────────────────

interface ApiKeyRecord {
  id: string;
  provider: string;
  key: string;
  priority: number;
  label: string | null;
}

type SupportedProvider = "OPENAI" | "GEMINI";

// ─── In-Memory Cache ────────────────────────────────────
// DB'ye her istekte sorgu atmamak için kısa süreli cache
const KEY_CACHE: Map<string, { keys: ApiKeyRecord[]; fetchedAt: number }> = new Map();
const CACHE_TTL_MS = 60_000; // 1 dakika

// ─── Ana Fonksiyon: Anahtar Getir ──────────────────────

/**
 * Belirtilen provider için aktif API anahtarını döner.
 * DB'de aktif anahtar yoksa .env fallback kullanır.
 */
export async function getApiKey(provider: SupportedProvider): Promise<string> {
  const keys = await getActiveKeys(provider);
  
  if (keys.length > 0) {
    const chosen = keys[0];
    console.log(
      "[KeyProvider] ✅ DB'den " + provider + " anahtarı alındı: " +
      "\"" + (chosen.label || chosen.id) + "\" (priority: " + chosen.priority + ")"
    );
    return chosen.key;
  }

  // Fallback: .env
  const envKey = getEnvFallback(provider);
  if (envKey) {
    console.log("[KeyProvider] ⚠️ DB'de aktif " + provider + " anahtarı yok — .env fallback kullanılıyor");
    return envKey;
  }

  console.error("[KeyProvider] ❌ " + provider + " için hiçbir anahtar bulunamadı!");
  return "";
}

/**
 * Belirtilen provider için yeni bir OpenAI client oluşturur.
 * Her çağrıda güncel anahtarı kullanır.
 */
export async function createOpenAIClient(): Promise<OpenAI> {
  const apiKey = await getApiKey("OPENAI");
  return new OpenAI({ apiKey });
}

// ─── Failover: Kota Dolduğunda Anahtar Değiştir ────────

/**
 * Bir anahtar kota/hata verdiğinde çağrılır.
 * Anahtarı DEPLETED yapar ve sıradaki anahtarı döner.
 * Hiç aktif anahtar kalmazsa .env fallback döner.
 */
export async function markKeyDepletedAndGetNext(
  provider: SupportedProvider,
  failedKey: string
): Promise<string | null> {
  try {
    // Başarısız anahtarı DEPLETED yap
    const updated = await prisma.apiKey.updateMany({
      where: { provider, key: failedKey, status: "ACTIVE" },
      data: {
        status: "DEPLETED",
        usageNote: "Kota doldu — " + new Date().toLocaleString("tr-TR"),
      },
    });

    if (updated.count > 0) {
      console.log("[KeyProvider] 🔴 " + provider + " anahtarı DEPLETED yapıldı");
    }

    // Cache'i temizle
    KEY_CACHE.delete(provider);

    // Sıradaki aktif anahtarı getir
    const nextKeys = await getActiveKeys(provider);
    if (nextKeys.length > 0) {
      console.log(
        "[KeyProvider] 🔄 Failover → yeni anahtar: \"" + (nextKeys[0].label || nextKeys[0].id) + "\""
      );
      return nextKeys[0].key;
    }

    // Son çare: .env fallback
    const envKey = getEnvFallback(provider);
    if (envKey && envKey !== failedKey) {
      console.log("[KeyProvider] 🛟 Son çare .env fallback kullanılıyor");
      return envKey;
    }

    console.error("[KeyProvider] ❌ " + provider + " için hiç aktif anahtar kalmadı!");
    return null;
  } catch (e) {
    console.error("[KeyProvider] Failover hatası:", e);
    return getEnvFallback(provider);
  }
}

// ─── Failover ile API Çağrısı Sarmalayıcı ───────────────

/**
 * OpenAI API çağrısını failover ile sarar.
 * 429/quota hatası alırsa otomatik anahtar değiştirir ve tekrar dener.
 */
export async function callWithFailover<T>(
  provider: SupportedProvider,
  apiFn: (apiKey: string) => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  let currentKey = await getApiKey(provider);
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiFn(currentKey);
    } catch (error: unknown) {
      lastError = error;
      
      // Kota/rate limit hatası mı kontrol et
      if (isQuotaError(error)) {
        console.warn(
          "[KeyProvider] ⚠️ " + provider + " kota hatası (deneme " + (attempt + 1) + "/" + (maxRetries + 1) + ")"
        );

        const nextKey = await markKeyDepletedAndGetNext(provider, currentKey);
        if (nextKey) {
          currentKey = nextKey;
          continue; // Yeni anahtarla tekrar dene
        }
      }

      // Kota hatası değilse veya yeni anahtar yoksa — hatayı fırlat
      break;
    }
  }

  throw lastError;
}

// ─── Yardımcı Fonksiyonlar ──────────────────────────────

async function getActiveKeys(provider: string): Promise<ApiKeyRecord[]> {
  // Cache kontrol
  const cached = KEY_CACHE.get(provider);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.keys;
  }

  try {
    const keys = await prisma.apiKey.findMany({
      where: { provider, status: "ACTIVE" },
      orderBy: { priority: "asc" },
      select: { id: true, provider: true, key: true, priority: true, label: true },
    });

    KEY_CACHE.set(provider, { keys, fetchedAt: Date.now() });
    return keys;
  } catch (e) {
    console.error("[KeyProvider] DB sorgu hatası:", e);
    return [];
  }
}

function getEnvFallback(provider: string): string {
  switch (provider) {
    case "OPENAI":
      return process.env.OPENAI_API_KEY || "";
    case "GEMINI":
      return process.env.GEMINI_API_KEY || "";
    default:
      return "";
  }
}

function isQuotaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  
  const err = error as Record<string, unknown>;
  
  // OpenAI SDK hata yapısı
  if (err.status === 429) return true;
  if (err.code === "insufficient_quota") return true;
  
  // Genel hata mesajları
  const message = String(err.message || "").toLowerCase();
  if (
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("rate_limit") ||
    message.includes("too many requests")
  ) {
    return true;
  }

  return false;
}
