"use client";
import { useState, useEffect, useCallback } from "react";
import PhoneInput, { formatPhoneForAPI, stripPhonePrefix } from "@/components/stk/PhoneInput";

interface BoardMember { id: string; name: string; title: string; phone: string | null; email: string | null; isActive: boolean; startDate: string | null; createdAt: string; }

const TITLE_BADGES: Record<string, { bg: string; text: string }> = {
  "Başkan": { bg: "bg-indigo-100 ring-1 ring-indigo-300", text: "text-indigo-800" },
  "Başkan Yardımcısı": { bg: "bg-violet-100 ring-1 ring-violet-300", text: "text-violet-800" },
  "Sayman": { bg: "bg-emerald-100 ring-1 ring-emerald-300", text: "text-emerald-800" },
  "Sekreter": { bg: "bg-blue-100 ring-1 ring-blue-300", text: "text-blue-800" },
  "Asil Üye": { bg: "bg-gray-100 ring-1 ring-gray-300", text: "text-gray-700" },
  "Yedek Üye": { bg: "bg-amber-50 ring-1 ring-amber-200", text: "text-amber-700" },
};
const TITLE_OPTIONS = ["Başkan", "Başkan Yardımcısı", "Sayman", "Sekreter", "Asil Üye", "Yedek Üye"];

export default function YonetimKuruluPage() {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ name: "", title: "Asil Üye", phone: "", email: "", photoUrl: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try { const res = await fetch("/api/stk-panel/board"); const json = await res.json(); if (json.success) setMembers(json.data); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const showToastMsg = (message: string, type: "success" | "error") => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const openAdd = () => {
    setEditId(null);
    setForm({ name: "", title: "Asil Üye", phone: "", email: "", photoUrl: "" });
    setShowModal(true);
  };

  const openEdit = (m: BoardMember) => {
    setEditId(m.id);
    setForm({ name: m.name, title: m.title, phone: m.phone ? stripPhonePrefix(m.phone) : "", email: m.email || "", photoUrl: (m as any).photoUrl || "" });
    setShowModal(true);
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (j.success && j.url) {
        setForm(p => ({ ...p, photoUrl: j.url }));
        showToastMsg("✅ Fotoğraf yüklendi!", "success");
      } else { showToastMsg("Fotoğraf yüklenemedi", "error"); }
    } catch { showToastMsg("Hata oluştu", "error"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) {
        const res = await fetch(`/api/stk-panel/board?id=${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, phone: formatPhoneForAPI(form.phone) }) });
        const json = await res.json();
        if (json.success) { showToastMsg("✅ Üye güncellendi!", "success"); setShowModal(false); fetchData(); }
        else showToastMsg(json.error || "Hata", "error");
      } else {
        const res = await fetch("/api/stk-panel/board", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, phone: formatPhoneForAPI(form.phone) }) });
        const json = await res.json();
        if (json.success) { showToastMsg("✅ Kurul üyesi eklendi!", "success"); setShowModal(false); setForm({ name: "", title: "Asil Üye", phone: "", email: "", photoUrl: "" }); fetchData(); }
        else showToastMsg(json.error || "Hata", "error");
      }
    } catch { showToastMsg("Sunucu hatası", "error"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await fetch(`/api/stk-panel/board?id=${id}`, { method: "DELETE" });
      showToastMsg("✅ Kurul üyesi silindi", "success");
      setConfirmDelete(null);
      fetchData();
    } catch { showToastMsg("Silme hatası", "error"); } finally { setDeleting(false); }
  };

  const activeMembers = members.filter(m => m.isActive);

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (<div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white animate-slide-in ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-red-500 to-rose-500"}`}>{toast.message}</div>)}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">🏛️ Yönetim Kurulu</h1>
          <p className="text-sm text-gray-500 mt-1">Dernek yönetim kurulu üyelerini yönetin</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all duration-300 active:scale-95">
          <span className="text-lg">+</span> Kurul Üyesi Ekle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-lg">🏛️</div>
          <div><p className="text-2xl font-bold text-gray-900">{activeMembers.length}</p><p className="text-xs text-gray-500">Aktif Üye</p></div>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-lg">👑</div>
          <div><p className="text-2xl font-bold text-gray-900">{activeMembers.filter(m => m.title === "Başkan").length}</p><p className="text-xs text-gray-500">Başkan</p></div>
        </div>
        <div className="rounded-xl bg-white border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-lg">📋</div>
          <div><p className="text-2xl font-bold text-gray-900">{activeMembers.filter(m => m.title === "Yedek Üye").length}</p><p className="text-xs text-gray-500">Yedek Üye</p></div>
        </div>
      </div>

      {/* Board Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
      ) : activeMembers.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm py-20 text-center">
          <p className="text-4xl mb-3">🏛️</p><p className="text-gray-500 text-sm">Henüz kurul üyesi eklenmemiş</p>
          <button onClick={openAdd} className="mt-3 text-indigo-600 text-sm font-medium hover:text-indigo-800">+ İlk üyeyi ekleyin</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeMembers.map(m => {
            const badge = TITLE_BADGES[m.title] || TITLE_BADGES["Asil Üye"];
            return (
              <div key={m.id} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-lg font-bold text-indigo-700 flex-shrink-0 overflow-hidden">
                    {(m as any).photoUrl ? (
                      <img src={(m as any).photoUrl.startsWith('/') ? `https://kamulogstk.net${(m as any).photoUrl}` : (m as any).photoUrl} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      m.name.split(" ").map(n => n[0]).join("").slice(0, 2)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{m.name}</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mt-1 ${badge.bg} ${badge.text}`}>{m.title}</span>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors" title="Düzenle">✏️</button>
                    <button onClick={() => setConfirmDelete({ id: m.id, name: m.name })} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Sil">🗑</button>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-gray-500">
                  {m.phone && <p className="flex items-center gap-2"><span>📱</span> {m.phone}</p>}
                  {m.email && <p className="flex items-center gap-2 truncate"><span>✉️</span> {m.email}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><span className="text-3xl">⚠️</span></div>
              <h3 className="text-lg font-bold text-gray-900">Emin misiniz?</h3>
              <p className="text-sm text-gray-500 mt-2"><strong>{confirmDelete.name}</strong> kalıcı olarak yönetim kurulundan çıkarılacaktır.</p>
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
              <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-white">{editId ? "✏️ Üyeyi Düzenle" : "+ Kurul Üyesi Ekle"}</h3><button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white text-2xl">×</button></div>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Ad Soyad *</label><input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ahmet Yılmaz" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Unvan *</label>
                <select value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-white">
                  {TITLE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Profil Fotoğrafı</label>
                <div className="flex items-center gap-3">
                  {form.photoUrl && (
                    <img src={form.photoUrl.startsWith('/') ? `https://kamulogstk.net${form.photoUrl}` : form.photoUrl} alt="Profil" className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm" />
                  )}
                  <label className="cursor-pointer px-4 py-2 border border-dashed border-gray-300 rounded-xl text-xs text-indigo-600 font-medium hover:bg-indigo-50 hover:border-indigo-300 transition-colors">
                    {uploading ? "⏳ Yükleniyor..." : "+ Fotoğraf Seç"}
                    <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={uploadPhoto} disabled={uploading} />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Telefon</label><PhoneInput value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1.5">E-posta</label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="ahmet@mail.com" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800">İptal</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all disabled:opacity-50">{saving ? "Kaydediliyor..." : editId ? "Güncelle" : "Kaydet"}</button>
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
