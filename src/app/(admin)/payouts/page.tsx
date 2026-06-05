"use client";
import { useState, useEffect } from "react";
import { Banknote, CheckCircle2, XCircle, Clock, Eye, X, Search, Filter, Settings } from "lucide-react";

interface PayoutReq {
  id: string;
  amountCredits: number;
  amountTL: number;
  jetonRate: number;
  status: string;
  bankDetails?: string;
  adminNote?: string;
  completedAt?: string;
  createdAt: string;
  consultant: {
    id: string;
    name: string;
    category: string;
    iban?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
    consultantCredits?: number;
    completedConsultations?: number;
    commissionRate?: number;
  };
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: "Bekliyor", bg: "bg-amber-100", color: "text-amber-700", icon: Clock },
  COMPLETED: { label: "Ödendi", bg: "bg-green-100", color: "text-green-700", icon: CheckCircle2 },
  REJECTED: { label: "Reddedildi", bg: "bg-red-100", color: "text-red-700", icon: XCircle },
};

export default function PayoutsPage() {
  const [requests, setRequests] = useState<PayoutReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<PayoutReq | null>(null);
  const [processing, setProcessing] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [commissionRate, setCommissionRate] = useState(20);
  const [jetonRate, setJetonRate] = useState(50);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editCommission, setEditCommission] = useState(20);
  const [editJetonRate, setEditJetonRate] = useState(50);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      const r = await fetch(`/api/admin/payouts?${params}`);
      const d = await r.json();
      if (d.success) {
        setRequests(d.data);
        if (d.stats) {
          setCommissionRate(d.stats.commissionRate || 20);
          setJetonRate(d.stats.jetonRate || 50);
          setEditCommission(d.stats.commissionRate || 20);
          setEditJetonRate(d.stats.jetonRate || 50);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [filterStatus]);

  const handleAction = async (id: string, status: "COMPLETED" | "REJECTED") => {
    if (!confirm(status === "COMPLETED" ? "Ödeme yapıldığını onaylıyor musunuz?" : "Talebi reddetmek istediğinize emin misiniz? Jetonlar danışmana iade edilecek.")) return;
    setProcessing(true);
    try {
      const r = await fetch(`/api/admin/payouts?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote }),
      });
      const d = await r.json();
      if (d.success) {
        load();
        setDetail(null);
        setAdminNote("");
        alert(status === "COMPLETED" ? "✅ Ödeme tamamlandı." : "❌ Talep reddedildi, jetonlar iade edildi.");
      } else {
        alert("Hata: " + d.error);
      }
    } catch { alert("Bağlantı hatası"); }
    setProcessing(false);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const r = await fetch("/api/admin/consultant-management", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_settings", jetonRate: editJetonRate, commissionRate: editCommission }),
      });
      if (r.ok) {
        setCommissionRate(editCommission);
        setJetonRate(editJetonRate);
        setShowSettings(false);
        alert("✅ Ayarlar kaydedildi.");
      }
    } catch { alert("Hata!"); }
    setSavingSettings(false);
  };

  const filtered = requests.filter(r => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return r.consultant.name.toLowerCase().includes(s) || (r.consultant.email || "").toLowerCase().includes(s);
  });

  const pendingCount = requests.filter(r => r.status === "PENDING").length;
  const totalPaid = requests.filter(r => r.status === "COMPLETED").reduce((s, r) => s + r.amountTL, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Banknote className="w-8 h-8" style={{ color: "var(--primary)" }} />
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>💰 Danışman Ödeme Talepleri</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Danışmanların nakit çekim taleplerini yönetin</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold text-sm animate-pulse">
              ⏳ {pendingCount} Bekleyen Talep
            </span>
          )}
          <button onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
            <Settings className="w-4 h-4" /> Kur & Komisyon
          </button>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { label: "Toplam Talep", value: requests.length, color: "blue" },
          { label: "Bekleyen", value: pendingCount, color: "amber" },
          { label: "Ödenen", value: requests.filter(r => r.status === "COMPLETED").length, color: "green" },
          { label: "Toplam Net Ödenen", value: `${totalPaid.toLocaleString("tr-TR")} ₺`, color: "purple" },
          { label: "Kur / Komisyon", value: `${jetonRate} ₺ / %${commissionRate}`, color: "rose" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: "var(--text)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtreler */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Danışman adı veya email..." className="w-full pl-10 text-sm" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm">
          <option value="">Tüm Durumlar</option>
          <option value="PENDING">⏳ Bekleyen</option>
          <option value="COMPLETED">✅ Ödenen</option>
          <option value="REJECTED">❌ Reddedilen</option>
        </select>
      </div>

      {/* Tablo */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-bold" style={{ color: "var(--text)" }}>
            <Filter className="w-4 h-4 inline mr-1" /> Talepler ({filtered.length})
          </h3>
        </div>
        {loading ? (
          <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Banknote className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
            <p style={{ color: "var(--text-muted)" }}>Henüz ödeme talebi yok</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Tarih</th><th>Danışman</th><th>IBAN</th><th>Jeton</th><th>Net Tutar</th><th>Görüşme</th><th>Komisyon</th><th>Kalan Jeton</th><th>Durum</th><th>İşlem</th></tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const st = STATUS_MAP[r.status] || STATUS_MAP.PENDING;
                const Icon = st.icon;
                // bankDetails'ten IBAN'ı çıkar
                const ibanDisplay = r.bankDetails?.match(/IBAN:\s*(.+)/)?.[1]?.split("\n")[0]?.trim()
                  || r.consultant.iban || "—";
                return (
                  <tr key={r.id}>
                    <td><span className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(r.createdAt).toLocaleDateString("tr-TR")}</span></td>
                    <td>
                      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{r.consultant.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{r.consultant.email}</p>
                    </td>
                    <td>
                      <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                        {ibanDisplay.length > 20 ? `${ibanDisplay.slice(0, 10)}...${ibanDisplay.slice(-6)}` : ibanDisplay}
                      </span>
                    </td>
                    <td><span className="font-semibold text-indigo-600">💎 {r.amountCredits}</span></td>
                    <td><span className="font-bold text-green-700">{r.amountTL.toLocaleString("tr-TR")} ₺</span></td>
                    <td>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                        💬 {r.consultant.completedConsultations ?? 0}
                      </span>
                    </td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${(r.consultant.commissionRate ?? 20) === 0 ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
                        %{r.consultant.commissionRate ?? 20}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                        💎 {r.consultant.consultantCredits ?? "—"}
                      </span>
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.color}`}>
                        <Icon className="w-3 h-3" /> {st.label}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => { setDetail(r); setAdminNote(""); }} className="p-1.5 rounded-lg hover:bg-gray-100" title="Detay">
                          <Eye className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                        </button>
                        {r.status === "PENDING" && (
                          <>
                            <button onClick={() => handleAction(r.id, "COMPLETED")} className="p-1.5 rounded-lg hover:bg-green-100 text-green-600" title="Ödendi">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleAction(r.id, "REJECTED")} className="p-1.5 rounded-lg hover:bg-red-100 text-red-600" title="Reddet">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detay Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">💰 Ödeme Talebi Detayı</h2>
              <button onClick={() => setDetail(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Danışman */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase">👨‍⚕️ Danışman Bilgileri</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-xs text-gray-400">Ad</p><p className="text-sm font-semibold">{detail.consultant.name}</p></div>
                  <div><p className="text-xs text-gray-400">Kategori</p><p className="text-sm">{detail.consultant.category}</p></div>
                  <div><p className="text-xs text-gray-400">E-posta</p><p className="text-sm">{detail.consultant.email || "—"}</p></div>
                  <div><p className="text-xs text-gray-400">Telefon</p><p className="text-sm">{detail.consultant.phone || "—"}</p></div>
                  <div className="col-span-2"><p className="text-xs text-gray-400">Kalan Jeton Bakiye</p><p className="text-sm font-semibold text-indigo-600">💎 {detail.consultant.consultantCredits ?? 0}</p></div>
                </div>
              </div>

              {/* Finansal Detay */}
              <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-indigo-600 uppercase">💎 Finansal Detay</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Talep Edilen Jeton</span>
                    <span className="font-bold text-indigo-700">💎 {detail.amountCredits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Kur</span>
                    <span className="font-semibold">{detail.jetonRate} ₺/jeton</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Brüt Tutar</span>
                    <span className="font-semibold">{(detail.amountCredits * detail.jetonRate).toLocaleString("tr-TR")} ₺</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Komisyon (%{detail.consultant.commissionRate ?? commissionRate})</span>
                    <span className="font-semibold">-{((detail.amountCredits * detail.jetonRate) - detail.amountTL).toLocaleString("tr-TR")} ₺</span>
                  </div>
                  <hr className="border-indigo-200" />
                  <div className="flex justify-between text-lg">
                    <span className="font-bold text-gray-900">Danışmana Ödenecek</span>
                    <span className="font-black text-green-700">{detail.amountTL.toLocaleString("tr-TR")} ₺</span>
                  </div>
                </div>
              </div>

              {/* Banka / IBAN */}
              <div className="bg-amber-50 rounded-xl p-4">
                <h3 className="text-xs font-bold text-amber-600 uppercase mb-2">🏦 Banka Bilgileri</h3>
                {detail.bankDetails ? (
                  <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap">{detail.bankDetails}</pre>
                ) : detail.consultant.iban ? (
                  <p className="text-sm font-mono text-gray-800">{detail.consultant.iban}</p>
                ) : (
                  <p className="text-sm text-red-500 italic">⚠️ IBAN bilgisi girilmemiş</p>
                )}
              </div>

              {/* Admin notu */}
              {detail.status === "PENDING" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">📝 Admin Notu (opsiyonel)</label>
                  <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={2} placeholder="Ödeme açıklaması..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                </div>
              )}
              {detail.adminNote && detail.status !== "PENDING" && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Admin Notu: {detail.adminNote}</p>
                </div>
              )}
            </div>
            {/* Butonlar */}
            {detail.status === "PENDING" && (
              <div className="p-5 border-t border-gray-100 flex gap-3">
                <button onClick={() => handleAction(detail.id, "REJECTED")} disabled={processing}
                  className="flex-1 py-2.5 border-2 border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50">
                  ❌ Reddet (İade)
                </button>
                <button onClick={() => handleAction(detail.id, "COMPLETED")} disabled={processing}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                  ✅ Ödeme Yapıldı ({detail.amountTL.toLocaleString("tr-TR")} ₺)
                </button>
              </div>
            )}
            {detail.status !== "PENDING" && (
              <div className="p-5 border-t border-gray-100">
                <p className="text-center text-sm text-gray-500">
                  {detail.status === "COMPLETED" ? "✅ Ödeme tamamlandı" : "❌ Talep reddedildi"}
                  {detail.completedAt && ` • ${new Date(detail.completedAt).toLocaleDateString("tr-TR")}`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kur & Komisyon Ayarları Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">⚙️ Kur & Komisyon Ayarları</h2>
              <button onClick={() => setShowSettings(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">💎 1 Jeton = ? TL (Kur)</label>
                <input type="number" value={editJetonRate} onChange={e => setEditJetonRate(parseFloat(e.target.value) || 50)} min={1} step={0.5}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <p className="text-[10px] text-gray-400 mt-1">Jeton satış fiyatı. Danışman hakediş hesabında bu kur kullanılır.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">📊 Komisyon Oranı (%)</label>
                <input type="number" value={editCommission} onChange={e => setEditCommission(parseFloat(e.target.value) || 20)} min={0} max={100} step={1}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                <p className="text-[10px] text-gray-400 mt-1">Danışman hakedişinden kesilecek platform komisyonu.</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-blue-700">
                  <strong>Örnek:</strong> 100 jeton × {editJetonRate} ₺ = {(100 * editJetonRate).toLocaleString("tr-TR")} ₺ brüt →
                  Komisyon %{editCommission} = {(100 * editJetonRate * editCommission / 100).toLocaleString("tr-TR")} ₺ →
                  Net: <strong>{(100 * editJetonRate * (1 - editCommission / 100)).toLocaleString("tr-TR")} ₺</strong>
                </p>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowSettings(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
              <button onClick={handleSaveSettings} disabled={savingSettings}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {savingSettings ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
