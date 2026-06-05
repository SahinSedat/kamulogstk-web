"use client";

import { useState } from "react";
import { Calculator, Award, TrendingUp, Banknote, RefreshCw } from "lucide-react";

const dereceler = Array.from({ length: 15 }, (_, i) => i + 1);
const kademeler = Array.from({ length: 4 }, (_, i) => i + 1);

// 2026 Kamu Maaş Katsayıları (yaklaşık)
const MAAS_KATSAYISI = 0.76458;
const TABAN_AYLIK_KATSAYISI = 5.95073;
const YAN_ODEME_KATSAYISI = 0.076458;

// Gösterge tablosu (derece-kademe)
const gostergeler: Record<number, Record<number, number>> = {
    1: { 1: 1320, 2: 1380, 3: 1440, 4: 1500 },
    2: { 1: 1155, 2: 1210, 3: 1265, 4: 1320 },
    3: { 1: 1020, 2: 1065, 3: 1110, 4: 1155 },
    4: { 1: 915, 2: 950, 3: 985, 4: 1020 },
    5: { 1: 835, 2: 865, 3: 895, 4: 915 },
    6: { 1: 760, 2: 785, 3: 810, 4: 835 },
    7: { 1: 705, 2: 725, 3: 740, 4: 760 },
    8: { 1: 660, 2: 675, 3: 690, 4: 705 },
    9: { 1: 620, 2: 635, 3: 650, 4: 660 },
    10: { 1: 590, 2: 600, 3: 610, 4: 620 },
    11: { 1: 560, 2: 570, 3: 580, 4: 590 },
    12: { 1: 545, 2: 550, 3: 555, 4: 560 },
    13: { 1: 530, 2: 535, 3: 540, 4: 545 },
    14: { 1: 515, 2: 520, 3: 525, 4: 530 },
    15: { 1: 500, 2: 505, 3: 510, 4: 515 },
};

// Ek göstergeler
const ekGostergeler: Record<string, number> = {
    "Genel Müdür": 6400,
    "Daire Başkanı": 3600,
    "Şube Müdürü": 2200,
    "Uzman": 3000,
    "Mühendis": 3600,
    "Hemşire": 3000,
    "Öğretmen": 3000,
    "Tabip": 5300,
    "Avukat": 3600,
    "VHKİ": 1500,
    "Memur": 1200,
    "Hizmetli": 800,
    "Yok": 0,
};

