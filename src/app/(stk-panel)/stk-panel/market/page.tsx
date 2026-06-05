"use client";
import { useState, useEffect, useCallback } from "react";

interface STKPackage { id: string; name: string; description?: string; type: string; price: number; smsAmount: number; whatsappAmount: number; pushAmount: number; emailAmount: number; featuredDays: number; whatsappBotDays: number; durationLabel?: string; }
interface PurchaseRequest { id: string; receiptNo: string; amount: number; status: string; createdAt: string; package: { name: string; type: string; whatsappBotDays?: number; featuredDays?: number; durationLabel?: string; smsAmount?: number; whatsappAmount?: number; pushAmount?: number; emailAmount?: number }; }
interface Credits { sms: number; whatsapp: number; push: number; email: number; }
interface WaBotInfo { active: boolean; until?: string; status: string; }

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  PENDING: { label: "Bekliyor", bg: "bg-amber-50", color: "text-amber-700" },
  APPROVED: { label: "Onaylandı", bg: "bg-emerald-50", color: "text-emerald-700" },
  REJECTED: { label: "Reddedildi", bg: "bg-red-50", color: "text-red-700" },
};
const TYPE_ICONS: Record<string, string> = { QUOTA: "📨", FEATURED: "⭐", WA_BOT: "🤖", FULL_LICENSE: "👑", COMBO: "🔥" };

