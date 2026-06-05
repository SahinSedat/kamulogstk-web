"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Crown, Store, Package } from "lucide-react";

interface CareerPlan {
  id: string;
  name: string;
  interval: string;
  price: number;
  yearlyPrice: number;
  description: string | null;
  badgeText: string | null;
  aiMatchQuota: number;
  aiCvQuota: number;
  cvUploadQuota: number;
  aiTokens: number;
  hasAiAnalyze: boolean;
  hasCvBuilder: boolean;
  hasJobMatching: boolean;
  hasCareerRadar: boolean;
  careerRadarDays: number;
  isActive: boolean;
  isDefault: boolean;
  storeProductId: string | null;
  appleProductId: string | null;
  googleProductId: string | null;
}

const emptyPlan: CareerPlan = {
  id: "",
  name: "",
  interval: "lifetime",
  price: 0,
  yearlyPrice: 0,
  description: "",
  badgeText: "",
  aiMatchQuota: 5,
  aiCvQuota: 50,
  cvUploadQuota: 30,
  aiTokens: 100,
  hasAiAnalyze: true,
  hasCvBuilder: true,
  hasJobMatching: true,
  hasCareerRadar: true,
  careerRadarDays: 30,
  isActive: true,
  isDefault: false,
  storeProductId: null,
  appleProductId: null,
  googleProductId: null,
};

