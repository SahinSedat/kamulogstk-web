"use client";
import { useState, useEffect, useCallback } from "react";

interface Credits { sms: number; whatsapp: number; email: number; push: number; }
interface Campaign { id: string; title: string; content: string; channel: string; targetAudience: string; targetCount: number; status: string; createdAt: string; }

const CHANNEL_INFO: Record<string, { icon: string; label: string; gradient: string; border: string }> = {
  SMS: { icon: "💬", label: "SMS", gradient: "from-emerald-500 to-teal-500", border: "border-emerald-200" },
  PUSH: { icon: "📱", label: "Push Bildirim", gradient: "from-blue-500 to-indigo-500", border: "border-blue-200" },
  WHATSAPP: { icon: "📲", label: "WhatsApp", gradient: "from-green-500 to-emerald-600", border: "border-green-200" },
  EMAIL: { icon: "✉️", label: "E-Posta", gradient: "from-violet-500 to-purple-500", border: "border-violet-200" },
};

export default function MesajlarPage() {
  const [credits, setCredits] = useState<Credits>({ sms: 0, whatsapp: 0, email: 0, push: 0 });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ title: "", content: "", channel: "PUSH", targetAudience: "ALL" });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/stk-panel/messages"); const json = await res.json();
      if (json.success) { setCredits(json.credits); setCampaigns(json.campaigns); setMemberCount(json.memberCount); }
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const showToast = (msg: string, type: "success" | "error") => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 4000); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    try {
      const res = await fetch("/api/stk-panel/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (json.success) { showToast(json.message || "✅ Gönderildi!", "success"); setForm({ title: "", content: "", channel: "PUSH", targetAudience: "ALL" }); fetchData(); }
      else showToast(json.error || "Hata oluştu", "error");
    } catch { showToast("Sunucu hatası", "error"); } finally { setSending(false); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const creditCards = [
    { key: "sms" as const, label: "SMS Kredisi", icon: "💬", gradient: "from-emerald-500 to-teal-500" },
    { key: "push" as const, label: "Push Kredisi", icon: "📱", gradient: "from-blue-500 to-indigo-500" },
    { key: "whatsapp" as const, label: "WhatsApp", icon: "📲", gradient: "from-green-500 to-emerald-600" },
    { key: "email" as const, label: "E-Posta", icon: "✉️", gradient: "from-violet-500 to-purple-500" },
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (<div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white animate-slide-in max-w-sm ${toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-red-500 to-rose-500"}`}>{toast.message}</div>)}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">📨 Mesajlar & Kampanyalar</h1>
        <p className="text-sm text-gray-500 mt-1">Üyelerinize SMS, Push, WhatsApp veya E-posta ile ulaşın</p>
      </div>

      {/* Credit Cards moved to Bildirimler/Kampanyalar page */}

      {/* Send Form */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
          <h2 className="font-semibold text-white flex items-center gap-2">🚀 Yeni Mesaj Gönder</h2>
          <p className="text-indigo-200 text-xs mt-1">Aktif üye sayısı: {memberCount}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Gönderim Kanalı *</label>
              <select value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-white">
                <option value="PUSH">📱 Push Bildirim</option>
                <option value="SMS">💬 SMS</option>
                <option value="WHATSAPP">📲 WhatsApp</option>
                <option value="EMAIL">✉️ E-Posta</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Hedef Kitle *</label>
              <select value={form.targetAudience} onChange={e => setForm(p => ({ ...p, targetAudience: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-white">
                <option value="ALL">👥 Tüm Üyeler</option>
                <option value="ACTIVE">✅ Aktif Üyeler</option>
                <option value="APPLIED">⏳ Başvuru Bekleyenler</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Başlık *</label>
            <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Aidat Hatırlatması" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Mesaj İçeriği *</label>
            <textarea required rows={4} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Sayın üyemiz, Haziran ayı aidatınızı yatırmanızı rica ederiz..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all resize-none" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-400">
              Seçili kanal kredisi: <strong className={credits[form.channel.toLowerCase() as keyof Credits] > 0 ? "text-emerald-600" : "text-red-600"}>{credits[form.channel.toLowerCase() as keyof Credits]?.toLocaleString("tr-TR") || 0}</strong>
            </div>
            <button type="submit" disabled={sending} className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl hover:from-indigo-700 hover:to-violet-700 transition-all duration-300 active:scale-95 disabled:opacity-50">
              {sending ? "Gönderiliyor..." : "🚀 Gönder"}
            </button>
          </div>
        </form>
      </div>

      {/* Campaign History */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs">📊</span>
            Kampanya Geçmişi
          </h2>
        </div>
        {campaigns.length === 0 ? (
          <div className="py-16 text-center"><p className="text-3xl mb-2">📨</p><p className="text-sm text-gray-400">Henüz kampanya gönderilmemiş</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50/80">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kampanya</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kanal</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Hedef</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kişi</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tarih</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {campaigns.map(c => {
                  const ch = CHANNEL_INFO[c.channel] || CHANNEL_INFO.PUSH;
                  return (
                    <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{c.title}</p>
                        <p className="text-xs text-gray-400 truncate max-w-xs">{c.content.slice(0, 60)}...</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-white ring-1 ${ch.border} text-gray-700`}>{ch.icon} {ch.label}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {c.targetAudience === "ALL" ? "Tümü" : c.targetAudience === "ACTIVE" ? "Aktif" : "Başvuranlar"}
                      </td>
                      <td className="px-6 py-4"><span className="inline-flex items-center rounded-lg bg-indigo-50 text-indigo-700 px-2.5 py-1 text-sm font-bold">{c.targetCount}</span></td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          c.status === "SENT" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" :
                          c.status === "FAILED" ? "bg-red-50 text-red-700 ring-1 ring-red-200" :
                          "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                        }`}>{c.status === "SENT" ? "✓ Gönderildi" : c.status === "FAILED" ? "✗ Başarısız" : "⏳ Bekliyor"}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(c.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slide-in { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .animate-slide-in { animation: slide-in 0.4s ease-out; }
      `}</style>
    </div>
  );
}
