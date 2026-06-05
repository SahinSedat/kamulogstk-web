"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface FAQ { id: string; question: string; answer: string; createdAt: string; }
interface BotLog { id: string; action: string; details: string; createdAt: string; }
interface BotDoc { id: string; title: string; description: string; fileName: string; fileUrl: string; fileSize: number; createdAt: string; }
interface TelemetryStats { contractCount: number; receiptCount: number; totalLogCount: number; faqCount: number; remainingCredits: number; }

export default function WABotPage() {
  const [loading, setLoading] = useState(true);
  const [hasBot, setHasBot] = useState(false);
  const [botStatus, setBotStatus] = useState("INACTIVE");
  const [botPhone, setBotPhone] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [autoReply, setAutoReply] = useState("");
  const [stkName, setStkName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // SSS State
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [faqQ, setFaqQ] = useState("");
  const [faqA, setFaqA] = useState("");
  const [faqSaving, setFaqSaving] = useState(false);

  // Telemetry State
  const [telemetryStats, setTelemetryStats] = useState<TelemetryStats | null>(null);
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);

  // Contact + Documents State
  const [contactPhone, setContactPhone] = useState("");
  const [docs, setDocs] = useState<BotDoc[]>([]);
  const [docTitle, setDocTitle] = useState("");
  const [docDesc, setDocDesc] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);

  const fetchStatus = async () => {
    try {
      const r = await fetch("/api/stk-panel/wa-bot");
      const d = await r.json();
      if (d.success) {
        setHasBot(d.data.hasCustomWaBot);
        setBotStatus(d.data.waBotStatus);
        setBotPhone(d.data.waBotPhone);
        setQrCode(d.data.waBotQrCode);
        setAutoReply(d.data.waBotAutoReply || "");
        setContactPhone(d.data.botContactPhone || "");
        setStkName(d.data.stkName);
      }
    } catch {}
  };

  const fetchFaqs = async () => {
    try {
      const r = await fetch("/api/stk-panel/faqs");
      const d = await r.json();
      if (d.success) setFaqs(d.data);
    } catch {}
  };

  useEffect(() => {
    fetchStatus().finally(() => setLoading(false));
    fetchFaqs();
    fetchTelemetry();
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try { const r = await fetch("/api/stk-panel/wa-bot/documents"); const d = await r.json(); if (d.success) setDocs(d.data); } catch {}
  };

  const handleSaveContact = async () => {
    setSaving(true); setSaved(false);
    try { const r = await fetch("/api/stk-panel/wa-bot", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ botContactPhone: contactPhone }) }); const d = await r.json(); if (d.success) setSaved(true); } catch {}
    setSaving(false); setTimeout(() => setSaved(false), 3000);
  };

  const handleUploadDoc = async () => {
    if (!docTitle.trim() || !docDesc.trim() || !docFile) return;
    setDocUploading(true);
    try {
      const fd = new FormData(); fd.append("title", docTitle); fd.append("description", docDesc); fd.append("file", docFile);
      const r = await fetch("/api/stk-panel/wa-bot/documents", { method: "POST", body: fd });
      const d = await r.json();
      if (d.success) { setDocs(prev => [d.data, ...prev]); setDocTitle(""); setDocDesc(""); setDocFile(null); }
    } catch {}
    setDocUploading(false);
  };

  const handleDeleteDoc = async (id: string) => {
    try { await fetch(`/api/stk-panel/wa-bot/documents?id=${id}`, { method: "DELETE" }); setDocs(prev => prev.filter(d => d.id !== id)); } catch {}
  };

  const fetchTelemetry = async () => {
    try {
      const r = await fetch("/api/stk-panel/wa-bot/telemetry");
      const d = await r.json();
      if (d.success) { setTelemetryStats(d.data.stats); setBotLogs(d.data.logs); }
    } catch {}
  };

  useEffect(() => {
    if (hasBot && (botStatus === "PENDING_QR" || (botStatus === "CONNECTED" && !botPhone))) {
      pollRef.current = setInterval(fetchStatus, 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [hasBot, botStatus, botPhone]);

  const handleSaveAutoReply = async () => {
    setSaving(true); setSaved(false);
    try {
      const r = await fetch("/api/stk-panel/wa-bot", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ waBotAutoReply: autoReply }) });
      const d = await r.json();
      if (d.success) setSaved(true);
    } catch {}
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleAddFaq = async () => {
    if (!faqQ.trim() || !faqA.trim()) return;
    setFaqSaving(true);
    try {
      const r = await fetch("/api/stk-panel/faqs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: faqQ, answer: faqA }) });
      const d = await r.json();
      if (d.success) { setFaqs(prev => [d.data, ...prev]); setFaqQ(""); setFaqA(""); }
    } catch {}
    setFaqSaving(false);
  };

  const handleDeleteFaq = async (id: string) => {
    try { await fetch(`/api/stk-panel/faqs?id=${id}`, { method: "DELETE" }); setFaqs(prev => prev.filter(f => f.id !== id)); } catch {}
  };

  if (loading) return <div className="flex items-center justify-center py-32"><div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" /></div>;

  if (!hasBot) {
    return (
      <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 opacity-90" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px]" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <div className="w-[600px] space-y-4 opacity-20 blur-sm">
            <div className="bg-white/20 rounded-2xl h-16 w-full" />
            <div className="bg-white/15 rounded-2xl h-64 w-full flex items-center justify-center"><div className="w-48 h-48 border-4 border-dashed border-white/30 rounded-2xl" /></div>
          </div>
        </div>
        <div className="relative z-10 max-w-md w-full mx-4">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500" />
            <div className="p-8 text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl rotate-12 opacity-20 animate-pulse" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center border border-white/10 shadow-xl"><span className="text-5xl">🔒</span></div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Premium Özellik</h2>
              <p className="text-white/60 text-sm leading-relaxed mb-6"><strong className="text-amber-400">Özel WhatsApp Bot</strong> ile üyelerinize 7/24 otomatik yanıt verin!</p>
              <div className="space-y-3 mb-8 text-left">
                {[{ icon: "🤖", text: "Kendi numaranızdan otomatik yanıt" },{ icon: "📱", text: "QR kod ile anında bağlantı" },{ icon: "💬", text: "Üyelere hoş geldin mesajları" },{ icon: "📊", text: "Mesaj istatistikleri ve raporlar" },{ icon: "🔐", text: "Uçtan uca şifreleme ile güvenlik" }].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5 border border-white/5"><span className="text-lg">{f.icon}</span><span className="text-white/80 text-sm">{f.text}</span></div>
                ))}
              </div>
              <Link href="/stk-panel/market" className="block w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-[1.02] transition-all active:scale-95">🛒 Markete Git — Kilidi Aç</Link>
              <p className="text-white/30 text-xs mt-4">WhatsApp Bot Paketi veya Süper STK Lisansı ile açılır</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo: Record<string, { label: string; color: string; bg: string; icon: string; pulse?: boolean }> = {
    INACTIVE: { label: "Pasif", color: "text-gray-500", bg: "bg-gray-100", icon: "⚪" },
    PENDING_QR: { label: "QR Kod Bekleniyor", color: "text-amber-600", bg: "bg-amber-50", icon: "📱", pulse: true },
    CONNECTED: { label: "Bağlı & Aktif", color: "text-emerald-600", bg: "bg-emerald-50", icon: "✅" },
    DISCONNECTED: { label: "Bağlantı Koptu", color: "text-red-600", bg: "bg-red-50", icon: "❌" },
  };
  const si = statusInfo[botStatus] || statusInfo.INACTIVE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200/50"><span className="text-2xl">🤖</span></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">WhatsApp Bot</h1>
            <p className="text-sm text-gray-500">{stkName}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${si.bg} ${si.color} ${si.pulse ? "animate-pulse" : ""}`}>{si.icon} {si.label}</span>
      </div>

      {/* QR KOD */}
      {botStatus === "PENDING_QR" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500" />
          <div className="p-8 text-center">
            {qrCode ? (<>
              <div className="inline-block p-4 bg-white rounded-2xl shadow-xl border-2 border-amber-100 mb-6"><img src={qrCode} alt="QR" className="w-64 h-64 mx-auto" /></div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">QR Kodu Okutun</h2>
              <p className="text-sm text-gray-500 max-w-md mx-auto">📲 <strong>WhatsApp</strong> → <strong>Ayarlar</strong> → <strong>Bağlı Cihazlar</strong> → <strong>Cihaz Bağla</strong></p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-amber-600 bg-amber-50 px-4 py-2 rounded-full w-fit mx-auto"><span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" /><span>QR otomatik yenileniyor</span></div>
            </>) : (
              <div className="space-y-4">
                <div className="w-48 h-48 mx-auto border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center bg-gray-50/50"><div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" /></div>
                <h2 className="text-xl font-bold text-gray-900">Bot Motoru Hazırlanıyor</h2>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BAĞLI DURUM */}
      {botStatus === "CONNECTED" && (<>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100"><span className="text-4xl">✅</span></div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Bot Aktif ve Bağlı!</h2>
            <p className="text-sm text-gray-500">Numara: <strong className="font-mono text-gray-900 text-base">{botPhone || "—"}</strong></p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center"><span className="text-lg">💬</span></div>
            <div><h3 className="font-bold text-gray-900 text-sm">Otomatik Yanıt Mesajı</h3><p className="text-xs text-gray-400">Bot tanınmayan komutlara bu mesajla yanıt verir</p></div>
          </div>
          <div className="p-6 space-y-4">
            <textarea value={autoReply} onChange={e => setAutoReply(e.target.value)} rows={5} placeholder={`Merhaba! 👋 ${stkName} sanal asistanına hoş geldiniz.`} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{autoReply ? `${autoReply.length} karakter` : "Boş bırakılırsa varsayılan mesaj kullanılır"}</p>
              <div className="flex items-center gap-3">
                {saved && <span className="text-xs text-emerald-600 font-medium">✅ Kaydedildi!</span>}
                <button onClick={handleSaveAutoReply} disabled={saving} className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-200/50 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50">{saving ? "Kaydediliyor..." : "💾 Kaydet"}</button>
              </div>
            </div>
          </div>
        </div>

        {/* Temsilci Telefon */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center"><span className="text-lg">📞</span></div>
            <div><h3 className="font-bold text-gray-900 text-sm">Canlı Destek / Temsilci Telefonu</h3><p className="text-xs text-gray-400">Bot &quot;temsilci&quot; isteyenleri bu numaraya yönlendirir</p></div>
          </div>
          <div className="p-6 flex items-center gap-3">
            <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="905XXXXXXXXX" className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition font-mono" />
            <button onClick={handleSaveContact} disabled={saving} className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50">{saving ? "..." : "💾"}</button>
          </div>
        </div>
      </>)}

      {botStatus === "DISCONNECTED" && (
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-500 to-orange-500" />
          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center"><span className="text-4xl">❌</span></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Bağlantı Koptu</h2>
            <p className="text-sm text-gray-500">Bot bağlantısı kesildi. Sistem otomatik olarak yeniden bağlanmayı deneyecektir.</p>
          </div>
        </div>
      )}

      {botStatus === "INACTIVE" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-gray-300 to-gray-400" />
          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center"><span className="text-4xl">⏳</span></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Bot Aktifleştiriliyor</h2>
            <p className="text-sm text-gray-500">Satın alma talebiniz onaylandı. Bot motoru birkaç dakika içinde QR kodu üretecektir.</p>
          </div>
        </div>
      )}

      {/* Özellikler */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: "💬", title: "Otomatik Yanıt", desc: "Üyelerinizin mesajlarına 7/24 otomatik cevap", gradient: "from-blue-500 to-indigo-500" },
          { icon: "📢", title: "Toplu Mesaj", desc: "Tüm üyelerinize tek tıkla bildirim gönderin", gradient: "from-emerald-500 to-teal-500" },
          { icon: "📊", title: "İstatistikler", desc: "Gönderilen ve okunan mesaj raporları", gradient: "from-purple-500 to-pink-500" },
        ].map((f, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}><span className="text-lg">{f.icon}</span></div>
            <h3 className="font-bold text-gray-900 text-sm">{f.title}</h3>
            <p className="text-xs text-gray-500 mt-1">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* ═══ 🧠 BOT BEYNİ — SSS ═══ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg"><span className="text-xl">🧠</span></div>
          <div>
            <h2 className="font-bold text-gray-900">Bot Hafıza ve Bilgi Bankası (SSS)</h2>
            <p className="text-xs text-gray-500">Bota soru-cevap öğretin, üyelerinize otomatik yanıt versin</p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">📝 Yeni Soru Ekle</h3>
              <input type="text" value={faqQ} onChange={e => setFaqQ(e.target.value)} placeholder="Soru: Aidat nasıl ödenir?" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition" />
              <textarea value={faqA} onChange={e => setFaqA(e.target.value)} rows={4} placeholder="Cevap: IBAN numaramıza havale yaparak aidatınızı ödeyebilirsiniz..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none transition" />
              <button onClick={handleAddFaq} disabled={faqSaving || !faqQ.trim() || !faqA.trim()} className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-200/50 hover:shadow-xl hover:from-violet-700 hover:to-purple-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {faqSaving ? "Ekleniyor..." : "🧠 Bota Öğret"}
              </button>
            </div>
            {/* Liste */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">📚 Öğretilmiş Sorular ({faqs.length})</h3>
              {faqs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <span className="text-4xl block mb-3">🤔</span>
                  <p className="text-sm text-gray-400">Henüz SSS eklenmedi. Bota ilk soruyu öğretin!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {faqs.map(f => (
                    <div key={f.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-violet-200 transition group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">❓ {f.question}</p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">💬 {f.answer}</p>
                        </div>
                        <button onClick={() => handleDeleteFaq(f.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-700 shrink-0" title="Sil">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 📁 BOT DOSYA VE DOKÜMAN HAVUZU ═══ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg"><span className="text-xl">📁</span></div>
          <div>
            <h2 className="font-bold text-gray-900">Bot Dosya ve Doküman Havuzu</h2>
            <p className="text-xs text-gray-500">Tüzük, kılavuz, form gibi dosyalar yükleyin. Bot, üyelere WhatsApp&apos;tan göndersin (max 200MB)</p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Form */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-700">📤 Yeni Dosya Yükle</h3>
              <input type="text" value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="Başlık: Dernek Tüzüğü" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition" />
              <textarea value={docDesc} onChange={e => setDocDesc(e.target.value)} rows={3} placeholder="Açıklama: 2024 yılı güncellenmiş dernek tüzüğü..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none transition" />
              <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-amber-400 transition bg-gray-50">
                <span className="text-2xl">📎</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{docFile ? docFile.name : "Dosya seç (PDF, DOC, resim, video...)"}</p>
                  <p className="text-xs text-gray-400">{docFile ? `${(docFile.size / 1024 / 1024).toFixed(1)} MB` : "Maksimum 200MB"}</p>
                </div>
                <input type="file" className="hidden" onChange={e => setDocFile(e.target.files?.[0] || null)} />
              </label>
              <button onClick={handleUploadDoc} disabled={docUploading || !docTitle.trim() || !docDesc.trim() || !docFile} className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-200/50 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {docUploading ? "Yükleniyor..." : "📁 Dosyayı Yükle & Bota Tanıt"}
              </button>
            </div>
            {/* Liste */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-700">📚 Yüklü Dosyalar ({docs.length})</h3>
              {docs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <span className="text-4xl block mb-3">📂</span>
                  <p className="text-sm text-gray-400">Henüz dosya yüklenmedi</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {docs.map(d => (
                    <div key={d.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-amber-200 transition group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">📄 {d.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{d.fileName} • {(d.fileSize / 1024 / 1024).toFixed(1)} MB</p>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{d.description}</p>
                        </div>
                        <button onClick={() => handleDeleteDoc(d.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-700 shrink-0" title="Sil">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 📊 TELEMETRİ & ANALİTİK KOKPİTİ ═══ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg"><span className="text-xl">📊</span></div>
            <div>
              <h2 className="font-bold text-gray-900">Bot Telemetri & Analitik Kokpiti</h2>
              <p className="text-xs text-gray-500">Son 30 gün • Canlı bot hareketleri</p>
            </div>
          </div>
          <button onClick={fetchTelemetry} className="px-3 py-1.5 text-xs font-medium text-cyan-700 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition">🔄 Yenile</button>
        </div>

        {/* Stat Kartları */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { icon: "💳", label: "Kalan Kredi", value: telemetryStats?.remainingCredits ?? 0, color: (telemetryStats?.remainingCredits ?? 0) > 10 ? "from-emerald-500 to-green-500" : "from-red-500 to-rose-500", link: "/stk-panel/market" },
            { icon: "🤖", label: "Toplam Bot İşlemi", value: telemetryStats?.totalLogCount ?? 0, color: "from-blue-500 to-indigo-500" },
            { icon: "📄", label: "Yakalanan Sözleşme", value: telemetryStats?.contractCount ?? 0, color: "from-emerald-500 to-teal-500" },
            { icon: "💸", label: "Yakalanan Dekont", value: telemetryStats?.receiptCount ?? 0, color: "from-amber-500 to-orange-500" },
            { icon: "📚", label: "SSS Yanıtları", value: telemetryStats?.faqCount ?? 0, color: "from-violet-500 to-purple-500" },
          ].map((s, i) => {
            const card = (
              <div key={i} className={`bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 p-4 text-center hover:shadow-md transition ${s.link ? "cursor-pointer hover:border-emerald-300 hover:-translate-y-0.5" : ""}`}>
                <div className={`w-10 h-10 mx-auto rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg mb-2`}><span className="text-lg">{s.icon}</span></div>
                <p className="text-2xl font-bold text-gray-900">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                {s.link && <p className="text-[10px] text-emerald-600 mt-1 font-medium">🛒 Kredi Al →</p>}
              </div>
            );
            return s.link ? <Link key={i} href={s.link}>{card}</Link> : card;
          })}
        </div>

        {/* Terminal Log Ekranı */}
        <div className="px-6 pb-6">
          <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border-b border-gray-800">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <span className="text-xs text-gray-500 font-mono ml-2">wa-bot-motor — live telemetry</span>
            </div>
            <div className="p-4 max-h-[350px] overflow-y-auto font-mono text-xs space-y-1 scrollbar-thin">
              {botLogs.length === 0 ? (
                <p className="text-gray-600">Henüz log bulunmuyor. Bot çalışmaya başladığında hareketler burada görünecek...</p>
              ) : (
                botLogs.map(log => {
                  const d = new Date(log.createdAt);
                  const time = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                  const date = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
                  const actionColors: Record<string, string> = {
                    CONTRACT_RECEIVED: "text-emerald-400",
                    RECEIPT_RECEIVED: "text-amber-400",
                    FAQ_ANSWERED: "text-violet-400",
                    MANAGER_REPORT: "text-cyan-400",
                  };
                  const actionIcons: Record<string, string> = {
                    CONTRACT_RECEIVED: "📄",
                    RECEIPT_RECEIVED: "💸",
                    FAQ_ANSWERED: "📚",
                    MANAGER_REPORT: "👑",
                  };
                  return (
                    <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-gray-600 shrink-0">[{date} {time}]</span>
                      <span className="shrink-0">{actionIcons[log.action] || "🟢"}</span>
                      <span className={`font-semibold shrink-0 ${actionColors[log.action] || "text-green-400"}`}>{log.action}:</span>
                      <span className="text-gray-300">{log.details}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
