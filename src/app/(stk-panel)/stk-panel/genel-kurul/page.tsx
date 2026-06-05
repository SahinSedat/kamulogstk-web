"use client";
import { useState, useEffect, useCallback } from "react";

interface Assembly { id: string; assemblyType: "OLAGAN" | "OLAGANUSTU"; assemblyNumber: number; date: string; location: string; quorum: number; status: string; createdAt: string; }

const STATUS_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  PLANNED: { label: "Planlandı", bg: "bg-blue-50 ring-1 ring-blue-200", text: "text-blue-700" },
  IN_PROGRESS: { label: "Devam Ediyor", bg: "bg-amber-50 ring-1 ring-amber-200", text: "text-amber-700" },
  COMPLETED: { label: "Tamamlandı", bg: "bg-emerald-50 ring-1 ring-emerald-200", text: "text-emerald-700" },
  CANCELLED: { label: "İptal Edildi", bg: "bg-red-50 ring-1 ring-red-200", text: "text-red-700" },
};
const STATUS_OPTIONS = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default function GenelKurulPage() {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ assemblyType: "OLAGAN", assemblyNumber: "", date: "", location: "", quorum: "", status: "PLANNED" });
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try { const res = await fetch("/api/stk-panel/assembly"); const json = await res.json(); if (json.success) setAssemblies(json.data); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const showToastMsg = (message: string, type: "success" | "error") => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const openEdit = (a: Assembly) => {
    setEditId(a.id);
    setForm({ assemblyType: a.assemblyType, assemblyNumber: String(a.assemblyNumber), date: a.date.split("T")[0], location: a.location, quorum: String(a.quorum), status: a.status });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ assemblyType: "OLAGAN", assemblyNumber: "", date: "", location: "", quorum: "", status: "PLANNED" });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) {
        const res = await fetch(`/api/stk-panel/assembly?id=${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const json = await res.json();
        if (json.success) { showToastMsg("✅ Genel kurul güncellendi!", "success"); setShowModal(false); fetchData(); }
        else showToastMsg(json.error || "Hata", "error");
      } else {
        const res = await fetch("/api/stk-panel/assembly", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const json = await res.json();
        if (json.success) { showToastMsg("✅ Genel kurul planlandı!", "success"); setShowModal(false); setForm({ assemblyType: "OLAGAN", assemblyNumber: "", date: "", location: "", quorum: "", status: "PLANNED" }); fetchData(); }
        else showToastMsg(json.error || "Hata", "error");
      }
    } catch { showToastMsg("Sunucu hatası", "error"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await fetch(`/api/stk-panel/assembly?id=${id}`, { method: "DELETE" });
      showToastMsg("✅ Genel kurul silindi", "success");
      setConfirmDelete(null);
      fetchData();
    } catch { showToastMsg("Silme hatası", "error"); } finally { setDeleting(false); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const planned = assemblies.filter(a => a.status === "PLANNED").length;
  const completed = assemblies.filter(a => a.status === "COMPLETED").length;

  // Yaklaşan genel kurul uyarıları
  const upcomingWarnings = assemblies.filter(a => {
    if (a.status !== "PLANNED") return false;
    const days = Math.ceil((new Date(a.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 3;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (<div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white animate-slide-in ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-red-500 to-rose-500"}`}>{toast.message}</div>)}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">🏛️ Genel Kurul</h1>
          <p className="text-sm text-gray-500 mt-1">Olağan ve olağanüstü genel kurullarınızı planlayın</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all duration-300 active:scale-95">
          <span className="text-lg">+</span> Genel Kurul Planla
        </button>
      </div>

      {/* Yaklaşan Kurul Uyarısı */}
      {upcomingWarnings.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-5">
          <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">🔔 Yaklaşan Genel Kurul!</h3>
          {upcomingWarnings.map(a => {
            const days = Math.ceil((new Date(a.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return <p key={a.id} className="text-xs text-amber-700 mt-1">{a.assemblyNumber}. {a.assemblyType === "OLAGAN" ? "Olağan" : "Olağanüstü"} Genel Kurul — <strong>{days === 0 ? "Bugün!" : `${days} gün kaldı`}</strong> ({formatDate(a.date)}, {a.location})</p>;
          })}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-lg">📊</div>
          <div><p className="text-2xl font-bold text-gray-900">{assemblies.length}</p><p className="text-xs text-gray-500">Toplam</p></div>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-lg">📅</div>
          <div><p className="text-2xl font-bold text-gray-900">{planned}</p><p className="text-xs text-gray-500">Planlandı</p></div>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-lg">✓</div>
          <div><p className="text-2xl font-bold text-gray-900">{completed}</p><p className="text-xs text-gray-500">Tamamlandı</p></div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
        ) : assemblies.length === 0 ? (
          <div className="py-20 text-center"><p className="text-4xl mb-3">🏛️</p><p className="text-gray-500 text-sm">Henüz genel kurul kaydı yok</p>
            <button onClick={openAdd} className="mt-3 text-indigo-600 text-sm font-medium hover:text-indigo-800">+ İlk genel kurulu planlayın</button></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50/80">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">No</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tür</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Yer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Yeter Sayısı</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlem</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {assemblies.map(a => {
                  const badge = STATUS_BADGES[a.status] || STATUS_BADGES.PLANNED;
                  return (
                    <tr key={a.id} className="hover:bg-indigo-50/30 transition-colors duration-200 group">
                      <td className="px-6 py-4"><span className="inline-flex items-center rounded-lg bg-indigo-50 text-indigo-700 px-2.5 py-1 text-sm font-bold">{a.assemblyNumber}.</span></td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${a.assemblyType === "OLAGAN" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"}`}>{a.assemblyType === "OLAGAN" ? "Olağan" : "Olağanüstü"}</span></td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">{formatDate(a.date)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{a.location}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">{a.quorum}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(a)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">✏️ Düzenle</button>
                          <button onClick={() => setConfirmDelete({ id: a.id, label: `${a.assemblyNumber}. Genel Kurul` })} className="text-red-500 hover:text-red-700 text-sm font-medium">🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><span className="text-3xl">⚠️</span></div>
              <h3 className="text-lg font-bold text-gray-900">Emin misiniz?</h3>
              <p className="text-sm text-gray-500 mt-2"><strong>{confirmDelete.label}</strong> kalıcı olarak silinecektir. Bu işlem geri alınamaz.</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
              <button onClick={() => handleDelete(confirmDelete.id)} disabled={deleting} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">{deleting ? "Siliniyor..." : "Evet, Sil"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
              <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-white">{editId ? "✏️ Genel Kurul Düzenle" : "+ Genel Kurul Planla"}</h3><button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white text-2xl">×</button></div>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Tür *</label>
                  <select value={form.assemblyType} onChange={e => setForm(p => ({ ...p, assemblyType: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-white">
                    <option value="OLAGAN">Olağan</option><option value="OLAGANUSTU">Olağanüstü</option>
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Kurul No *</label><input required type="number" min="1" value={form.assemblyNumber} onChange={e => setForm(p => ({ ...p, assemblyNumber: e.target.value }))} placeholder="1" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Tarih *</label><input required type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Toplantı Yeter Sayısı</label><input type="number" min="0" value={form.quorum} onChange={e => setForm(p => ({ ...p, quorum: e.target.value }))} placeholder="50" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Yer *</label><input required value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Dernek Merkezi, Ankara" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" /></div>
              {editId && (
                <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Durum</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-white">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_BADGES[s]?.label || s}</option>)}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800">İptal</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all disabled:opacity-50">{saving ? "Kaydediliyor..." : editId ? "Güncelle" : "Planla"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slide-in { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .animate-scale-in { animation: scale-in 0.3s ease-out; }
        .animate-slide-in { animation: slide-in 0.4s ease-out; }
      `}</style>
    </div>
  );
}
