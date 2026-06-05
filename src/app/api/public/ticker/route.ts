import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── Piyasa verileri cache (15 dakika) ──
let marketCache: { data: any; timestamp: number } | null = null;
const MARKET_CACHE_TTL = 15 * 60 * 1000; // 15 dk

async function fetchMarketData() {
  if (marketCache && Date.now() - marketCache.timestamp < MARKET_CACHE_TTL) {
    return marketCache.data;
  }

  const results: any = {
    usd: null, eur: null, gbp: null, btc: null, bist100: null, gold: null,
  };

  // Döviz kurları
  try {
    const fxRes = await fetch("https://open.er-api.com/v6/latest/TRY", {
      signal: AbortSignal.timeout(8000),
    });
    if (fxRes.ok) {
      const fxData = await fxRes.json();
      if (fxData.rates) {
        results.usd = { rate: +(1 / fxData.rates.USD).toFixed(4), symbol: "$", name: "USD/TRY" };
        results.eur = { rate: +(1 / fxData.rates.EUR).toFixed(4), symbol: "€", name: "EUR/TRY" };
        results.gbp = { rate: +(1 / fxData.rates.GBP).toFixed(4), symbol: "£", name: "GBP/TRY" };
      }
    }
  } catch (e) { console.error("[Ticker] Döviz hatası:", e); }

  // Bitcoin
  try {
    const btcRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=try&include_24hr_change=true",
      { signal: AbortSignal.timeout(8000) }
    );
    if (btcRes.ok) {
      const btcData = await btcRes.json();
      if (btcData.bitcoin) {
        results.btc = {
          rate: Math.round(btcData.bitcoin.try),
          change24h: +(btcData.bitcoin.try_24h_change || 0).toFixed(2),
          symbol: "₿",
          name: "BTC/TRY",
        };
      }
    }
  } catch (e) { console.error("[Ticker] BTC hatası:", e); }

  // BIST100
  try {
    const bistRes = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/XU100.IS?interval=1d&range=2d",
      { signal: AbortSignal.timeout(8000) }
    );
    if (bistRes.ok) {
      const bistData = await bistRes.json();
      const meta = bistData?.chart?.result?.[0]?.meta;
      if (meta) {
        const prev = meta.chartPreviousClose || meta.previousClose;
        const current = meta.regularMarketPrice;
        results.bist100 = {
          rate: Math.round(current),
          change: prev ? +((current - prev) / prev * 100).toFixed(2) : 0,
          symbol: "📈",
          name: "BIST 100",
        };
      }
    }
  } catch (e) { console.error("[Ticker] BIST hatası:", e); }

  // Altın (CoinGecko → fallback: admin fiyatı)
  try {
    const goldRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=gold&vs_currencies=try&include_24hr_change=true",
      { signal: AbortSignal.timeout(8000) }
    );
    if (goldRes.ok) {
      const goldData = await goldRes.json();
      if (goldData.gold && goldData.gold.try > 0) {
        const gramPrice = +(goldData.gold.try / 31.1035).toFixed(2);
        results.gold = {
          rate: gramPrice,
          change24h: +(goldData.gold.try_24h_change || 0).toFixed(2),
          symbol: "🥇",
          name: "Gram Altın",
        };
      }
    }
  } catch (e) { console.error("[Ticker] Altın API hatası:", e); }

  // Altın fallback: API başarısızsa admin fiyatı
  if (!results.gold || results.gold.rate === 0) {
    try {
      const goldSetting = await prisma.siteSettings.findUnique({ where: { key: "gold_price" } });
      if (goldSetting && parseFloat(goldSetting.value) > 0) {
        results.gold = {
          rate: parseFloat(goldSetting.value),
          change24h: 0,
          symbol: "🥇",
          name: "Gram Altın",
        };
      }
    } catch { /* ignore */ }
  }

  // BIST100 fallback: API başarısızsa admin fiyatı
  if (!results.bist100 || results.bist100.rate === 0) {
    try {
      const bistSetting = await prisma.siteSettings.findUnique({ where: { key: "bist100_price" } });
      if (bistSetting && parseFloat(bistSetting.value) > 0) {
        results.bist100 = {
          rate: parseFloat(bistSetting.value),
          change: 0,
          symbol: "📈",
          name: "BIST 100",
        };
      }
    } catch { /* ignore */ }
  }

  marketCache = { data: results, timestamp: Date.now() };
  return results;
}

// ── Marquee cache (30 saniye) ──
let marqueeCache: { data: any; timestamp: number } | null = null;
const MARQUEE_CACHE_TTL = 30 * 1000;

async function getMarqueeSettings() {
  if (marqueeCache && Date.now() - marqueeCache.timestamp < MARQUEE_CACHE_TTL) {
    return marqueeCache.data;
  }

  const [textSetting, enabledSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "MARQUEE_TEXT" } }),
    prisma.systemSetting.findUnique({ where: { key: "MARQUEE_ENABLED" } }),
  ]);

  const result = {
    text: textSetting?.value || "",
    enabled: enabledSetting?.value === "true",
  };

  marqueeCache = { data: result, timestamp: Date.now() };
  return result;
}

/** Admin tarafından çağrılır — marquee cache'ini anında temizler. */
export function invalidateMarqueeCache() {
  marqueeCache = null;
}

// GET /api/public/ticker
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    "CDN-Cache-Control": "no-store",
    "Cloudflare-CDN-Cache-Control": "no-store",
  };

  try {
    const [market, marquee] = await Promise.all([
      fetchMarketData(),
      getMarqueeSettings(),
    ]);

    return NextResponse.json({
      market,
      marquee,
      updatedAt: new Date().toISOString(),
    }, { headers });
  } catch {
    return NextResponse.json(
      { error: "Ticker verileri alınamadı" },
      { status: 500 },
    );
  }
}
