"use client";
import { useState, useEffect } from "react";
import { X, Loader2, Plus, Trash2, CheckCircle, Tag, Package, Calendar, Percent } from "lucide-react";

interface QuotaData {
  id: string; name: string;
  smsCredits: number; whatsappCredits: number; pushCredits: number; emailCredits: number;
  isFeatured: boolean; featuredUntil?: string;
  hasCustomWaBot: boolean; waBotUntil?: string; waBotStatus?: string;
}
interface STKPkg { id: string; name: string; type: string; price: number; }
interface Promotion {
  id: string; name: string; stkId?: string; packageId?: string;
  discountPercent?: number; discountAmount?: number;
  startDate: string; endDate: string; message?: string; isActive: boolean;
  stk?: { id: string; name: string };
  package?: { id: string; name: string; type: string; price: number };
}

export default function STKQuotaModal({ stkId, stkName, onClose }: { stkId: string; stkName: string; onClose: () => void }) {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [packages, setPackages] = useState<STKPkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"quota" | "campaign">("quota");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Quota form
  const [qForm, setQForm] = useState({ smsCredits: "", whatsappCredits: "", pushCredits: "", emailCredits: "", waBotDays: "", featuredDays: "" });

  // Campaign form
  const [showCampForm, setShowCampForm] = useState(false);
  const [cForm, setCForm] = useState({ name: "", packageId: "", discountPercent: "", discountAmount: "", startDate: "", endDate: "", message: "", forAllStks: false });

  const showToast = (msg: string, type: "success" | "error") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const [qRes, pRes, pkgRes] = await Promise.all([
        fetch(`/api/admin/stk-quota?stkId=${stkId}`),
        fetch(`/api/admin/stk-promotions?stkId=${stkId}`),
        fetch("/api/admin/sales/packages"),
      ]);
      const [qData, pData, pkgData] = await Promise.all([qRes.json(), pRes.json(), pkgRes.json()]);
      if (qData.success) setQuota(qData.data);
      if (pData.success) setPromotions(pData.data);
      if (pkgData.success) setPackages(pkgData.data);
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, [stkId]);

  const handleQuotaSubmit = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/stk-quota", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stkId, ...qForm }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("✅ Kota güncellendi!", "success");
        setQuota(data.data);
        setQForm({ smsCredits: "", whatsappCredits: "", pushCredits: "", emailCredits: "", waBotDays: "", featuredDays: "" });
      } else showToast(data.error || "Hata", "error");
    } catch { showToast("Sunucu hatası", "error"); }
    setSaving(false);
  };

  const handleCampaignSubmit = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/stk-promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cForm,
          stkId: cForm.forAllStks ? null : stkId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("✅ Kampanya oluşturuldu!", "success");
        setShowCampForm(false);
        setCForm({ name: "", packageId: "", discountPercent: "", discountAmount: "", startDate: "", endDate: "", message: "", forAllStks: false });
        load();
      } else showToast(data.error || "Hata", "error");
    } catch { showToast("Sunucu hatası", "error"); }
    setSaving(false);
  };

  const handleDeletePromotion = async (id: string) => {
    if (!confirm("Bu kampanyayı silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`/api/admin/stk-promotions?id=${id}`, { method: "DELETE" });
      showToast("Kampanya silindi", "success");
      load();
    } catch { showToast("Hata", "error"); }
  };

  const handleTogglePromotion = async (id: string, isActive: boolean) => {
    try {
      await fetch("/api/admin/stk-promotions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      load();
    } catch { /* ignore */ }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("tr-TR");
  const daysLeft = (d?: string) => d && new Date(d) > new Date() ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : 0;

  if (loading) return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-12 text-center" onClick={e => e.stopPropagation()}>
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {toast && <div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white ${toast.type === "success" ? "bg-emerald-500" : "bg-red-500"}`}>{toast.msg}</div>}

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">💰 Kota & Kampanya</h3>
            <p className="text-indigo-200 text-sm">{stkName}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 bg-gray-50 shrink-0">
          <button onClick={() => setTab("quota")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === "quota" ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}>📊 Kota Yönetimi</button>
          <button onClick={() => setTab("campaign")} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === "campaign" ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}>🎯 Kampanyalar</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {tab === "quota" && quota && (
            <>
              {/* Mevcut Kotalar */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "SMS", value: quota.smsCredits, icon: "💬", color: "emerald" },
                  { label: "WhatsApp", value: quota.whatsappCredits, icon: "📲", color: "green" },
                  { label: "Push", value: quota.pushCredits, icon: "📱", color: "blue" },
                  { label: "E-posta", value: quota.emailCredits, icon: "✉️", color: "violet" },
                  { label: "Öne Çıkarma", value: daysLeft(quota.featuredUntil) > 0 ? `${daysLeft(quota.featuredUntil)} gün` : "Yok", icon: "⭐", color: "amber" },
                  { label: "WA Bot", value: daysLeft(quota.waBotUntil) > 0 ? `${daysLeft(quota.waBotUntil)} gün` : "Yok", icon: "🤖", color: "teal" },
                ].map(c => (
                  <div key={c.label} className="rounded-xl border border-gray-100 p-3 text-center hover:shadow-sm transition">
                    <span className="text-lg">{c.icon}</span>
                    <p className="text-xl font-bold text-gray-900 mt-1">{typeof c.value === "number" ? c.value.toLocaleString("tr-TR") : c.value}</p>
                    <p className="text-[10px] text-gray-400">{c.label}</p>
                  </div>
                ))}
              </div>

              {/* Kota Ekleme Formu */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-gray-700">➕ Kota Ekle (Mevcut krediye eklenir)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">💬 SMS</label>
                    <input type="number" placeholder="0" value={qForm.smsCredits} onChange={e => setQForm(p => ({ ...p, smsCredits: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">📲 WhatsApp</label>
                    <input type="number" placeholder="0" value={qForm.whatsappCredits} onChange={e => setQForm(p => ({ ...p, whatsappCredits: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">📱 Push</label>
                    <input type="number" placeholder="0" value={qForm.pushCredits} onChange={e => setQForm(p => ({ ...p, pushCredits: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">✉️ E-posta</label>
                    <input type="number" placeholder="0" value={qForm.emailCredits} onChange={e => setQForm(p => ({ ...p, emailCredits: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">🤖 WA Bot (gün uzat)</label>
                    <input type="number" placeholder="0" value={qForm.waBotDays} onChange={e => setQForm(p => ({ ...p, waBotDays: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500 mb-1 block">⭐ Öne Çıkarma (gün uzat)</label>
                    <input type="number" placeholder="0" value={qForm.featuredDays} onChange={e => setQForm(p => ({ ...p, featuredDays: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                </div>
                <button onClick={handleQuotaSubmit} disabled={saving} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Kota Ekle
                </button>
              </div>
            </>
          )}

          {tab === "campaign" && (
            <>
              {/* Kampanya Listesi */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-700">🎯 Aktif Kampanyalar</p>
                <button onClick={() => setShowCampForm(!showCampForm)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Yeni Kampanya
                </button>
              </div>

              {/* Kampanya Oluşturma Formu */}
              {showCampForm && (
                <div className="bg-indigo-50 rounded-xl p-4 space-y-3 border border-indigo-100">
                  <p className="text-xs font-bold text-indigo-700 uppercase flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Yeni Kampanya</p>
                  <input type="text" placeholder="Kampanya adı *" value={cForm.name} onChange={e => setCForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">Paket (opsiyonel)</label>
                      <select value={cForm.packageId} onChange={e => setCForm(p => ({ ...p, packageId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm bg-white">
                        <option value="">Tüm paketler</option>
                        {packages.map(p => <option key={p.id} value={p.id}>{p.name} ({p.price}₺)</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block flex items-center gap-1"><Percent className="w-3 h-3" /> İndirim (%)</label>
                      <input type="number" placeholder="Örn: 10" value={cForm.discountPercent} onChange={e => setCForm(p => ({ ...p, discountPercent: e.target.value, discountAmount: "" }))} className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm bg-white" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block">Sabit İndirim (₺)</label>
                      <input type="number" placeholder="Örn: 600" value={cForm.discountAmount} onChange={e => setCForm(p => ({ ...p, discountAmount: e.target.value, discountPercent: "" }))} className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm bg-white" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" /> Başlangıç *</label>
                      <input type="date" value={cForm.startDate} onChange={e => setCForm(p => ({ ...p, startDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm bg-white" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" /> Bitiş *</label>
                      <input type="date" value={cForm.endDate} onChange={e => setCForm(p => ({ ...p, endDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm bg-white" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[11px] text-gray-500 mb-1 block">Kampanya Mesajı (opsiyonel)</label>
                      <input type="text" placeholder="STK'lara gösterilecek mesaj" value={cForm.message} onChange={e => setCForm(p => ({ ...p, message: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-indigo-200 text-sm bg-white" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={cForm.forAllStks} onChange={e => setCForm(p => ({ ...p, forAllStks: e.target.checked }))} className="rounded accent-indigo-600" />
                    Tüm STK'lara genel kampanya (işaretlenmezse sadece {stkName} için)
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => setShowCampForm(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">İptal</button>
                    <button onClick={handleCampaignSubmit} disabled={saving || !cForm.name || !cForm.startDate || !cForm.endDate || (!cForm.discountPercent && !cForm.discountAmount)} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-indigo-700 flex items-center justify-center gap-1.5">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Oluştur
                    </button>
                  </div>
                </div>
              )}

              {/* Kampanya Listesi */}
              {promotions.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Henüz kampanya yok</div>
              ) : (
                <div className="space-y-2">
                  {promotions.map(p => {
                    const isExpired = new Date(p.endDate) < new Date();
                    const isActive = p.isActive && !isExpired;
                    return (
                      <div key={p.id} className={`rounded-xl border p-4 transition ${isActive ? "border-indigo-200 bg-indigo-50/30" : "border-gray-100 bg-gray-50/50 opacity-60"}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-gray-900">{p.name}</span>
                              {p.discountPercent && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">%{p.discountPercent} İndirim</span>}
                              {p.discountAmount && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">{p.discountAmount}₺ İndirim</span>}
                              {!isActive && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">Pasif</span>}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span>📅 {fmtDate(p.startDate)} — {fmtDate(p.endDate)}</span>
                              {p.package && <span>📦 {p.package.name}</span>}
                              {p.stkId ? <span>🏢 Özel</span> : <span className="text-indigo-600 font-medium">🌐 Tüm STK&apos;lar</span>}
                            </div>
                            {p.message && <p className="text-xs text-gray-500 mt-1 italic">&quot;{p.message}&quot;</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => handleTogglePromotion(p.id, p.isActive)} className={`p-1.5 rounded-lg text-xs transition ${p.isActive ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`} title={p.isActive ? "Pasife al" : "Aktif yap"}>
                              {p.isActive ? "⏸️" : "▶️"}
                            </button>
                            <button onClick={() => handleDeletePromotion(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
