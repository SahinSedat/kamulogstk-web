"use client";
import { useState, useEffect, useCallback, useRef } from "react";

interface Activity { id: string; title: string; content: string; imageUrl: string | null; createdAt: string; stk: { name: string; slug: string; logo: string | null }; }

export default function FaaliyetlerPage() {
  const [stkId, setStkId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [sendPush, setSendPush] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  const [sendResult, setSendResult] = useState<{push:number;email:number;whatsapp:number;total:number}|null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{id:string;title:string}|null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetch("/api/stk-panel/profile").then(r => r.json()).then(d => { if (d.success && d.data?.id) setStkId(d.data.id); }).catch(() => {}); }, []);

  const fetchActivities = useCallback(async () => {
    if (!stkId) return;
    try { const res = await fetch(`/api/admin/stk-activities?stkId=${stkId}`); const json = await res.json(); if (json.success) setActivities(json.activities); } catch {} finally { setLoading(false); }
  }, [stkId]);
  useEffect(() => { if (stkId) fetchActivities(); }, [stkId, fetchActivities]);

  const showToast = (msg: string, type: "success" | "error") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 4000); };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImageFile(file); const reader = new FileReader(); reader.onloadend = () => setImagePreview(reader.result as string); reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!stkId || !title || !content) return; setSaving(true); setSendResult(null);
    try {
      let imageUrl = "";
      if (imageFile) {
        const formData = new FormData(); formData.append("file", imageFile);
        const upRes = await fetch("/api/admin/upload", { method: "POST", body: formData });
        const upJson = await upRes.json(); if (upJson.url) imageUrl = upJson.url;
      }
      const res = await fetch("/api/admin/stk-activities", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stkId, title, content, imageUrl, sendPush, sendEmail, sendWhatsapp }),
      });
      const json = await res.json();
      if (json.success) {
        const result = { push: json.pushCount || 0, email: json.emailCount || 0, whatsapp: json.whatsappCount || 0, total: (json.pushCount || 0) + (json.emailCount || 0) + (json.whatsappCount || 0) };
        setSendResult(result);
        const warnings = json.quotaWarnings ? `\n⚠️ ${json.quotaWarnings.join(", ")}` : "";
        showToast(`✅ Faaliyet yayınlandı! ${result.push > 0 ? `📱 ${result.push} push` : ""}${result.email > 0 ? ` ✉️ ${result.email} email` : ""}${result.whatsapp > 0 ? ` 📲 ${result.whatsapp} WhatsApp` : ""} gönderildi${warnings}`, warnings ? "error" : "success");
        setTitle(""); setContent(""); setImageFile(null); setImagePreview(""); setSendPush(false); setSendEmail(false); setSendWhatsapp(false);
        fetchActivities();
      } else showToast(json.error || "Hata", "error");
    } catch { showToast("Sunucu hatası", "error"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try { await fetch(`/api/admin/stk-activities?id=${id}`, { method: "DELETE" }); showToast("✅ Faaliyet silindi", "success"); setConfirmDelete(null); fetchActivities(); }
    catch { showToast("Hata", "error"); } finally { setDeleting(false); }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (<div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white animate-slide-in ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-red-500 to-rose-500"}`}>{toast.message}</div>)}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900 tracking-tight">📅 Faaliyetler & Duyurular</h1><p className="text-sm text-gray-500 mt-1">Etkinlik, duyuru ve haber yayınlayın</p></div>
        <button onClick={() => { setShowForm(!showForm); setSendResult(null); }} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all active:scale-95"><span className="text-lg">+</span> Yeni Faaliyet</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
          <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Başlık *</label><input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Yıllık Piknik Etkinliği" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1.5">İçerik *</label><textarea required rows={4} value={content} onChange={e => setContent(e.target.value)} placeholder="Detaylı açıklama..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Görsel</label><input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" /><button type="button" onClick={() => fileRef.current?.click()} className="px-4 py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition">{imagePreview ? "📷 Değiştir" : "📷 Görsel Ekle"}</button>{imagePreview && <img src={imagePreview} alt="Önizleme" className="mt-2 h-24 rounded-lg object-cover" />}</div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Bildirim Kanalları <span className="text-gray-400">(sadece aktif/onaylı üyelere gönderilir)</span></label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sendPush} onChange={e => setSendPush(e.target.checked)} className="rounded accent-indigo-600" /> 📱 Push</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="rounded accent-indigo-600" /> ✉️ Email</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sendWhatsapp} onChange={e => setSendWhatsapp(e.target.checked)} className="rounded accent-indigo-600" /> 📲 WhatsApp</label>
            </div>
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm text-gray-600">İptal</button><button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg disabled:opacity-50">{saving ? "Yayınlanıyor..." : "🚀 Yayınla"}</button></div>

          {sendResult && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mt-2">
              <h4 className="text-sm font-bold text-emerald-700 mb-2">📊 Gönderim Sonucu</h4>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div><p className="text-xl font-bold text-emerald-700">{sendResult.total}</p><p className="text-[10px] text-emerald-600">Toplam Hedef</p></div>
                <div><p className="text-xl font-bold text-blue-600">{sendResult.push}</p><p className="text-[10px] text-blue-500">Push Bildirim</p></div>
                <div><p className="text-xl font-bold text-violet-600">{sendResult.email}</p><p className="text-[10px] text-violet-500">E-posta</p></div>
                <div><p className="text-xl font-bold text-green-600">{sendResult.whatsapp}</p><p className="text-[10px] text-green-500">WhatsApp</p></div>
              </div>
            </div>
          )}
        </form>
      )}

      {activities.length === 0 ? <div className="rounded-2xl bg-white border border-gray-100 shadow-sm py-20 text-center"><p className="text-4xl mb-3">📅</p><p className="text-gray-500 text-sm">Henüz faaliyet yok</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{activities.map(a => (
          <div key={a.id} className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 group">
            {a.imageUrl && <img src={a.imageUrl} alt={a.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />}
            <div className="p-5">
              <p className="text-xs text-gray-400 mb-2">{fmtDate(a.createdAt)}</p>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{a.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-3">{a.content}</p>
              <div className="flex justify-end mt-3 pt-3 border-t border-gray-100">
                <button onClick={() => setConfirmDelete({id:a.id,title:a.title})} className="text-red-400 hover:text-red-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">🗑 Sil</button>
              </div>
            </div>
          </div>
        ))}</div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><span className="text-3xl">⚠️</span></div>
              <h3 className="text-lg font-bold text-gray-900">Faaliyet Sil</h3>
              <p className="text-sm text-gray-500 mt-2"><strong>{confirmDelete.title}</strong> kalıcı olarak silinecek.</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
              <button onClick={() => handleDelete(confirmDelete.id)} disabled={deleting} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">{deleting ? "Siliniyor..." : "Sil"}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`@keyframes fade-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes slide-in{from{opacity:0;transform:translateX(100px)}to{opacity:1;transform:translateX(0)}}@keyframes scale-in{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}.animate-fade-in{animation:fade-in .5s ease-out}.animate-slide-in{animation:slide-in .4s ease-out}.animate-scale-in{animation:scale-in .3s ease-out}`}</style>
    </div>
  );
}
