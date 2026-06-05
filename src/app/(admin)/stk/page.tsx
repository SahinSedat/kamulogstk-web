"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Building2, Plus, Trash2, Search, X, Loader2, MapPin, Users, FolderOpen, MessageSquare, Lock, EyeOff, MoreHorizontal, Edit3, FileText, CheckCircle2, XCircle, Clock, Upload, Image as ImageIcon, BarChart3, LogOut, CheckCheck, Eye, Download, Mail, PenTool } from "lucide-react";

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════
interface STKOrg {
  id: string; name: string; slug: string; type: string; status: string;
  description: string; email?: string; phone?: string; city: string;
  logo?: string; iban?: string; paymentNote?: string; donationNote?: string; duesNote?: string; annualDuesNote?: string; acceptsDonation: boolean; acceptsDues: boolean; acceptsAnnualDues?: boolean; monthlyDuesAmount?: string; annualDuesAmount?: string; bankAccountName?: string;
  requiresMembershipForFinance: boolean;
  showMemberCount: boolean;
  isConsentActive?: boolean;
  consentText?: string;
  contractPdfUrl?: string;
  isApplicationEnabled?: boolean;
  isFeatured?: boolean;
  stkLicenseUntil?: string;
  memberCount: number; topicCount: number; createdAt: string;
  _count?: { members: number; applications: number };
}
interface STKApp {
  id: string; stkId: string; userId?: string; name: string; tcKimlik: string;
  phone: string; email: string; status: string; createdAt: string;
  stk: { id: string; name: string; slug: string };
  consentGiven?: boolean;
  signatureType?: string;
  signatureUrl?: string;
  documentUrl?: string;
  membershipStatus?: string;
  expiryDate?: string;
  approvedAt?: string;
}
interface ForumCat {
  id: string; name: string; slug: string; description?: string;
  icon?: string; color?: string; order: number; isActive: boolean;
  topicCount: number; postCount: number;
}
interface ForumTopic {
  id: string; title: string; slug: string; authorName: string;
  status: string; replyCount: number; viewCount: number;
  createdAt: string; category: { id: string; name: string; icon?: string };
}

const ORG_TYPES = [
  { value: "SENDIKA", label: "Sendika", emoji: "🏛️" },
  { value: "DERNEK", label: "Dernek", emoji: "🤝" },
  { value: "VAKIF", label: "Vakıf", emoji: "🏦" },
  { value: "KONFEDERASYON", label: "Konfederasyon", emoji: "🏗️" },
  { value: "MESLEK_ODASI", label: "Meslek Odası", emoji: "📋" },
  { value: "DIGER", label: "Diğer", emoji: "📌" },
];

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Beklemede", color: "text-amber-700", bg: "bg-amber-50" },
  ACTIVE: { label: "Aktif", color: "text-green-700", bg: "bg-green-50" },
  SUSPENDED: { label: "Askıda", color: "text-red-700", bg: "bg-red-50" },
  INACTIVE: { label: "Pasif", color: "text-gray-700", bg: "bg-gray-100" },
};

const APP_STATUS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING: { label: "Beklemede", color: "text-amber-700", bg: "bg-amber-50", icon: Clock },
  APPROVED: { label: "Onaylandı", color: "text-green-700", bg: "bg-green-50", icon: CheckCircle2 },
  REJECTED: { label: "Reddedildi", color: "text-red-700", bg: "bg-red-50", icon: XCircle },
  RESIGNED: { label: "İstifa Onaylandı", color: "text-gray-600", bg: "bg-gray-100", icon: XCircle },
  RESIGN_PENDING: { label: "İstifa Bekliyor", color: "text-purple-700", bg: "bg-purple-50", icon: Clock },
};

const TOPIC_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: "Açık", color: "text-green-700", bg: "bg-green-50" },
  LOCKED: { label: "Kilitli", color: "text-amber-700", bg: "bg-amber-50" },
  HIDDEN: { label: "Gizli", color: "text-gray-600", bg: "bg-gray-100" },
  DELETED: { label: "Silinmiş", color: "text-red-700", bg: "bg-red-50" },
};

// ═══════════════════════════════════════════════════════
// MAIN PAGE — STK YÖNETİM MERKEZİ
// ═══════════════════════════════════════════════════════
import dynamic from "next/dynamic";

const STKCampaignsPage = dynamic(() => import("@/app/(admin)/stk-campaigns/page"), { loading: () => <div className="p-12 text-center text-gray-400">Yükleniyor...</div> });
const STKPaymentsPage = dynamic(() => import("@/app/(admin)/stk-payments/page"), { loading: () => <div className="p-12 text-center text-gray-400">Yükleniyor...</div> });
const SalesPage = dynamic(() => import("@/app/(admin)/sales/page"), { loading: () => <div className="p-12 text-center text-gray-400">Yükleniyor...</div> });