export default function MarketPage() {
  const [packages, setPackages] = useState<STKPackage[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [credits, setCredits] = useState<Credits>({ sms: 0, whatsapp: 0, push: 0, email: 0 });
  const [featured, setFeatured] = useState<{ active: boolean; until?: string }>({ active: false });
  const [waBot, setWaBot] = useState<WaBotInfo>({ active: false, status: "INACTIVE" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [buyModal, setBuyModal] = useState<STKPackage | null>(null);
  const [receiptNo, setReceiptNo] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptFileUrl, setReceiptFileUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [bank, setBank] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/stk-panel/market");
      const json = await res.json();
      if (json.success) {
        setCredits(json.credits);
        setFeatured(json.featured);
        if (json.waBot) setWaBot(json.waBot);
        setPackages(json.packages);
        setRequests(json.requests);
        if (json.bank) setBank(json.bank);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string, type: "success" | "error") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 4000); };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/stk-panel/market/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) { setReceiptFileUrl(json.url); setReceiptFile(file); showToast("✅ Dekont yüklendi!", "success"); }
      else showToast(json.error || "Yükleme hatası", "error");
    } catch { showToast("Dosya yükleme hatası", "error"); }
    setUploading(false);
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyModal || !receiptNo.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/stk-panel/market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: buyModal.id, receiptNo: receiptNo.trim(), receiptFileUrl: receiptFileUrl || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "✅ Talebiniz oluşturuldu!", "success");
        setBuyModal(null); setReceiptNo(""); setReceiptFile(null); setReceiptFileUrl(""); load();
      } else showToast(json.error || "Hata oluştu", "error");
    } catch { showToast("Sunucu hatası", "error"); }
    setSaving(false);
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("tr-TR");

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (<div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white animate-slide-in ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-red-500 to-rose-500"}`}>{toast.message}</div>)}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">🏪 Premium Market</h1>
        <p className="text-sm text-gray-500 mt-1">Bildirim kotanızı artırın ve uygulamada öne çıkın</p>
      </div>

      {/* Mevcut Krediler */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { key: "sms" as const, label: "SMS", icon: "💬", gradient: "from-emerald-500 to-teal-500" },
          { key: "push" as const, label: "Push", icon: "📱", gradient: "from-blue-500 to-indigo-500" },
          { key: "whatsapp" as const, label: "WhatsApp", icon: "📲", gradient: "from-green-500 to-emerald-600" },
          { key: "email" as const, label: "E-posta", icon: "✉️", gradient: "from-violet-500 to-purple-500" },
        ].map(c => (
          <div key={c.key} className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-4 shadow-sm group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-[2rem] bg-gradient-to-br ${c.gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
            <div className="relative">
              <span className="text-xl">{c.icon}</span>
              <p className="text-2xl font-extrabold text-gray-900 mt-1">{credits[c.key].toLocaleString("tr-TR")}</p>
              <p className="text-[10px] text-gray-500">{c.label} Kredisi</p>
            </div>
          </div>
        ))}
        <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-4 shadow-sm group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-[2rem] bg-gradient-to-br from-amber-400 to-orange-500 opacity-10 group-hover:opacity-20 transition-opacity" />
          <div className="relative">
            <span className="text-xl">⭐</span>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{featured.active ? "Aktif" : "—"}</p>
            <p className="text-[10px] text-gray-500">{featured.until && new Date(featured.until) > new Date() ? `✅ ${Math.ceil((new Date(featured.until).getTime() - Date.now()) / 86400000)} gün` : "Öne Çıkarma"}</p>
          </div>
        </div>
        <div className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${waBot.active ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'}`}>
          <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-[2rem] bg-gradient-to-br from-emerald-400 to-teal-500 opacity-10 group-hover:opacity-20 transition-opacity" />
          <div className="relative">
            <span className="text-xl">🤖</span>
            <p className={`text-lg font-extrabold mt-1 ${waBot.active ? 'text-emerald-700' : 'text-gray-400'}`}>{waBot.active ? (waBot.status === 'CONNECTED' ? '🟢 Bağlı' : '🟡 Bekliyor') : '🔒 Kilitli'}</p>
            <p className="text-[10px] text-gray-500">{waBot.active && waBot.until && new Date(waBot.until) > new Date() ? `⏳ ${Math.ceil((new Date(waBot.until).getTime() - Date.now()) / 86400000)} gün kaldı` : 'WA Bot'}</p>
          </div>
        </div>
      </div>

      {/* Paketler */}
      <div className="space-y-6">
        {packages.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 p-12 text-center"><p className="text-3xl mb-2">📦</p><p className="text-sm text-gray-400">Şu an aktif paket bulunmuyor</p></div>
        ) : (
          <>
            {/* 🏆 Süper Lisans Paketleri */}
            {packages.filter(p => p.type === "FULL_LICENSE").length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">🏆 Süper STK Lisansı</h2>
                <div className="grid grid-cols-1 gap-4">
                  {packages.filter(p => p.type === "FULL_LICENSE").map(pkg => (
                    <div key={pkg.id} className="relative rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}>
                      <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
                      <div className="absolute top-0 right-0 w-48 h-48 rounded-bl-full bg-gradient-to-bl from-amber-400/10 to-transparent" />
                      <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-4xl">👑</span>
                            <span className="px-3 py-1 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-900 rounded-full text-xs font-bold uppercase tracking-wider">Full Lisans</span>
                          </div>
                          <h3 className="text-2xl font-bold text-white">{pkg.name}</h3>
                          {pkg.description && <p className="text-sm text-white/60 mt-2">{pkg.description}</p>}
                          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 text-amber-300/80"><span>🤖</span><span>Özel WhatsApp Bot</span></div>
                            <div className="flex items-center gap-2 text-amber-300/80"><span>⭐</span><span>1 Yıl Öne Çıkarma</span></div>
                            {pkg.smsAmount > 0 && <div className="flex items-center gap-2 text-white/70"><span>💬</span><span>{pkg.smsAmount.toLocaleString()} SMS</span></div>}
                            {pkg.pushAmount > 0 && <div className="flex items-center gap-2 text-white/70"><span>📱</span><span>{pkg.pushAmount.toLocaleString()} Push</span></div>}
                            {pkg.whatsappAmount > 0 && <div className="flex items-center gap-2 text-white/70"><span>📲</span><span>{pkg.whatsappAmount.toLocaleString()} WA</span></div>}
                            {pkg.emailAmount > 0 && <div className="flex items-center gap-2 text-white/70"><span>✉️</span><span>{pkg.emailAmount.toLocaleString()} E-posta</span></div>}
                            {pkg.whatsappBotDays > 0 && <div className="flex items-center gap-2 text-amber-300"><span>⏳</span><span>{pkg.whatsappBotDays} gün WA Bot</span></div>}
                            {pkg.durationLabel && <div className="flex items-center gap-2 text-amber-200 font-bold"><span>📅</span><span>{pkg.durationLabel}</span></div>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          <p className="text-4xl font-extrabold bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent">{pkg.price.toLocaleString("tr-TR")} ₺</p>
                          <button onClick={() => { setBuyModal(pkg); setReceiptNo(""); setReceiptFile(null); setReceiptFileUrl(""); }} className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-900 text-sm font-bold shadow-lg shadow-amber-500/30 hover:shadow-xl hover:from-amber-300 hover:to-yellow-200 transition-all active:scale-95">
                            👑 Satın Al
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 🤖 WhatsApp Bot Paketi */}
            {packages.filter(p => p.type === "WA_BOT").length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">🤖 WhatsApp Bot</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {packages.filter(p => p.type === "WA_BOT").map(pkg => (
                    <div key={pkg.id} className="relative rounded-2xl bg-white border-2 border-emerald-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                      <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-2xl">🤖</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700">Bot Paketi</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                        {pkg.description && <p className="text-xs text-gray-400 mt-1">{pkg.description}</p>}
                        <div className="mt-4 space-y-1.5 text-sm text-gray-600">
                          <div className="flex items-center gap-2"><span>🔓</span><span>Özel WhatsApp Bot Kilidi Açılır</span></div>
                          <div className="flex items-center gap-2"><span>📱</span><span>QR Kod ile Bağlantı</span></div>
                          <div className="flex items-center gap-2"><span>💬</span><span>7/24 Otomatik Yanıt</span></div>
                          {(pkg as STKPackage).whatsappBotDays > 0 && <div className="flex items-center gap-2 font-semibold text-emerald-700"><span>⏳</span><span>{(pkg as STKPackage).whatsappBotDays} gün süreli</span></div>}
                          {(pkg as STKPackage).durationLabel && <div className="flex items-center gap-2 font-bold text-emerald-800"><span>📅</span><span>{(pkg as STKPackage).durationLabel}</span></div>}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-end justify-between">
                          <p className="text-3xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{pkg.price.toLocaleString("tr-TR")} ₺</p>
                          <button onClick={() => { setBuyModal(pkg); setReceiptNo(""); setReceiptFile(null); setReceiptFileUrl(""); }} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-200/50 hover:shadow-xl transition-all active:scale-95">
                            Satın Al
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 📦 Kota & Diğer Paketler */}
            {packages.filter(p => !["FULL_LICENSE", "WA_BOT"].includes(p.type)).length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">📦 Kota & Görünürlük Paketleri</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {packages.filter(p => !["FULL_LICENSE", "WA_BOT"].includes(p.type)).map(pkg => (
                    <div key={pkg.id} className="relative rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                      <div className={`h-2 bg-gradient-to-r ${pkg.type === "FEATURED" ? "from-amber-400 to-orange-500" : pkg.type === "COMBO" ? "from-red-500 to-pink-500" : "from-indigo-500 to-violet-500"}`} />
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-2xl">{TYPE_ICONS[pkg.type] || "📦"}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pkg.type === "FEATURED" ? "bg-amber-50 text-amber-700" : pkg.type === "COMBO" ? "bg-red-50 text-red-700" : "bg-indigo-50 text-indigo-700"}`}>
                            {pkg.type === "QUOTA" ? "Kota" : pkg.type === "FEATURED" ? "Öne Çıkarma" : "Kombo"}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                        {pkg.description && <p className="text-xs text-gray-400 mt-1">{pkg.description}</p>}
                        <div className="mt-4 space-y-1.5 text-sm text-gray-600">
                          {pkg.smsAmount > 0 && <div className="flex items-center gap-2"><span>💬</span><span>{pkg.smsAmount.toLocaleString()} SMS</span></div>}
                          {pkg.whatsappAmount > 0 && <div className="flex items-center gap-2"><span>📲</span><span>{pkg.whatsappAmount.toLocaleString()} WhatsApp</span></div>}
                          {pkg.pushAmount > 0 && <div className="flex items-center gap-2"><span>📱</span><span>{pkg.pushAmount.toLocaleString()} Push</span></div>}
                          {pkg.emailAmount > 0 && <div className="flex items-center gap-2"><span>✉️</span><span>{pkg.emailAmount.toLocaleString()} E-posta</span></div>}
                          {pkg.featuredDays > 0 && <div className="flex items-center gap-2"><span>⭐</span><span>{pkg.featuredDays} gün öne çıkarma</span></div>}
                          {pkg.whatsappBotDays > 0 && <div className="flex items-center gap-2 font-semibold text-emerald-700"><span>🤖</span><span>{pkg.whatsappBotDays} gün WhatsApp Bot</span></div>}
                          {pkg.durationLabel && <div className="flex items-center gap-2 font-bold text-indigo-700"><span>📅</span><span>{pkg.durationLabel}</span></div>}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-end justify-between">
                          <p className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">{pkg.price.toLocaleString("tr-TR")} ₺</p>
                          <button onClick={() => { setBuyModal(pkg); setReceiptNo(""); setReceiptFile(null); setReceiptFileUrl(""); }} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:from-indigo-700 hover:to-violet-700 transition-all active:scale-95">
                            Satın Al
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Satın Alma Geçmişi */}
      {requests.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">📋 Satın Alma Geçmişi ({requests.length})</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50/80"><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tarih</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Paket</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">İçerik</th><th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tutar</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Dekont No</th><th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Durum</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map(r => {
                  const st = STATUS[r.status] || STATUS.PENDING;
                  const p = r.package;
                  return (
                    <tr key={r.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-6 py-3 text-sm text-gray-500">{fmtDate(r.createdAt)}</td>
                      <td className="px-6 py-3"><span className="text-sm font-medium text-gray-900">{TYPE_ICONS[p.type] || '📦'} {p.name}</span>{p.durationLabel && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-medium">{p.durationLabel}</span>}</td>
                      <td className="px-6 py-3 text-xs text-gray-500 space-x-1">{[p.smsAmount && `💬${p.smsAmount}`, p.whatsappAmount && `📲${p.whatsappAmount}`, p.pushAmount && `📱${p.pushAmount}`, p.emailAmount && `✉️${p.emailAmount}`, p.featuredDays && `⭐${p.featuredDays}g`, p.whatsappBotDays && `🤖${p.whatsappBotDays}g`].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">{r.amount.toLocaleString("tr-TR")} ₺</td>
                      <td className="px-6 py-3 text-sm font-mono text-gray-600">{r.receiptNo}</td>
                      <td className="px-6 py-3 text-center"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${st.bg} ${st.color}`}>{st.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Satın Alma Modal */}
      {buyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setBuyModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">💳 Satın Al</h3>
                <button onClick={() => setBuyModal(null)} className="text-white/70 hover:text-white text-2xl">×</button>
              </div>
              <p className="text-indigo-100 text-sm mt-1">{buyModal.name} — {buyModal.price.toLocaleString("tr-TR")} ₺</p>
            </div>
            <form onSubmit={handlePurchase} className="p-6 space-y-5">
              {/* Paket İçeriği */}
              <div className="bg-indigo-50 rounded-xl p-4 space-y-1 text-sm">
                <p className="text-xs font-bold text-indigo-600 uppercase mb-2">📦 Paket İçeriği</p>
                {buyModal.smsAmount > 0 && <p>💬 {buyModal.smsAmount.toLocaleString()} SMS</p>}
                {buyModal.whatsappAmount > 0 && <p>📲 {buyModal.whatsappAmount.toLocaleString()} WhatsApp</p>}
                {buyModal.pushAmount > 0 && <p>📱 {buyModal.pushAmount.toLocaleString()} Push</p>}
                {buyModal.emailAmount > 0 && <p>✉️ {buyModal.emailAmount.toLocaleString()} E-posta</p>}
                {buyModal.featuredDays > 0 && <p>⭐ {buyModal.featuredDays} gün öne çıkarma</p>}
                {buyModal.whatsappBotDays > 0 && <p>🤖 {buyModal.whatsappBotDays} gün WhatsApp Bot</p>}
                {buyModal.durationLabel && <p className="font-semibold text-indigo-700">📅 Süre: {buyModal.durationLabel}</p>}
              </div>
              {/* Banka Bilgileri */}
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-600 uppercase mb-2">🏦 Banka Bilgileri</p>
                <div className="space-y-1 text-sm text-gray-700">
                  <p><span className="font-medium">Banka:</span> {bank.bankName || "Belirtilmemiş"}</p>
                  <p><span className="font-medium">IBAN:</span> <span className="font-mono text-xs select-all">{bank.bankIban || "Belirtilmemiş"}</span></p>
                  <p><span className="font-medium">Hesap Sahibi:</span> {bank.bankAccountHolder || "Belirtilmemiş"}</p>
                  {bank.paymentDescription && <p className="text-xs text-amber-600 mt-2">⚠️ {bank.paymentDescription}</p>}
                </div>
              </div>
              {/* Dekont No */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Dekont / İşlem Numarası *</label>
                <input required value={receiptNo} onChange={e => setReceiptNo(e.target.value)} placeholder="Örn: 123456789" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono" />
              </div>
              {/* Dekont Yükleme */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">📄 Dekont Yükle (JPG, PNG, PDF — maks 25MB)</label>
                <div className="relative">
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" disabled={uploading} />
                  {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl"><span className="text-sm text-indigo-600 animate-pulse">⏳ Yükleniyor...</span></div>}
                </div>
                {receiptFile && <p className="text-xs text-green-600 mt-1">✅ {receiptFile.name} yüklendi</p>}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setBuyModal(null)} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-semibold shadow-lg disabled:opacity-50 hover:from-indigo-700 hover:to-violet-700 transition-all">
                  {saving ? "Gönderiliyor..." : "🚀 Onaya Gönder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`@keyframes fade-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes slide-in{from{opacity:0;transform:translateX(100px)}to{opacity:1;transform:translateX(0)}}.animate-fade-in{animation:fade-in .5s ease-out}.animate-slide-in{animation:slide-in .4s ease-out}`}</style>
    </div>
  );
}
