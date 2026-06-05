"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";

export default function SubscriptionActions({ type }: { type: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", price: 0, interval: "monthly", description: "", includedQuota: 5 });
  const router = useRouter();

  if (type !== "createPlan") return null;

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90 transition-all glow-primary">
        <Plus className="w-4 h-4" /> Yeni Plan
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
          <div className="glass-card p-6 w-full max-w-md mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Yeni Abonelik Planı</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs text-text-muted">Plan Adı *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full text-sm mt-1" placeholder="Premium Plan" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-text-muted">Fiyat (₺) *</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className="w-full text-sm mt-1" /></div>
                <div><label className="text-xs text-text-muted">Periyot</label>
                  <select value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })} className="w-full text-sm mt-1">
                    <option value="monthly">Aylık</option><option value="yearly">Yıllık</option>
                  </select></div>
              </div>
              <div><label className="text-xs text-text-muted">Kota</label>
                <input type="number" value={form.includedQuota} onChange={(e) => setForm({ ...form, includedQuota: parseInt(e.target.value) || 0 })} className="w-full text-sm mt-1" /></div>
              <div><label className="text-xs text-text-muted">Açıklama</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full text-sm mt-1 min-h-[60px]" /></div>
              <button disabled={pending || !form.name} onClick={() => startTransition(async () => {
                await fetch("/api/subscriptions/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
                setOpen(false); setForm({ name: "", price: 0, interval: "monthly", description: "", includedQuota: 5 }); router.refresh();
              })} className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-medium flex items-center justify-center gap-2">
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
