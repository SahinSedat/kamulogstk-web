"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createConsultant, updateConsultant, deleteConsultant, toggleOnlineStatus, toggleFeatured, updateConsultantCredits } from "@/actions/consultants";
import { Plus, X, Loader2, Save, Trash2, Star, Wifi, WifiOff, Edit, Coins } from "lucide-react";

const CATEGORIES = [
  { value: "hukuki", label: "Hukuki Danışmanlık" },
  { value: "idari", label: "İdari Danışmanlık" },
  { value: "mali", label: "Mali Danışmanlık" },
  { value: "kariyer", label: "Kariyer Danışmanlığı" },
  { value: "psikolojik", label: "Psikolojik Danışmanlık" },
  { value: "diger", label: "Diğer" },
];

export function OnlineToggle({ id, isOnline }: { id: string; isOnline: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button disabled={pending} onClick={() => startTransition(async () => { await toggleOnlineStatus(id); router.refresh(); })}
      className={`p-1.5 rounded-lg transition-colors ${isOnline ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}
      title={isOnline ? "Çevrimdışı Yap" : "Çevrimiçi Yap"}>
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
    </button>
  );
}

export function FeaturedToggle({ id, isFeatured }: { id: string; isFeatured: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button disabled={pending} onClick={() => startTransition(async () => { await toggleFeatured(id); router.refresh(); })}
      className={`p-1.5 rounded-lg transition-colors ${isFeatured ? "bg-accent/20 text-accent" : "bg-gray-500/20 text-gray-400"}`}
      title={isFeatured ? "Öne Çıkarmayı Kaldır" : "Öne Çıkar"}>
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
    </button>
  );
}

export function DeleteConsultantBtn({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (confirm) {
    return (
      <div className="flex items-center gap-1">
        <button disabled={pending} onClick={() => startTransition(async () => { await deleteConsultant(id); router.refresh(); })}
          className="p-1.5 rounded-lg bg-red-500 text-white text-xs">
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sil"}
        </button>
        <button onClick={() => setConfirm(false)} className="p-1.5 rounded-lg bg-white/10 text-xs">İptal</button>
      </div>
    );
  }
  return (
    <button onClick={() => setConfirm(true)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Sil">
      <Trash2 className="w-4 h-4" />
    </button>
  );
}

export function CreateConsultantModal() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [specs, setSpecs] = useState("");
  const [form, setForm] = useState({ name: "", title: "", category: "hukuki", bio: "", experienceYears: 0 });
  const router = useRouter();

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90 transition-all glow-primary">
        <Plus className="w-4 h-4" /> Yeni Danışman
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
          <div className="glass-card p-6 w-full max-w-lg mx-4 animate-scale-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Yeni Danışman Ekle</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="p-3 mb-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-text-muted">Ad Soyad *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full text-sm mt-1" /></div>
                <div><label className="text-xs text-text-muted">Unvan *</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full text-sm mt-1" placeholder="Av. / Dr. / Uzm." /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-text-muted">Kategori</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full text-sm mt-1">
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select></div>
                <div><label className="text-xs text-text-muted">Deneyim (yıl)</label>
                  <input type="number" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: parseInt(e.target.value) || 0 })} className="w-full text-sm mt-1" min={0} /></div>
              </div>
              <div><label className="text-xs text-text-muted">Uzmanlık Alanları (virgülle ayırın)</label>
                <input value={specs} onChange={(e) => setSpecs(e.target.value)} className="w-full text-sm mt-1" placeholder="İş Hukuku, İdare Hukuku, Memur Hakları" /></div>
              <div><label className="text-xs text-text-muted">Biyografi *</label>
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="w-full text-sm mt-1 min-h-[80px]" /></div>
              <button disabled={pending} onClick={() => {
                if (!form.name || !form.title || !form.bio) { setError("Ad, unvan ve biyografi zorunlu"); return; }
                setError("");
                startTransition(async () => {
                  await createConsultant({ ...form, specializations: specs.split(",").map((s) => s.trim()).filter(Boolean) });
                  setOpen(false);
                  setForm({ name: "", title: "", category: "hukuki", bio: "", experienceYears: 0 });
                  setSpecs("");
                  router.refresh();
                });
              }} className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-medium flex items-center justify-center gap-2">
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function EditConsultantModal({ consultant }: { consultant: { id: string; name: string; title: string; category: string; bio: string; experienceYears: number; specializations: string[] } }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [specs, setSpecs] = useState(consultant.specializations.join(", "));
  const [form, setForm] = useState({ name: consultant.name, title: consultant.title, category: consultant.category, bio: consultant.bio, experienceYears: consultant.experienceYears });
  const router = useRouter();

  if (!open) return (
    <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Düzenle">
      <Edit className="w-4 h-4" />
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
      <div className="glass-card p-6 w-full max-w-lg mx-4 animate-scale-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Danışman Düzenle</h3>
          <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-text-muted">Ad Soyad</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full text-sm mt-1" /></div>
            <div><label className="text-xs text-text-muted">Unvan</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full text-sm mt-1" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-text-muted">Kategori</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full text-sm mt-1">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select></div>
            <div><label className="text-xs text-text-muted">Deneyim (yıl)</label>
              <input type="number" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: parseInt(e.target.value) || 0 })} className="w-full text-sm mt-1" /></div>
          </div>
          <div><label className="text-xs text-text-muted">Uzmanlık Alanları</label>
            <input value={specs} onChange={(e) => setSpecs(e.target.value)} className="w-full text-sm mt-1" /></div>
          <div><label className="text-xs text-text-muted">Biyografi</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="w-full text-sm mt-1 min-h-[80px]" /></div>
          <button disabled={pending} onClick={() => startTransition(async () => {
            await updateConsultant(consultant.id, { ...form, specializations: specs.split(",").map((s) => s.trim()).filter(Boolean) });
            setOpen(false);
            router.refresh();
          })} className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-medium flex items-center justify-center gap-2">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConsultantCreditManager({ id, currentCredits, currentPrice }: { id: string; currentCredits: number; currentPrice: number }) {
  const [open, setOpen] = useState(false);
  const [credits, setCredits] = useState(currentCredits);
  const [price, setPrice] = useState(currentPrice);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) return (
    <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors" title="Jeton Yönetimi">
      <Coins className="w-4 h-4" />
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
      <div className="glass-card p-6 w-full max-w-sm mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Coins className="w-5 h-5 text-accent" /> Jeton Yönetimi
          </h3>
          <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-muted">Jeton Sayısı</label>
            <input type="number" value={credits} onChange={(e) => setCredits(parseInt(e.target.value) || 0)} className="w-full text-sm mt-1" min={0} />
          </div>
          <div>
            <label className="text-xs text-text-muted">Jeton Fiyatı (₺)</label>
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} className="w-full text-sm mt-1" min={0} />
          </div>
          <button disabled={pending} onClick={() => startTransition(async () => {
            await updateConsultantCredits(id, credits, price);
            setOpen(false);
            router.refresh();
          })} className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-medium flex items-center justify-center gap-2">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

