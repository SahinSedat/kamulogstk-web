"use client";
import { useState, useEffect, useCallback } from "react";

interface Resignation { id: string; memberId: string; reason: string | null; status: string; date: string; createdAt: string; Member: { name: string; surname: string; email: string; phone: string; }; }
interface ResignApp { id: string; name: string; email: string; phone: string; tcKimlik: string; status: string; createdAt: string; stk: { id: string; name: string; slug: string }; }

export default function IstifaYonetimiPage() {
  const [resignations, setResignations] = useState<Resignation[]>([]);
  const [resignApps, setResignApps] = useState<ResignApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [stkId, setStkId] = useState<string | null>(null);

  useEffect(() => { fetch("/api/stk-panel/profile").then(r => r.json()).then(d => { if (d.success && d.data?.id) setStkId(d.data.id); }).catch(() => {}); }, []);

  const fetchData = useCallback(async () => {
    try { const res = await fetch("/api/stk-panel/resignations"); const json = await res.json(); if (json.success) setResignations(json.data); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchResignApps = useCallback(async () => {
    if (!stkId) return;
    try {
      const res = await fetch(`/api/admin/stk/applications?stkId=${stkId}`);
      const json = await res.json();
      if (json.success) setResignApps(json.data.filter((a: ResignApp) => a.status === "RESIGNED" || a.status === "RESIGN_PENDING"));
    } catch {}
  }, [stkId]);
  useEffect(() => { if (stkId) fetchResignApps(); }, [stkId, fetchResignApps]);

  const showToastMsg = (msg: string, type: "success" | "error") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleAction = async (resignationId: string, action: "APPROVE" | "REJECT") => {
    setProcessing(resignationId);
    try {
      const res = await fetch("/api/stk-panel/resignations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resignationId, action }) });
      const json = await res.json();
      if (json.success) { showToastMsg(action === "APPROVE" ? "✅ İstifa onaylandı" : "İstifa reddedildi", "success"); fetchData(); fetchResignApps(); }
      else showToastMsg(json.error || "Hata", "error");
    } catch { showToastMsg("Sunucu hatası", "error"); } finally { setProcessing(null); }
  };

  const handleAppAction = async (id: string, newStatus: string) => {
    setProcessing(id);
    try {
      await fetch(`/api/admin/stk/applications?id=${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      showToastMsg(newStatus === "RESIGNED" ? "✅ İstifa onaylandı" : "İstifa reddedildi", "success"); fetchResignApps();
    } catch { showToastMsg("Hata oluştu", "error"); } finally { setProcessing(null); }
  };

  const allItems = [
    ...resignations.map(r => ({ id: r.id, type: "resignation" as const, name: `${r.Member.name} ${r.Member.surname}`, email: r.Member.email, phone: r.Member.phone, reason: r.reason, status: r.status, date: r.date || r.createdAt })),
    ...resignApps.map(a => ({ id: a.id, type: "application" as const, name: a.name, email: a.email, phone: a.phone, reason: null as string | null, status: a.status === "RESIGN_PENDING" ? "PENDING" : "APPROVED", date: a.createdAt })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pending = allItems.filter(i => i.status === "PENDING").length;
  const approved = allItems.filter(i => i.status === "APPROVED" || i.status === "RESIGNED").length;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("tr-TR");

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (<div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white animate-slide-in ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-red-500 to-rose-500"}`}>{toast.message}</div>)}
      <div><h1 className="text-2xl font-bold text-gray-900 tracking-tight">📤 İstifa Yönetimi</h1><p className="text-sm text-gray-500 mt-1">Üye istifa taleplerini inceleyin ve yönetin</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white border border-gray-100 p-4 flex items-center gap-4 shadow-sm"><div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-lg">📤</div><div><p className="text-2xl font-bold text-gray-900">{allItems.length}</p><p className="text-xs text-gray-500">Toplam Talep</p></div></div>
        <div className="rounded-xl bg-white border border-gray-100 p-4 flex items-center gap-4 shadow-sm"><div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-lg">⏳</div><div><p className="text-2xl font-bold text-gray-900">{pending}</p><p className="text-xs text-gray-500">Bekleyen</p></div></div>
        <div className="rounded-xl bg-white border border-gray-100 p-4 flex items-center gap-4 shadow-sm"><div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center text-white text-lg">✓</div><div><p className="text-2xl font-bold text-gray-900">{approved}</p><p className="text-xs text-gray-500">Onaylanan</p></div></div>
      </div>

      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
        : allItems.length === 0 ? <div className="py-20 text-center"><p className="text-4xl mb-3">📤</p><p className="text-gray-500 text-sm">İstifa talebi bulunmuyor</p></div>
        : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50/80">
          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Üye</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">İletişim</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Sebep</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Tarih</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Durum</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">İşlem</th>
        </tr></thead><tbody className="divide-y divide-gray-50">{allItems.map(item => (
          <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
            <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-100 to-rose-100 flex items-center justify-center text-sm font-bold text-red-700">{item.name.split(" ").map(n => n[0]).join("").slice(0,2)}</div><div><p className="text-sm font-semibold text-gray-900">{item.name}</p><p className="text-xs text-gray-400">{item.email}</p></div></div></td>
            <td className="px-6 py-4 text-sm text-gray-600">{item.phone}</td>
            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{item.reason || "Belirtilmedi"}</td>
            <td className="px-6 py-4 text-sm text-gray-500">{fmtDate(item.date)}</td>
            <td className="px-6 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${item.status === "PENDING" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" : item.status === "APPROVED" || item.status === "RESIGNED" ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"}`}>{item.status === "PENDING" ? "⏳ Bekliyor" : item.status === "APPROVED" || item.status === "RESIGNED" ? "✓ Onaylandı" : "✗ Reddedildi"}</span></td>
            <td className="px-6 py-4 text-right">{item.status === "PENDING" ? (
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => item.type === "resignation" ? handleAction(item.id, "APPROVE") : handleAppAction(item.id, "RESIGNED")} disabled={processing === item.id} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50">Onayla</button>
                <button onClick={() => item.type === "resignation" ? handleAction(item.id, "REJECT") : handleAppAction(item.id, "REJECTED")} disabled={processing === item.id} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors disabled:opacity-50">Reddet</button>
              </div>
            ) : <span className="text-xs text-gray-400">İşlem yapıldı</span>}</td>
          </tr>
        ))}</tbody></table></div>}
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-5">
        <h3 className="text-sm font-semibold text-amber-900 mb-2">⚠️ Önemli Bilgi</h3>
        <p className="text-xs text-amber-700/80 leading-relaxed">İstifa onaylandığında üyenin durumu otomatik olarak &quot;İstifa Etti&quot; olarak güncellenir ve dernek üye sayısı düşürülür. Bu işlem geri alınamaz.</p>
      </div>

      <style jsx>{`@keyframes fade-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes slide-in{from{opacity:0;transform:translateX(100px)}to{opacity:1;transform:translateX(0)}}.animate-fade-in{animation:fade-in .5s ease-out}.animate-slide-in{animation:slide-in .4s ease-out}`}</style>
    </div>
  );
}
