"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, X, Loader2 } from "lucide-react";

export default function NotificationActions() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ title: "", body: "", type: "info", userId: "" });
  const router = useRouter();

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90 transition-all glow-primary">
        <Send className="w-4 h-4" /> Bildirim Gönder
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
          <div className="glass-card p-6 w-full max-w-md mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Bildirim Gönder</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs text-text-muted">Başlık *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full text-sm mt-1" /></div>
              <div><label className="text-xs text-text-muted">İçerik *</label>
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full text-sm mt-1 min-h-[80px]" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-text-muted">Tür</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full text-sm mt-1">
                    <option value="info">Bilgi</option><option value="success">Başarılı</option>
                    <option value="warning">Uyarı</option><option value="promo">Kampanya</option>
                  </select></div>
                <div><label className="text-xs text-text-muted">Kullanıcı ID (boş = tümü)</label>
                  <input value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="w-full text-sm mt-1" placeholder="Tüm kullanıcılar" /></div>
              </div>
              <button disabled={pending || !form.title || !form.body} onClick={() => startTransition(async () => {
                await fetch("/api/notifications", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...form, userId: form.userId || null }),
                });
                setOpen(false); setForm({ title: "", body: "", type: "info", userId: "" }); router.refresh();
              })} className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-medium flex items-center justify-center gap-2">
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Gönder
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
