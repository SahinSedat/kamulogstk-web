"use client";

import { useState, useEffect, useCallback } from "react";

interface ApiKeyItem {
  id: string;
  provider: string;
  label: string | null;
  maskedKey: string;
  status: string;
  priority: number;
  usageNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState({ provider: "OPENAI", key: "", label: "", priority: 0 });
  const [saving, setSaving] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai-keys");
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (e) {
      console.error("Anahtar yükleme hatası:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleAdd = async () => {
    if (!newKey.key.trim()) return alert("API anahtarı boş olamaz!");
    setSaving(true);
    try {
      await fetch("/api/admin/ai-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newKey),
      });
      setNewKey({ provider: "OPENAI", key: "", label: "", priority: 0 });
      setShowAddForm(false);
      await fetchKeys();
    } catch (e) {
      alert("Ekleme hatası: " + e);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await fetch("/api/admin/ai-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      await fetchKeys();
    } catch (e) {
      alert("Güncelleme hatası: " + e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu anahtarı silmek istediğinize emin misiniz?")) return;
    try {
      await fetch("/api/admin/ai-keys?id=" + id, { method: "DELETE" });
      await fetchKeys();
    } catch (e) {
      alert("Silme hatası: " + e);
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-300",
      DEPLETED: "bg-red-100 text-red-800 border-red-300",
      INACTIVE: "bg-gray-100 text-gray-600 border-gray-300",
    };
    const labels: Record<string, string> = {
      ACTIVE: "✅ Aktif",
      DEPLETED: "🔴 Kota Dolu",
      INACTIVE: "⏸️ Pasif",
    };
    return (
      <span className={"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border " + (styles[status] || styles.INACTIVE)}>
        {labels[status] || status}
      </span>
    );
  };

  const activeCount = keys.filter(k => k.status === "ACTIVE").length;
  const depletedCount = keys.filter(k => k.status === "DEPLETED").length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🧠 AI Komuta Merkezi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            OpenAI ve Google Gemini API anahtarlarını yönetin. Kota dolduğunda sistem otomatik olarak sıradaki anahtara geçer.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {showAddForm ? "İptal" : "+ Yeni Anahtar"}
        </button>
      </div>

      {/* Durum Kartları */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{keys.length}</div>
          <div className="text-xs text-gray-500 mt-1">Toplam Anahtar</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-emerald-700">{activeCount}</div>
          <div className="text-xs text-emerald-600 mt-1">Aktif Anahtar</div>
        </div>
        <div className={"border rounded-xl p-4 shadow-sm " + (depletedCount > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200")}>
          <div className={"text-2xl font-bold " + (depletedCount > 0 ? "text-red-700" : "text-gray-400")}>{depletedCount}</div>
          <div className={"text-xs mt-1 " + (depletedCount > 0 ? "text-red-600" : "text-gray-400")}>Kota Dolu</div>
        </div>
      </div>

      {/* Fallback Bilgisi */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-2">
          <span className="text-lg">🛟</span>
          <div>
            <div className="text-sm font-semibold text-amber-800">Güvenlik Ağı (Fallback)</div>
            <div className="text-xs text-amber-700 mt-0.5">
              Tüm anahtarlar tükenirse sistem otomatik olarak sunucudaki .env dosyasındaki OPENAI_API_KEY değerine geçer. Servis asla durmaz.
            </div>
          </div>
        </div>
      </div>

      {/* Yeni Anahtar Formu */}
      {showAddForm && (
        <div className="bg-white border rounded-xl p-6 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Yeni API Anahtarı Ekle</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Sağlayıcı</label>
              <select
                value={newKey.provider}
                onChange={e => setNewKey({...newKey, provider: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="OPENAI">OpenAI</option>
                <option value="GEMINI">Google Gemini</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Etiket (opsiyonel)</label>
              <input
                type="text"
                placeholder="Örn: Ana Hesap, Yedek Proje-2"
                value={newKey.label}
                onChange={e => setNewKey({...newKey, label: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 block mb-1">API Anahtarı</label>
              <input
                type="password"
                placeholder="sk-proj-..."
                value={newKey.key}
                onChange={e => setNewKey({...newKey, key: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Öncelik (0 = en yüksek)</label>
              <input
                type="number"
                value={newKey.priority}
                onChange={e => setNewKey({...newKey, priority: parseInt(e.target.value) || 0})}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAdd}
                disabled={saving || !newKey.key.trim()}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Kaydediliyor..." : "Anahtarı Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anahtar Listesi */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
      ) : keys.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center shadow-sm">
          <div className="text-4xl mb-3">🔑</div>
          <div className="text-gray-500 text-sm">
            Henüz API anahtarı eklenmemiş. Sistem .env fallback kullanıyor.
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            İlk Anahtarı Ekle
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k, idx) => (
            <div
              key={k.id}
              className={"bg-white border rounded-xl p-5 shadow-sm transition-all hover:shadow-md " +
                (k.status === "DEPLETED" ? "border-red-200 bg-red-50/30" : "") +
                (k.status === "INACTIVE" ? "opacity-60" : "")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">
                        {k.label || k.provider + " Key"}
                      </span>
                      {statusBadge(k.status)}
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        Öncelik: {k.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <code className="text-xs text-gray-400 font-mono">{k.maskedKey}</code>
                      {k.usageNote && (
                        <span className="text-xs text-red-500">{k.usageNote}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {k.status === "ACTIVE" && (
                    <button
                      onClick={() => handleStatusChange(k.id, "INACTIVE")}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Pasife al"
                    >
                      ⏸️ Pasif Yap
                    </button>
                  )}
                  {k.status === "INACTIVE" && (
                    <button
                      onClick={() => handleStatusChange(k.id, "ACTIVE")}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors"
                      title="Aktif et"
                    >
                      ✅ Aktif Yap
                    </button>
                  )}
                  {k.status === "DEPLETED" && (
                    <button
                      onClick={() => handleStatusChange(k.id, "ACTIVE")}
                      className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Yeniden aktif et"
                    >
                      🔄 Yeniden Aktif Et
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(k.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    title="Sil"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mimari Açıklama */}
      <div className="mt-8 bg-slate-50 border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">⚙️ Nasıl Çalışır?</h3>
        <div className="text-xs text-slate-500 space-y-1.5">
          <p>1. Sistem bir AI isteği aldığında, önce bu tablodaki <strong>ACTIVE</strong> durumlu en düşük öncelik numaralı anahtarı kullanır.</p>
          <p>2. Eğer OpenAI &quot;Kota Doldu&quot; (429) hatası dönerse, o anahtar otomatik olarak <strong>DEPLETED</strong> yapılır ve sıradaki aktif anahtar denenir.</p>
          <p>3. Tüm anahtarlar tükendiyse, sunucudaki <strong>.env</strong> dosyasındaki OPENAI_API_KEY son çare olarak kullanılır.</p>
          <p>4. Kota yenilenen bir anahtarı &quot;Yeniden Aktif Et&quot; butonu ile tekrar devreye alabilirsiniz.</p>
        </div>
      </div>
    </div>
  );
}
