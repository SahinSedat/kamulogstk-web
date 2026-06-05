"use client";

import { useEffect, useState } from "react";
import { UserCheck, Trash2, Plus, Search, X, Star, Loader2, Eye, Calendar } from "lucide-react";

interface Consultant {
  id: string;
  name: string;
  title: string;
  category: string;
  bio?: string;
  specializations?: string[];
  email?: string;
  phone?: string;
  avatarUrl?: string;
  rating: number;
  reviewCount: number;
  isOnline: boolean;
  isFeatured: boolean;
  isActive: boolean;
  sessionFeeJeton: number;
  costPerMessage: number;
  maxMessagesPerSession: number;
  experienceYears: number;
  completedConsultations: number;
  consultantCredits: number;
  commissionRate: number;
  iban?: string;
  workingHours?: string;
  createdAt: string;
}

export default function ConsultantsPage() {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedConsultant, setSelectedConsultant] = useState<Consultant | null>(null);

  // Sistem ayarları: komisyon oranı ve jeton kuru
  const [sysCommissionRate, setSysCommissionRate] = useState(20);
  const [sysJetonRate, setSysJetonRate] = useState(50);
  const [avgJetonUnitPrice, setAvgJetonUnitPrice] = useState(0);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchConsultants = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/consultants");
      const data = await res.json();
      setConsultants(data);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchConsultants();
    // Komisyon & jeton kuru yükle
    fetch("/api/admin/consultant-management?tab=settings").then(r => r.json()).then(data => {
      if (data.settings) {
        setSysCommissionRate(parseFloat(data.settings.commission_rate) || 20);
        setSysJetonRate(parseFloat(data.settings.jeton_rate) || 50);
      }
    }).catch(() => {});
    // CreditPackage en düşük birim fiyat (danışman ödemelerinde kullanılan)
    fetch("/api/public/credit-packages").then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length > 0) {
        const unitPrices = data.map((p: { price: number; jetons: number }) => p.price / p.jetons);
        const minPrice = Math.min(...unitPrices);
        setAvgJetonUnitPrice(Math.round(minPrice * 100) / 100);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSystemSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/consultant-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_settings", jetonRate: sysJetonRate, commissionRate: sysCommissionRate }),
      });
      if (res.ok) alert("✅ Ayarlar güncellendi");
      else alert("Hata: " + (await res.json()).error);
    } catch { alert("Sunucu hatası"); }
    setSavingSettings(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" adlı danışmanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/consultants/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConsultants(prev => prev.filter(c => c.id !== id));
      } else {
        alert("Silme hatası");
      }
    } catch { alert("Sunucu hatası"); }
    setDeleting(null);
  };

  const filtered = consultants.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search)
  );

  // İstatistikler
  const totalOnline = consultants.filter(c => c.isOnline).length;
  const totalActive = consultants.filter(c => c.isActive).length;
  const avgRating = consultants.length > 0 ? (consultants.reduce((a, c) => a + c.rating, 0) / consultants.length).toFixed(1) : "0";

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Danışman Yönetimi</h1>
            <p className="text-sm text-gray-500">{consultants.length} kayıtlı • {totalOnline} çevrimiçi • {totalActive} aktif • ⭐ {avgRating}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Danışman Ekle
        </button>
      </div>

      {/* Komisyon & Jeton Kuru Ayarları */}
      <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">📊 Komisyon Oranı:</span>
            <div className="flex items-center gap-1">
              <input type="number" value={sysCommissionRate} onChange={e => setSysCommissionRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <span className="text-xs text-gray-500">%</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">💰 Jeton Kuru:</span>
            <div className="flex items-center gap-1">
              <input type="number" value={sysJetonRate} onChange={e => setSysJetonRate(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <span className="text-xs text-gray-500">₺/jeton</span>
            </div>
          </div>
          <button onClick={saveSystemSettings} disabled={savingSettings}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition disabled:opacity-50">
            {savingSettings ? "Kaydediliyor..." : "💾 Kaydet"}
          </button>
          <span className="text-[10px] text-gray-400">Varsayılan komisyon. Her danışmana bireysel oran atanabilir.</span>
          {avgJetonUnitPrice > 0 && (
            <span className="text-[10px] text-orange-600 font-semibold">💰 Danışman ödeme kuru: 1 jeton = {avgJetonUnitPrice.toFixed(2)} ₺ (en düşük paket birim fiyatı)</span>
          )}
        </div>
      </div>

      {/* Arama */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="İsim, kategori, email veya telefon ile ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        />
      </div>

      {/* Tablo */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Danışman</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Kategori</th>
                <th className="px-4 py-3 font-semibold text-gray-600">İletişim</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Puan</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Oturum / Jeton</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Komisyon</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Takvim</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Durum</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Danışman bulunamadı</td></tr>
              ) : filtered.map(c => {
                const hasWorkingHours = c.workingHours && c.workingHours.startsWith("[");
                let workingDayCount = 0;
                try { if (hasWorkingHours) workingDayCount = JSON.parse(c.workingHours!).length; } catch {}
                return (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt={c.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                            {c.name.charAt(0)}
                          </div>
                        )}
                        {c.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-1">
                          {c.name}
                          {c.isFeatured && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                        </div>
                        <div className="text-xs text-gray-500">{c.title || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium">{c.category}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.email && <div>{c.email}</div>}
                    {c.phone && <div>{c.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-yellow-600 font-semibold">{c.rating.toFixed(1)}</span>
                    <span className="text-gray-400 text-xs"> ({c.reviewCount})</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-indigo-600">💎 {c.sessionFeeJeton}</span>
                    {(c.consultantCredits ?? 0) > 0 && (
                      <div className="text-xs text-gray-400 mt-0.5">Bakiye: {c.consultantCredits}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${(c.commissionRate ?? 20) === 0 ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
                      %{c.commissionRate ?? 20}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {hasWorkingHours ? (
                      <span className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium flex items-center gap-1 justify-center">
                        <Calendar className="w-3 h-3" /> {workingDayCount} gün
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {c.isActive ? "Aktif" : "Pasif"}
                      </span>
                      {c.isOnline && <span className="text-[10px] text-green-500 font-medium">🟢 Online</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedConsultant(c)}
                        className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition"
                        title="Detay"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={deleting === c.id}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        title="Sil"
                      >
                        {deleting === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {/* Danışman Ekleme Modal */}
      {showAddModal && (
        <AddConsultantModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); fetchConsultants(); }}
        />
      )}

      {/* Danışman Detay Modal */}
      {selectedConsultant && (
        <ConsultantDetailModal
          consultant={selectedConsultant}
          onClose={() => setSelectedConsultant(null)}
          onSaved={() => { setSelectedConsultant(null); fetchConsultants(); }}
        />
      )}
    </div>
  );
}

// ─── Danışman Ekleme Modal (Sadeleştirilmiş — sadece kullanıcı bul + danışman yap) ───────────
function AddConsultantModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [foundUser, setFoundUser] = useState<Record<string, string> | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSearchUser = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true); setError(""); setFoundUser(null);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchTerm.trim())}`);
      const data = await res.json();
      if (data.user) {
        setFoundUser(data.user);
      } else {
        setError("Kullanıcı bulunamadı. Email veya telefon ile tekrar deneyin.");
      }
    } catch { setError("Arama hatası"); }
    setSearching(false);
  };

  const handleSave = async () => {
    if (!foundUser) return;
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/consultants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: foundUser.id,
          name: foundUser.name || foundUser.firstName || "İsimsiz",
          email: foundUser.email,
          phone: foundUser.phone,
          title: "Danışman",
          category: "Genel",
          bio: "Profil bilgileri danışman tarafından güncellenecektir.",
          specializations: [],
          experienceYears: 0,
          sessionFeeJeton: 5,
          isFeatured: false,
          isActive: true,
        }),
      });
      if (res.ok) {
        // Kullanıcının rolünü CONSULTANT yap
        await fetch(`/api/users/${foundUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "CONSULTANT" }),
        });
        onAdded();
      } else {
        const err = await res.json();
        setError(err.error || "Ekleme hatası");
      }
    } catch { setError("Sunucu hatası"); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">🆕 Yeni Danışman Kaydet</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm">
            💡 Kullanıcıyı email veya telefon ile bulun, danışman olarak kaydedin. Profil bilgilerini (unvan, kategori, bio, oturum ücreti vb.) <strong>danışmanın kendisi</strong> mobil uygulamadan dolduracaktır.
          </div>

          {/* 1. Kullanıcı Arama */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kullanıcı Bul</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Email veya telefon numarası..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearchUser()}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleSearchUser}
                disabled={searching}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Bulunan kullanıcı */}
          {foundUser && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-green-800 font-bold">
                {(foundUser.name || "?").charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-medium text-green-900">{foundUser.name || foundUser.firstName}</div>
                <div className="text-xs text-green-700">{foundUser.email || foundUser.phone} — Rol: {foundUser.role}</div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}
        </div>

        {foundUser && (
          <div className="p-5 border-t border-gray-100 flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
              İptal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              ✅ Danışman Olarak Kaydet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Danışman Detay Modal (Tüm Parametreler — Readonly + Admin Kontrolleri) ───────────
function ConsultantDetailModal({ consultant, onClose, onSaved }: { consultant: Consultant; onClose: () => void; onSaved: () => void }) {
  const [isActive, setIsActive] = useState(consultant.isActive);
  const [isFeatured, setIsFeatured] = useState(consultant.isFeatured);
  const [sessionFeeJeton, setSessionFeeJeton] = useState(consultant.sessionFeeJeton ?? 5);
  const [costPerMessage, setCostPerMessage] = useState(consultant.costPerMessage ?? 5);
  const [maxMessagesPerSession, setMaxMessagesPerSession] = useState(consultant.maxMessagesPerSession ?? 10);
  const [commissionRate, setCommissionRate] = useState(consultant.commissionRate ?? 20);
  const [saving, setSaving] = useState(false);

  // Çalışma saatleri parse
  type WorkDay = { day: string; slots: string[] };
  let workingDays: WorkDay[] = [];
  try {
    if (consultant.workingHours && consultant.workingHours.startsWith("[")) {
      workingDays = JSON.parse(consultant.workingHours);
    }
  } catch {}

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/consultants/${consultant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive, isFeatured, sessionFeeJeton, costPerMessage, maxMessagesPerSession, commissionRate }),
      });
      if (res.ok) onSaved();
      else alert("Güncelleme hatası");
    } catch { alert("Sunucu hatası"); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                {consultant.name.charAt(0)}
              </div>
              {consultant.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{consultant.name}</h2>
              <p className="text-sm text-gray-500">{consultant.title || "—"} • {consultant.category}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* 👤 Kişisel Bilgiler */}
          <DetailSection icon="👤" title="Kişisel Bilgiler">
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="E-posta" value={consultant.email || "—"} />
              <DetailField label="Telefon" value={consultant.phone || "—"} />
              <DetailField label="Unvan" value={consultant.title || "—"} />
              <DetailField label="Kategori" value={consultant.category} />
              <DetailField label="Deneyim" value={`${consultant.experienceYears} yıl`} />
              <DetailField label="Kayıt Tarihi" value={new Date(consultant.createdAt).toLocaleDateString("tr-TR")} />
            </div>
          </DetailSection>

          {/* 📝 Profil */}
          <DetailSection icon="📝" title="Profil Bilgileri">
            <div className="mb-3">
              <span className="text-xs font-semibold text-gray-500">Hakkımda</span>
              <p className="text-sm text-gray-700 mt-1 leading-relaxed bg-gray-50 p-3 rounded-lg">
                {consultant.bio || <span className="italic text-gray-400">Henüz doldurulmamış</span>}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500">Uzmanlık Alanları</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(consultant.specializations && consultant.specializations.length > 0) ? consultant.specializations.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium">{s}</span>
                )) : <span className="text-xs text-gray-400 italic">Henüz eklenmemiş</span>}
              </div>
            </div>
          </DetailSection>

          {/* 💰 Finansal */}
          <DetailSection icon="💰" title="Finansal Bilgiler">
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Oturum Ücreti" value={`💎 ${sessionFeeJeton} jeton`} highlight />
              <DetailField label="Jeton Bakiyesi" value={`💎 ${consultant.consultantCredits ?? 0}`} />
              <DetailField label="Tamamlanan Görüşme" value={`${consultant.completedConsultations}`} />
              <DetailField label="IBAN" value={consultant.iban || "Girilmemiş"} warn={!consultant.iban} />
            </div>
          </DetailSection>

          {/* 📅 Çalışma Takvimi */}
          <DetailSection icon="📅" title="Çalışma Takvimi">
            {workingDays.length > 0 ? (
              <div className="space-y-2">
                {workingDays.map((wd: WorkDay, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold min-w-[50px] text-center">{wd.day.substring(0, 3)}</span>
                    <div className="flex flex-wrap gap-1">
                      {wd.slots.map((s: string, j: number) => (
                        <span key={j} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px]">{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Çalışma takvimi henüz belirlenmemiş</p>
            )}
          </DetailSection>

          {/* ⚙️ Admin Kontrolleri */}
          <DetailSection icon="⚙️" title="Admin Kontrolleri">
            <div className="space-y-3">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
                  <span className="text-sm text-gray-700">Aktif</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="rounded" />
                  <span className="text-sm text-gray-700">⭐ Öne Çıkan</span>
                </label>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">💎 Oturum Ücreti (Jeton)</label>
                  <input type="number" value={sessionFeeJeton} onChange={e => setSessionFeeJeton(Math.max(1, parseInt(e.target.value) || 5))} min={1}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <p className="text-[10px] text-gray-400 mt-0.5">Minimum 1 jeton</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">💬 Mesaj Başı Jeton</label>
                  <input type="number" value={costPerMessage} onChange={e => setCostPerMessage(parseInt(e.target.value) || 5)} min={0}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">📊 Mesaj Sınırı</label>
                  <input type="number" value={maxMessagesPerSession} onChange={e => setMaxMessagesPerSession(parseInt(e.target.value) || 10)} min={0}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  <p className="text-[10px] text-gray-400 mt-0.5">0 = sınırsız</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">📊 Komisyon Oranı (%)</label>
                  <input type="number" value={commissionRate} onChange={e => setCommissionRate(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))} min={0} max={100}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
                  <p className="text-[10px] text-gray-400 mt-0.5">0 = komisyonsuz</p>
                </div>
              </div>
            </div>
          </DetailSection>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Kapat</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            💾 Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Alt Bileşenler ───────────────────────
function DetailSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-4">
      <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

function DetailField({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div>
      <span className="text-[11px] font-semibold text-gray-400 uppercase">{label}</span>
      <p className={`text-sm font-medium mt-0.5 ${highlight ? "text-indigo-600" : warn ? "text-orange-500 italic" : "text-gray-800"}`}>
        {value}
      </p>
    </div>
  );
}