export default function MaasHesaplamaPage() {
    const [derece, setDerece] = useState(5);
    const [kademe, setKademe] = useState(1);
    const [ekGosterge, setEkGosterge] = useState("Memur");
    const [personelTuru, setPersonelTuru] = useState("4A");
    const [hesaplandi, setHesaplandi] = useState(false);

    // Hesaplama
    const gosterge = gostergeler[derece]?.[kademe] || 500;
    const ekG = ekGostergeler[ekGosterge] || 0;

    const aylikGosterge = (gosterge + ekG) * MAAS_KATSAYISI;
    const tabanAylik = 1000 * TABAN_AYLIK_KATSAYISI;
    const yanOdeme = gosterge * YAN_ODEME_KATSAYISI * 2; // ~2x
    const toplam = aylikGosterge + tabanAylik + yanOdeme;

    // Kesintiler (yaklaşık)
    const sgk = toplam * 0.14;
    const vergiMatrah = toplam * 0.15;
    const damgaVergisi = toplam * 0.00759;
    const netMaas = toplam - sgk - vergiMatrah - damgaVergisi;

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Calculator className="w-6 h-6 text-blue-600" /> Maaş Hesaplama</h2>
                <p className="text-gray-500 text-sm mt-1">Kamu personeli maaş hesaplama — 2026 katsayıları</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Form */}
                <div className="lg:col-span-2 glass-card p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Bilgileri Girin</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-500 font-medium">Personel Türü</label>
                            <select value={personelTuru} onChange={e => setPersonelTuru(e.target.value)} className="w-full text-sm mt-1">
                                <option value="4A">4/A — Kadrolu Memur</option>
                                <option value="4B">4/B — Sözleşmeli Personel</option>
                                <option value="4C">4/C — Geçici Personel</option>
                                <option value="4D">4/D — İşçi</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 font-medium">Derece</label>
                                <select value={derece} onChange={e => setDerece(parseInt(e.target.value))} className="w-full text-sm mt-1">
                                    {dereceler.map(d => <option key={d} value={d}>{d}. Derece</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">Kademe</label>
                                <select value={kademe} onChange={e => setKademe(parseInt(e.target.value))} className="w-full text-sm mt-1">
                                    {kademeler.map(k => <option key={k} value={k}>{k}. Kademe</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 font-medium">Ek Gösterge (Unvan)</label>
                            <select value={ekGosterge} onChange={e => setEkGosterge(e.target.value)} className="w-full text-sm mt-1">
                                {Object.entries(ekGostergeler).map(([k, v]) => <option key={k} value={k}>{k} ({v})</option>)}
                            </select>
                        </div>
                        <button onClick={() => setHesaplandi(true)}
                            className="w-full py-3 rounded-xl gradient-primary text-white font-semibold text-sm hover:opacity-90 transition-all glow-primary flex items-center justify-center gap-2">
                            <Calculator className="w-4 h-4" /> Hesapla
                        </button>
                    </div>
                </div>

                {/* Result */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Net Maaş Card */}
                    <div className="glass-card p-6 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-500">Net Maaş (Tahmini)</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">2026 Katsayı</span>
                        </div>
                        <p className="text-4xl font-bold text-blue-700">₺{netMaas.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</p>
                        <p className="text-xs text-gray-400 mt-1">{personelTuru} · {derece}/{kademe} · Ek Gösterge: {ekG}</p>
                    </div>

                    {/* Detay Tablosu */}
                    <div className="glass-card overflow-hidden">
                        <div className="px-6 py-3 border-b border-gray-100">
                            <h4 className="text-sm font-semibold text-gray-700">Maaş Kalemi Detayı</h4>
                        </div>
                        <table className="w-full text-sm">
                            <tbody>
                                {[
                                    { label: "Gösterge", value: gosterge, desc: `${derece}/${kademe}` },
                                    { label: "Ek Gösterge", value: ekG, desc: ekGosterge },
                                    { label: "Aylık Gösterge × Katsayı", value: aylikGosterge, desc: `(${gosterge}+${ekG}) × ${MAAS_KATSAYISI}` },
                                    { label: "Taban Aylık", value: tabanAylik, desc: `1000 × ${TABAN_AYLIK_KATSAYISI}` },
                                    { label: "Yan Ödeme", value: yanOdeme, desc: "Yaklaşık" },
                                ].map((r, i) => (
                                    <tr key={i} className="border-b border-gray-50">
                                        <td className="px-6 py-2.5 text-gray-600">{r.label}</td>
                                        <td className="px-6 py-2.5 text-right font-medium text-green-600">₺{r.value.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</td>
                                        <td className="px-6 py-2.5 text-right text-xs text-gray-400">{r.desc}</td>
                                    </tr>
                                ))}
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <td className="px-6 py-2.5 font-semibold text-gray-700">Brüt Toplam</td>
                                    <td className="px-6 py-2.5 text-right font-bold text-gray-800">₺{toplam.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</td>
                                    <td></td>
                                </tr>
                                {[
                                    { label: "SGK Primi (%14)", value: sgk },
                                    { label: "Gelir Vergisi (%15)", value: vergiMatrah },
                                    { label: "Damga Vergisi", value: damgaVergisi },
                                ].map((r, i) => (
                                    <tr key={`d-${i}`} className="border-b border-gray-50">
                                        <td className="px-6 py-2.5 text-gray-500">{r.label}</td>
                                        <td className="px-6 py-2.5 text-right font-medium text-red-500">-₺{r.value.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</td>
                                        <td></td>
                                    </tr>
                                ))}
                                <tr className="bg-blue-50">
                                    <td className="px-6 py-3 font-bold text-blue-800">Net Maaş</td>
                                    <td className="px-6 py-3 text-right font-bold text-xl text-blue-700">₺{netMaas.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                        <p className="text-xs text-amber-700">⚠️ Bu hesaplama tahmini değerler içerir. Kesin maaş bilgisi için kurumunuzun maaş birimine başvurunuz. Katsayılar 2026 1. dönem itibariyledir.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
