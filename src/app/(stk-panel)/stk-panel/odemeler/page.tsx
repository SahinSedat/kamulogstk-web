"use client";
import { useState, useEffect, useCallback } from "react";

interface Payment { id: string; amount: number; paymentType: string; paymentDate: string; receiptUrl?: string; note?: string; status: string; reviewedAt?: string; createdAt: string; application: { id: string; name: string; email: string; phone: string; tcKimlik: string; membershipStatus: string; expiryDate?: string; stk: { id: string; name: string; slug: string }; }; }

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  PENDING: { label: "Bekliyor", bg: "bg-amber-50", color: "text-amber-700" },
  APPROVED: { label: "Onaylandı", bg: "bg-emerald-50", color: "text-emerald-700" },
  REJECTED: { label: "Reddedildi", bg: "bg-red-50", color: "text-red-700" },
};
const TYPE_LABELS: Record<string, string> = { MONTHLY: "Aylık Aidat", ANNUAL: "Yıllık Aidat", DONATION: "Bağış" };

export default function OdemelerPage() {
  const [stkId, setStkId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [paySearch, setPaySearch] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [detailPay, setDetailPay] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Manuel Ödeme Modal
  const [showManual, setShowManual] = useState(false);
  const [manMembers, setManMembers] = useState<{id: string; name: string; surname: string}[]>([]);
  const [manSearch, setManSearch] = useState("");
  const [manMemberId, setManMemberId] = useState("");
  const [manMemberLabel, setManMemberLabel] = useState("");
  const [manType, setManType] = useState("MONTHLY_DUES");
  const [manAmount, setManAmount] = useState("");
  const [manDate, setManDate] = useState(new Date().toISOString().split("T")[0]);
  const [manDesc, setManDesc] = useState("");
  const [manSaving, setManSaving] = useState(false);
  const [manDropdown, setManDropdown] = useState(false);

  useEffect(() => { fetch("/api/stk-panel/profile").then(r => r.json()).then(d => { if (d.success && d.data?.id) setStkId(d.data.id); }).catch(() => {}); }, []);

  const fetchPayments = useCallback(async () => {
    if (!stkId) return;
    try {
      const params = new URLSearchParams({ stkId });
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/admin/stk/payments?${params}`);
      const json = await res.json(); if (json.success) setPayments(json.data);
    } catch {} finally { setLoading(false); }
  }, [stkId, filterStatus]);
  useEffect(() => { if (stkId) fetchPayments(); }, [stkId, fetchPayments]);

  const showToast = (msg: string, type: "success" | "error") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleAction = async (id: string, newStatus: string, payment?: Payment) => {
    setUpdating(id);
    try {
      const durationDays = payment && payment.paymentType === "ANNUAL" ? 365 : 30;
      await fetch(`/api/admin/stk/payments?id=${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus, durationDays }) });
      showToast(newStatus === "APPROVED" ? "✅ Ödeme onaylandı" : "Ödeme reddedildi", "success");
      if (newStatus === "APPROVED" && payment) {
        try { await fetch("/api/stk-panel/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "INCOME", category: "DUES", amount: payment.amount, description: `${payment.application.name} - ${TYPE_LABELS[payment.paymentType] || payment.paymentType} ödemesi`, date: payment.paymentDate }) }); } catch {}
      }
      fetchPayments(); setDetailPay(null);
    } catch { showToast("Hata oluştu", "error"); } finally { setUpdating(null); }
  };

  const deletePayment = async (id: string) => {
    if (!confirm("Bu ödeme kaydını silmek istediğinize emin misiniz?")) return;
    setDeleting(id);
    try {
      const r = await fetch(`/api/admin/stk/payments?id=${id}`, { method: "DELETE" });
      const j = await r.json();
      if (j.success) { showToast("🗑 Ödeme silindi", "success"); fetchPayments(); }
      else showToast(j.error || "Hata", "error");
    } catch { showToast("Hata oluştu", "error"); } finally { setDeleting(null); }
  };

  const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " ₺";
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("tr-TR");

  // Üye arama (debounce)
  useEffect(() => {
    if (!manSearch || manSearch.length < 2) { setManMembers([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/stk-panel/members?search=${encodeURIComponent(manSearch)}&limit=10`);
        const d = await r.json();
        if (d.success) setManMembers(d.data?.map((m: { id: string; name: string; surname: string }) => ({ id: m.id, name: m.name, surname: m.surname })) || []);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [manSearch]);

  const handleManualSubmit = async () => {
    if (!manMemberId || !manAmount) return;
    setManSaving(true);
    try {
      const r = await fetch("/api/stk-panel/payments/manual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: manMemberId, paymentType: manType, amount: parseFloat(manAmount), paymentDate: manDate, description: manDesc }) });
      const d = await r.json();
      if (d.success) { showToast("✅ " + d.message, "success"); setShowManual(false); setManMemberId(""); setManMemberLabel(""); setManAmount(""); setManDesc(""); fetchPayments(); }
      else showToast(d.error || "Hata", "error");
    } catch { showToast("Hata oluştu", "error"); }
    setManSaving(false);
  };
  const pending = payments.filter(p => p.status === "PENDING").length;
  const totalApproved = payments.filter(p => p.status === "APPROVED").reduce((s, p) => s + p.amount, 0);
  const filtered = payments.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (paySearch) {
      const q = paySearch.toLowerCase();
      const nameMatch = p.application.name?.toLowerCase().includes(q);
      const phoneMatch = p.application.phone?.includes(q);
      const tcMatch = p.application.tcKimlik?.includes(q);
      const emailMatch = p.application.email?.toLowerCase().includes(q);
      if (!nameMatch && !phoneMatch && !tcMatch && !emailMatch) return false;
    }
    return true;
  });

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (<div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white animate-slide-in ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-red-500 to-rose-500"}`}>{toast.message}</div>)}
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 tracking-tight">💳 Ödeme Bildirimleri</h1><p className="text-sm text-gray-500 mt-1">Üyelerin ödeme dekontlarını inceleyin ve onaylayın</p></div>
        <button onClick={() => setShowManual(true)} className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-200/50 hover:shadow-xl transition-all active:scale-95">➕ Manuel Ödeme Ekle</button>
      </div>

      {/* MANUEL ÖDEME MODAL */}
      {showManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowManual(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">➕ Manuel Ödeme / Tahsilat</h2>
                <button onClick={() => setShowManual(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>

              {/* Üye Arama */}
              <div className="relative">
                <label className="text-sm font-medium text-gray-700 mb-1 block">👤 Üye Seçimi</label>
                {manMemberId ? (
                  <div className="flex items-center justify-between px-4 py-3 border border-emerald-200 rounded-xl bg-emerald-50">
                    <span className="text-sm font-medium text-emerald-800">{manMemberLabel}</span>
                    <button onClick={() => { setManMemberId(""); setManMemberLabel(""); setManSearch(""); }} className="text-xs text-red-500 hover:text-red-700">✕ Değiştir</button>
                  </div>
                ) : (
                  <>
                    <input type="text" value={manSearch} onChange={e => { setManSearch(e.target.value); setManDropdown(true); }} placeholder="Üye ismi yazın..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" />
                    {manDropdown && manMembers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {manMembers.map(m => (
                          <button key={m.id} onClick={() => { setManMemberId(m.id); setManMemberLabel(`${m.name} ${m.surname}`); setManDropdown(false); setManSearch(""); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-emerald-50 transition">{m.name} {m.surname}</button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">📋 Ödeme Türü</label>
                  <select value={manType} onChange={e => setManType(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition">
                    <option value="MONTHLY_DUES">Aylık Aidat</option>
                    <option value="ANNUAL_DUES">Yıllık Aidat</option>
                    <option value="DONATION">Bağış</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">💰 Tutar (₺)</label>
                  <input type="number" value={manAmount} onChange={e => setManAmount(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">📅 Ödeme Tarihi</label>
                <input type="date" value={manDate} onChange={e => setManDate(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">📝 Açıklama (opsiyonel)</label>
                <input type="text" value={manDesc} onChange={e => setManDesc(e.target.value)} placeholder="Elden nakit alındı" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition" />
              </div>

              <button onClick={handleManualSubmit} disabled={manSaving || !manMemberId || !manAmount} className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200/50 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50">
                {manSaving ? "Kaydediliyor..." : "✅ Ödemeyi Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white border border-gray-100 p-4 shadow-sm"><p className="text-2xl font-bold text-gray-900">{payments.length}</p><p className="text-xs text-gray-500">Toplam Ödeme</p></div>
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 shadow-sm cursor-pointer hover:ring-2 hover:ring-amber-200 transition" onClick={() => setFilterStatus(filterStatus === "PENDING" ? "" : "PENDING")}><p className="text-2xl font-bold text-amber-700">{pending}</p><p className="text-xs text-amber-600">Bekleyen</p></div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 shadow-sm"><p className="text-2xl font-bold text-emerald-700">{fmt(totalApproved)}</p><p className="text-xs text-emerald-600">Onaylanan Toplam</p></div>
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 shadow-sm cursor-pointer hover:ring-2 hover:ring-red-200 transition" onClick={() => setFilterStatus(filterStatus === "REJECTED" ? "" : "REJECTED")}><p className="text-2xl font-bold text-red-700">{payments.filter(p => p.status === "REJECTED").length}</p><p className="text-xs text-red-600">Reddedilen</p></div>
      </div>

      {/* Arama */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <input type="text" placeholder="İsim, telefon, TC kimlik veya e-posta ile ara..." value={paySearch} onChange={e => setPaySearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" />
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? <div className="py-16 text-center"><p className="text-3xl mb-2">💳</p><p className="text-sm text-gray-400">Ödeme bildirimi bulunamadı</p></div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50/80"><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Üye</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Tür</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Tutar</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Tarih</th><th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Geçerlilik</th><th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Durum</th><th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">İşlem</th></tr></thead>
          <tbody className="divide-y divide-gray-50">{filtered.map(p => {
            const st = STATUS[p.status] || STATUS.PENDING;
            // Geçerlilik süresi hesapla
            const isDues = p.paymentType.toUpperCase().includes("DUES") || p.paymentType === "MONTHLY" || p.paymentType === "ANNUAL";
            const isAnnual = p.paymentType.toUpperCase().includes("ANNUAL");
            const daysToAdd = isAnnual ? 365 : 30;
            const expiryDate = isDues && p.status === "APPROVED" ? new Date(new Date(p.paymentDate).getTime() + daysToAdd * 86400000) : null;
            const daysRemaining = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / 86400000) : null;
            return (<tr key={p.id} className="hover:bg-indigo-50/30 transition-colors">
              <td className="px-6 py-4"><p className="font-medium text-gray-900">{p.application.name}</p><p className="text-xs text-gray-400">{p.application.phone}</p></td>
              <td className="px-6 py-4 text-sm text-gray-600">{TYPE_LABELS[p.paymentType] || p.paymentType}</td>
              <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{fmt(p.amount)}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{fmtDate(p.paymentDate)}</td>
              <td className="px-6 py-4 text-center">
                {daysRemaining !== null ? (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                    daysRemaining <= 0 ? "bg-red-100 text-red-700" :
                    daysRemaining <= 7 ? "bg-amber-100 text-amber-700" :
                    "bg-emerald-100 text-emerald-700"
                  }`}>
                    {daysRemaining <= 0 ? "❌ Süresi Doldu" : `⏳ ${daysRemaining} Gün`}
                  </span>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </td>
              <td className="px-6 py-4 text-center"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${st.bg} ${st.color}`}>{st.label}</span></td>
              <td className="px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <button onClick={() => setDetailPay(p)} className="px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded text-xs font-medium">👁️ Detay</button>
                  {p.status === "PENDING" && (<>
                    <button onClick={() => handleAction(p.id, "APPROVED", p)} disabled={updating === p.id} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">✓</button>
                    <button onClick={() => handleAction(p.id, "REJECTED", p)} disabled={updating === p.id} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50">✕</button>
                  </>)}
                  <button onClick={() => deletePayment(p.id)} disabled={deleting === p.id} className="px-2 py-1 text-red-500 hover:bg-red-50 rounded text-xs font-medium disabled:opacity-50" title="Ödemeyi sil">🗑</button>
                </div>
              </td>
            </tr>);
          })}</tbody></table></div>
        )}
      </div>

      {detailPay && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDetailPay(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5"><div className="flex items-center justify-between"><h3 className="text-lg font-bold text-white">💳 Dekont Detayı</h3><button onClick={() => setDetailPay(null)} className="text-white/70 hover:text-white text-2xl">×</button></div></div>
            <div className="p-6 space-y-4">
              {/* Üye Bilgileri */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase">👤 Üye</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-xs text-gray-400">Ad Soyad</p><p className="text-sm font-semibold">{detailPay.application.name}</p></div>
                  <div><p className="text-xs text-gray-400">Telefon</p><p className="text-sm">{detailPay.application.phone}</p></div>
                  <div><p className="text-xs text-gray-400">E-posta</p><p className="text-sm">{detailPay.application.email}</p></div>
                  <div><p className="text-xs text-gray-400">TC Kimlik</p><p className="text-sm font-mono">{detailPay.application.tcKimlik}</p></div>
                  <div><p className="text-xs text-gray-400">STK</p><p className="text-sm font-semibold">{detailPay.application.stk.name}</p></div>
                </div>
              </div>
              {/* Ödeme Bilgileri */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-bold text-blue-600 uppercase">💰 Ödeme Bilgileri</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-xs text-gray-400">Tutar</p><p className="text-lg font-bold text-blue-700">{fmt(detailPay.amount)}</p></div>
                  <div><p className="text-xs text-gray-400">Tür</p><p className="text-sm font-semibold">{TYPE_LABELS[detailPay.paymentType] || detailPay.paymentType}</p></div>
                  <div><p className="text-xs text-gray-400">Ödeme Tarihi</p><p className="text-sm">{fmtDate(detailPay.paymentDate)}</p></div>
                  <div><p className="text-xs text-gray-400">Bildirim Tarihi</p><p className="text-sm">{fmtDate(detailPay.createdAt)}</p></div>
                </div>
                {detailPay.note && <div className="mt-2"><p className="text-xs text-gray-400">Not</p><p className="text-sm text-gray-700">{detailPay.note}</p></div>}
              </div>
              {/* Üyelik Durumu */}
              <div className="bg-indigo-50 rounded-xl p-4">
                <h3 className="text-xs font-bold text-indigo-600 uppercase mb-2">🎫 Mevcut Üyelik</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-xs text-gray-400">Durum</p><p className="text-sm font-semibold">{detailPay.application.membershipStatus || "Belirsiz"}</p></div>
                  <div><p className="text-xs text-gray-400">Bitiş</p><p className="text-sm font-semibold">{detailPay.application.expiryDate ? fmtDate(detailPay.application.expiryDate) : "Belirsiz"}</p></div>
                </div>
              </div>
              {/* Dekont Görseli */}
              <div className="bg-amber-50 rounded-xl p-4">
                <h3 className="text-xs font-bold text-amber-600 uppercase mb-2">🧾 Dekont</h3>
                {detailPay.receiptUrl ? (
                  <>
                    <div className="border-2 border-amber-200 rounded-xl overflow-hidden bg-white p-2 max-h-72 overflow-y-auto">
                      <img src={detailPay.receiptUrl.startsWith("/") || detailPay.receiptUrl.startsWith("http") ? detailPay.receiptUrl : `data:image/png;base64,${detailPay.receiptUrl}`} alt="Dekont" className="max-h-72 mx-auto object-contain" />
                    </div>
                    <a href={detailPay.receiptUrl.startsWith("/") || detailPay.receiptUrl.startsWith("http") ? detailPay.receiptUrl : `data:image/png;base64,${detailPay.receiptUrl}`} download={`dekont-${detailPay.id}.png`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">📥 Dekontu İndir</a>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-6 text-gray-400">
                    <span className="text-3xl mb-2">📄</span>
                    <p className="text-sm">Dekont yüklenmemiş</p>
                    <p className="text-xs mt-1">Üye henüz ödeme belgesi göndermemiş</p>
                  </div>
                )}
              </div>
            </div>
            {/* İşlem Butonları */}
            {detailPay.status === "PENDING" && (
              <div className="p-5 border-t border-gray-100 flex gap-3">
                <button onClick={() => handleAction(detailPay.id, "REJECTED", detailPay)} disabled={updating === detailPay.id} className="flex-1 py-2.5 border-2 border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50">❌ Reddet</button>
                <button onClick={() => handleAction(detailPay.id, "APPROVED", detailPay)} disabled={updating === detailPay.id} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50">✅ Onayla ({detailPay.paymentType === "ANNUAL" ? "+365 g\u00fcn" : "+30 g\u00fcn"})</button>
              </div>
            )}
            {detailPay.status !== "PENDING" && (
              <div className="p-5 border-t border-gray-100"><p className="text-center text-sm text-gray-500">{detailPay.status === "APPROVED" ? "✅ Bu \u00f6deme onayland\u0131" : "❌ Bu \u00f6deme reddedildi"}{detailPay.reviewedAt && ` \u2022 ${fmtDate(detailPay.reviewedAt)}`}</p></div>
            )}
          </div>
        </div>
      )}
      <style jsx>{`@keyframes fade-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes slide-in{from{opacity:0;transform:translateX(100px)}to{opacity:1;transform:translateX(0)}}.animate-fade-in{animation:fade-in .5s ease-out}.animate-slide-in{animation:slide-in .4s ease-out}`}</style>
    </div>
  );
}
