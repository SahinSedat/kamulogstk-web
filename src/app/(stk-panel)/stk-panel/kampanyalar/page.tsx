"use client";
import { useState, useEffect, useCallback } from "react";

interface Campaign { id: string; title: string; content: string; channels: string[]; audience: string; stkId?: string; stk?: { id: string; name: string }; status: string; sentCount: number; createdAt: string; }
interface Credits { sms: number; whatsapp: number; email: number; push: number; }

const audienceLabels: Record<string, {label:string;icon:string;desc:string}> = {
  ALL_MEMBERS: {label:"Tüm Üyeler",icon:"👥",desc:"Tüm onaylı/aktif üyelere"},
  ACTIVE: {label:"Aktif/Onaylı",icon:"✅",desc:"Sadece aktif ve onaylanmış üyeler"},
  REJECTED: {label:"Reddedilen",icon:"❌",desc:"Başvurusu reddedilen üyeler"},
  OVERDUE_DUES: {label:"Aidatı Gecikenler",icon:"💸",desc:"Ödemesi geçmiş üyeler"},
  UPCOMING_DUES: {label:"Aidatı Yaklaşanlar",icon:"⏳",desc:"3 gün içinde ödemesi olan"},
  PENDING: {label:"Beklemede",icon:"📝",desc:"Başvurusu bekleyen üyeler"},
  INCOMPLETE_PROFILE: {label:"Profil Eksik",icon:"📊",desc:"Bilgileri tamamlanmamış"},
  INDIVIDUAL: {label:"Münferit",icon:"👤",desc:"Tek kişiye özel gönderim"},
};
const channelLabels: Record<string, string> = { PUSH: "Push", WHATSAPP: "WhatsApp", EMAIL: "E-posta" };