export default function CareerPlanManagerPage() {
  const [plans, setPlans] = useState<CareerPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<CareerPlan | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    try {
      const res = await fetch("/api/career/subscriptions/plans");
      const data = await res.json();
      setPlans(data.plans || []);
    } catch {
      console.error("Planlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  async function savePlan() {
    if (!editingPlan) return;
    setSaving(true);
    try {
      const method = editingPlan.id ? "PUT" : "POST";
      const res = await fetch("/api/career/subscriptions/plans", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPlan),
      });
      if (res.ok) {
        setEditingPlan(null);
        fetchPlans();
      }
    } catch {
      console.error("Plan kaydedilemedi");
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(id: string) {
    if (!confirm("Bu planı silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`/api/career/subscriptions/plans?id=${id}`, { method: "DELETE" });
      fetchPlans();
    } catch {
      console.error("Plan silinemedi");
    }
  }

  const intervalLabel = (interval: string) => {
    switch (interval) {
      case "lifetime": return "Ömür Boyu (Tek Seferlik)";
      case "yearly": return "Yıllık";
      case "monthly": return "Aylık";
      default: return interval;
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-400" /> Kariyer Premium Plan Yönetimi
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Kariyer modülü abonelik planlarını yönetin · Mobil uygulama ile entegre
          </p>
        </div>
        <button
          onClick={() => setEditingPlan({ ...emptyPlan })}
          className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 text-black rounded-xl hover:bg-yellow-400 transition font-semibold"
        >
          <Plus className="w-4 h-4" /> Yeni Plan
        </button>
      </div>

      {/* Plan Kartları */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`border rounded-2xl p-5 relative ${
              plan.isActive
                ? "border-yellow-500/30 bg-yellow-500/5"
                : "border-white/10 bg-white/5 opacity-60"
            }`}
          >
            {/* Durum Badge */}
            <div className="absolute top-3 right-3 flex gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                plan.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
              }`}>
                {plan.isActive ? "Aktif" : "Pasif"}
              </span>
              {plan.isDefault && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">
                  Varsayılan
                </span>
              )}
            </div>

            {/* Plan Bilgileri */}
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              {plan.name}
            </h3>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-yellow-400">₺{plan.price}</span>
              <span className="text-sm text-gray-400">{intervalLabel(plan.interval)}</span>
            </div>

            {plan.badgeText && (
              <span className="inline-block mt-2 px-3 py-1 bg-yellow-500/20 text-yellow-300 text-xs font-bold rounded-full">
                {plan.badgeText}
              </span>
            )}

            {/* Mağaza Entegrasyonu */}
            <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Store className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-purple-300">Mağaza Entegrasyonu</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Apple:</span>{" "}
                  <span className={plan.appleProductId ? "text-green-400" : "text-red-400"}>
                    {plan.appleProductId || "Tanımlı değil"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Google:</span>{" "}
                  <span className={plan.googleProductId ? "text-green-400" : "text-red-400"}>
                    {plan.googleProductId || "Tanımlı değil"}
                  </span>
                </div>
              </div>
            </div>

            {/* Özellik Grid */}
            <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
              <div><span className="text-gray-400">AI Token:</span> <span className="text-white font-semibold">{plan.aiTokens}</span></div>
              <div><span className="text-gray-400">AI Eşleştirme:</span> <span className="text-white font-semibold">{plan.aiMatchQuota}</span></div>
              <div><span className="text-gray-400">AI CV:</span> <span className="text-white font-semibold">{plan.aiCvQuota}</span></div>
              <div><span className="text-gray-400">CV Yükleme:</span> <span className="text-white font-semibold">{plan.cvUploadQuota}</span></div>
              <div><span className="text-gray-400">AI Analiz:</span> <span className={plan.hasAiAnalyze ? 'text-green-400' : 'text-red-400'}>{plan.hasAiAnalyze ? '✓' : '✗'}</span></div>
              <div><span className="text-gray-400">İş Eşleştirme:</span> <span className={plan.hasJobMatching ? 'text-green-400' : 'text-red-400'}>{plan.hasJobMatching ? '✓' : '✗'}</span></div>
              <div><span className="text-gray-400">🎯 Radar:</span> <span className={plan.hasCareerRadar ? 'text-green-400' : 'text-red-400'}>{plan.hasCareerRadar ? `✓ (${plan.careerRadarDays} gün)` : '✗'}</span></div>
            </div>

            {/* İşlem Butonları */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setEditingPlan({ ...plan })}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition text-sm font-medium"
              >
                <Pencil className="w-3.5 h-3.5" /> Düzenle
              </button>
              {!plan.isDefault && (
                <button
                  onClick={() => deletePlan(plan.id)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition text-sm font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Sil
                </button>
              )}
            </div>
          </div>
        ))}

        {plans.length === 0 && (
          <div className="col-span-2 text-center text-gray-400 py-12">
            Henüz plan oluşturulmamış.
          </div>
        )}
      </div>

      {/* Düzenleme Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#0f0e2a] border border-white/10 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">
              {editingPlan.id ? "Plan Düzenle" : "Yeni Plan Oluştur"}
            </h2>

            <div className="space-y-4">
              {/* Plan Adı */}
              <div>
                <label className="text-sm text-gray-400">Plan Adı</label>
                <input
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                  placeholder="Kariyer Premium"
                />
              </div>

              {/* Süre Tipi + Fiyat */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400">Süre Tipi</label>
                  <select
                    value={editingPlan.interval}
                    onChange={(e) => setEditingPlan({ ...editingPlan, interval: e.target.value })}
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                  >
                    <option value="lifetime">Ömür Boyu (Tek Seferlik)</option>
                    <option value="monthly">Aylık</option>
                    <option value="yearly">Yıllık</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400">
                    Fiyat (₺){editingPlan.interval === "lifetime" ? "" : editingPlan.interval === "yearly" ? " /yıl" : " /ay"}
                  </label>
                  <input
                    type="number"
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) })}
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Badge + Açıklama */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400">Badge Metni</label>
                  <input
                    value={editingPlan.badgeText || ""}
                    onChange={(e) => setEditingPlan({ ...editingPlan, badgeText: e.target.value })}
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                    placeholder="TEK SEFERLİK"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">AI Token</label>
                  <input
                    type="number"
                    value={editingPlan.aiTokens}
                    onChange={(e) => setEditingPlan({ ...editingPlan, aiTokens: parseInt(e.target.value) })}
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Açıklama */}
              <div>
                <label className="text-sm text-gray-400">Açıklama</label>
                <textarea
                  value={editingPlan.description || ""}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  rows={2}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none resize-none"
                  placeholder="Ömür boyu tüm kariyer özelliklerine sınırsız erişim"
                />
              </div>

              {/* Mağaza Entegrasyonu */}
              <div className="border border-purple-500/20 rounded-lg p-4 bg-purple-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <Store className="w-4 h-4 text-purple-400" />
                  <label className="text-sm font-semibold text-purple-300">Mağaza Entegrasyonu (RevenueCat)</label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400">Apple Product ID</label>
                    <input
                      value={editingPlan.appleProductId || ""}
                      onChange={(e) => setEditingPlan({ ...editingPlan, appleProductId: e.target.value || null })}
                      className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none"
                      placeholder="kariyer_omurboyu"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Google Product ID</label>
                    <input
                      value={editingPlan.googleProductId || ""}
                      onChange={(e) => setEditingPlan({ ...editingPlan, googleProductId: e.target.value || null })}
                      className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 outline-none"
                      placeholder="kariyer_omurboyu"
                    />
                  </div>
                </div>
              </div>

              {/* Kotalar */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-gray-400">AI Eşleştirme</label>
                  <input type="number" value={editingPlan.aiMatchQuota} onChange={(e) => setEditingPlan({ ...editingPlan, aiMatchQuota: parseInt(e.target.value) })} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm text-gray-400">AI CV</label>
                  <input type="number" value={editingPlan.aiCvQuota} onChange={(e) => setEditingPlan({ ...editingPlan, aiCvQuota: parseInt(e.target.value) })} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm text-gray-400">CV Yükleme</label>
                  <input type="number" value={editingPlan.cvUploadQuota} onChange={(e) => setEditingPlan({ ...editingPlan, cvUploadQuota: parseInt(e.target.value) })} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none" />
                </div>
              </div>

              {/* Radar */}
              <div className="border border-purple-500/20 rounded-lg p-4 bg-purple-500/5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-purple-300">🎯 KariyerAI Radar</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={editingPlan.hasCareerRadar} onChange={(e) => setEditingPlan({ ...editingPlan, hasCareerRadar: e.target.checked })} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                {editingPlan.hasCareerRadar && (
                  <div>
                    <label className="text-sm text-gray-400">Radar Süresi (gün)</label>
                    <input type="number" value={editingPlan.careerRadarDays} onChange={(e) => setEditingPlan({ ...editingPlan, careerRadarDays: parseInt(e.target.value) })} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none" />
                  </div>
                )}
              </div>

              {/* Özellik Bayrakları */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingPlan.hasAiAnalyze} onChange={(e) => setEditingPlan({ ...editingPlan, hasAiAnalyze: e.target.checked })} className="w-4 h-4 accent-blue-500" />
                  <span className="text-sm text-gray-300">AI Analiz</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingPlan.hasCvBuilder} onChange={(e) => setEditingPlan({ ...editingPlan, hasCvBuilder: e.target.checked })} className="w-4 h-4 accent-blue-500" />
                  <span className="text-sm text-gray-300">CV Oluşturucu</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingPlan.hasJobMatching} onChange={(e) => setEditingPlan({ ...editingPlan, hasJobMatching: e.target.checked })} className="w-4 h-4 accent-blue-500" />
                  <span className="text-sm text-gray-300">İş Eşleştirme</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingPlan.isActive} onChange={(e) => setEditingPlan({ ...editingPlan, isActive: e.target.checked })} className="w-4 h-4 accent-green-500" />
                  <span className="text-sm text-gray-300">Aktif</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingPlan(null)} className="flex-1 px-4 py-2.5 bg-white/5 text-white rounded-lg hover:bg-white/10 transition font-medium">
                İptal
              </button>
              <button onClick={savePlan} disabled={saving} className="flex-1 px-4 py-2.5 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition font-semibold disabled:opacity-50">
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
