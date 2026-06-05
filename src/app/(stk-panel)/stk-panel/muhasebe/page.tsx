"use client";
import { useState, useEffect, useCallback } from "react";

interface FinanceRecord { id: string; type: string; category: string; amount: number; description: string | null; date: string; }
interface Summary { income: number; expense: number; balance: number; }

const CAT_LABELS: Record<string, string> = { DUES: "Aidat", DONATION: "Bağış", RENT: "Kira", BILL: "Fatura", EVENT: "Etkinlik", OTHER: "Diğer" };

export default function MuhasebePage() {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [summary, setSummary] = useState<Summary>({ income: 0, expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ type: "INCOME", category: "DUES", amount: "", description: "", date: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{id:string;desc:string}|null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const fetchData = useCallback(async () => {
    try { const res = await fetch("/api/stk-panel/finance"); const json = await res.json(); if (json.success) { setRecords(json.data); setSummary(json.summary); } } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const showToastMsg = (msg: string, type: "success" | "error") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  const openAdd = () => { setEditId(null); setForm({ type: "INCOME", category: "DUES", amount: "", description: "", date: "" }); setShowModal(true); };
  const openEdit = (r: FinanceRecord) => { setEditId(r.id); setForm({ type: r.type, category: r.category, amount: String(r.amount), description: r.description || "", date: r.date.split("T")[0] }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) {
        const res = await fetch(`/api/stk-panel/finance?id=${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const json = await res.json();
        if (json.success) { showToastMsg("✅ Kayıt güncellendi!", "success"); setShowModal(false); fetchData(); }
        else showToastMsg(json.error || "Hata", "error");
      } else {
        const res = await fetch("/api/stk-panel/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const json = await res.json();
        if (json.success) { showToastMsg("✅ İşlem kaydedildi!", "success"); setShowModal(false); setForm({ type: "INCOME", category: "DUES", amount: "", description: "", date: "" }); fetchData(); }
        else showToastMsg(json.error || "Hata", "error");
      }
    } catch { showToastMsg("Sunucu hatası", "error"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try { await fetch(`/api/stk-panel/finance?id=${id}`, { method: "DELETE" }); showToastMsg("✅ Kayıt silindi", "success"); setConfirmDelete(null); fetchData(); }
    catch { showToastMsg("Hata", "error"); } finally { setDeleting(false); }
  };

  const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " ₺";
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("tr-TR");

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (<div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white animate-slide-in ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-red-500 to-rose-500"}`}>{toast.message}</div>)}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900 tracking-tight">💰 Muhasebe &amp; Aidat</h1><p className="text-sm text-gray-500 mt-1">Derneğin gelir ve giderlerini takip edin</p></div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all active:scale-95"><span className="text-lg">+</span> Yeni İşlem</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white border border-gray-100 p-5 shadow-sm"><div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white">📈</div><p className="text-xs text-gray-500">Toplam Gelir</p></div><p className="text-2xl font-extrabold text-emerald-600">{fmt(summary.income)}</p></div>
        <div className="rounded-xl bg-white border border-gray-100 p-5 shadow-sm"><div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center text-white">📉</div><p className="text-xs text-gray-500">Toplam Gider</p></div><p className="text-2xl font-extrabold text-red-600">{fmt(summary.expense)}</p></div>
        <div className="rounded-xl bg-white border border-gray-100 p-5 shadow-sm"><div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white">🏦</div><p className="text-xs text-gray-500">Net Kasa</p></div><p className={`text-2xl font-extrabold ${summary.balance >= 0 ? "text-indigo-600" : "text-red-600"}`}>{fmt(summary.balance)}</p></div>
      </div>

      {/* Arama */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input type="text" placeholder="Açıklama, kategori veya tutar ile ara..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" />
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
        : records.length === 0 ? <div className="py-20 text-center"><p className="text-4xl mb-3">💰</p><p className="text-gray-500 text-sm">Henüz kayıt yok</p><button onClick={openAdd} className="mt-3 text-indigo-600 text-sm font-medium">+ İlk kaydı ekleyin</button></div>
        : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50/80">
          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Tarih</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Tür</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Kategori</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Açıklama</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Tutar</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">İşlem</th>
        </tr></thead><tbody className="divide-y divide-gray-50">{records.filter(r => {
          if (!searchQ) return true;
          const s = searchQ.toLowerCase();
          return (r.description && r.description.toLowerCase().includes(s)) ||
                 (CAT_LABELS[r.category] || r.category).toLowerCase().includes(s) ||
                 String(r.amount).includes(searchQ) ||
                 fmtDate(r.date).includes(searchQ);
        }).map(r => (
          <tr key={r.id} className="hover:bg-indigo-50/30 transition-colors group"><td className="px-6 py-4 text-sm text-gray-600">{fmtDate(r.date)}</td>
          <td className="px-6 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${r.type === "INCOME" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-red-50 text-red-700 ring-1 ring-red-200"}`}>{r.type === "INCOME" ? "📈 Gelir" : "📉 Gider"}</span></td>
          <td className="px-6 py-4 text-sm text-gray-600">{CAT_LABELS[r.category] || r.category}</td>
          <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{r.description || "—"}</td>
          <td className={`px-6 py-4 text-sm font-bold text-right ${r.type === "INCOME" ? "text-emerald-600" : "text-red-600"}`}>{r.type === "INCOME" ? "+" : "-"}{fmt(r.amount)}</td>
          <td className="px-6 py-4 text-right">
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => openEdit(r)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">✏️ Düzenle</button>
              <button onClick={() => setConfirmDelete({id:r.id,desc:r.description||`${r.type === "INCOME" ? "Gelir" : "Gider"} - ${fmt(r.amount)}`})} className="text-red-500 hover:text-red-700 text-xs font-medium">🗑 Sil</button>
            </div>
          </td></tr>
        ))}</tbody></table></div>}
      </div>

      {/* Confirm Delete */}
      {confirmDelete&&(<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setConfirmDelete(null)}><div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/><div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in" onClick={e=>e.stopPropagation()}><div className="text-center"><div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><span className="text-3xl">⚠️</span></div><h3 className="text-lg font-bold text-gray-900">Kayıt Sil</h3><p className="text-sm text-gray-500 mt-2"><strong>{confirmDelete.desc}</strong> silinecek.</p></div><div className="flex gap-3 mt-6"><button onClick={()=>setConfirmDelete(null)} className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button><button onClick={()=>handleDelete(confirmDelete.id)} disabled={deleting} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">{deleting?"Siliniyor...":"Sil"}</button></div></div></div>)}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}><div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5"><div className="flex items-center justify-between"><h3 className="text-lg font-bold text-white">{editId ? "✏️ Gider Düzenle" : "+ Yeni İşlem"}</h3><button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white text-2xl">×</button></div></div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Tür *</label><select disabled={!!editId} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white disabled:opacity-50"><option value="INCOME">📈 Gelir</option><option value="EXPENSE">📉 Gider</option></select></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Kategori</label><select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white"><option value="DUES">Aidat</option><option value="DONATION">Bağış</option><option value="RENT">Kira</option><option value="BILL">Fatura</option><option value="EVENT">Etkinlik</option><option value="OTHER">Diğer</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Tutar (₺) *</label><input required type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="150.00" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Tarih</label><input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Açıklama</label><input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Mayıs aidatı..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm text-gray-600">İptal</button><button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg disabled:opacity-50">{saving ? "Kaydediliyor..." : editId ? "Güncelle" : "Kaydet"}</button></div>
            </form></div></div>
      )}
      <style jsx>{`@keyframes fade-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes scale-in{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}@keyframes slide-in{from{opacity:0;transform:translateX(100px)}to{opacity:1;transform:translateX(0)}}.animate-fade-in{animation:fade-in .5s ease-out}.animate-scale-in{animation:scale-in .3s ease-out}.animate-slide-in{animation:slide-in .4s ease-out}`}</style>
    </div>
  );
}