export default function KampanyalarPage() {
  const [stkId, setStkId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ title: "", content: "", audience: "ALL_MEMBERS", channels: ["PUSH"] as string[] });
  const [credits, setCredits] = useState<Credits>({ sms: 0, whatsapp: 0, email: 0, push: 0 });
  const [confirmDelete, setConfirmDelete] = useState<{id:string;title:string}|null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetch("/api/stk-panel/profile").then(r => r.json()).then(d => { if (d.success && d.data?.id) setStkId(d.data.id); }).catch(() => {}); }, []);

  // Fetch credits from messages API
  useEffect(() => { fetch("/api/stk-panel/messages").then(r => r.json()).then(d => { if (d.success && d.credits) setCredits(d.credits); }).catch(() => {}); }, []);

  const fetchCampaigns = useCallback(async () => {
    if (!stkId) return;
    try { const res = await fetch(`/api/admin/stk-campaigns?stkId=${stkId}`); const json = await res.json(); if (json.success) setCampaigns(json.data); } catch {} finally { setLoading(false); }
  }, [stkId]);
  useEffect(() => { if (stkId) fetchCampaigns(); }, [stkId, fetchCampaigns]);

  const showToast = (msg: string, type: "success" | "error") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  const toggleChannel = (ch: string) => { setForm(p => ({ ...p, channels: p.channels.includes(ch) ? p.channels.filter(c => c !== ch) : [...p.channels, ch] })); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!stkId) return; setSaving(true);
    try {
      const res = await fetch("/api/admin/stk-campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, stkId }) });
      const json = await res.json();
      if (json.success) { showToast(`✅ Kampanya ${json.sentCount || 0} kişiye gönderildi!`, "success"); setShowForm(false); setForm({ title: "", content: "", audience: "ALL_MEMBERS", channels: ["PUSH"] }); fetchCampaigns(); }
      else showToast(json.error || "Hata", "error");
    } catch { showToast("Sunucu hatası", "error"); } finally { setSaving(false); }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const handleDeleteCampaign = async (id: string) => { setDeleting(true); try { await fetch(`/api/admin/stk-campaigns?id=${id}`,{method:"DELETE"}); showToast("✅ Kampanya silindi","success"); setConfirmDelete(null); fetchCampaigns(); } catch { showToast("Hata","error"); } finally { setDeleting(false); } };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (<div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white animate-slide-in ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-red-500 to-rose-500"}`}>{toast.message}</div>)}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900 tracking-tight">📣 Üye Bildirimleri</h1><p className="text-sm text-gray-500 mt-1">Push, WhatsApp ve E-posta bildirimleri yönetin</p></div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all active:scale-95"><span className="text-lg">+</span> Yeni Bildirim Gönder</button>
      </div>

      {/* Credit Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: "sms" as const, label: "SMS Kredisi", icon: "💬", gradient: "from-emerald-500 to-teal-500" },
          { key: "push" as const, label: "Push Kredisi", icon: "📱", gradient: "from-blue-500 to-indigo-500" },
          { key: "whatsapp" as const, label: "WhatsApp", icon: "📲", gradient: "from-green-500 to-emerald-600" },
          { key: "email" as const, label: "E-Posta", icon: "✉️", gradient: "from-violet-500 to-purple-500" },
        ].map(c => (
          <div key={c.key} className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-[2.5rem] bg-gradient-to-br ${c.gradient} opacity-10 group-hover:opacity-20 transition-opacity duration-500`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{c.icon}</span>
                <div className={`w-2.5 h-2.5 rounded-full ${credits[c.key] > 0 ? "bg-emerald-400" : "bg-red-400"} animate-pulse`} />
              </div>
              <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{credits[c.key].toLocaleString("tr-TR")}</p>
              <p className="text-xs text-gray-500 mt-1">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-4">
          <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Başlık *</label><input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Aidat Hatırlatması" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1.5">İçerik *</label><textarea required rows={4} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Mesaj içeriğiniz..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Hedef Kitle</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(audienceLabels).map(([k, v]) => (
                  <label key={k} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-sm ${form.audience === k ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200 text-indigo-800 font-semibold' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-600'}`}>
                    <input type="radio" name="audience" value={k} checked={form.audience === k} onChange={() => setForm(p => ({ ...p, audience: k }))} className="sr-only" />
                    <span className="text-base flex-shrink-0">{v.icon}</span>
                    <div className="min-w-0"><p className="text-[12px] font-medium leading-tight">{v.label}</p><p className="text-[10px] text-gray-400 leading-tight truncate">{v.desc}</p></div>
                  </label>
                ))}
              </div>
            </div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1.5">Kanallar</label><div className="flex items-center gap-4 pt-2">
              {Object.entries(channelLabels).map(([k, v]) => (<label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.channels.includes(k)} onChange={() => toggleChannel(k)} className="rounded accent-indigo-600" />{k === "PUSH" ? "📱" : k === "EMAIL" ? "✉️" : "📲"} {v}</label>))}
            </div></div>
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm text-gray-600">İptal</button><button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg disabled:opacity-50">{saving ? "Gönderiliyor..." : "🚀 Gönder"}</button></div>
        </form>
      )}

      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {campaigns.length === 0 ? <div className="py-16 text-center"><p className="text-3xl mb-2">📣</p><p className="text-sm text-gray-400">Henüz kampanya gönderilmemiş</p></div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50/80"><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Kampanya</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Kanallar</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Hedef</th><th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Gönderim</th><th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Tarih</th><th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">İşlem</th></tr></thead>
          <tbody className="divide-y divide-gray-50">{campaigns.map(c => (
            <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors">
              <td className="px-6 py-4"><p className="font-medium text-gray-900">{c.title}</p><p className="text-xs text-gray-400 truncate max-w-xs">{c.content.slice(0, 60)}...</p></td>
              <td className="px-6 py-4"><div className="flex gap-1 flex-wrap">{c.channels.map(ch => <span key={ch} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-700">{channelLabels[ch] || ch}</span>)}</div></td>
              <td className="px-6 py-4 text-sm text-gray-600">{audienceLabels[c.audience]?.label || c.audience}</td>
              <td className="px-6 py-4 text-center"><span className="inline-flex items-center rounded-lg bg-emerald-50 text-emerald-700 px-2.5 py-1 text-sm font-bold">{c.sentCount}</span></td>
              <td className="px-6 py-4 text-sm text-gray-500">{fmtDate(c.createdAt)}</td>
              <td className="px-6 py-4 text-right"><button onClick={()=>setConfirmDelete({id:c.id,title:c.title})} className="text-red-400 hover:text-red-600 text-xs font-medium">🗑 Sil</button></td>
            </tr>
          ))}</tbody></table></div>
        )}
      </div>

      {confirmDelete&&(<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setConfirmDelete(null)}><div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/><div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in" onClick={e=>e.stopPropagation()}><div className="text-center"><div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><span className="text-3xl">⚠️</span></div><h3 className="text-lg font-bold text-gray-900">Kampanya Sil</h3><p className="text-sm text-gray-500 mt-2"><strong>{confirmDelete.title}</strong> silinecek.</p></div><div className="flex gap-3 mt-6"><button onClick={()=>setConfirmDelete(null)} className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button><button onClick={()=>handleDeleteCampaign(confirmDelete.id)} disabled={deleting} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">{deleting?"Siliniyor...":"Sil"}</button></div></div></div>)}

      <style jsx>{`@keyframes fade-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes slide-in{from{opacity:0;transform:translateX(100px)}to{opacity:1;transform:translateX(0)}}@keyframes scale-in{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}.animate-fade-in{animation:fade-in .5s ease-out}.animate-slide-in{animation:slide-in .4s ease-out}.animate-scale-in{animation:scale-in .3s ease-out}`}</style>
    </div>
  );
}
