"use client";
import { useState, useEffect, useCallback } from "react";
import PhoneInput, { formatPhoneForAPI } from "@/components/stk/PhoneInput";

interface Branch { id: string; name: string; city: string; district: string | null; phone: string | null; email: string | null; address: string | null; isActive: boolean; createdAt: string; }

export default function SubelerPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ name: "", city: "", district: "", phone: "", email: "", address: "", managerName: "", managerPhone: "", managerEmail: "", managerRole: "Şube Başkanı", managerAvatar: "", vicePresName: "", vicePresPhone: "", vicePresRole: "Başkan Yardımcısı", vicePresAvatar: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{id:string;name:string}|null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try { const res = await fetch("/api/stk-panel/branches"); const json = await res.json(); if (json.success) setBranches(json.data); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const showToastMsg = (msg: string, type: "success" | "error") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) {
        const res = await fetch(`/api/stk-panel/branches?id=${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, phone: formatPhoneForAPI(form.phone) }) });
        const json = await res.json();
        if (json.success) { showToastMsg("✅ Şube güncellendi!", "success"); setShowModal(false); fetchData(); }
        else showToastMsg(json.error || "Hata", "error");
      } else {
        const res = await fetch("/api/stk-panel/branches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, phone: formatPhoneForAPI(form.phone) }) });
        const json = await res.json();
        if (json.success) { showToastMsg("✅ Şube eklendi!", "success"); setShowModal(false); setForm({ name: "", city: "", district: "", phone: "", email: "", address: "", managerName: "", managerPhone: "", managerEmail: "", managerRole: "Şube Başkanı", managerAvatar: "", vicePresName: "", vicePresPhone: "", vicePresRole: "Başkan Yardımcısı", vicePresAvatar: "" }); fetchData(); }
        else showToastMsg(json.error || "Hata", "error");
      }
    } catch { showToastMsg("Sunucu hatası", "error"); } finally { setSaving(false); }
  };

  const openAdd = () => { setEditId(null); setForm({ name: "", city: "", district: "", phone: "", email: "", address: "", managerName: "", managerPhone: "", managerEmail: "", managerRole: "Şube Başkanı", managerAvatar: "", vicePresName: "", vicePresPhone: "", vicePresRole: "Başkan Yardımcısı", vicePresAvatar: "" }); setShowModal(true); };
  const openEdit = (b: any) => { setEditId(b.id); setForm({ name: b.name, city: b.city, district: b.district||"", phone: b.phone||"", email: b.email||"", address: b.address||"", managerName: b.managerName||"", managerPhone: b.managerPhone||"", managerEmail: b.managerEmail||"", managerRole: b.managerRole||"Şube Başkanı", managerAvatar: b.managerAvatar||"", vicePresName: b.vicePresName||"", vicePresPhone: b.vicePresPhone||"", vicePresRole: b.vicePresRole||"Başkan Yardımcısı", vicePresAvatar: b.vicePresAvatar||"" }); setShowModal(true); };
  const handleDelete = async (id: string) => { setDeleting(true); try { await fetch(`/api/stk-panel/branches?id=${id}`,{method:"DELETE"}); showToastMsg("✅ Şube silindi","success"); setConfirmDelete(null); fetchData(); } catch { showToastMsg("Hata","error"); } finally { setDeleting(false); } };

  const active = branches.filter(b => b.isActive).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (<div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white animate-slide-in ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-red-500 to-rose-500"}`}>{toast.message}</div>)}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900 tracking-tight">🏢 Şubeler & Teşkilatlanma</h1><p className="text-sm text-gray-500 mt-1">Derneğin şubelerini yönetin</p></div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all active:scale-95"><span className="text-lg">+</span> Yeni Şube Aç</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white border border-gray-100 p-4 flex items-center gap-4 shadow-sm"><div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-lg">🏢</div><div><p className="text-2xl font-bold text-gray-900">{branches.length}</p><p className="text-xs text-gray-500">Toplam Şube</p></div></div>
        <div className="rounded-xl bg-white border border-gray-100 p-4 flex items-center gap-4 shadow-sm"><div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-lg">✓</div><div><p className="text-2xl font-bold text-gray-900">{active}</p><p className="text-xs text-gray-500">Aktif</p></div></div>
        <div className="rounded-xl bg-white border border-gray-100 p-4 flex items-center gap-4 shadow-sm"><div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-lg">🗺️</div><div><p className="text-2xl font-bold text-gray-900">{new Set(branches.map(b => b.city)).size}</p><p className="text-xs text-gray-500">Farklı İl</p></div></div>
      </div>

      {loading ? <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
      : branches.length === 0 ? <div className="rounded-2xl bg-white border border-gray-100 shadow-sm py-20 text-center"><p className="text-4xl mb-3">🏢</p><p className="text-gray-500 text-sm">Henüz şube yok</p><button onClick={openAdd} className="mt-3 text-indigo-600 text-sm font-medium">+ İlk şubeyi açın</button></div>
      : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map(b => (
            <div key={b.id} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-lg">🏢</div><div><p className="font-semibold text-gray-900">{b.name}</p><p className="text-xs text-gray-500">{b.city}{b.district ? ` / ${b.district}` : ""}</p></div></div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{b.isActive ? "Aktif" : "Pasif"}</span>
              </div>
              <div className="space-y-1.5 text-sm text-gray-500">{b.phone && <p>📱 {b.phone}</p>}{b.email && <p className="truncate">✉️ {b.email}</p>}{b.address && <p className="truncate">📍 {b.address}</p>}</div>
              {(b as any).managerName && <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                <div className="flex items-center gap-2">{(b as any).managerAvatar ? <img src={(b as any).managerAvatar} className="w-8 h-8 rounded-full object-cover"/> : <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">{(b as any).managerName?.charAt(0)}</div>}<div><p className="text-xs font-semibold text-gray-900">{(b as any).managerName}</p><p className="text-[10px] text-indigo-600">{(b as any).managerRole || 'Şube Başkanı'}</p></div></div>
                {(b as any).vicePresName && <div className="flex items-center gap-2">{(b as any).vicePresAvatar ? <img src={(b as any).vicePresAvatar} className="w-7 h-7 rounded-full object-cover"/> : <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-700">{(b as any).vicePresName?.charAt(0)}</div>}<div><p className="text-xs font-medium text-gray-700">{(b as any).vicePresName}</p><p className="text-[10px] text-violet-600">{(b as any).vicePresRole || 'Başkan Yardımcısı'}</p></div></div>}
              </div>}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <button onClick={()=>openEdit(b)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">✏️ Düzenle</button>
                <button onClick={()=>setConfirmDelete({id:b.id,name:b.name})} className="text-red-500 hover:text-red-700 text-xs font-medium">🗑 Sil</button>
              </div>
            </div>
          ))}
        </div>}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}><div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5"><div className="flex items-center justify-between"><h3 className="text-lg font-bold text-white">{editId ? "✏️ Şube Düzenle" : "+ Yeni Şube Aç"}</h3><button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white text-2xl">×</button></div></div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Şube Adı *</label><input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ankara Şubesi" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-500 mb-1.5">İl *</label><input required value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Ankara" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1.5">İlçe</label><input value={form.district} onChange={e => setForm(p => ({ ...p, district: e.target.value }))} placeholder="Çankaya" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Telefon</label><PhoneInput value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} /></div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1.5">E-posta</label><input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="ankara@dernek.org" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Adres</label><input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Atatürk Bulvarı No:125" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
              <div className="border-t border-gray-100 pt-4 mt-2">
                <p className="text-xs font-semibold text-gray-700 mb-3">👤 Şube Yönetimi</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[11px] font-medium text-gray-500 mb-1">Başkan Adı</label><input value={form.managerName} onChange={e=>setForm(p=>({...p,managerName:e.target.value}))} placeholder="Ad Soyad" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"/></div>
                  <div><label className="block text-[11px] font-medium text-gray-500 mb-1">Başkan Rolü</label><select value={form.managerRole} onChange={e=>setForm(p=>({...p,managerRole:e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"><option>Şube Başkanı</option><option>Genel Başkan</option><option>Başkan Vekili</option></select></div>
                  <div><label className="block text-[11px] font-medium text-gray-500 mb-1">Başkan Tel</label><PhoneInput value={form.managerPhone} onChange={v=>setForm(p=>({...p,managerPhone:v}))}/></div>
                  <div><label className="block text-[11px] font-medium text-gray-500 mb-1">Başkan E-posta</label><input value={form.managerEmail} onChange={e=>setForm(p=>({...p,managerEmail:e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"/></div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div><label className="block text-[11px] font-medium text-gray-500 mb-1">Yardımcı Adı</label><input value={form.vicePresName} onChange={e=>setForm(p=>({...p,vicePresName:e.target.value}))} placeholder="Ad Soyad" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"/></div>
                  <div><label className="block text-[11px] font-medium text-gray-500 mb-1">Yardımcı Rolü</label><select value={form.vicePresRole} onChange={e=>setForm(p=>({...p,vicePresRole:e.target.value}))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"><option>Başkan Yardımcısı</option><option>Genel Sekreter</option><option>Sayman</option></select></div>
                  <div><label className="block text-[11px] font-medium text-gray-500 mb-1">Yardımcı Tel</label><PhoneInput value={form.vicePresPhone} onChange={v=>setForm(p=>({...p,vicePresPhone:v}))}/></div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm text-gray-600">İptal</button><button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg disabled:opacity-50">{saving ? "Kaydediliyor..." : editId ? "Güncelle" : "Şubeyi Aç"}</button></div>
            </form></div></div>
      )}

      {confirmDelete&&(<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setConfirmDelete(null)}><div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/><div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in" onClick={e=>e.stopPropagation()}><div className="text-center"><div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><span className="text-3xl">⚠️</span></div><h3 className="text-lg font-bold text-gray-900">Emin misiniz?</h3><p className="text-sm text-gray-500 mt-2"><strong>{confirmDelete.name}</strong> şubesi kalıcı olarak silinecektir.</p></div><div className="flex gap-3 mt-6"><button onClick={()=>setConfirmDelete(null)} className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button><button onClick={()=>handleDelete(confirmDelete.id)} disabled={deleting} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">{deleting?"Siliniyor...":"Evet, Sil"}</button></div></div></div>)}
      <style jsx>{`@keyframes fade-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes scale-in{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}@keyframes slide-in{from{opacity:0;transform:translateX(100px)}to{opacity:1;transform:translateX(0)}}.animate-fade-in{animation:fade-in .5s ease-out}.animate-scale-in{animation:scale-in .3s ease-out}.animate-slide-in{animation:slide-in .4s ease-out}`}</style>
    </div>
  );
}
