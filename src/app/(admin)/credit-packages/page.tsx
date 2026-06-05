"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Star, StarOff, Save, X, GripVertical, Coins, Smartphone } from "lucide-react";
import JetonOrdersManager from "./JetonOrdersManager";

interface CreditPackage {
  id: string;
  name: string;
  jetons: number;
  price: number;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  description: string | null;
  appleProductId: string | null;
  googleProductId: string | null;
}

export default function CreditPackagesPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    jetons: 0,
    price: 0,
    isPopular: false,
    isActive: true,
    sortOrder: 0,
    description: "",
    appleProductId: "",
    googleProductId: "",
  });

  const fetchPackages = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/credit-packages");
      const data = await res.json();
      setPackages(data.packages || []);
    } catch (err) {
      console.error("Paketler yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const resetForm = () => {
    setForm({ name: "", jetons: 0, price: 0, isPopular: false, isActive: true, sortOrder: 0, description: "", appleProductId: "", googleProductId: "" });
    setEditingId(null);
    setShowCreate(false);
  };

  const startEdit = (pkg: CreditPackage) => {
    setForm({
      name: pkg.name,
      jetons: pkg.jetons,
      price: pkg.price,
      isPopular: pkg.isPopular,
      isActive: pkg.isActive,
      sortOrder: pkg.sortOrder,
      description: pkg.description || "",
      appleProductId: pkg.appleProductId || "",
      googleProductId: pkg.googleProductId || "",
    });
    setEditingId(pkg.id);
    setShowCreate(false);
  };

  const startCreate = () => {
    resetForm();
    setForm((prev) => ({ ...prev, sortOrder: packages.length }));
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!form.name || form.jetons <= 0 || form.price <= 0) {
      alert("Ad, jeton ve fiyat alanları zorunludur.");
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/credit-packages/${editingId}`
        : "/api/admin/credit-packages";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        await fetchPackages();
        resetForm();
      } else {
        alert(data.error || "İşlem başarısız");
      }
    } catch (err) {
      alert("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu paketi silmek istediğinize emin misiniz?")) return;

    try {
      const res = await fetch(`/api/admin/credit-packages/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchPackages();
        if (editingId === id) resetForm();
      }
    } catch (err) {
      alert("Silme hatası");
    }
  };

  const togglePopular = async (pkg: CreditPackage) => {
    try {
      await fetch(`/api/admin/credit-packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPopular: !pkg.isPopular }),
      });
      await fetchPackages();
    } catch (err) {
      alert("Güncelleme hatası");
    }
  };

  const toggleActive = async (pkg: CreditPackage) => {
    try {
      await fetch(`/api/admin/credit-packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });
      await fetchPackages();
    } catch (err) {
      alert("Güncelleme hatası");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--primary)", color: "white" }}>
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Jeton Paketleri</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Mobil uygulama için jeton satış paketlerini yönetin</p>
          </div>
        </div>
        <button
          onClick={startCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "var(--primary)" }}
        >
          <Plus className="w-4 h-4" />
          Yeni Paket
        </button>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-2xl font-bold" style={{ color: "var(--primary)" }}>{packages.length}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Toplam Paket</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-2xl font-bold text-green-600">{packages.filter((p) => p.isActive).length}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Aktif Paket</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-2xl font-bold text-amber-500">{packages.filter((p) => p.isPopular).length}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Popüler İşaretli</p>
        </div>
      </div>

      {/* Form (Oluştur / Düzenle) */}
      {(showCreate || editingId) && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: "var(--card)", border: "1px solid var(--primary)", boxShadow: "0 0 0 3px rgba(99,102,241,0.1)" }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>
              {editingId ? "📝 Paketi Düzenle" : "➕ Yeni Paket Oluştur"}
            </h2>
            <button onClick={resetForm} className="p-1 rounded-lg hover:bg-gray-100 transition">
              <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Paket Adı</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ör: 50 Jeton"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Jeton Miktarı</label>
              <input
                type="number"
                value={form.jetons || ""}
                onChange={(e) => setForm({ ...form, jetons: parseInt(e.target.value) || 0 })}
                placeholder="50"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Fiyat (₺)</label>
              <input
                type="number"
                value={form.price || ""}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                placeholder="500"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Sıralama</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Açıklama (Opsiyonel)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="ör: Danışman oturumları için ideal"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
            />
          </div>

          {/* Mağaza Ürün ID'leri */}
          <div className="rounded-lg p-3" style={{ background: "rgba(99,102,241,0.04)", border: "1px dashed rgba(99,102,241,0.25)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-indigo-600">Mağaza Ürün ID&apos;leri (RevenueCat)</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>
                   Apple Product ID
                </label>
                <input
                  type="text"
                  value={form.appleProductId}
                  onChange={(e) => setForm({ ...form, appleProductId: e.target.value })}
                  placeholder="Örn: com.kamulog.jeton25"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                  style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>
                   Google Product ID
                </label>
                <input
                  type="text"
                  value={form.googleProductId}
                  onChange={(e) => setForm({ ...form, googleProductId: e.target.value })}
                  placeholder="Örn: com.kamulog.jeton25"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                  style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPopular}
                onChange={(e) => setForm({ ...form, isPopular: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>⭐ Popüler İşaretle</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>✅ Aktif</span>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              <Save className="w-4 h-4" />
              {saving ? "Kaydediliyor..." : editingId ? "Güncelle" : "Oluştur"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-gray-100"
              style={{ color: "var(--text-secondary)" }}
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Paket Listesi */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        {packages.length === 0 ? (
          <div className="p-12 text-center">
            <Coins className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              Henüz paket eklenmemiş. &quot;Yeni Paket&quot; ile başlayın.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Sıra</th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Paket Adı</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Jeton</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Fiyat</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Durum</th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>Popüler</th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--text-muted)" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr
                  key={pkg.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <GripVertical className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                      <span style={{ color: "var(--text-muted)" }}>{pkg.sortOrder}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{pkg.name}</p>
                      {pkg.description && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{pkg.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-indigo-600">💎 {pkg.jetons}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{pkg.price} ₺</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(pkg)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                        pkg.isActive
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {pkg.isActive ? "Aktif" : "Pasif"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => togglePopular(pkg)} className="transition hover:scale-110">
                      {pkg.isPopular ? (
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                      ) : (
                        <StarOff className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(pkg)}
                        className="p-1.5 rounded-lg transition hover:bg-blue-50"
                        title="Düzenle"
                      >
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(pkg.id)}
                        className="p-1.5 rounded-lg transition hover:bg-red-50"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Jeton Satın Alma Geçmişi */}
      <JetonOrdersManager />
    </div>
  );
}
