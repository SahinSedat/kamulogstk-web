import { NextResponse } from "next/server";

// Cache piyasa verilerini 5 dakika
let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika

async function fetchMarketData() {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) return cache.data;

    const results: any = { usd: null, eur: null, gbp: null, btc: null, bist100: null, updatedAt: new Date().toISOString() };

    try {
        // Döviz kurları — exchangerate-api (ücretsiz)
        const fxRes = await fetch("https://open.er-api.com/v6/latest/TRY", { next: { revalidate: 300 } });
        if (fxRes.ok) {
            const fxData = await fxRes.json();
            if (fxData.rates) {
                results.usd = { rate: +(1 / fxData.rates.USD).toFixed(4), symbol: "$" };
                results.eur = { rate: +(1 / fxData.rates.EUR).toFixed(4), symbol: "€" };
                results.gbp = { rate: +(1 / fxData.rates.GBP).toFixed(4), symbol: "£" };
            }
        }
    } catch (e) { console.error("Döviz API hatası:", e); }

    try {
        // Bitcoin — CoinGecko (ücretsiz)
        const btcRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=try&include_24hr_change=true", { next: { revalidate: 300 } });
        if (btcRes.ok) {
            const btcData = await btcRes.json();
            if (btcData.bitcoin) {
                results.btc = {
                    rate: btcData.bitcoin.try,
                    change24h: btcData.bitcoin.try_24h_change?.toFixed(2) || "0",
                    symbol: "₿",
                };
            }
        }
    } catch (e) { console.error("BTC API hatası:", e); }

    try {
        // BIST100 — Yahoo Finance
        const bistRes = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/XU100.IS?interval=1d&range=2d", { next: { revalidate: 300 } });
        if (bistRes.ok) {
            const bistData = await bistRes.json();
            const meta = bistData?.chart?.result?.[0]?.meta;
            if (meta) {
                const prev = meta.chartPreviousClose || meta.previousClose;
                const current = meta.regularMarketPrice;
                results.bist100 = {
                    rate: Math.round(current),
                    change: prev ? ((current - prev) / prev * 100).toFixed(2) : "0",
                    symbol: "📈",
                };
            }
        }
    } catch (e) { console.error("BIST API hatası:", e); }

    cache = { data: results, timestamp: Date.now() };
    return results;
}

// Admin panel için
export async function GET() {
    try {
        const data = await fetchMarketData();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: "Piyasa verileri alınamadı" }, { status: 500 });
    }
}
