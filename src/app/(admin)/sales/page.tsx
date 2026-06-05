"use client";
import { useState, useEffect } from "react";
import { CreditCard, CheckCircle2, XCircle, Clock, Package, Plus, Trash2, Eye, X, Edit2 } from "lucide-react";

interface STKPackage { id: string; name: string; description?: string; type: string; price: number; smsAmount: number; whatsappAmount: number; pushAmount: number; emailAmount: number; featuredDays: number; whatsappBotDays: number; durationLabel?: string; isActive: boolean; _count?: { purchases: number }; }
interface PurchaseRequest { id: string; stkId: string; packageId: string; receiptNo: string; receiptFileUrl?: string; amount: number; status: string; reviewNote?: string; reviewedAt?: string; createdAt: string; stk: { id: string; name: string; slug: string; logo?: string; smsCredits: number; whatsappCredits: number; pushCredits: number; emailCredits: number; isFeatured: boolean; featuredUntil?: string }; package: STKPackage; }

const STATUS_MAP: Record<string, { label: string; bg: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: "Bekliyor", bg: "bg-amber-100", color: "text-amber-700", icon: Clock },
  APPROVED: { label: "Onaylandı", bg: "bg-green-100", color: "text-green-700", icon: CheckCircle2 },
  REJECTED: { label: "Reddedildi", bg: "bg-red-100", color: "text-red-700", icon: XCircle },
};
const TYPE_MAP: Record<string, string> = { QUOTA: "📨 Kota Paketi", FEATURED: "⭐ Öne Çıkarma", WA_BOT: "📲 WhatsApp Bot", FULL_LICENSE: "👑 Tam Lisans", COMBO: "🔥 Kombo" };

