"use client";
import { useState, useEffect, useCallback } from "react";

interface Application {
  id: string; name: string; email: string; phone: string; tcKimlik: string;
  status: string; createdAt: string; consentGiven?: boolean;
  signatureType?: string; signatureUrl?: string; documentUrl?: string;
  membershipStatus?: string; expiryDate?: string; approvedAt?: string;
  stk: { id: string; name: string; slug: string };
}

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Beklemede", color: "text-amber-700", bg: "bg-amber-50" },
  APPROVED: { label: "Onaylandı", color: "text-green-700", bg: "bg-green-50" },
  REJECTED: { label: "Reddedildi", color: "text-red-700", bg: "bg-red-50" },
  RESIGNED: { label: "İstifa", color: "text-gray-600", bg: "bg-gray-100" },
  RESIGN_PENDING: { label: "İstifa Bek.", color: "text-purple-700", bg: "bg-purple-50" },
};

export default function BasvurularPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [stkId, setStkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [detailApp, setDetailApp] = useState<Application | null>(null);

  // stkId çözümle
  useEffect(() => {
    fetch("/api/stk-panel/profile").then(r => r.json()).then(d => { if (d.success && d.data?.id) setStkId(d.data.id); }).catch(() => {});
  }, []);

  const fetchApps = useCallback(async () => {
    if (!stkId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ stkId });
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/admin/stk/applications?${params}`);
      const json = await res.json();
      if (json.success) setApps(json.data);
    } catch {} finally { setLoading(false); }
  }, [stkId, filterStatus]);
  useEffect(() => { if (stkId) fetchApps(); }, [stkId, fetchApps]);

  const showToast = (msg: string, type: "success" | "error") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleStatus = async (id: string, newStatus: string) => {
    setUpdating(id);
    try {
      await fetch(`/api/admin/stk/applications?id=${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      showToast(newStatus === "APPROVED" ? "✅ Başvuru onaylandı" : "Başvuru güncellendi", "success"); fetchApps();
    } catch { showToast("Hata oluştu", "error"); } finally { setUpdating(null); }
  };

  const filtered = apps.filter(a => { if (!search) return true; const q = search.toLowerCase(); return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.phone.includes(q) || a.tcKimlik.includes(q); });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("tr-TR");
  const pending = apps.filter(a => a.status === "PENDING").length;
  const approved = apps.filter(a => a.status === "APPROVED").length;

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (<div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white animate-slide-in ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-red-500 to-rose-500"}`}>{toast.message}</div>)}
      <div><h1 className="text-2xl font-bold text-gray-900 tracking-tight">📋 Üyelik Başvuruları</h1><p className="text-sm text-gray-500 mt-1">Derneğinize gelen başvuruları yönetin</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white border border-gray-100 p-4 shadow-sm cursor-pointer hover:ring-2 hover:ring-indigo-200 transition" onClick={() => setFilterStatus("")}><p className="text-2xl font-bold text-gray-900">{apps.length}</p><p className="text-xs text-gray-500">Toplam</p></div>
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 shadow-sm cursor-pointer hover:ring-2 hover:ring-amber-200 transition" onClick={() => setFilterStatus("PENDING")}><p className="text-2xl font-bold text-amber-700">{pending}</p><p className="text-xs text-amber-600">Beklemede</p></div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 shadow-sm cursor-pointer hover:ring-2 hover:ring-emerald-200 transition" onClick={() => setFilterStatus("APPROVED")}><p className="text-2xl font-bold text-emerald-700">{approved}</p><p className="text-xs text-emerald-600">Onaylandı</p></div>
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 shadow-sm cursor-pointer hover:ring-2 hover:ring-red-200 transition" onClick={() => setFilterStatus("REJECTED")}><p className="text-2xl font-bold text-red-700">{apps.filter(a => a.status === "REJECTED").length}</p><p className="text-xs text-red-600">Reddedildi</p></div>
      </div>

      <div className="flex gap-3"><input type="text" placeholder="İsim, e-posta, TC ile ara..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /><select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"><option value="">Tüm Durumlar</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>

      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? <div className="py-16 text-center"><p className="text-3xl mb-2">📋</p><p className="text-sm text-gray-400">{search ? "Aramayla eşleşen başvuru yok" : "Başvuru bulunamadı"}</p></div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50/80"><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Başvuran</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">TC</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">İletişim</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Tarih</th><th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Durum</th><th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">İşlem</th><th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Detay</th></tr></thead>
          <tbody className="divide-y divide-gray-50">{filtered.map(a => {
            const st = STATUS[a.status] || STATUS.PENDING;
            return (<tr key={a.id} className="hover:bg-indigo-50/30 transition-colors">
              <td className="px-6 py-4"><p className="font-medium text-gray-900">{a.name}</p><p className="text-xs text-gray-400">{a.email}</p></td>
              <td className="px-6 py-4 text-xs text-gray-600 font-mono">{a.tcKimlik}</td>
              <td className="px-6 py-4 text-xs text-gray-600">{a.phone}</td>
              <td className="px-6 py-4 text-xs text-gray-500">{fmtDate(a.createdAt)}</td>
              <td className="px-6 py-4 text-center"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${st.bg} ${st.color}`}>{st.label}</span></td>
              <td className="px-6 py-4 text-center">{a.status === "PENDING" ? (
                <div className="flex items-center justify-center gap-1">
                  <button onClick={() => handleStatus(a.id, "APPROVED")} disabled={updating === a.id} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">✓ Onayla</button>
                  <button onClick={() => handleStatus(a.id, "REJECTED")} disabled={updating === a.id} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50">✕ Reddet</button>
                </div>
              ) : <select value={a.status} onChange={e => handleStatus(a.id, e.target.value)} className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${st.bg} ${st.color}`}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>}</td>
              <td className="px-6 py-4 text-center"><button onClick={() => setDetailApp(a)} className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition">Detay</button></td>
            </tr>);
          })}</tbody></table></div>
        )}
      </div>

      {detailApp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDetailApp(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b"><h2 className="text-lg font-bold">📋 Başvuru Detayı</h2><button onClick={() => setDetailApp(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button></div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3"><div><p className="text-xs text-gray-400">Ad Soyad</p><p className="text-sm font-semibold">{detailApp.name}</p></div><div><p className="text-xs text-gray-400">TC</p><p className="text-sm font-mono">{detailApp.tcKimlik}</p></div><div><p className="text-xs text-gray-400">E-posta</p><p className="text-sm">{detailApp.email}</p></div><div><p className="text-xs text-gray-400">Telefon</p><p className="text-sm">{detailApp.phone}</p></div></div>
              {detailApp.signatureUrl && <div className="bg-blue-50 rounded-xl p-4"><h3 className="text-xs font-bold text-blue-600 uppercase mb-2">✍️ İmza</h3><img src={detailApp.signatureUrl.startsWith("data:") ? detailApp.signatureUrl : detailApp.signatureUrl.startsWith("/") || detailApp.signatureUrl.startsWith("http") ? detailApp.signatureUrl : `data:image/png;base64,${detailApp.signatureUrl}`} alt="İmza" className="max-h-48 mx-auto" /></div>}
              {detailApp.documentUrl && <div className="bg-amber-50 rounded-xl p-4"><h3 className="text-xs font-bold text-amber-600 uppercase mb-2">📂 Yüklenen Belge</h3><img src={detailApp.documentUrl.startsWith("/") || detailApp.documentUrl.startsWith("http") ? detailApp.documentUrl : `data:image/png;base64,${detailApp.documentUrl}`} alt="Belge" className="max-h-48 mx-auto" /></div>}
              <div className="bg-purple-50 rounded-xl p-4"><h3 className="text-xs font-bold text-purple-600 uppercase">⚖️ Onam</h3><p className="text-sm mt-1">{detailApp.consentGiven ? "✅ Onam verildi" : "❌ Onam verilmedi"}</p></div>
            </div>
            <div className="p-5 border-t"><button onClick={() => setDetailApp(null)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Kapat</button></div>
          </div>
        </div>
      )}
      <style jsx>{`@keyframes fade-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes slide-in{from{opacity:0;transform:translateX(100px)}to{opacity:1;transform:translateX(0)}}.animate-fade-in{animation:fade-in .5s ease-out}.animate-slide-in{animation:slide-in .4s ease-out}`}</style>
    </div>
  );
}
