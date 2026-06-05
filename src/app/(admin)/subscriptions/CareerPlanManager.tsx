"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Save, X, Star, Package } from "lucide-react";

interface CareerPlan {
  id: string;
  name: string;
  interval: string;
  price: number;
  yearlyPrice: number;
  yearlyDiscountRate: number;
  description: string | null;
  badgeText: string | null;
  aiMatchQuota: number;
  aiCvQuota: number;
  cvUploadQuota: number;
  aiTokens: number;
  hasAiAnalyze: boolean;
  hasCvBuilder: boolean;
  hasJobMatching: boolean;
  isActive: boolean;
  isDefault: boolean;
  storeProductId: string | null;
  order: number;
}

const defaultPlan: Partial<CareerPlan> = {
  name: "",
  interval: "monthly",
  price: 0,
  yearlyPrice: 0,
  yearlyDiscountRate: 20,
  description: "",
  badgeText: "",
  aiMatchQuota: 5,
  aiCvQuota: 2,
  cvUploadQuota: 1,
  aiTokens: 100,
  hasAiAnalyze: false,
  hasCvBuilder: true,
  hasJobMatching: false,
  isActive: true,
  isDefault: false,
  storeProductId: "",
};

export default function CareerPlanManager() {
  const [plans, setPlans] = useState<CareerPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Partial<CareerPlan> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/career/subscriptions/plans");
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (e) {
      console.error("Plan yükleme hatası:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const savePlan = async () => {
    if (!editingPlan?.name || editingPlan.price === undefined) return;
    setSaving(true);
    try {
      const method = isCreating ? "POST" : "PUT";
      const res = await fetch("/api/career/subscriptions/plans", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPlan),
      });
      if (res.ok) {
        await fetchPlans();
        setEditingPlan(null);
        setIsCreating(false);
      }
    } catch (e) {
      console.error("Plan kaydetme hatası:", e);
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Bu planı silmek istediğinizden emin misiniz?")) return;
    try {
      const res = await fetch(`/api/career/subscriptions/plans?id=${id}`, { method: "DELETE" });
      if (res.ok) await fetchPlans();
      else {
        const data = await res.json();
        alert(data.error || "Plan silinemedi");
      }
    } catch (e) {
      console.error("Plan silme hatası:", e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            🎯 Kariyer Abonelik Planları
          </h3>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Kariyer modülü için abonelik planlarını yönetin. Store uyumlu.
          </p>
        </div>
        <button
          onClick={() => { setEditingPlan({ ...defaultPlan }); setIsCreating(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: "var(--primary)" }}
        >
          <Plus className="w-4 h-4" />
          Yeni Plan
        </button>
      </div>

      {/* Edit / Create Form */}
      {editingPlan && (
        <div className="p-6 rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
              {isCreating ? "📝 Yeni Plan Oluştur" : "✏️ Plan Düzenle"}
            </h4>
            <button onClick={() => { setEditingPlan(null); setIsCreating(false); }}>
              <X className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Plan Adı *" value={editingPlan.name || ""} onChange={v => setEditingPlan({ ...editingPlan, name: v })} />
            <SelectField label="Periyot" value={editingPlan.interval || "monthly"} options={[{ value: "monthly", label: "Aylık" }, { value: "yearly", label: "Yıllık" }, { value: "lifetime", label: "Ömür Boyu" }]} onChange={v => setEditingPlan({ ...editingPlan, interval: v })} />
            <InputField label="Aylık Fiyat (₺) *" type="number" value={String(editingPlan.price || 0)} onChange={v => setEditingPlan({ ...editingPlan, price: parseFloat(v) })} />
            <InputField label="Yıllık Fiyat (₺)" type="number" value={String(editingPlan.yearlyPrice || 0)} onChange={v => setEditingPlan({ ...editingPlan, yearlyPrice: parseFloat(v) })} />
            <InputField label="Yıllık İndirim (%)" type="number" value={String(editingPlan.yearlyDiscountRate || 20)} onChange={v => setEditingPlan({ ...editingPlan, yearlyDiscountRate: parseInt(v) })} />
            <InputField label="Badge Metni" value={editingPlan.badgeText || ""} onChange={v => setEditingPlan({ ...editingPlan, badgeText: v })} placeholder="Örn: EN POPÜLER" />
          </div>

          <div className="mt-4">
            <InputField label="Açıklama" value={editingPlan.description || ""} onChange={v => setEditingPlan({ ...editingPlan, description: v })} placeholder="Plan açıklaması..." />
          </div>

          <h5 className="font-bold text-sm mt-6 mb-3" style={{ color: "var(--text-primary)" }}>📊 Kota Ayarları</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InputField label="AI Eşleştirme" type="number" value={String(editingPlan.aiMatchQuota || 0)} onChange={v => setEditingPlan({ ...editingPlan, aiMatchQuota: parseInt(v) })} />
            <InputField label="AI CV Oluşturma" type="number" value={String(editingPlan.aiCvQuota || 0)} onChange={v => setEditingPlan({ ...editingPlan, aiCvQuota: parseInt(v) })} />
            <InputField label="CV Yükleme" type="number" value={String(editingPlan.cvUploadQuota || 0)} onChange={v => setEditingPlan({ ...editingPlan, cvUploadQuota: parseInt(v) })} />
            <InputField label="AI Token" type="number" value={String(editingPlan.aiTokens || 0)} onChange={v => setEditingPlan({ ...editingPlan, aiTokens: parseInt(v) })} />
          </div>

          <h5 className="font-bold text-sm mt-6 mb-3" style={{ color: "var(--text-primary)" }}>🔑 Özellikler</h5>
          <div className="flex flex-wrap gap-4">
            <ToggleField label="AI CV Oluşturucu" checked={editingPlan.hasCvBuilder ?? true} onChange={v => setEditingPlan({ ...editingPlan, hasCvBuilder: v })} />
            <ToggleField label="AI İş Eşleştirme" checked={editingPlan.hasJobMatching ?? false} onChange={v => setEditingPlan({ ...editingPlan, hasJobMatching: v })} />
            <ToggleField label="AI İlan Analizi" checked={editingPlan.hasAiAnalyze ?? false} onChange={v => setEditingPlan({ ...editingPlan, hasAiAnalyze: v })} />
            <ToggleField label="Varsayılan Plan" checked={editingPlan.isDefault ?? false} onChange={v => setEditingPlan({ ...editingPlan, isDefault: v })} />
            <ToggleField label="Aktif" checked={editingPlan.isActive ?? true} onChange={v => setEditingPlan({ ...editingPlan, isActive: v })} />
          </div>

          <h5 className="font-bold text-sm mt-6 mb-3" style={{ color: "var(--text-primary)" }}>🏪 Store Entegrasyonu</h5>
          <InputField label="Store Ürün ID" value={editingPlan.storeProductId || ""} onChange={v => setEditingPlan({ ...editingPlan, storeProductId: v })} placeholder="com.kamulog.career.pro_monthly" />

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <button onClick={() => { setEditingPlan(null); setIsCreating(false); }} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              İptal
            </button>
            <button onClick={savePlan} disabled={saving} className="flex items-center gap-2 px-6 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50" style={{ background: "var(--primary)" }}>
              <Save className="w-4 h-4" />
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      )}

      {/* Plans List */}
      {plans.length === 0 ? (
        <div className="text-center py-12 rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <Package className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Henüz kariyer abonelik planı oluşturulmadı.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map(plan => (
            <div key={plan.id} className="p-5 rounded-xl border" style={{ background: "var(--bg-card)", borderColor: plan.isDefault ? "var(--primary)" : "var(--border)", borderWidth: plan.isDefault ? "2px" : "1px" }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                      {plan.name}
                    </h4>
                    {plan.isDefault && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md" style={{ background: "rgba(var(--primary-rgb), 0.1)", color: "var(--primary)" }}>
                        <Star className="w-3 h-3" /> Varsayılan
                      </span>
                    )}
                    {plan.badgeText && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-100 text-amber-700">
                        {plan.badgeText}
                      </span>
                    )}
                    {!plan.isActive && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-red-100 text-red-600">Pasif</span>
                    )}
                  </div>
                  {plan.description && (
                    <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{plan.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-3">
                    <InfoBadge label="Fiyat" value={plan.interval === "lifetime" ? `₺${plan.price} (Tek Seferlik)` : plan.interval === "yearly" && plan.yearlyPrice > 0 ? `₺${plan.yearlyPrice}/yıl` : `₺${plan.price}/ay`} />
                    <InfoBadge label="Periyot" value={plan.interval === "lifetime" ? "Ömür Boyu" : plan.interval === "yearly" ? "Yıllık" : "Aylık"} />
                    <InfoBadge label="AI Token" value={plan.interval === "lifetime" ? "Sınırsız" : String(plan.aiTokens)} />
                    <InfoBadge label="Eşleştirme" value={plan.interval === "lifetime" ? "Sınırsız" : String(plan.aiMatchQuota)} />
                    <InfoBadge label="CV Oluştur" value={String(plan.aiCvQuota)} />
                    <InfoBadge label="CV Yükle" value={String(plan.cvUploadQuota)} />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {plan.hasCvBuilder && <FeatureBadge label="CV Oluşturucu" />}
                    {plan.hasJobMatching && <FeatureBadge label="İş Eşleştirme" />}
                    {plan.hasAiAnalyze && <FeatureBadge label="İlan Analizi" />}
                  </div>
                  {plan.storeProductId && (
                    <p className="text-xs mt-2 font-mono" style={{ color: "var(--text-muted)" }}>
                      Store: {plan.storeProductId}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => { setEditingPlan(plan); setIsCreating(false); }} className="p-2 rounded-lg hover:bg-blue-50" title="Düzenle">
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>
                  {!plan.isDefault && (
                    <button onClick={() => deletePlan(plan.id)} className="p-2 rounded-lg hover:bg-red-50" title="Sil">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Yardımcı bileşenler ────────────────────────────────

function InputField({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm border outline-none" style={{ background: "var(--bg-muted)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 rounded" />
      <span className="text-sm" style={{ color: "var(--text-primary)" }}>{label}</span>
    </label>
  );
}

function InfoBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs" style={{ background: "var(--bg-muted)" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}:</span>
      <span className="font-bold" style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

function FeatureBadge({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-700">
      ✓ {label}
    </span>
  );
}