export default function SalesPage() {
  const [tab, setTab] = useState<"requests" | "packages" | "bank">("requests");
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [packages, setPackages] = useState<STKPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [editPkg, setEditPkg] = useState<STKPackage | null>(null);
  const [detailReq, setDetailReq] = useState<PurchaseRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [pkgForm, setPkgForm] = useState({ name: "", description: "", type: "QUOTA", price: "", smsAmount: "", whatsappAmount: "", pushAmount: "", emailAmount: "", featuredDays: "", whatsappBotDays: "", durationLabel: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Hoşgeldin Kotası state
  const [quotas, setQuotas] = useState({ defaultSmsQuota: "0", defaultPushQuota: "100", defaultWhatsappQuota: "50", defaultEmailQuota: "50" });
  const [quotaSaving, setQuotaSaving] = useState(false);
  const [quotaDistributing, setQuotaDistributing] = useState(false);
  const [showDistributeConfirm, setShowDistributeConfirm] = useState(false);

  // Banka ayarları
  const [bankSettings, setBankSettings] = useState({ bankName: "", bankIban: "", bankAccountHolder: "", paymentDescription: "", commissionRate: "" });
  const [bankSaving, setBankSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [rRes, pRes] = await Promise.all([
        fetch(`/api/admin/sales${filterStatus ? `?status=${filterStatus}` : ""}`),
        fetch("/api/admin/sales/packages"),
      ]);
      const [rData, pData] = await Promise.all([rRes.json(), pRes.json()]);
      if (rData.success) setRequests(rData.data);
      if (pData.success) setPackages(pData.data);
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); }, [filterStatus]);

  // Hoşgeldin kotalarını yükle
  useEffect(() => {
    fetch("/api/admin/settings/quotas").then(r => r.json()).then(d => {
      if (d.success && d.data) {
        setQuotas({
          defaultSmsQuota: String(d.data.defaultSmsQuota || 0),
          defaultPushQuota: String(d.data.defaultPushQuota || 0),
          defaultWhatsappQuota: String(d.data.defaultWhatsappQuota || 0),
          defaultEmailQuota: String(d.data.defaultEmailQuota || 0),
        });
      }
    }).catch(() => {});
  }, []);

  // Banka ayarlarını yükle
  useEffect(() => {
    fetch("/api/admin/settings/bank").then(r => r.json()).then(d => {
      if (d.success && d.data) setBankSettings(prev => ({ ...prev, ...d.data }));
    }).catch(() => {});
  }, []);

  const handleAction = async (id: string, action: "APPROVED" | "REJECTED", note?: string) => {
    if (!confirm(action === "APPROVED" ? "Bu talebi onaylamak ve kredileri yüklemek istediğinize emin misiniz?" : "Bu talebi reddetmek istediğinize emin misiniz?")) return;
    setProcessing(true);
    try {
      const r = await fetch("/api/admin/sales", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, reviewNote: note }),
      });
      const d = await r.json();
      if (d.success) { alert(d.message); load(); setDetailReq(null); setRejectNote(""); }
      else alert("Hata: " + d.error);
    } catch { alert("Bağlantı hatası"); }
    setProcessing(false);
  };

  const handlePkgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editPkg ? "/api/admin/sales/packages" : "/api/admin/sales/packages";
      const method = editPkg ? "PATCH" : "POST";
      const body = editPkg ? { id: editPkg.id, ...pkgForm } : pkgForm;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { setShowPkgForm(false); setEditPkg(null); resetPkgForm(); load(); }
      else alert(d.error);
    } catch { alert("Hata"); }
  };

  const handleDeletePkg = async (id: string) => {
    if (!confirm("Bu paketi silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/admin/sales/packages?id=${id}`, { method: "DELETE" });
    load();
  };

  const handleTogglePkg = async (pkg: STKPackage) => {
    await fetch("/api/admin/sales/packages", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pkg.id, isActive: !pkg.isActive }),
    });
    load();
  };

  const resetPkgForm = () => setPkgForm({ name: "", description: "", type: "QUOTA", price: "", smsAmount: "", whatsappAmount: "", pushAmount: "", emailAmount: "", featuredDays: "", whatsappBotDays: "", durationLabel: "" });

  const startEditPkg = (pkg: STKPackage) => {
    setEditPkg(pkg);
    setPkgForm({ name: pkg.name, description: pkg.description || "", type: pkg.type, price: String(pkg.price), smsAmount: String(pkg.smsAmount), whatsappAmount: String(pkg.whatsappAmount), pushAmount: String(pkg.pushAmount), emailAmount: String(pkg.emailAmount), featuredDays: String(pkg.featuredDays), whatsappBotDays: String(pkg.whatsappBotDays || 0), durationLabel: pkg.durationLabel || "" });
    setShowPkgForm(true);
  };

  const pendingCount = requests.filter(r => r.status === "PENDING").length;
  const totalRevenue = requests.filter(r => r.status === "APPROVED").reduce((s, r) => s + r.amount, 0);

  const handleSaveQuotas = async () => {
    setQuotaSaving(true);
    try {
      const r = await fetch("/api/admin/settings/quotas", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quotas),
      });
      const d = await r.json();
      if (d.success) alert(d.message || "✅ Kotalar kaydedildi!");
      else alert(d.error);
    } catch { alert("Hata"); }
    setQuotaSaving(false);
  };

  const handleDistributeQuotas = async () => {
    setQuotaDistributing(true);
    try {
      const r = await fetch("/api/admin/settings/quotas", { method: "POST" });
      const d = await r.json();
      if (d.success) { alert(d.message); setShowDistributeConfirm(false); }
      else alert(d.error);
    } catch { alert("Hata"); }
    setQuotaDistributing(false);
  };

  const handleSaveBank = async () => {
    setBankSaving(true);
    try {
      const r = await fetch("/api/admin/settings/bank", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankSettings),
      });
      const d = await r.json();
      if (d.success) alert(d.message || "✅ Banka ayarları kaydedildi!");
      else alert(d.error);
    } catch { alert("Hata"); }
    setBankSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="w-8 h-8" style={{ color: "var(--primary)" }} />
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>💰 Satış & Onay Veznesi</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>STK paket satın alma taleplerini yönetin</p>
          </div>
        </div>
        {pendingCount > 0 && <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold text-sm animate-pulse">⏳ {pendingCount} Bekleyen Talep</span>}
      </div>

      {/* İstatistik */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Toplam Talep", value: requests.length, gradient: "from-blue-500 to-blue-600" },
          { label: "Bekleyen", value: pendingCount, gradient: "from-amber-500 to-amber-600" },
          { label: "Onaylanan", value: requests.filter(r => r.status === "APPROVED").length, gradient: "from-green-500 to-emerald-500" },
          { label: "Toplam Gelir", value: `${totalRevenue.toLocaleString("tr-TR")} ₺`, gradient: "from-purple-500 to-purple-600" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: "var(--text)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Hoşgeldin Kotası */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>🎁 Hoşgeldin Kotası (Varsayılan Başlangıç)</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Yeni oluşturulan veya onaylanan STK&apos;lara otomatik atanan başlangıç kredileri</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div><label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>💬 SMS</label><input type="number" value={quotas.defaultSmsQuota} onChange={e => setQuotas(q => ({ ...q, defaultSmsQuota: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
          <div><label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>📱 Push</label><input type="number" value={quotas.defaultPushQuota} onChange={e => setQuotas(q => ({ ...q, defaultPushQuota: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
          <div><label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>📲 WhatsApp</label><input type="number" value={quotas.defaultWhatsappQuota} onChange={e => setQuotas(q => ({ ...q, defaultWhatsappQuota: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
          <div><label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>✉️ E-posta</label><input type="number" value={quotas.defaultEmailQuota} onChange={e => setQuotas(q => ({ ...q, defaultEmailQuota: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSaveQuotas} disabled={quotaSaving} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">{quotaSaving ? "Kaydediliyor..." : "✅ Ayarları Kaydet"}</button>
          <button onClick={() => setShowDistributeConfirm(true)} className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-orange-600 transition shadow-lg shadow-amber-200">🎁 Mevcut Tüm STK&apos;lara Hediye Et</button>
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-2">
        <button onClick={() => setTab("requests")} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === "requests" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>📋 Talepler</button>
        <button onClick={() => setTab("packages")} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === "packages" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>📦 Paket Yönetimi</button>
        <button onClick={() => setTab("bank")} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === "bank" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>🏦 Banka Ayarları</button>
        {tab === "requests" && (
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="ml-auto text-sm rounded-lg border border-gray-200 px-3 py-2">
            <option value="">Tüm Durumlar</option>
            <option value="PENDING">⏳ Bekleyen</option>
            <option value="APPROVED">✅ Onaylanan</option>
            <option value="REJECTED">❌ Reddedilen</option>
          </select>
        )}
        {tab === "packages" && (
          <button onClick={() => { resetPkgForm(); setEditPkg(null); setShowPkgForm(true); }} className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition"><Plus className="w-4 h-4" /> Yeni Paket</button>
        )}
      </div>

      {/* Talepler Tablosu */}
      {tab === "requests" && (
        <div className="card overflow-hidden">
          {loading ? <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>Yükleniyor...</div> :
          requests.length === 0 ? <div className="p-12 text-center"><CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" /><p style={{ color: "var(--text-muted)" }}>Henüz talep yok</p></div> : (
          <table>
            <thead><tr><th>Tarih</th><th>STK</th><th>Paket</th><th>Tutar</th><th>Dekont No</th><th>Durum</th><th>İşlem</th></tr></thead>
            <tbody>{requests.map(r => {
              const st = STATUS_MAP[r.status] || STATUS_MAP.PENDING;
              const Icon = st.icon;
              return (
                <tr key={r.id}>
                  <td><span className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(r.createdAt).toLocaleDateString("tr-TR")}</span></td>
                  <td><p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{r.stk.name}</p></td>
                  <td><span className="badge badge-blue text-xs">{r.package.name}</span></td>
                  <td><span className="font-bold" style={{ color: "var(--text)" }}>{r.amount.toLocaleString("tr-TR")} ₺</span></td>
                  <td><span className="text-sm font-mono" style={{ color: "var(--text)" }}>{r.receiptNo}</span></td>
                  <td><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.color}`}><Icon className="w-3 h-3" /> {st.label}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setDetailReq(r)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Detay"><Eye className="w-4 h-4" style={{ color: "var(--text-secondary)" }} /></button>
                      {r.status === "PENDING" && (<>
                        <button onClick={() => handleAction(r.id, "APPROVED")} className="p-1.5 rounded-lg hover:bg-green-100 text-green-600" title="Onayla"><CheckCircle2 className="w-4 h-4" /></button>
                        <button onClick={() => setDetailReq(r)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-600" title="Reddet"><XCircle className="w-4 h-4" /></button>
                      </>)}
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
          )}
        </div>
      )}

      {/* Paket Yönetimi */}
      {tab === "packages" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map(pkg => (
            <div key={pkg.id} className={`card p-5 relative ${!pkg.isActive ? "opacity-60" : ""}`}>
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">{TYPE_MAP[pkg.type] || pkg.type}</span>
                <div className="flex gap-1">
                  <button onClick={() => startEditPkg(pkg)} className="p-1 hover:bg-gray-100 rounded"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
                  <button onClick={() => handleDeletePkg(pkg.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                </div>
              </div>
              <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>{pkg.name}</h3>
              {pkg.description && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{pkg.description}</p>}
              <p className="text-2xl font-extrabold mt-3" style={{ color: "var(--primary)" }}>{pkg.price.toLocaleString("tr-TR")} ₺</p>
              <div className="mt-3 space-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                {pkg.smsAmount > 0 && <p>💬 {pkg.smsAmount.toLocaleString()} SMS</p>}
                {pkg.whatsappAmount > 0 && <p>📲 {pkg.whatsappAmount.toLocaleString()} WhatsApp</p>}
                {pkg.pushAmount > 0 && <p>📱 {pkg.pushAmount.toLocaleString()} Push</p>}
                {pkg.emailAmount > 0 && <p>✉️ {pkg.emailAmount.toLocaleString()} E-posta</p>}
                {pkg.featuredDays > 0 && <p>⭐ {pkg.featuredDays} gün öne çıkarma</p>}
                {pkg.whatsappBotDays > 0 && <p>📲 {pkg.whatsappBotDays} gün WhatsApp Bot</p>}
                {pkg.durationLabel && <p className="font-semibold text-indigo-600">📅 {pkg.durationLabel}</p>}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{pkg._count?.purchases || 0} satış</span>
                <button onClick={() => handleTogglePkg(pkg)} className={`text-xs px-3 py-1 rounded-full font-medium ${pkg.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {pkg.isActive ? "Aktif" : "Pasif"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Banka Ayarları Tab */}
      {tab === "bank" && (
        <div className="card p-6 space-y-5">
          <div>
            <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>🏦 Banka & Ödeme Ayarları</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>STK yöneticilerinin satın alma sırasında göreceği banka bilgileri</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Banka Adı</label><input value={bankSettings.bankName} onChange={e => setBankSettings(p => ({ ...p, bankName: e.target.value }))} placeholder="Örn: Ziraat Bankası" className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
            <div><label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Hesap Sahibi</label><input value={bankSettings.bankAccountHolder} onChange={e => setBankSettings(p => ({ ...p, bankAccountHolder: e.target.value }))} placeholder="Örn: Kamulog Yazılım A.Ş." className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
          </div>
          <div><label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>IBAN</label><input value={bankSettings.bankIban} onChange={e => setBankSettings(p => ({ ...p, bankIban: e.target.value }))} placeholder="TR00 0000 0000 0000 0000 0000 00" className="w-full mt-1 px-3 py-2 border rounded-xl text-sm font-mono" /></div>
          <div><label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Ödeme Açıklaması (STK&apos;ların göreceği bilgi)</label><textarea value={bankSettings.paymentDescription} onChange={e => setBankSettings(p => ({ ...p, paymentDescription: e.target.value }))} placeholder="Lütfen açıklama kısmına STK adınızı yazınız..." className="w-full mt-1 px-3 py-2 border rounded-xl text-sm resize-none" rows={2} /></div>
          <div className="w-48"><label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Komisyon Oranı (%)</label><input type="number" step="0.01" value={bankSettings.commissionRate} onChange={e => setBankSettings(p => ({ ...p, commissionRate: e.target.value }))} placeholder="0" className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
          <button onClick={handleSaveBank} disabled={bankSaving} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition">{bankSaving ? "Kaydediliyor..." : "✅ Banka Ayarlarını Kaydet"}</button>
        </div>
      )}

      {/* Paket Formu Modal */}
      {showPkgForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowPkgForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900"><Package className="w-5 h-5 inline mr-2" />{editPkg ? "Paket Düzenle" : "Yeni Paket"}</h2>
              <button onClick={() => setShowPkgForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handlePkgSubmit} className="p-5 space-y-4">
              <div><label className="text-xs font-medium text-gray-500">Paket Adı *</label><input required value={pkgForm.name} onChange={e => setPkgForm(p => ({ ...p, name: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
              <div><label className="text-xs font-medium text-gray-500">Açıklama</label><input value={pkgForm.description} onChange={e => setPkgForm(p => ({ ...p, description: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-500">Tür</label>
                  <select value={pkgForm.type} onChange={e => setPkgForm(p => ({ ...p, type: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm">
                    <option value="QUOTA">📨 Kota</option><option value="FEATURED">⭐ Öne Çıkarma</option><option value="WA_BOT">📲 WhatsApp Bot</option><option value="FULL_LICENSE">👑 Tam Lisans</option><option value="COMBO">🔥 Kombo</option>
                  </select>
                </div>
                <div><label className="text-xs font-medium text-gray-500">Fiyat (₺) *</label><input required type="number" step="0.01" value={pkgForm.price} onChange={e => setPkgForm(p => ({ ...p, price: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-500">📅 Süre Etiketi (Ör: Aylık, 6 Aylık, Yıllık)</label><input value={pkgForm.durationLabel} onChange={e => setPkgForm(p => ({ ...p, durationLabel: e.target.value }))} placeholder="Aylık / 6 Aylık / Yıllık" className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500">💬 SMS</label><input type="number" value={pkgForm.smsAmount} onChange={e => setPkgForm(p => ({ ...p, smsAmount: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
                <div><label className="text-xs font-medium text-gray-500">📲 WhatsApp</label><input type="number" value={pkgForm.whatsappAmount} onChange={e => setPkgForm(p => ({ ...p, whatsappAmount: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
                <div><label className="text-xs font-medium text-gray-500">📱 Push</label><input type="number" value={pkgForm.pushAmount} onChange={e => setPkgForm(p => ({ ...p, pushAmount: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
                <div><label className="text-xs font-medium text-gray-500">✉️ E-posta</label><input type="number" value={pkgForm.emailAmount} onChange={e => setPkgForm(p => ({ ...p, emailAmount: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-gray-500">⭐ Öne Çıkarma (gün)</label><input type="number" value={pkgForm.featuredDays} onChange={e => setPkgForm(p => ({ ...p, featuredDays: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
                <div><label className="text-xs font-medium text-gray-500">📲 WhatsApp Bot (gün)</label><input type="number" value={pkgForm.whatsappBotDays} onChange={e => setPkgForm(p => ({ ...p, whatsappBotDays: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm" /></div>
              </div>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowPkgForm(false)} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium">İptal</button><button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">{editPkg ? "Güncelle" : "Oluştur"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Talep Detay Modal */}
      {detailReq && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => { setDetailReq(null); setRejectNote(""); }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">💳 Talep Detayı</h2>
              <button onClick={() => { setDetailReq(null); setRejectNote(""); }} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase">🏢 STK Bilgileri</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-xs text-gray-400">STK Adı</p><p className="text-sm font-semibold">{detailReq.stk.name}</p></div>
                  <div><p className="text-xs text-gray-400">Mevcut SMS</p><p className="text-sm">{detailReq.stk.smsCredits}</p></div>
                  <div><p className="text-xs text-gray-400">Mevcut WhatsApp</p><p className="text-sm">{detailReq.stk.whatsappCredits}</p></div>
                  <div><p className="text-xs text-gray-400">Mevcut Push</p><p className="text-sm">{detailReq.stk.pushCredits}</p></div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-bold text-blue-600 uppercase">📦 Paket Bilgileri</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-xs text-gray-400">Paket</p><p className="text-sm font-semibold">{detailReq.package.name}</p></div>
                  <div><p className="text-xs text-gray-400">Tutar</p><p className="text-lg font-bold text-blue-700">{detailReq.amount.toLocaleString("tr-TR")} ₺</p></div>
                  <div><p className="text-xs text-gray-400">Dekont No</p><p className="text-sm font-mono font-bold">{detailReq.receiptNo}</p></div>
                  <div><p className="text-xs text-gray-400">Tarih</p><p className="text-sm">{new Date(detailReq.createdAt).toLocaleString("tr-TR")}</p></div>
                </div>
                {detailReq.receiptFileUrl && (
                  <div className="mt-2 pt-2 border-t border-blue-100">
                    <a href={detailReq.receiptFileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition">
                      <Eye className="w-3.5 h-3.5" /> Dekontu Görüntüle / İndir
                    </a>
                  </div>
                )}
              </div>
              <div className="bg-emerald-50 rounded-xl p-4">
                <h3 className="text-xs font-bold text-emerald-600 uppercase mb-2">📊 Yüklenecek Krediler</h3>
                <div className="grid grid-cols-2 gap-1 text-sm">
                  {detailReq.package.smsAmount > 0 && <p>💬 +{detailReq.package.smsAmount} SMS</p>}
                  {detailReq.package.whatsappAmount > 0 && <p>📲 +{detailReq.package.whatsappAmount} WhatsApp</p>}
                  {detailReq.package.pushAmount > 0 && <p>📱 +{detailReq.package.pushAmount} Push</p>}
                  {detailReq.package.emailAmount > 0 && <p>✉️ +{detailReq.package.emailAmount} E-posta</p>}
                  {detailReq.package.featuredDays > 0 && <p>⭐ +{detailReq.package.featuredDays} gün öne çıkarma</p>}
                  {(detailReq.package as STKPackage).whatsappBotDays > 0 && <p>📲 +{(detailReq.package as STKPackage).whatsappBotDays} gün WhatsApp Bot</p>}
                </div>
              </div>
            </div>
            {detailReq.status === "PENDING" && (
              <div className="p-5 border-t border-gray-100 space-y-3">
                <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Red sebebi (opsiyonel)..." className="w-full px-3 py-2 border rounded-xl text-sm resize-none" rows={2} />
                <div className="flex gap-3">
                  <button onClick={() => handleAction(detailReq.id, "REJECTED", rejectNote)} disabled={processing} className="flex-1 py-2.5 border-2 border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50">❌ Reddet</button>
                  <button onClick={() => handleAction(detailReq.id, "APPROVED")} disabled={processing} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50">✅ Onayla & Yükle</button>
                </div>
              </div>
            )}
            {detailReq.status !== "PENDING" && (
              <div className="p-5 border-t border-gray-100">
                <p className="text-center text-sm text-gray-500">{detailReq.status === "APPROVED" ? "✅ Bu talep onaylandı" : "❌ Bu talep reddedildi"}{detailReq.reviewedAt && ` • ${new Date(detailReq.reviewedAt).toLocaleDateString("tr-TR")}`}</p>
                {detailReq.reviewNote && <p className="text-center text-xs text-gray-400 mt-1">Not: {detailReq.reviewNote}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dağıtım Onay Modalı */}
      {showDistributeConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowDistributeConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4"><span className="text-3xl">🎁</span></div>
              <h3 className="text-lg font-bold text-gray-900">Tüm STK&apos;lara Dağıt</h3>
              <p className="text-sm text-gray-500 mt-2">Sistemdeki <strong>tüm STK&apos;ların</strong> mevcut kredilerinin üzerine aşağıdaki kotaları <strong>EKLE</strong>yeceksiniz:</p>
              <div className="mt-3 bg-amber-50 rounded-xl p-3 text-sm space-y-1">
                {parseInt(quotas.defaultSmsQuota) > 0 && <p>💬 +{quotas.defaultSmsQuota} SMS</p>}
                {parseInt(quotas.defaultPushQuota) > 0 && <p>📱 +{quotas.defaultPushQuota} Push</p>}
                {parseInt(quotas.defaultWhatsappQuota) > 0 && <p>📲 +{quotas.defaultWhatsappQuota} WhatsApp</p>}
                {parseInt(quotas.defaultEmailQuota) > 0 && <p>✉️ +{quotas.defaultEmailQuota} E-posta</p>}
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowDistributeConfirm(false)} className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
              <button onClick={handleDistributeQuotas} disabled={quotaDistributing} className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-semibold hover:from-amber-600 hover:to-orange-600 disabled:opacity-50">{quotaDistributing ? "Dağıtılıyor..." : "🚀 Dağıt"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
