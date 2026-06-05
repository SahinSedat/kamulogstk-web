"use client";

import { useState, useEffect, useCallback } from "react";

interface Decision {
  id: string;
  decisionNumber: string;
  date: string;
  subject: string;
  content: string | null;
  status: "DRAFT" | "FINALIZED";
  createdAt: string;
}

export default function KararlarPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ decisionNumber: "", date: "", subject: "", content: "", status: "DRAFT" });
  const [channels, setChannels] = useState({ whatsapp: false, email: false, push: false, sms: false });
  const [notifying, setNotifying] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDecisions = useCallback(async () => {
    try {
      const res = await fetch("/api/stk-panel/decisions");
      const json = await res.json();
      if (json.success) setDecisions(json.data);
    } catch {
      console.error("Kararlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDecisions(); }, [fetchDecisions]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/stk-panel/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        showToast("✅ Karar başarıyla eklendi!", "success");
        setShowAddModal(false);
        setForm({ decisionNumber: "", date: "", subject: "", content: "", status: "DRAFT" });
        setChannels({ whatsapp: false, email: false, push: false, sms: false });
        fetchDecisions();

        // Seçili kanallardan bildirim gönder
        const activeChannels = Object.entries(channels).filter(([,v]) => v).map(([k]) => k);
        if (activeChannels.length > 0 && json.data?.id) {
          setNotifying(true);
          try {
            await fetch('/api/stk-panel/decisions/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ decisionId: json.data.id, channels: activeChannels }),
            });
            showToast(`✅ Karar eklendi ve ${activeChannels.length} kanaldan bildirildi!`, 'success');
          } catch { showToast('⚠️ Karar eklendi ama bildirim gönderilemedi', 'error'); }
          finally { setNotifying(false); }
        }
      } else {
        showToast(json.error || "Hata oluştu", "error");
      }
    } catch {
      showToast("Sunucu hatası", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ids: string[]) => {
    setDeleting(true);
    try {
      if (ids.length === 1) {
        await fetch(`/api/stk-panel/decisions?id=${ids[0]}`, { method: "DELETE" });
      } else {
        await fetch("/api/stk-panel/decisions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
      }
      showToast(`✅ ${ids.length} karar silindi`, "success");
      setSelected(new Set());
      setConfirmDelete(null);
      fetchDecisions();
    } catch { showToast("Silme hatası", "error"); } finally { setDeleting(false); }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(d => d.id)));
  };

  const filtered = filterStatus === "ALL" ? decisions : decisions.filter(d => d.status === filterStatus);
  const totalFinalized = decisions.filter(d => d.status === "FINALIZED").length;
  const totalDraft = decisions.filter(d => d.status === "DRAFT").length;
  const formatDate = (d: string) => new Date(d).toLocaleDateString("tr-TR");

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white animate-slide-in ${
          toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-red-500 to-rose-500"
        }`}>{toast.message}</div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">📋 Karar Defteri</h1>
          <p className="text-sm text-gray-500 mt-1">Yönetim kurulu kararlarını yönetin ve takip edin</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={() => setConfirmDelete({ ids: Array.from(selected), label: `${selected.size} karar` })}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-all active:scale-95">
              🗑 {selected.size} Seçili Sil
            </button>
          )}
          <button onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:from-indigo-700 hover:to-violet-700 transition-all duration-300 active:scale-95">
            <span className="text-lg">+</span> Yeni Karar Al
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-lg">📄</div>
          <div><p className="text-2xl font-bold text-gray-900">{decisions.length}</p><p className="text-xs text-gray-500">Toplam Karar</p></div>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-lg">✓</div>
          <div><p className="text-2xl font-bold text-gray-900">{totalFinalized}</p><p className="text-xs text-gray-500">Kesinleşen</p></div>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-lg">◷</div>
          <div><p className="text-2xl font-bold text-gray-900">{totalDraft}</p><p className="text-xs text-gray-500">Taslak</p></div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {[
          { key: "ALL", label: "Tümü" },
          { key: "FINALIZED", label: "✓ Kesinleşen" },
          { key: "DRAFT", label: "◷ Taslak" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${filterStatus === f.key ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600"}`}
          >{f.label}</button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center"><p className="text-4xl mb-3">📋</p><p className="text-gray-500 text-sm">Henüz karar bulunmuyor</p>
            <button onClick={() => setShowAddModal(true)} className="mt-3 text-indigo-600 text-sm font-medium hover:text-indigo-800">+ İlk kararı ekleyin</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50/80">
                <th className="px-4 py-4 text-left"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /></th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Karar No</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Konu</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlem</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(d => (
                  <tr key={d.id} className="hover:bg-indigo-50/30 transition-colors duration-200 group">
                    <td className="px-4 py-4"><input type="checkbox" checked={selected.has(d.id)} onChange={() => toggleSelect(d.id)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /></td>
                    <td className="px-6 py-4"><span className="inline-flex items-center rounded-lg bg-indigo-50 text-indigo-700 px-2.5 py-1 text-sm font-bold">{d.decisionNumber}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(d.date)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs truncate">{d.subject}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${d.status === "FINALIZED" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}>
                        {d.status === "FINALIZED" ? "✓ Kesinleşti" : "◷ Taslak"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedDecision(d)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Detay</button>
                        <button onClick={() => setConfirmDelete({ ids: [d.id], label: `"${d.decisionNumber}"` })} className="text-red-500 hover:text-red-700 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
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
              <p className="text-sm text-gray-500 mt-2">{confirmDelete.label} kalıcı olarak silinecektir. Bu işlem geri alınamaz.</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
              <button onClick={() => handleDelete(confirmDelete.ids)} disabled={deleting} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                {deleting ? "Siliniyor..." : "Evet, Sil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDecision(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <div><p className="text-indigo-200 text-xs font-medium">Karar No: {selectedDecision.decisionNumber}</p><h3 className="text-lg font-bold text-white mt-1">{selectedDecision.subject}</h3></div>
                <button onClick={() => setSelectedDecision(null)} className="text-white/70 hover:text-white text-2xl">×</button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex gap-4 text-sm"><span className="text-gray-500">📅 Tarih:</span><span className="font-medium text-gray-900">{formatDate(selectedDecision.date)}</span></div>
              <div className="flex gap-4 text-sm"><span className="text-gray-500">📌 Durum:</span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${selectedDecision.status === "FINALIZED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {selectedDecision.status === "FINALIZED" ? "✓ Kesinleşti" : "◷ Taslak"}
                </span>
              </div>
              {selectedDecision.content && (
                <div><p className="text-sm text-gray-500 mb-2">Karar İçeriği:</p><div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-700 leading-relaxed">{selectedDecision.content}</div></div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end"><button onClick={() => setSelectedDecision(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Kapat</button></div>
          </div>
        </div>
      )}

      {/* Add Decision Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
              <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-white">+ Yeni Karar Al</h3><button onClick={() => setShowAddModal(false)} className="text-white/70 hover:text-white text-2xl">×</button></div>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Karar No *</label><input required value={form.decisionNumber} onChange={e => setForm(p => ({ ...p, decisionNumber: e.target.value }))} placeholder="2026/15" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Tarih *</label><input required type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Konu *</label><input required value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Karar konusu..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1.5">İçerik</label><textarea rows={3} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Karar detayları..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all resize-none" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Durum</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-white">
                  <option value="DRAFT">◷ Taslak</option><option value="FINALIZED">✓ Kesinleşti</option>
                </select>
              </div>
              <div className="border-t border-gray-100 pt-4 mt-2">
                <p className="text-xs font-semibold text-gray-700 mb-3">📨 Bildirim Kanalları <span className="text-gray-400 font-normal">(opsiyonel)</span></p>
                <div className="grid grid-cols-2 gap-2">
                  {[{k:"whatsapp",l:"WhatsApp",i:"💬",c:"from-green-500 to-emerald-500"},{k:"email",l:"E-posta",i:"📧",c:"from-blue-500 to-indigo-500"},{k:"push",l:"Push Bildirim",i:"🔔",c:"from-amber-500 to-orange-500"},{k:"sms",l:"SMS",i:"📱",c:"from-violet-500 to-purple-500"}].map(ch=>(
                    <label key={ch.k} className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${(channels as any)[ch.k] ? `bg-gradient-to-r ${ch.c} text-white border-transparent shadow-md` : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                      <input type="checkbox" checked={(channels as any)[ch.k]} onChange={e=>setChannels(prev=>({...prev,[ch.k]:e.target.checked}))} className="sr-only"/>
                      <span className="text-lg">{ch.i}</span>
                      <span className="text-sm font-medium">{ch.l}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">Seçili kanallardan tüm üyelere bildirim gönderilecektir.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 transition-colors">İptal</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all disabled:opacity-50">{saving ? "Kaydediliyor..." : "Kaydet"}</button>
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
