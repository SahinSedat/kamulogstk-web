/**
 * Basit in-memory rate limiter (Next.js App Router uyumlu).
 * Dış bağımlılık gerektirmez, sunucu belleğinde çalışır.
 */

interface RateEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateEntry>();

// Her 10 dakikada eski kayıtları temizle (bellek sızıntısını önler)
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key);
    }
}, 10 * 60 * 1000);

/**
 * İstek hız kontrolü.
 * @param key - Benzersiz anahtar (IP veya telefon)
 * @param maxRequests - Pencere içinde izin verilen max istek (varsayılan: 5)
 * @param windowMs - Pencere süresi ms (varsayılan: 15 dakika)
 */
export function checkRateLimit(
    key: string,
    maxRequests = 5,
    windowMs = 15 * 60 * 1000
): { limited: boolean; remaining: number; retryAfterMs: number } {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { limited: false, remaining: maxRequests - 1, retryAfterMs: 0 };
    }

    entry.count++;

    if (entry.count > maxRequests) {
        return {
            limited: true,
            remaining: 0,
            retryAfterMs: entry.resetAt - now,
        };
    }

    return { limited: false, remaining: maxRequests - entry.count, retryAfterMs: 0 };
}