export default function STKPage() {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (session?.user as any)?.role || "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const managedStkId = (session?.user as any)?.managedStkId || "";
  const isSTKManager = userRole === "STK_MANAGER";
  const [activeTab, setActiveTab] = useState(0);

  const allTabs = [
    { label: "🏢 STK Dizini", id: "stk" },
    { label: "📋 Başvurular", id: "applications" },
    { label: "📢 Kampanyalar", id: "campaigns" },
    { label: "💳 Ödemeler", id: "payments" },
    { label: "💰 Satış & Kota", id: "sales" },
  ];
  const tabs = isSTKManager ? allTabs.filter(t => t.id === "applications") : allTabs;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><Building2 className="w-5 h-5 text-emerald-600" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">🏛️ STK Yönetim Merkezi</h1>
          <p className="text-sm text-gray-500">Tüm STK işlemleriniz tek merkezde</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === i
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {!isSTKManager && tabs[activeTab]?.id === "stk" && <STKTab />}
      {tabs[activeTab]?.id === "applications" && <ApplicationsTab forceStkId={isSTKManager ? managedStkId : undefined} />}
      {tabs[activeTab]?.id === "campaigns" && <STKCampaignsPage />}
      {tabs[activeTab]?.id === "payments" && <STKPaymentsPage />}
      {tabs[activeTab]?.id === "sales" && <SalesPage />}
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// TAB 1: STK DİZİNİ
// ═══════════════════════════════════════════════════════
function STKTab() {
  const [orgs, setOrgs] = useState<STKOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editOrg, setEditOrg] = useState<STKOrg | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [licenseModal, setLicenseModal] = useState<{id:string;name:string;current?:string}|null>(null);
  const [licenseDays, setLicenseDays] = useState("365");

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("type", filterType);
      const res = await fetch(`/api/admin/stk/organizations?${params}`);
      const json = await res.json();
      if (json.success) setOrgs(json.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchOrgs(); }, [filterType]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" kuruluşunu silmek istediğinize emin misiniz?`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/stk/organizations?id=${id}`, { method: "DELETE" });
      if (res.ok) setOrgs(prev => prev.filter(o => o.id !== id));
    } catch {}
    setDeleting(null);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/admin/stk/organizations?id=${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setOrgs(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    } catch {}
  };

  const handleToggleFeatured = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/admin/stk/organizations?id=${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !current }),
      });
      setOrgs(prev => prev.map(o => o.id === id ? { ...o, isFeatured: !current } : o));
    } catch {}
  };

  const handleGrantLicense = async () => {
    if (!licenseModal) return;
    const days = parseInt(licenseDays) || 365;
    try {
      const res = await fetch(`/api/admin/stk/organizations?id=${licenseModal.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stkLicenseUntil: new Date(Date.now() + days * 86400000).toISOString() }),
      });
      if (res.ok) {
        fetchOrgs();
        setLicenseModal(null);
      }
    } catch {}
  };

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) || o.city.toLowerCase().includes(search.toLowerCase())
  );
  const getTypeInfo = (type: string) => ORG_TYPES.find(t => t.value === type) || { value: type, label: type, emoji: "📌" };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><Building2 className="w-5 h-5 text-emerald-600" /></div>
          <div><h2 className="text-xl font-bold text-gray-900">STK Dizini</h2><p className="text-sm text-gray-500">{orgs.length} kayıtlı kuruluş</p></div>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-medium text-sm">
          <Plus className="w-4 h-4" /> Yeni STK Ekle
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="İsim veya şehir ile ara..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Tüm Türler</option>
          {ORG_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100 text-left">
              <th className="px-4 py-3 font-semibold text-gray-600">Kuruluş</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Tür</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Şehir</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-center">Üye</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-center">Finans</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-center">Öne Çıkar</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-center">Lisans</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-center">Durum</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-center">İşlem</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Kayıtlı STK bulunamadı</td></tr>
              ) : filtered.map((o: STKOrg) => {
                const ti = getTypeInfo(o.type); const st = STATUS_MAP[o.status] || STATUS_MAP.PENDING;
                return (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3"><div className="flex items-center gap-3">
                      {o.logo ? (
                        <img src={o.logo} alt={o.name} className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-lg">{ti.emoji}</div>
                      )}
                      <div><div className="font-medium text-gray-900">{o.name}</div><div className="text-xs text-gray-400">{o.email || o.slug}</div></div>
                    </div></td>
                    <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">{ti.label}</span></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-1 text-gray-600 text-xs"><MapPin className="w-3 h-3" /> {o.city}</div></td>
                    <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1 text-gray-600 text-xs"><Users className="w-3 h-3" /> {o.memberCount}</div></td>
                    <td className="px-4 py-3 text-center">
                      {o.acceptsDonation && <span className="text-xs" title="Bağış">💙</span>}
                      {o.acceptsDues && <span className="text-xs" title="Aidat">💳</span>}
                      {o.requiresMembershipForFinance && <span className="text-xs ml-1" title="Üyelik Gerekli">🔒</span>}
                      {!o.acceptsDonation && !o.acceptsDues && <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleFeatured(o.id, o.isFeatured ?? false)}
                        className={`p-2 rounded-lg transition text-lg ${o.isFeatured ? 'bg-amber-100 hover:bg-amber-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                        title={o.isFeatured ? 'Öne çıkarmayı kaldır' : 'Anasayfada öne çıkar'}
                      >
                        {o.isFeatured ? '⭐' : '☆'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(() => {
                        const lic = o.stkLicenseUntil ? new Date(o.stkLicenseUntil) : null;
                        const isActive = lic && lic > new Date();
                        const daysLeft = lic ? Math.ceil((lic.getTime() - Date.now()) / 86400000) : 0;
                        return (
                          <button
                            onClick={() => setLicenseModal({id:o.id, name:o.name, current: o.stkLicenseUntil})}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${isActive ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 ring-1 ring-amber-300 hover:ring-amber-400' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                            title={isActive ? `Bitiş: ${lic!.toLocaleDateString('tr-TR')}` : 'Lisans ver'}
                          >
                            {isActive ? `👑 ${daysLeft}g` : '🔒 Yok'}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <select value={o.status} onChange={e => handleStatusChange(o.id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${st.bg} ${st.color}`}>
                        {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <a href={`/stk-radar/${o.id}`} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition" title="Gözetim Kulesi">
                          <Eye className="w-4 h-4" />
                        </a>
                        <button onClick={() => setEditOrg(o)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Düzenle">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(o.id, o.name)} disabled={deleting === o.id}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                          {deleting === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && <STKFormModal onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); fetchOrgs(); }} />}
      {editOrg && <STKFormModal org={editOrg} onClose={() => setEditOrg(null)} onSaved={() => { setEditOrg(null); fetchOrgs(); }} />}

      {/* Lisans Modalı */}
      {licenseModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLicenseModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 rounded-t-2xl" style={{ background: 'linear-gradient(135deg, #F59E0B, #EA580C)' }}>
              <h3 className="text-lg font-bold text-white">👑 STK Lisans Ver</h3>
              <p className="text-amber-100 text-sm mt-1">{licenseModal.name}</p>
            </div>
            <div className="p-6 space-y-4">
              {licenseModal.current && new Date(licenseModal.current) > new Date() && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">⚡ Mevcut lisans: {new Date(licenseModal.current).toLocaleDateString('tr-TR')}&apos;e kadar aktif</p>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">Süre (Gün)</label>
                <div className="flex gap-2 mt-2">
                  {['30', '90', '180', '365'].map(d => (
                    <button key={d} onClick={() => setLicenseDays(d)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${licenseDays === d ? 'bg-amber-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{d}</button>
                  ))}
                </div>
                <input type="number" value={licenseDays} onChange={e => setLicenseDays(e.target.value)} className="w-full mt-2 px-3 py-2 border rounded-xl text-sm text-center" placeholder="Gün sayısı" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setLicenseModal(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">İptal</button>
                <button onClick={handleGrantLicense} className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold transition-all" style={{ background: 'linear-gradient(135deg, #F59E0B, #EA580C)' }}>👑 Lisans Ver</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 2: BAŞVURULAR (STK FİLTRESİ + ARAMA + İSTATİSTİK)
// ═══════════════════════════════════════════════════════
function ApplicationsTab({ forceStkId }: { forceStkId?: string }) {
  const [apps, setApps] = useState<STKApp[]>([]);
  const [orgs, setOrgs] = useState<STKOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSTK, setFilterSTK] = useState("");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [detailApp, setDetailApp] = useState<STKApp | null>(null);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (forceStkId) params.set("stkId", forceStkId); else if (filterSTK) params.set("stkId", filterSTK);
      const res = await fetch(`/api/admin/stk/applications?${params}`);
      const json = await res.json();
      if (json.success) setApps(json.data);
    } catch {}
    setLoading(false);
  };

  const fetchOrgs = async () => {
    try {
      const res = await fetch("/api/admin/stk/organizations");
      const json = await res.json();
      if (json.success) setOrgs(json.data);
    } catch {}
  };

  useEffect(() => { fetchOrgs(); }, []);
  useEffect(() => { fetchApps(); }, [filterStatus, filterSTK]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdating(id);
    try {
      await fetch(`/api/admin/stk/applications?id=${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setApps(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch {}
    setUpdating(null);
  };

  // Arama filtresi
  const filteredApps = apps.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.phone.includes(q) || a.tcKimlik.includes(q);
  });

  // STK bazlı istatistikler
  const stkStats = orgs.map(o => {
    const stkApps = apps.filter(a => a.stkId === o.id);
    return {
      ...o,
      totalApps: stkApps.length,
      pending: stkApps.filter(a => a.status === "PENDING").length,
      approved: stkApps.filter(a => a.status === "APPROVED").length,
      rejected: stkApps.filter(a => a.status === "REJECTED").length,
      resigned: stkApps.filter(a => a.status === "RESIGNED").length,
      resignPending: stkApps.filter(a => a.status === "RESIGN_PENDING").length,
    };
  }).filter(s => s.totalApps > 0);

  const totalPending = apps.filter(a => a.status === "PENDING").length;
  const totalApproved = apps.filter(a => a.status === "APPROVED").length;
  const totalRejected = apps.filter(a => a.status === "REJECTED").length;
  const totalResigned = apps.filter(a => a.status === "RESIGNED").length;
  const totalResignPending = apps.filter(a => a.status === "RESIGN_PENDING").length;

  const toggleSelect = (id: string) => setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const selectAll = () => { if (selectedIds.size === filteredApps.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filteredApps.map(a => a.id))); };
  const handleBulkAction = async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size} başvuruyu "${newStatus === "APPROVED" ? "Onayla" : newStatus === "REJECTED" ? "Reddet" : "İstifa Onayla"}" olarak işaretlemek istediğinize emin misiniz?`)) return;
    setBulkProcessing(true);
    try {
      await fetch("/api/admin/stk/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(selectedIds), status: newStatus }) });
      setSelectedIds(new Set());
      fetchApps();
    } catch {}
    setBulkProcessing(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><FileText className="w-5 h-5 text-amber-600" /></div>
          <div><h2 className="text-xl font-bold text-gray-900">STK Başvuruları</h2><p className="text-sm text-gray-500">{apps.length} toplam başvuru</p></div>
        </div>
        <button onClick={() => setShowStats(!showStats)} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
          <BarChart3 className="w-4 h-4" /> {showStats ? "İstatistikleri Gizle" : "İstatistikleri Göster"}
        </button>
      </div>

      {/* Genel istatistik kartları */}
      {showStats && (
        <div className="grid grid-cols-5 gap-3 mb-4">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center cursor-pointer hover:ring-2 hover:ring-amber-300 transition" onClick={() => setFilterStatus(filterStatus === "PENDING" ? "" : "PENDING")}>
            <div className="text-2xl font-bold text-amber-700">{totalPending}</div>
            <div className="text-xs text-amber-600 font-medium">Beklemede</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center cursor-pointer hover:ring-2 hover:ring-green-300 transition" onClick={() => setFilterStatus(filterStatus === "APPROVED" ? "" : "APPROVED")}>
            <div className="text-2xl font-bold text-green-700">{totalApproved}</div>
            <div className="text-xs text-green-600 font-medium">Onaylandı</div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center cursor-pointer hover:ring-2 hover:ring-red-300 transition" onClick={() => setFilterStatus(filterStatus === "REJECTED" ? "" : "REJECTED")}>
            <div className="text-2xl font-bold text-red-700">{totalRejected}</div>
            <div className="text-xs text-red-600 font-medium">Reddedildi</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:ring-2 hover:ring-gray-300 transition" onClick={() => setFilterStatus(filterStatus === "RESIGNED" ? "" : "RESIGNED")}>
            <div className="text-2xl font-bold text-gray-600">{totalResigned}</div>
            <div className="text-xs text-gray-500 font-medium">İstifa Onaylı</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center cursor-pointer hover:ring-2 hover:ring-purple-300 transition" onClick={() => setFilterStatus(filterStatus === "RESIGN_PENDING" ? "" : "RESIGN_PENDING")}>
            <div className="text-2xl font-bold text-purple-700">{totalResignPending}</div>
            <div className="text-xs text-purple-500 font-medium">İstifa Bekliyor</div>
          </div>
        </div>
      )}

      {/* STK bazlı istatistik kartları */}
      {stkStats.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4 text-gray-500" /><span className="text-sm font-semibold text-gray-700">STK Bazlı İstatistikler</span></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {stkStats.map(s => (
              <button key={s.id} onClick={() => setFilterSTK(s.id === filterSTK ? "" : s.id)}
                className={`text-left p-3 rounded-xl border transition ${filterSTK === s.id ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200" : "border-gray-100 bg-white hover:border-emerald-200"}`}>
                <div className="font-medium text-gray-900 text-sm truncate">{s.name}</div>
                <div className="flex gap-3 mt-2 text-xs flex-wrap">
                  <span className="text-amber-600">⏳ {s.pending}</span>
                  <span className="text-green-600">✅ {s.approved}</span>
                  <span className="text-red-500">❌ {s.rejected}</span>
                  <span className="text-gray-500">🚪 {s.resigned}</span>
                  <span className="text-purple-500">⏳ {s.resignPending}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">Toplam: {s.totalApps}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtreler + Arama */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="İsim, e-posta, telefon veya TC ile ara..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm" />
        </div>
        <select value={filterSTK} onChange={e => setFilterSTK(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">Tüm STK'lar</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">Tüm Durumlar</option>
          {Object.entries(APP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {filterSTK && <div className="mb-3 flex items-center gap-2"><span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full font-medium">🏢 {orgs.find(o => o.id === filterSTK)?.name}</span><button onClick={() => setFilterSTK("")} className="text-xs text-gray-400 hover:text-gray-600">✕ Filtreyi kaldır</button></div>}

      {/* Toplu İşlem Çubuğu */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-sm font-medium text-amber-800">{selectedIds.size} başvuru seçildi</span>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => handleBulkAction("APPROVED")} disabled={bulkProcessing}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50">
              <CheckCheck className="w-3 h-3" /> Toplu Onayla
            </button>
            <button onClick={() => handleBulkAction("REJECTED")} disabled={bulkProcessing}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50">
              <XCircle className="w-3 h-3" /> Toplu Reddet
            </button>
            <button onClick={() => handleBulkAction("RESIGNED")} disabled={bulkProcessing}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded-lg text-xs font-medium hover:bg-gray-700 disabled:opacity-50">
              <LogOut className="w-3 h-3" /> İstifa Onayla
            </button>
            <button onClick={async () => {
              if (!confirm(`${selectedIds.size} başvuruyu kalıcı olarak SİLMEK istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`)) return;
              setBulkProcessing(true);
              try {
                await fetch("/api/admin/stk/applications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(selectedIds) }) });
                setSelectedIds(new Set());
                fetchApps();
              } catch {}
              setBulkProcessing(false);
            }} disabled={bulkProcessing}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-700 text-white rounded-lg text-xs font-medium hover:bg-rose-800 disabled:opacity-50">
              <Trash2 className="w-3 h-3" /> Toplu Sil
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-medium">
              İptal
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100 text-left">
              <th className="px-4 py-3"><input type="checkbox" checked={selectedIds.size === filteredApps.length && filteredApps.length > 0} onChange={selectAll} className="rounded accent-amber-600" /></th>
              <th className="px-4 py-3 font-semibold text-gray-600">Başvuran</th>
              <th className="px-4 py-3 font-semibold text-gray-600">STK</th>
              <th className="px-4 py-3 font-semibold text-gray-600">TC Kimlik</th>
              <th className="px-4 py-3 font-semibold text-gray-600">İletişim</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Tarih</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-center">Durum</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-center">İşlem</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-center">Detay</th>
            </tr></thead>
            <tbody>
              {filteredApps.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">{search ? "Aramayla eşleşen başvuru yok" : "Henüz başvuru yok"}</td></tr>
              ) : filteredApps.map(a => {
                const as2 = APP_STATUS[a.status] || APP_STATUS.PENDING;
                const StatusIcon = as2.icon;
                return (
                  <tr key={a.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition ${selectedIds.has(a.id) ? "bg-amber-50/30" : ""}`}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggleSelect(a.id)} className="rounded accent-amber-600" /></td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{a.name}</div>
                      <div className="text-xs text-gray-400">{a.email}</div>
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">{a.stk.name}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-mono">{a.tcKimlik}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{a.phone}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(a.createdAt).toLocaleDateString("tr-TR")}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${as2.bg} ${as2.color}`}>
                        <StatusIcon className="w-3 h-3" /> {as2.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a.status === "PENDING" ? (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleStatusChange(a.id, "APPROVED")} disabled={updating === a.id}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50">
                            {updating === a.id ? "..." : "✓ Onayla"}
                          </button>
                          <button onClick={() => handleStatusChange(a.id, "REJECTED")} disabled={updating === a.id}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50">
                            ✕ Reddet
                          </button>
                        </div>
                      ) : (
                        <select value={a.status} onChange={e => handleStatusChange(a.id, e.target.value)}
                          className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${as2.bg} ${as2.color}`}>
                          {Object.entries(APP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setDetailApp(a)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm" title="Detay">
                        <FileText className="w-3.5 h-3.5" /> Detay
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {detailApp && <ApplicationDetailModal app={detailApp} onClose={() => setDetailApp(null)} />}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// MODAL: BAŞVURU DETAY
// ═══════════════════════════════════════════════════════
function ApplicationDetailModal({ app, onClose }: { app: STKApp; onClose: () => void }) {
  const as2 = APP_STATUS[app.status] || APP_STATUS.PENDING;
  const StatusIcon = as2.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">📋 Başvuru Detayı</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Durum */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold ${as2.bg} ${as2.color}`}>
              <StatusIcon className="w-4 h-4" /> {as2.label}
            </span>
            <span className="text-xs text-gray-400">{new Date(app.createdAt).toLocaleDateString("tr-TR")} {new Date(app.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>

          {/* Kişisel Bilgiler */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">👤 Kişisel Bilgiler</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-400">Ad Soyad</p><p className="text-sm font-semibold text-gray-900">{app.name}</p></div>
              <div><p className="text-xs text-gray-400">TC Kimlik</p><p className="text-sm font-mono text-gray-900">{app.tcKimlik}</p></div>
              <div><p className="text-xs text-gray-400">E-posta</p><p className="text-sm text-gray-900">{app.email}</p></div>
              <div><p className="text-xs text-gray-400">Telefon</p><p className="text-sm text-gray-900">{app.phone}</p></div>
            </div>
          </div>

          {/* Üyelik Durumu */}
          <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">🎫 Üyelik Durumu</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-400">Durum</p><p className="text-sm font-semibold">{
                app.membershipStatus === "ACTIVE" ? <span className="text-green-600">✅ Aktif</span> :
                app.membershipStatus === "SUSPENDED" ? <span className="text-amber-600">⏸️ Askıda</span> :
                app.membershipStatus === "EXPIRED" ? <span className="text-red-600">❌ Süresi Dolmuş</span> :
                <span className="text-gray-500">⏳ Beklemede</span>
              }</p></div>
              <div><p className="text-xs text-gray-400">Bitiş Tarihi</p><p className="text-sm font-semibold text-gray-900">{
                app.expiryDate ? new Date(app.expiryDate).toLocaleDateString("tr-TR") : "Belirsiz"
              }</p></div>
            </div>
          </div>

          {/* STK Bilgisi */}
          <div className="bg-emerald-50 rounded-xl p-4">
            <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">🏛️ STK</h3>
            <p className="text-sm font-semibold text-gray-900 mt-1">{app.stk.name}</p>
            {app.approvedAt && <p className="text-xs text-gray-500 mt-1">Onay Tarihi: {new Date(app.approvedAt).toLocaleDateString("tr-TR")}</p>}
          </div>

          {/* Onam Durumu */}
          <div className="bg-purple-50 rounded-xl p-4">
            <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider">⚖️ Onam & Sözleşme</h3>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                {app.consentGiven ? (
                  <><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-sm text-green-700 font-medium">Onam verildi ✅</span></>
                ) : (
                  <><XCircle className="w-4 h-4 text-red-500" /><span className="text-sm text-red-600 font-medium">Onam verilmedi</span></>
                )}
              </div>
            </div>
          </div>

          {/* İmza */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">✍️ İmza</h3>
            {app.signatureType ? (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700 font-medium">
                    {app.signatureType === "DRAWN" ? "Ekrana Çizilmiş İmza" : "Yüklenen Belge (Tarama)"}
                  </span>
                </div>
                {app.signatureUrl && (
                  <div className="mt-3">
                    <div className="border-2 border-blue-200 rounded-xl overflow-hidden bg-white p-2">
                      <img
                        src={app.signatureUrl.startsWith("data:") ? app.signatureUrl : app.signatureUrl.startsWith("/") || app.signatureUrl.startsWith("http") ? app.signatureUrl : `data:image/png;base64,${app.signatureUrl}`}
                        alt="İmza"
                        className="max-h-48 mx-auto object-contain"
                      />
                    </div>
                    <a
                      href={app.signatureUrl.startsWith("data:") ? app.signatureUrl : app.signatureUrl.startsWith("/") || app.signatureUrl.startsWith("http") ? app.signatureUrl : `data:image/png;base64,${app.signatureUrl}`}
                      download={`imza_${app.name.replace(/\s+/g, "_")}.png`}
                      className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                    >
                      <Download className="w-4 h-4" /> İmzayı İndir
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-2">İmza bilgisi bulunmuyor</p>
            )}
          </div>

          {/* Yüklenen Belge */}
          {app.documentUrl && (
            <div className="bg-amber-50 rounded-xl p-4">
              <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider">📂 Yüklenen Belge (Tarama)</h3>
              <div className="mt-3">
                <div className="border-2 border-amber-200 rounded-xl overflow-hidden bg-white p-2">
                  <img
                    src={app.documentUrl.startsWith("/") || app.documentUrl.startsWith("http") ? app.documentUrl : `data:image/png;base64,${app.documentUrl}`}
                    alt="Yüklenen Belge"
                    className="max-h-60 mx-auto object-contain"
                  />
                </div>
                <a
                  href={app.documentUrl.startsWith("/") || app.documentUrl.startsWith("http") ? app.documentUrl : `data:image/png;base64,${app.documentUrl}`}
                  download={`belge_${app.name.replace(/\s+/g, "_")}.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition"
                >
                  <Download className="w-4 h-4" /> Belgeyi İndir
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100">
          <button onClick={onClose} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Kapat</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 3: FORUM KATEGORİLERİ
// ═══════════════════════════════════════════════════════
function CategoriesTab() {
  const [cats, setCats] = useState<ForumCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editCat, setEditCat] = useState<ForumCat | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchCats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/forum/categories");
      const json = await res.json();
      if (json.success) setCats(json.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchCats(); }, []);

  const handleDelete = async (cat: ForumCat) => {
    const konuUyarisi = cat.topicCount > 0 ? `\n\n⚠️ Bu kategoride ${cat.topicCount} konu var, hepsi silinecek!` : "";
    if (!confirm(`"${cat.name}" kategorisini silmek istediğinize emin misiniz?${konuUyarisi}`)) return;
    setDeleting(cat.id);
    try {
      const res = await fetch(`/api/admin/forum/categories?id=${cat.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setCats(prev => prev.filter(c => c.id !== cat.id));
      } else {
        alert(data.error || "Silme hatası");
      }
    } catch { alert("Sunucu hatası"); }
    setDeleting(null);
  };

  const handleToggleActive = async (cat: ForumCat) => {
    try {
      await fetch(`/api/admin/forum/categories?id=${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !cat.isActive }),
      });
      setCats(prev => prev.map(c => c.id === cat.id ? { ...c, isActive: !c.isActive } : c));
    } catch {}
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center"><FolderOpen className="w-5 h-5 text-indigo-600" /></div>
          <div><h2 className="text-xl font-bold text-gray-900">Forum Kategorileri</h2><p className="text-sm text-gray-500">{cats.length} kategori</p></div>
        </div>
        <button onClick={() => { setEditCat(null); setShowFormModal(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium text-sm">
          <Plus className="w-4 h-4" /> Yeni Kategori Ekle
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cats.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${c.color}15` }}>{c.icon || "📁"}</div>
                  <div>
                    <h3 className="font-bold text-gray-900">{c.name}</h3>
                    <p className="text-xs text-gray-400">/{c.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditCat(c); setShowFormModal(true); }}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                    title="Düzenle"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    disabled={deleting === c.id}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    title="Sil"
                  >
                    {deleting === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {c.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{c.description}</p>}
              <div className="flex gap-4 text-xs text-gray-500 items-center">
                <span>{c.topicCount} konu</span>
                <span>{c.postCount} yanıt</span>
                <button
                  onClick={() => handleToggleActive(c)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition ${c.isActive ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-red-50 text-red-500 hover:bg-red-100"}`}
                >
                  {c.isActive ? "✅ Aktif" : "❌ Pasif"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showFormModal && (
        <CategoryFormModal
          category={editCat}
          onClose={() => { setShowFormModal(false); setEditCat(null); }}
          onSaved={() => { setShowFormModal(false); setEditCat(null); fetchCats(); }}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 4: FORUM KONULARI
// ═══════════════════════════════════════════════════════
function TopicsTab() {
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/admin/forum/topics?${params}`);
      const json = await res.json();
      if (json.success) setTopics(json.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchTopics(); }, [filterStatus]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/admin/forum/topics?id=${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setTopics(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    } catch {}
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" konusunu silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz ve konuya ait tüm yorumlar da silinecektir.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/forum/topics?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setTopics(prev => prev.filter(t => t.id !== id));
      } else {
        alert("Silme hatası: " + (data.error || "Bilinmeyen hata"));
      }
    } catch {
      alert("Konu silinemedi.");
    }
    setDeleting(null);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><MessageSquare className="w-5 h-5 text-purple-600" /></div>
          <div><h2 className="text-xl font-bold text-gray-900">Forum Konuları</h2><p className="text-sm text-gray-500">{topics.length} konu</p></div>
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
          <option value="">Tüm Durumlar</option>
          {Object.entries(TOPIC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100 text-left">
              <th className="px-4 py-3 font-semibold text-gray-600">Konu</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Kategori</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Yazar</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-center">Yanıt</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-center">Görüntülenme</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-center">Durum</th>
              <th className="px-4 py-3 font-semibold text-gray-600 text-center">İşlem</th>
            </tr></thead>
            <tbody>
              {topics.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Konu bulunamadı</td></tr>
              ) : topics.map(t => {
                const ts = TOPIC_STATUS[t.status] || TOPIC_STATUS.OPEN;
                return (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3"><div className="font-medium text-gray-900 truncate max-w-[250px]">{t.title}</div>
                      <div className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString("tr-TR")}</div></td>
                    <td className="px-4 py-3"><span className="text-xs text-indigo-600 font-medium">{t.category?.icon} {t.category?.name}</span></td>
                    <td className="px-4 py-3 text-xs text-gray-600">{t.authorName}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">{t.replyCount}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-600">{t.viewCount}</td>
                    <td className="px-4 py-3 text-center">
                      <select value={t.status} onChange={e => handleStatusChange(t.id, e.target.value)}
                        className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${ts.bg} ${ts.color}`}>
                        {Object.entries(TOPIC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(t.id, t.title)}
                        disabled={deleting === t.id}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                        title="Konuyu Sil"
                      >
                        {deleting === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// MODAL: STK EKLEME / DÜZENLEME (ORTAK + LOGO UPLOAD)
// ═══════════════════════════════════════════════════════
function STKFormModal({ org, onClose, onSaved }: { org?: STKOrg; onClose: () => void; onSaved: () => void }) {
  const isEditing = !!org;
  const [name, setName] = useState(org?.name || "");
  const [type, setType] = useState(org?.type || "SENDIKA");
  const [city, setCity] = useState(org?.city || "");
  const [description, setDescription] = useState(org?.description || "");
  const [email, setEmail] = useState(org?.email || "");
  const [phone, setPhone] = useState(org?.phone || "");
  const [iban, setIban] = useState(org?.iban || "");
  const [paymentNote, setPaymentNote] = useState(org?.paymentNote || "");
  const [bankAccountName, setBankAccountName] = useState(org?.bankAccountName || "");
  const [donationNote, setDonationNote] = useState(org?.donationNote || "");
  const [duesNote, setDuesNote] = useState(org?.duesNote || "");
  const [annualDuesNote, setAnnualDuesNote] = useState(org?.annualDuesNote || "");
  const [monthlyDuesAmount, setMonthlyDuesAmount] = useState(org?.monthlyDuesAmount || "");
  const [annualDuesAmount, setAnnualDuesAmount] = useState(org?.annualDuesAmount || "");
  const [logo, setLogo] = useState(org?.logo || "");
  const [acceptsDonation, setAcceptsDonation] = useState(org?.acceptsDonation || false);
  const [acceptsDues, setAcceptsDues] = useState(org?.acceptsDues || false);
  const [acceptsAnnualDues, setAcceptsAnnualDues] = useState(org?.acceptsAnnualDues || false);
  const [requiresMembership, setRequiresMembership] = useState(org?.requiresMembershipForFinance ?? true);
  const [showMemberCount, setShowMemberCount] = useState(org?.showMemberCount || false);
  const [isConsentActive, setIsConsentActive] = useState(org?.isConsentActive || false);
  const [consentText, setConsentText] = useState(org?.consentText || "");
  const [contractPdfUrl, setContractPdfUrl] = useState(org?.contractPdfUrl || "");
  const [isApplicationEnabled, setIsApplicationEnabled] = useState(org?.isApplicationEnabled ?? true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const needsIban = acceptsDonation || acceptsDues || acceptsAnnualDues;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.success) setLogo(json.url);
      else setError("Logo yükleme başarısız");
    } catch { setError("Logo yükleme hatası"); }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!name.trim() || !city.trim() || !description.trim()) { setError("İsim, Şehir ve Açıklama zorunludur."); return; }
    if (needsIban && !iban.trim()) { setError("Bağış veya aidat açıksa IBAN zorunludur."); return; }
    setSaving(true); setError("");
    try {
      const payload: any = {
        name: name.trim(), type, city: city.trim(), description: description.trim(),
        email: email.trim() || undefined, phone: phone.trim() || undefined,
        iban: iban.trim() || undefined, paymentNote: paymentNote.trim() || undefined,
        logo: logo || undefined,
        acceptsDonation, acceptsDues, acceptsAnnualDues, requiresMembershipForFinance: requiresMembership,
        showMemberCount,
        donationNote: donationNote.trim() || undefined,
        duesNote: duesNote.trim() || undefined,
        annualDuesNote: annualDuesNote.trim() || undefined,
        bankAccountName: bankAccountName.trim() || undefined,
        monthlyDuesAmount: monthlyDuesAmount.trim() || undefined,
        annualDuesAmount: annualDuesAmount.trim() || undefined,
        isConsentActive,
        consentText: consentText.trim() || undefined,
        contractPdfUrl: contractPdfUrl.trim() || undefined,
        isApplicationEnabled,
      };
      const url = isEditing ? `/api/admin/stk/organizations?id=${org!.id}` : "/api/admin/stk/organizations";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) onSaved();
      else { const err = await res.json(); setError(err.error || "Kaydetme hatası"); }
    } catch { setError("Sunucu hatası"); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{isEditing ? "✏️ STK Düzenle" : "🏛️ Yeni STK Ekle"}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-3">
          {/* Logo Upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {logo ? (
                <img src={logo} alt="Logo" className="w-16 h-16 rounded-xl object-cover border-2 border-gray-200" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Logo</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1">
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {uploading ? "Yükleniyor..." : "Logo Yükle"}
              </button>
              {logo && <button onClick={() => setLogo("")} className="text-xs text-red-500 mt-1 hover:underline">Logoyu kaldır</button>}
            </div>
          </div>

          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Kuruluş Adı *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Türk Eğitim-Sen"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Tür *</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {ORG_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
              </select></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Şehir *</label>
              <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Ankara"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
            <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-2">
              {acceptsDonation && (<div><label className="block text-xs font-semibold text-blue-600 mb-1">💙 Bağış Açıklaması</label>
                <textarea value={donationNote} onChange={e => setDonationNote(e.target.value)} rows={3} placeholder="Bağış ödeme açıklaması"
                  className="w-full px-3 py-2 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>)}
              {acceptsDues && (<div><label className="block text-xs font-semibold text-green-600 mb-1">💳 Aylık Aidat Açıklaması</label>
                <textarea value={duesNote} onChange={e => setDuesNote(e.target.value)} rows={3} placeholder="Aylık aidat açıklaması"
                  className="w-full px-3 py-2 border border-green-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                <label className="block text-xs font-semibold text-green-600 mt-2 mb-1">💰 Aylık Aidat Ücreti</label>
                <input type="text" value={monthlyDuesAmount} onChange={e => setMonthlyDuesAmount(e.target.value)} placeholder="Örn: 150 TL"
                  className="w-full px-3 py-2 border border-green-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" /></div>)}
              {acceptsAnnualDues && (<div><label className="block text-xs font-semibold text-amber-600 mb-1">📅 Yıllık Aidat Açıklaması</label>
                <textarea value={annualDuesNote} onChange={e => setAnnualDuesNote(e.target.value)} rows={3} placeholder="Yıllık aidat açıklaması"
                  className="w-full px-3 py-2 border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                <label className="block text-xs font-semibold text-amber-600 mt-2 mb-1">💰 Yıllık Aidat Ücreti</label>
                <input type="text" value={annualDuesAmount} onChange={e => setAnnualDuesAmount(e.target.value)} placeholder="Örn: 1.500 TL"
                  className="w-full px-3 py-2 border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" /></div>)}
            </div>
          </div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Açıklama *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Kısa tanım..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="info@ornek.org"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">Telefon</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0312..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
          </div>
          <div className="border-t border-gray-100 pt-3"><p className="text-xs font-semibold text-gray-600 mb-2">💰 Finansal Seçenekler</p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={acceptsDonation} onChange={e => setAcceptsDonation(e.target.checked)} className="rounded accent-emerald-600" /><span className="text-sm text-gray-700">💙 Bağış</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={acceptsDues} onChange={e => setAcceptsDues(e.target.checked)} className="rounded accent-emerald-600" /><span className="text-sm text-gray-700">💳 Aylık Aidat</span></label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={acceptsAnnualDues} onChange={e => setAcceptsAnnualDues(e.target.checked)} className="rounded accent-amber-600" /><span className="text-sm text-gray-700">📅 Yıllık Aidat</span></label>
              </div>
              {(acceptsDonation || acceptsDues || acceptsAnnualDues) && (
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input type="checkbox" checked={requiresMembership} onChange={e => setRequiresMembership(e.target.checked)} className="rounded accent-orange-600" />
                  <span className="text-sm text-gray-700">🔒 Bağış/Aidat için üyelik zorunlu</span>
                </label>
              )}
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3"><p className="text-xs font-semibold text-gray-600 mb-2">👁️ Görünürlük Ayarları</p>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={showMemberCount} onChange={e => setShowMemberCount(e.target.checked)} className="rounded accent-blue-600" /><span className="text-sm text-gray-700">📊 Üye sayısını mobilde göster</span></label>
          </div>
          {/* Hukuki & Başvuru Ayarları */}
          <div className="border-t border-gray-100 pt-3"><p className="text-xs font-semibold text-gray-600 mb-2">⚖️ Hukuki & Başvuru Ayarları</p>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isApplicationEnabled} onChange={e => setIsApplicationEnabled(e.target.checked)} className="rounded accent-green-600" /><span className="text-sm text-gray-700">✅ Başvuru Butonu Aktif</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isConsentActive} onChange={e => setIsConsentActive(e.target.checked)} className="rounded accent-purple-600" /><span className="text-sm text-gray-700">📋 Onam Formu Zorunlu Mu?</span></label>
              {isConsentActive && (
                <div><label className="block text-xs font-semibold text-purple-600 mb-1">📝 Onam Metni (Kullanıcıya gösterilecek)</label>
                  <textarea value={consentText} onChange={e => setConsentText(e.target.value)} rows={5} placeholder="STK üyelik başvurusunu onaylamak için kişisel verilerinizin işlenmesine muvafakat ettiğinizi beyan edersiniz..."
                    className="w-full px-3 py-2 border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">📄 Sözleşme PDF Dosyası (Kullanıcı indirecek)</label>
                {contractPdfUrl && (
                  <div className="flex items-center gap-2 mb-2">
                    <a href={contractPdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 transition">
                      <Download className="w-3 h-3" /> Mevcut PDF'i Gör
                    </a>
                    <button onClick={() => setContractPdfUrl("")} className="text-xs text-red-500 hover:underline">Kaldır</button>
                  </div>
                )}
                <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-500">{contractPdfUrl ? "Farklı PDF Yükle" : "PDF Dosyası Yükle"}</span>
                  <input type="file" accept=".pdf" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const fd = new FormData();
                      fd.append("file", file);
                      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
                      const json = await res.json();
                      if (json.success) setContractPdfUrl(json.url);
                      else setError("PDF yükleme başarısız");
                    } catch { setError("PDF yükleme hatası"); }
                  }} />
                </label>
              </div>
            </div>
          </div>
          {needsIban && (<>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">IBAN *</label>
              <input type="text" value={iban} onChange={e => setIban(e.target.value)} placeholder="TR00 0000 0000 ..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1">🏦 Hesap Alıcı Adı (Banka)</label>
              <input type="text" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} placeholder="Banka hesap sahibi adı"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" /></div>
          </>)}
          {error && <div className="p-2 bg-red-50 text-red-700 rounded-lg text-xs">{error}</div>}
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {isEditing ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MODAL: YENİ KATEGORİ EKLE
// ═══════════════════════════════════════════════════════
function CategoryFormModal({ category, onClose, onSaved }: { category?: ForumCat | null; onClose: () => void; onSaved: () => void }) {
  const isEditing = !!category;
  const [name, setName] = useState(category?.name || ""); const [description, setDescription] = useState(category?.description || "");
  const [icon, setIcon] = useState(category?.icon || "💬"); const [color, setColor] = useState(category?.color || "#6366F1");
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim()) { setError("Kategori adı zorunludur."); return; }
    setSaving(true); setError("");
    try {
      const url = isEditing ? `/api/admin/forum/categories?id=${category!.id}` : "/api/admin/forum/categories";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), icon, color }),
      });
      if (res.ok) onSaved();
      else { const err = await res.json(); setError(err.error || "İşlem hatası"); }
    } catch { setError("Sunucu hatası"); }
    setSaving(false);
  };

  const presetIcons = ["💬", "⚖️", "💼", "📚", "🏛️", "🏥", "📋", "🎓", "💰", "🔔", "❓", "🗳️"];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{isEditing ? "✏️ Kategoriyi Düzenle" : "📂 Yeni Kategori Ekle"}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Kategori Adı *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Genel Tartışma"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">İkon</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {presetIcons.map(ic => (
                <button key={ic} onClick={() => setIcon(ic)} className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition ${icon === ic ? "bg-indigo-100 ring-2 ring-indigo-400" : "bg-gray-50 hover:bg-gray-100"}`}>{ic}</button>
              ))}
            </div>
          </div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Renk</label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-9 h-9 rounded-lg border-0 cursor-pointer" />
              <span className="text-xs text-gray-500 font-mono">{color}</span>
            </div>
          </div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Açıklama</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Kategori açıklaması..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" /></div>
          {error && <div className="p-2 bg-red-50 text-red-700 rounded-lg text-xs">{error}</div>}
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {isEditing ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
