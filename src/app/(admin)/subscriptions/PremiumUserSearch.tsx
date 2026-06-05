"use client";

import { useState, useMemo } from "react";
import { Search, Bot, Sparkles, Calendar, Crown, Edit2, Plus, X, Loader2, ToggleLeft, ToggleRight, Trash2, CheckSquare, Square, XSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── Types ──
interface PremiumUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  phoneNumber: string | null;
  isPremium: boolean;
  premiumUntil: string | null;
  subscriptionTier: string | null;
  aiTokens: number;
  credits: number;
  createdAt: string;
}

interface SubPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  description: string | null;
  badgeText: string | null;
  yearlyDiscountRate: number;
  includedQuota: number;
  aiSearchQuota: number;
  listingQuota: number;
  boostQuota: number;
  boostDurationDays: number;
  urgentQuota: number;
  urgentDurationDays: number;
  matchRequestQuota: number;
  tisChatQuota: number;
  hasRadarFeature: boolean;
  radarDurationDays: number;
  isUnlimited: boolean;
  yearlyPrice: number;
  isActive: boolean;
  isDefault: boolean;
  order: number;
  appleProductId: string | null;
  googleProductId: string | null;
  entitlements: string[];
  features: string[];
  _count: { subscriptions: number };
}

interface Subscription {
  id: string;
  status: string;
  endsAt: string;
  startedAt: string;
  createdAt: string;
  user: { name: string | null; firstName: string | null; lastName: string | null; email: string | null };
  plan: { name: string; price: number };
}

interface CancelledSubscription {
  id: string;
  status: string;
  endsAt: string;
  startedAt: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    phoneNumber: string | null;
    tcKimlik: string | null;
    premiumUntil: string | null;
  };
  plan: { name: string; price: number; interval: string };
  order: { orderNumber: string } | null;
}

// ── Premium User Search with Management Actions ──
export function PremiumUserSearch({ users }: { users: PremiumUser[] }) {
  const [query, setQuery] = useState("");
  const [editUser, setEditUser] = useState<PremiumUser | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showGrant, setShowGrant] = useState(false);
  const [grantSearch, setGrantSearch] = useState("");
  const [grantUsers, setGrantUsers] = useState<{ id: string; name: string | null; firstName: string | null; lastName: string | null; email: string | null; isPremium: boolean }[]>([]);
  const [grantSelectedId, setGrantSelectedId] = useState("");
  const [grantDays, setGrantDays] = useState(30);
  const [grantTier, setGrantTier] = useState("pro");
  const [grantLoading, setGrantLoading] = useState(false);
  const [searchingGrant, setSearchingGrant] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const router = useRouter();

  // Edit form
  const [editForm, setEditForm] = useState({
    isPremium: true,
    premiumUntil: "",
    subscriptionTier: "pro",
    credits: 0,
    aiTokens: 0,
  });
  const [editSaving, setEditSaving] = useState(false);

  const openEdit = (u: PremiumUser) => {
    setEditUser(u);
    setEditForm({
      isPremium: u.isPremium,
      premiumUntil: u.premiumUntil ? u.premiumUntil.slice(0, 10) : "",
      subscriptionTier: u.subscriptionTier || "pro",
      credits: u.credits,
      aiTokens: u.aiTokens,
    });
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setEditSaving(true);
    try {
      await fetch("/api/admin/users/premium", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editUser.id,
          isPremium: editForm.isPremium,
          premiumUntil: editForm.premiumUntil || null,
          subscriptionTier: editForm.subscriptionTier,
          credits: editForm.credits,
          aiTokens: editForm.aiTokens,
        }),
      });
      setEditUser(null);
      router.refresh();
    } catch (e) { console.error(e); }
    finally { setEditSaving(false); }
  };

  const handleToggle = async (u: PremiumUser) => {
    const action = u.isPremium ? "Premium'u kaldırmak" : "Premium vermek";
    if (!confirm(`${u.name || u.firstName || "Bu kullanıcı"} için ${action} istediğinize emin misiniz?`)) return;
    setActionLoading(u.id);
    try {
      if (u.isPremium) {
        await fetch(`/api/admin/users/premium?userId=${u.id}`, { method: "DELETE" });
      } else {
        await fetch("/api/admin/users/premium", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: u.id, durationDays: 30, tier: "pro" }),
        });
      }
      router.refresh();
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const searchGrantUsers = async () => {
    if (!grantSearch.trim()) return;
    setSearchingGrant(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(grantSearch)}&limit=10`);
      const data = await res.json();
      setGrantUsers(data.users || data || []);
    } catch (e) { console.error(e); }
    finally { setSearchingGrant(false); }
  };

  const handleQuickGrant = async () => {
    if (!grantSelectedId) return;
    setGrantLoading(true);
    try {
      await fetch("/api/admin/users/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: grantSelectedId, durationDays: grantDays, tier: grantTier }),
      });
      setShowGrant(false);
      setGrantSelectedId(""); setGrantSearch(""); setGrantUsers([]);
      router.refresh();
    } catch (e) { console.error(e); }
    finally { setGrantLoading(false); }
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return users;
    const q = query.toLowerCase().trim();
    return users.filter((u) => {
      const fullName = [u.firstName, u.lastName, u.name].filter(Boolean).join(" ").toLowerCase();
      const phone = (u.phone || u.phoneNumber || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return fullName.includes(q) || phone.includes(q) || email.includes(q) || u.id.toLowerCase().includes(q);
    });
  }, [users, query]);

  const allUsersSelected = filtered.length > 0 && filtered.every((u) => selectedIds.has(u.id));
  const someUsersSelected = selectedIds.size > 0;

  const toggleAllUsers = () => {
    if (allUsersSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((u) => u.id)));
  };
  const toggleOneUser = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkRemovePremium = async () => {
    if (!confirm(`Seçili ${selectedIds.size} kullanıcının premium'unu kaldırmak istediğinize emin misiniz?`)) return;
    setBulkLoading(true);
    try {
      await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_premium", ids: Array.from(selectedIds) }),
      });
      setSelectedIds(new Set());
      router.refresh();
    } catch (e) { console.error(e); }
    finally { setBulkLoading(false); }
  };

  return (
    <>
      <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder="Telefon, e-posta veya isim ile ara..." value={query} onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl"
            style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
          />
        </div>
        <button onClick={() => setShowGrant(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl gradient-primary text-white text-xs font-medium ml-3">
          <Plus className="w-3.5 h-3.5" /> Hızlı Premium Ata
        </button>
      </div>
      {query && <p className="text-xs px-6 py-1" style={{ color: "var(--text-muted)" }}>{filtered.length} sonuç bulundu</p>}

      {/* Bulk Action Bar */}
      {someUsersSelected && (
        <div className="px-6 py-2.5 flex items-center gap-3" style={{ background: "rgba(239,68,68,0.08)", borderBottom: "1px solid var(--border)" }}>
          <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{selectedIds.size} seçili</span>
          <button onClick={handleBulkRemovePremium} disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50">
            {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Toplu Premium Kaldır
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-text-muted hover:bg-white/10 transition-colors">
            <XSquare className="w-3.5 h-3.5" /> Seçimi Kaldır
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-white/5">
            <th className="text-left px-4 py-3 w-10">
              <button onClick={toggleAllUsers} className="transition-colors">
                {allUsersSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-text-muted" />}
              </button>
            </th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Kullanıcı</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">E-posta / Telefon</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Katman</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">AI Kota</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Jeton</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Bitiş</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Durum</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">İşlem</th>
          </tr></thead>
          <tbody>
            {filtered.map((u) => {
              const userName = u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "—";
              const isExpired = u.premiumUntil ? new Date(u.premiumUntil) < new Date() : false;
              const phone = u.phone || u.phoneNumber || "—";
              const isLoading = actionLoading === u.id;
              const isChecked = selectedIds.has(u.id);
              return (
                <tr key={u.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] ${isChecked ? "bg-primary/5" : ""}`}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleOneUser(u.id)} className="transition-colors">
                      {isChecked ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-text-muted" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/users/${u.id}`} className="text-sm font-medium hover:underline" style={{ color: "var(--primary)" }}>{userName}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{u.email || "—"}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{phone}</div>
                  </td>
                  <td className="px-4 py-3"><span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 uppercase font-semibold">{u.subscriptionTier || "pro"}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1"><Bot className="w-3.5 h-3.5 text-cyan-400" /><span className="text-sm font-medium">{u.aiTokens}</span></div></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-yellow-400" /><span className="text-sm font-medium">{u.credits}</span></div></td>
                  <td className="px-4 py-3 text-xs text-text-muted"><div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{u.premiumUntil ? new Date(u.premiumUntil).toLocaleDateString("tr-TR") : "—"}</div></td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${isExpired ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>{isExpired ? "Süresi Dolmuş" : "Aktif"}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEdit(u)} className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors" title="Düzenle">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleToggle(u)} disabled={isLoading}
                        className={`text-[10px] px-2 py-1 rounded-lg transition-colors disabled:opacity-50 ${u.isPremium ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-green-500/20 text-green-400 hover:bg-green-500/30"}`}
                        title={u.isPremium ? "Premium Kaldır" : "Premium Ver"}>
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : u.isPremium ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-text-muted">{query ? "Aramayla eşleşen kullanıcı bulunamadı." : "Premium kullanıcı yok."}</td></tr>}
          </tbody>
        </table>
      </div>

      {/* ── Edit Modal ── */}
      {editUser && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setEditUser(null)}
            style={{ animation: "modalFade 200ms ease-out" }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
              style={{ background: "#ffffff", color: "#1a1a2e", animation: "modalScale 250ms cubic-bezier(0.16, 1, 0.3, 1)" }}
              onClick={(e) => e.stopPropagation()}>

              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #e5e7eb" }}>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "#1a1a2e" }}>Premium Düzenle</h2>
                  <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                    {editUser.name || `${editUser.firstName || ""} ${editUser.lastName || ""}`.trim() || editUser.email || "Anonim"}
                  </p>
                </div>
                <button onClick={() => setEditUser(null)} className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "#f3f4f6" }}><X className="w-4 h-4" style={{ color: "#6b7280" }} /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* Premium Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold" style={{ color: "#374151" }}>Premium Aktif</label>
                  <button onClick={() => setEditForm({ ...editForm, isPremium: !editForm.isPremium })}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: editForm.isPremium ? "#dcfce7" : "#fee2e2",
                      color: editForm.isPremium ? "#16a34a" : "#dc2626",
                      border: editForm.isPremium ? "1px solid #bbf7d0" : "1px solid #fecaca",
                    }}>
                    {editForm.isPremium ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    {editForm.isPremium ? "Açık" : "Kapalı"}
                  </button>
                </div>

                {/* Katman */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Abonelik Katmanı</label>
                  <select value={editForm.subscriptionTier} onChange={(e) => setEditForm({ ...editForm, subscriptionTier: e.target.value })}
                    className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }}>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                    <option value="vip">VIP</option>
                    <option value="basic">Basic</option>
                  </select>
                </div>

                {/* Bitiş Tarihi */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Premium Bitiş Tarihi</label>
                  <input type="date" value={editForm.premiumUntil} onChange={(e) => setEditForm({ ...editForm, premiumUntil: e.target.value })}
                    className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }} />
                </div>

                {/* Credits & AI Tokens */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Jeton (Credits)</label>
                    <input type="number" value={editForm.credits} onChange={(e) => setEditForm({ ...editForm, credits: parseInt(e.target.value) || 0 })}
                      className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                      style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>AI Token</label>
                    <input type="number" value={editForm.aiTokens} onChange={(e) => setEditForm({ ...editForm, aiTokens: parseInt(e.target.value) || 0 })}
                      className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                      style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
                <button onClick={() => setEditUser(null)} className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: "#f3f4f6", color: "#6b7280" }}>İptal</button>
                <button disabled={editSaving} onClick={handleEditSave}
                  className="px-6 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}>
                  {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Quick Grant Modal ── */}
      {showGrant && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setShowGrant(false)}
            style={{ animation: "modalFade 200ms ease-out" }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
              style={{ background: "#ffffff", color: "#1a1a2e", animation: "modalScale 250ms cubic-bezier(0.16, 1, 0.3, 1)" }}
              onClick={(e) => e.stopPropagation()}>

              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #e5e7eb" }}>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "#1a1a2e" }}>👑 Hızlı Premium Ata</h2>
                  <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>Bir kullanıcıya hızlıca premium statüsü verin</p>
                </div>
                <button onClick={() => setShowGrant(false)} className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "#f3f4f6" }}><X className="w-4 h-4" style={{ color: "#6b7280" }} /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* User Search */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Kullanıcı Ara</label>
                  <div className="flex gap-2">
                    <input value={grantSearch} onChange={(e) => setGrantSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchGrantUsers(); } }}
                      className="flex-1 text-sm px-3 py-2.5 rounded-xl outline-none"
                      style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }}
                      placeholder="E-posta, telefon veya isim..." />
                    <button onClick={searchGrantUsers} disabled={searchingGrant}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold"
                      style={{ background: "#dbeafe", color: "#1e40af" }}>{searchingGrant ? "..." : "Ara"}</button>
                  </div>
                  {grantUsers.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {grantUsers.map((u) => (
                        <button key={u.id} onClick={() => setGrantSelectedId(u.id)}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between"
                          style={{
                            background: grantSelectedId === u.id ? "#dbeafe" : "#f9fafb",
                            border: grantSelectedId === u.id ? "1px solid #3b82f6" : "1px solid #e5e7eb",
                            color: "#1a1a2e",
                          }}>
                          <div>
                            <span className="font-medium">{u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "İsimsiz"}</span>
                            <span className="text-xs ml-2" style={{ color: "#6b7280" }}>{u.email}</span>
                          </div>
                          {u.isPremium && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Premium</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Duration & Tier */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Süre (Gün)</label>
                    <input type="number" value={grantDays} onChange={(e) => setGrantDays(parseInt(e.target.value) || 30)}
                      className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                      style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Katman</label>
                    <select value={grantTier} onChange={(e) => setGrantTier(e.target.value)}
                      className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                      style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }}>
                      <option value="pro">Pro</option>
                      <option value="premium">Premium</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
                <button onClick={() => setShowGrant(false)} className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: "#f3f4f6", color: "#6b7280" }}>İptal</button>
                <button disabled={grantLoading || !grantSelectedId} onClick={handleQuickGrant}
                  className="px-6 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                  {grantLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                  Premium Ver
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Subscription Search with Actions ──
export function SubscriptionSearch({ subscriptions, plans }: { subscriptions: Subscription[]; plans: SubPlan[] }) {
  const [query, setQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [manualUsers, setManualUsers] = useState<{ id: string; name: string | null; firstName: string | null; lastName: string | null; email: string | null }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set());
  const [bulkSubLoading, setBulkSubLoading] = useState(false);
  const router = useRouter();

  const filtered = useMemo(() => {
    if (!query.trim()) return subscriptions;
    const q = query.toLowerCase().trim();
    return subscriptions.filter((s) => {
      const name = [s.user.name, s.user.firstName, s.user.lastName].filter(Boolean).join(" ").toLowerCase();
      const email = (s.user.email || "").toLowerCase();
      const planName = s.plan.name.toLowerCase();
      return name.includes(q) || email.includes(q) || planName.includes(q) || s.id.toLowerCase().includes(q);
    });
  }, [subscriptions, query]);

  const handleCancel = async (subId: string) => {
    if (!confirm("Bu aboneliği iptal etmek istediğinize emin misiniz?")) return;
    setActionLoading(subId);
    try {
      await fetch(`/api/admin/subscriptions/manual?id=${subId}`, { method: "DELETE" });
      router.refresh();
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const handleExtend = async (subId: string) => {
    const days = prompt("Kaç gün uzatmak istiyorsunuz?", "30");
    if (!days) return;
    setActionLoading(subId);
    try {
      await fetch("/api/admin/subscriptions/manual", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subId, additionalDays: parseInt(days) }),
      });
      router.refresh();
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const searchUsers = async () => {
    if (!manualSearch.trim()) return;
    setSearchingUsers(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(manualSearch)}&limit=10`);
      const data = await res.json();
      setManualUsers(data.users || data || []);
    } catch (e) { console.error(e); }
    finally { setSearchingUsers(false); }
  };

  const handleManualGrant = async () => {
    if (!selectedUserId || !selectedPlanId) return;
    setManualLoading(true);
    try {
      await fetch("/api/admin/subscriptions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, planId: selectedPlanId }),
      });
      setShowManual(false);
      setSelectedUserId(""); setSelectedPlanId(""); setManualSearch(""); setManualUsers([]);
      router.refresh();
    } catch (e) { console.error(e); }
    finally { setManualLoading(false); }
  };

  const allSubsSelected = filtered.length > 0 && filtered.every((s) => selectedSubs.has(s.id));
  const someSubsSelected = selectedSubs.size > 0;
  const toggleAllSubs = () => {
    if (allSubsSelected) setSelectedSubs(new Set());
    else setSelectedSubs(new Set(filtered.map((s) => s.id)));
  };
  const toggleOneSub = (id: string) => {
    const next = new Set(selectedSubs);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedSubs(next);
  };

  const handleBulkSubAction = async (action: "delete_subscriptions" | "cancel_subscriptions") => {
    const label = action === "delete_subscriptions" ? "silmek" : "iptal etmek";
    if (!confirm(`Seçili ${selectedSubs.size} aboneliği ${label} istediğinize emin misiniz?`)) return;
    setBulkSubLoading(true);
    try {
      await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: Array.from(selectedSubs) }),
      });
      setSelectedSubs(new Set());
      router.refresh();
    } catch (e) { console.error(e); }
    finally { setBulkSubLoading(false); }
  };

  const handleDeleteSub = async (id: string) => {
    if (!confirm("Bu aboneliği silmek istediğinize emin misiniz?")) return;
    setActionLoading(id);
    try {
      await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_subscriptions", ids: [id] }),
      });
      router.refresh();
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  return (
    <>
      <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder="E-posta, isim veya sipariş no ile ara..." value={query} onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl"
            style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
          />
        </div>
        <button onClick={() => setShowManual(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl gradient-primary text-white text-xs font-medium ml-3">
          <Crown className="w-3.5 h-3.5" /> Manuel Premium Ver
        </button>
      </div>
      {query && <p className="text-xs px-6 py-1" style={{ color: "var(--text-muted)" }}>{filtered.length} sonuç</p>}

      {/* Bulk Action Bar */}
      {someSubsSelected && (
        <div className="px-6 py-2.5 flex items-center gap-3" style={{ background: "rgba(239,68,68,0.08)", borderBottom: "1px solid var(--border)" }}>
          <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{selectedSubs.size} seçili</span>
          <button onClick={() => handleBulkSubAction("delete_subscriptions")} disabled={bulkSubLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50">
            {bulkSubLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Toplu Sil
          </button>
          <button onClick={() => handleBulkSubAction("cancel_subscriptions")} disabled={bulkSubLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors disabled:opacity-50">
            Toplu İptal
          </button>
          <button onClick={() => setSelectedSubs(new Set())} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-text-muted hover:bg-white/10 transition-colors">
            <XSquare className="w-3.5 h-3.5" /> Seçimi Kaldır
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-white/5">
            <th className="text-left px-4 py-3 w-10">
              <button onClick={toggleAllSubs} className="transition-colors">
                {allSubsSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-text-muted" />}
              </button>
            </th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Kullanıcı</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Plan</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Fiyat</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Durum</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Bitiş</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">İşlem</th>
          </tr></thead>
          <tbody>
            {filtered.map((sub) => {
              const userName = sub.user.name || `${sub.user.firstName || ""} ${sub.user.lastName || ""}`.trim() || sub.user.email || "Anonim";
              const isLoading = actionLoading === sub.id;
              const isChecked = selectedSubs.has(sub.id);
              return (
                <tr key={sub.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] ${isChecked ? "bg-primary/5" : ""}`}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleOneSub(sub.id)} className="transition-colors">
                      {isChecked ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-text-muted" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm">{userName}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{sub.plan.name}</td>
                  <td className="px-4 py-3 text-sm text-accent font-medium">₺{sub.plan.price}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${sub.status === "active" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>{sub.status === "active" ? "Aktif" : sub.status === "cancelled" ? "İptal" : "Pasif"}</span></td>
                  <td className="px-4 py-3 text-xs text-text-muted">{new Date(sub.endsAt).toLocaleDateString("tr-TR")}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {sub.status === "active" && (
                        <>
                          <button onClick={() => handleExtend(sub.id)} disabled={isLoading}
                            className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50">
                            {isLoading ? "..." : "+Uzat"}
                          </button>
                          <button onClick={() => handleCancel(sub.id)} disabled={isLoading}
                            className="text-[10px] px-2 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors disabled:opacity-50">
                            {isLoading ? "..." : "\u0130ptal"}
                          </button>
                        </>
                      )}
                      <button onClick={() => handleDeleteSub(sub.id)} disabled={isLoading}
                        className="text-[10px] px-2 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50" title="Sil">
                        {isLoading ? "..." : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted">{query ? "Sonu\u00e7 bulunamad\u0131." : "Abonelik yok."}</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Manuel Premium Modal */}
      {showManual && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setShowManual(false)}
            style={{ animation: "modalFade 200ms ease-out" }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
              style={{ background: "#ffffff", color: "#1a1a2e", animation: "modalScale 250ms cubic-bezier(0.16, 1, 0.3, 1)" }}
              onClick={(e) => e.stopPropagation()}>

              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #e5e7eb" }}>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "#1a1a2e" }}>Manuel Premium Ver</h2>
                  <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>Bir kullanıcıya manuel olarak premium atayın</p>
                </div>
                <button onClick={() => setShowManual(false)} className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "#f3f4f6" }}><X className="w-4 h-4" style={{ color: "#6b7280" }} /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* User Search */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Kullanıcı Ara</label>
                  <div className="flex gap-2">
                    <input value={manualSearch} onChange={(e) => setManualSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchUsers(); } }}
                      className="flex-1 text-sm px-3 py-2.5 rounded-xl outline-none"
                      style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }}
                      placeholder="E-posta veya isim yazın..." />
                    <button onClick={searchUsers} disabled={searchingUsers}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold"
                      style={{ background: "#dbeafe", color: "#1e40af" }}>{searchingUsers ? "..." : "Ara"}</button>
                  </div>
                  {manualUsers.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {manualUsers.map((u) => (
                        <button key={u.id} onClick={() => setSelectedUserId(u.id)}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                          style={{
                            background: selectedUserId === u.id ? "#dbeafe" : "#f9fafb",
                            border: selectedUserId === u.id ? "1px solid #3b82f6" : "1px solid #e5e7eb",
                            color: "#1a1a2e",
                          }}>
                          <span className="font-medium">{u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "İsimsiz"}</span>
                          <span className="text-xs ml-2" style={{ color: "#6b7280" }}>{u.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Plan Select */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Plan Seçin</label>
                  <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                    style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }}>
                    <option value="">Plan seçin...</option>
                    {plans.filter(p => p.isActive).map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {p.price} ₺ / {p.interval === "monthly" ? "Aylık" : p.interval === "yearly" ? "Yıllık" : p.interval}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
                <button onClick={() => setShowManual(false)} className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: "#f3f4f6", color: "#6b7280" }}>İptal</button>
                <button disabled={manualLoading || !selectedUserId || !selectedPlanId} onClick={handleManualGrant}
                  className="px-6 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}>
                  {manualLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                  Premium Ver
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Plan Management with Slide-Over Drawer ──
export function PlanManager({ plans: initialPlans }: { plans: SubPlan[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [editPlan, setEditPlan] = useState<SubPlan | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [featureInput, setFeatureInput] = useState("");
  const [entitlementInput, setEntitlementInput] = useState("");
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
  const [bulkPlanLoading, setBulkPlanLoading] = useState(false);
  const [deletePlanLoading, setDeletePlanLoading] = useState<string | null>(null);
  const router = useRouter();

  const emptyForm = {
    name: "", price: 0, interval: "monthly", description: "", includedQuota: 5,
    aiSearchQuota: 15, listingQuota: 1, boostQuota: 1, boostDurationDays: 7, urgentQuota: 0, urgentDurationDays: 7, matchRequestQuota: 15, tisChatQuota: 0, hasRadarFeature: false, radarDurationDays: 30, isUnlimited: false,
    badgeText: "", yearlyDiscountRate: 20, yearlyPrice: 0, order: 0,
    appleProductId: "", googleProductId: "",
    entitlements: [] as string[], features: [] as string[],
  };
  const [form, setForm] = useState(emptyForm);

  const openDrawer = (plan?: SubPlan) => {
    if (plan) {
      setEditPlan(plan);
      setForm({
        name: plan.name, price: plan.price, interval: plan.interval,
        description: plan.description || "", includedQuota: plan.includedQuota,
        aiSearchQuota: plan.aiSearchQuota ?? 15,
        listingQuota: plan.listingQuota ?? 1,
        boostQuota: plan.boostQuota ?? 1,
        boostDurationDays: plan.boostDurationDays ?? 7,
        urgentQuota: plan.urgentQuota ?? 0,
        urgentDurationDays: plan.urgentDurationDays ?? 7,
        matchRequestQuota: plan.matchRequestQuota ?? 15,
        tisChatQuota: plan.tisChatQuota ?? 0,
        hasRadarFeature: plan.hasRadarFeature ?? false,
        isUnlimited: plan.isUnlimited ?? false,
        radarDurationDays: plan.radarDurationDays ?? 30,
        badgeText: plan.badgeText || "", yearlyDiscountRate: plan.yearlyDiscountRate,
        yearlyPrice: (plan as any).yearlyPrice ?? 0,
        order: plan.order, appleProductId: plan.appleProductId || "",
        googleProductId: plan.googleProductId || "",
        entitlements: plan.entitlements || [], features: plan.features || [],
      });
    } else {
      setEditPlan(null);
      setForm(emptyForm);
    }
    setFeatureInput(""); setEntitlementInput("");
    setShowDrawer(true);
  };

  const closeDrawer = () => { setShowDrawer(false); setEditPlan(null); };

  const handleSave = async () => {
    setSaving(true);
    try {
      let res: Response;
      if (editPlan) {
        res = await fetch("/api/subscriptions/plans", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editPlan.id, ...form }),
        });
      } else {
        res = await fetch("/api/subscriptions/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Plan kaydedilemedi: ${err.error || res.statusText}`);
        return;
      }
      // Planları yeniden yükle
      const plansRes = await fetch("/api/subscriptions/plans");
      if (plansRes.ok) {
        const freshPlans = await plansRes.json();
        setPlans(freshPlans);
      }
      closeDrawer();
      router.refresh();
    } catch (e) {
      console.error("Plan kaydedilemedi:", e);
      alert("Plan kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string) => {
    await fetch(`/api/subscriptions/plans?id=${id}`, { method: "DELETE" });
    router.refresh();
  };

  const addFeature = () => {
    if (featureInput.trim() && !form.features.includes(featureInput.trim())) {
      setForm({ ...form, features: [...form.features, featureInput.trim()] });
      setFeatureInput("");
    }
  };
  const removeFeature = (f: string) => setForm({ ...form, features: form.features.filter(x => x !== f) });
  const addEntitlement = () => {
    if (entitlementInput.trim() && !form.entitlements.includes(entitlementInput.trim())) {
      setForm({ ...form, entitlements: [...form.entitlements, entitlementInput.trim()] });
      setEntitlementInput("");
    }
  };
  const removeEntitlement = (e: string) => setForm({ ...form, entitlements: form.entitlements.filter(x => x !== e) });

  const fieldStyle = { background: "var(--bg-muted)", border: "1px solid var(--border)", color: "var(--text)" };

  const handleDeletePlan = async (id: string) => {
    const plan = plans.find(p => p.id === id);
    if (plan?.isDefault) { alert("Standart plan silinemez."); return; }
    if (!confirm("Bu planı kalıcı olarak silmek istediğinize emin misiniz?")) return;
    setDeletePlanLoading(id);
    try {
      const res = await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_plans", ids: [id] }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Silinemedi"); return; }
      router.refresh();
    } catch (e) { console.error(e); }
    finally { setDeletePlanLoading(null); }
  };

  const allPlansSelected = plans.length > 0 && plans.every((p) => selectedPlanIds.has(p.id));
  const somePlansSelected = selectedPlanIds.size > 0;
  const toggleAllPlans = () => {
    if (allPlansSelected) setSelectedPlanIds(new Set());
    else setSelectedPlanIds(new Set(plans.map((p) => p.id)));
  };
  const toggleOnePlan = (id: string) => {
    const next = new Set(selectedPlanIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedPlanIds(next);
  };

  const handleBulkPlanAction = async (action: "delete_plans" | "activate_plans" | "deactivate_plans") => {
    const labels: Record<string, string> = { delete_plans: "silmek", activate_plans: "aktif yapmak", deactivate_plans: "pasif yapmak" };
    if (!confirm(`Se\u00e7ili ${selectedPlanIds.size} plan\u0131 ${labels[action]} istedi\u011finize emin misiniz?`)) return;
    setBulkPlanLoading(true);
    try {
      const res = await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: Array.from(selectedPlanIds) }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "İşlem başarısız"); setBulkPlanLoading(false); return; }
      setSelectedPlanIds(new Set());
      router.refresh();
    } catch (e) { console.error(e); }
    finally { setBulkPlanLoading(false); }
  };

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4">
        <h3 className="text-lg font-semibold">Abonelik Planları ({plans.length})</h3>
        <button onClick={() => openDrawer()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl gradient-primary text-white text-xs font-medium">
          <Plus className="w-3.5 h-3.5" /> Yeni Plan
        </button>
      </div>

      {/* Bulk Action Bar */}
      {somePlansSelected && (
        <div className="px-6 py-2.5 flex items-center gap-3" style={{ background: "rgba(239,68,68,0.08)", borderBottom: "1px solid var(--border)" }}>
          <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{selectedPlanIds.size} seçili</span>
          <button onClick={() => handleBulkPlanAction("delete_plans")} disabled={bulkPlanLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50">
            {bulkPlanLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Toplu Sil
          </button>
          <button onClick={() => handleBulkPlanAction("activate_plans")} disabled={bulkPlanLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50">
            <ToggleRight className="w-3.5 h-3.5" /> Toplu Aktif
          </button>
          <button onClick={() => handleBulkPlanAction("deactivate_plans")} disabled={bulkPlanLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors disabled:opacity-50">
            <ToggleLeft className="w-3.5 h-3.5" /> Toplu Pasif
          </button>
          <button onClick={() => setSelectedPlanIds(new Set())} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-text-muted hover:bg-white/10 transition-colors">
            <XSquare className="w-3.5 h-3.5" /> Seçimi Kaldır
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-white/5">
            <th className="text-left px-4 py-3 w-10">
              <button onClick={toggleAllPlans} className="transition-colors">
                {allPlansSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-text-muted" />}
              </button>
            </th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Plan</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Fiyat</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Periyot</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Kota</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">AI Tarama</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">İlan</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Başvuru</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">TİS Sohbet</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Abone</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Durum</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">İşlem</th>
          </tr></thead>
          <tbody>
            {plans.map((plan) => {
              const isChecked = selectedPlanIds.has(plan.id);
              const isDeleting = deletePlanLoading === plan.id;
              return (
              <tr key={plan.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] ${isChecked ? "bg-primary/5" : ""}`}>
                <td className="px-4 py-3">
                  <button onClick={() => toggleOnePlan(plan.id)} className="transition-colors">
                    {isChecked ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-text-muted" />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{plan.name}</span>
                    {plan.isDefault && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">🔒 Standart</span>}
                    {plan.badgeText && !plan.isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent">{plan.badgeText}</span>}
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">{plan.description || "—"}</p>
                  {plan.features.length > 0 && (
                    <p className="text-[10px] text-text-muted mt-0.5">{plan.features.length} özellik tanımlı</p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-primary">{plan.interval === "yearly" && plan.yearlyPrice > 0 ? plan.yearlyPrice : plan.price} ₺{plan.interval === "yearly" ? "/yıl" : "/ay"}</td>
                <td className="px-4 py-3 text-xs">{plan.interval === "monthly" ? "Aylık" : plan.interval === "yearly" ? "Yıllık" : plan.interval}</td>
                <td className="px-4 py-3 text-sm">{plan.includedQuota}</td>
                <td className="px-4 py-3 text-sm">{plan.aiSearchQuota ?? 15}</td>
                <td className="px-4 py-3 text-sm">{plan.listingQuota ?? 1}</td>
                <td className="px-4 py-3 text-sm">{plan.matchRequestQuota ?? 15}</td>
                <td className="px-4 py-3 text-sm">{plan.tisChatQuota ?? 0}</td>
                <td className="px-4 py-3 text-sm">{plan._count.subscriptions}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${plan.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {plan.isActive ? "Aktif" : "Pasif"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openDrawer(plan)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Düzenle">
                      <Edit2 className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                    </button>
                    {!plan.isDefault && (
                      <>
                        <button onClick={() => toggleActive(plan.id)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title={plan.isActive ? "Pasif Yap" : "Aktif Yap"}>
                          {plan.isActive ? <ToggleRight className="w-3.5 h-3.5 text-green-400" /> : <ToggleLeft className="w-3.5 h-3.5 text-red-400" />}
                        </button>
                        <button onClick={() => handleDeletePlan(plan.id)} disabled={isDeleting}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50" title="Sil">
                          {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" /> : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>



      {/* ══════ Profesyonel Modal ══════ */}
      {showDrawer && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={closeDrawer}
          style={{ animation: "modalFade 200ms ease-out" }} />
      )}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div className="w-full max-w-3xl max-h-[90vh] sm:max-h-[90vh] max-h-[95vh] flex flex-col rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
            style={{ background: "#ffffff", color: "#1a1a2e", animation: "modalScale 250ms cubic-bezier(0.16, 1, 0.3, 1)" }}
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5" style={{ borderBottom: "1px solid #e5e7eb" }}>
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#1a1a2e" }}>
                  {editPlan ? `"${editPlan.name}" Planını Düzenle` : "Yeni Abonelik Planı Oluştur"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
                  {editPlan ? "Plan bilgilerini güncelleyin" : "Mobil uygulama için yeni bir abonelik planı tanımlayın"}
                </p>
              </div>
              <button onClick={closeDrawer} className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: "#f3f4f6" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#f3f4f6")}>
                <X className="w-5 h-5" style={{ color: "#6b7280" }} />
              </button>
            </div>

            {/* Scrollable Form */}
            <div className="flex-1 overflow-y-auto">

              {/* ─── BÖLÜM 1: Temel Bilgiler ─── */}
              <div className="px-8 py-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
                    <span className="text-white text-sm font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#1a1a2e" }}>Temel Bilgiler</h3>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>Plan adı, fiyatlandırma ve periyot ayarları</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Plan Adı *</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full text-sm px-4 py-3 rounded-xl outline-none transition-all"
                      style={{ background: editPlan?.isDefault ? "#f3f4f6" : "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }}
                      onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                      onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                      placeholder="Kamulog PRO"
                      disabled={editPlan?.isDefault} />
                    {editPlan?.isDefault && <p className="text-[10px] mt-1" style={{ color: "#ef4444" }}>Standart plan adı değiştirilemez</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Aylık Fiyat (₺) *</label>
                      <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                        className="w-full text-sm px-4 py-3 rounded-xl outline-none"
                        style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Yıllık Fiyat (₺)</label>
                      <input type="number" value={form.yearlyPrice} onChange={(e) => setForm({ ...form, yearlyPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full text-sm px-4 py-3 rounded-xl outline-none"
                        style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }} />
                      {form.price > 0 && form.yearlyPrice > 0 && (
                        <p className="text-[10px] mt-1" style={{ color: "#16a34a" }}>
                          💰 İndirim: %{Math.round((1 - form.yearlyPrice / (form.price * 12)) * 100)} tasarruf (aylık {(form.yearlyPrice / 12).toFixed(0)} ₺)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Periyot</label>
                      <select value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value })}
                        className="w-full text-sm px-4 py-3 rounded-xl outline-none"
                        style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }}>
                        <option value="monthly">Aylık</option><option value="yearly">Yıllık</option><option value="weekly">Haftalık</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Rozet Metni</label>
                      <input value={form.badgeText} onChange={(e) => setForm({ ...form, badgeText: e.target.value })}
                        className="w-full text-sm px-4 py-3 rounded-xl outline-none"
                        style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }}
                        placeholder="En Popüler" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Yıllık İndirim %</label>
                      <input type="number" value={form.yearlyDiscountRate} onChange={(e) => setForm({ ...form, yearlyDiscountRate: parseInt(e.target.value) || 0 })}
                        className="w-full text-sm px-4 py-3 rounded-xl outline-none"
                        style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Sıralama</label>
                      <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                        className="w-full text-sm px-4 py-3 rounded-xl outline-none"
                        style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Açıklama</label>
                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full text-sm px-4 py-3 rounded-xl outline-none min-h-[70px] resize-none"
                      style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }}
                      placeholder="Bu plan kullanıcılara sunulan premium özellikleri içerir..." />
                  </div>
                </div>
              </div>

              <div style={{ borderBottom: "1px solid #e5e7eb" }} />

              {/* ─── BÖLÜM 2: Mağaza Entegrasyonu ─── */}
              <div className="px-8 py-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                    <span className="text-white text-sm font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#1a1a2e" }}>Mağaza Entegrasyonu</h3>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>App Store & Google Play ürün eşleştirme</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: "#374151" }}>
                      <span className="text-base">🍎</span> Apple Product ID
                    </label>
                    <input value={form.appleProductId} onChange={(e) => setForm({ ...form, appleProductId: e.target.value })}
                      className="w-full text-sm px-3 py-2.5 rounded-lg outline-none font-mono"
                      style={{ background: "#ffffff", border: "1px solid #e5e7eb", color: "#1a1a2e" }}
                      placeholder="com.kamulog.premium.monthly" />
                    <p className="text-[10px] mt-1.5" style={{ color: "#9ca3af" }}>App Store Connect ürün kimliği</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: "#374151" }}>
                      <span className="text-base">🤖</span> Google Product ID
                    </label>
                    <input value={form.googleProductId} onChange={(e) => setForm({ ...form, googleProductId: e.target.value })}
                      className="w-full text-sm px-3 py-2.5 rounded-lg outline-none font-mono"
                      style={{ background: "#ffffff", border: "1px solid #e5e7eb", color: "#1a1a2e" }}
                      placeholder="kamulog_premium_monthly" />
                    <p className="text-[10px] mt-1.5" style={{ color: "#9ca3af" }}>Google Play Console ürün kimliği</p>
                  </div>
                </div>
              </div>

              <div style={{ borderBottom: "1px solid #e5e7eb" }} />

              {/* ─── BÖLÜM 2.5: Premium Hakları ─── */}
              <div className="px-8 py-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                    <span className="text-white text-sm font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#1a1a2e" }}>Premium Hakları</h3>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>Plan kapsamındaki kullanım limitleri ve kotaları</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: "#92400e" }}>
                      <span className="text-base">🔍</span> AI Becayiş Tarama
                    </label>
                    <input type="number" value={form.aiSearchQuota} onChange={(e) => setForm({ ...form, aiSearchQuota: parseInt(e.target.value) || 0 })}
                      className="w-full text-sm px-3 py-2.5 rounded-lg outline-none font-bold text-center"
                      style={{ background: "#ffffff", border: "1px solid #fde68a", color: "#1a1a2e" }} />
                    <p className="text-[10px] mt-1.5 text-center" style={{ color: "#92400e" }}>KamulogAI ile becayiş arama hakkı</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: "#92400e" }}>
                      <span className="text-base">🤖</span> AI Token / İlan Kotası
                    </label>
                    <input type="number" value={form.includedQuota} onChange={(e) => setForm({ ...form, includedQuota: parseInt(e.target.value) || 0 })}
                      className="w-full text-sm px-3 py-2.5 rounded-lg outline-none font-bold text-center"
                      style={{ background: "#ffffff", border: "1px solid #fde68a", color: "#1a1a2e" }} />
                    <p className="text-[10px] mt-1.5 text-center" style={{ color: "#92400e" }}>AI ile ilan oluşturma ve AI token hakkı</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: "#92400e" }}>
                      <span className="text-base">📋</span> Aktif İlan Sayısı
                    </label>
                    <input type="number" value={form.listingQuota} onChange={(e) => setForm({ ...form, listingQuota: parseInt(e.target.value) || 0 })}
                      className="w-full text-sm px-3 py-2.5 rounded-lg outline-none font-bold text-center"
                      style={{ background: "#ffffff", border: "1px solid #fde68a", color: "#1a1a2e" }} />
                    <p className="text-[10px] mt-1.5 text-center" style={{ color: "#92400e" }}>Aynı anda yayında olabilecek aktif ilan</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: "#92400e" }}>
                      <span className="text-base">📩</span> İlana Başvuru Hakkı
                    </label>
                    <input type="number" value={form.matchRequestQuota} onChange={(e) => setForm({ ...form, matchRequestQuota: parseInt(e.target.value) || 0 })}
                      className="w-full text-sm px-3 py-2.5 rounded-lg outline-none font-bold text-center"
                      style={{ background: "#ffffff", border: "1px solid #fde68a", color: "#1a1a2e" }} />
                    <p className="text-[10px] mt-1.5 text-center" style={{ color: "#92400e" }}>Becayiş ilanlarına başvuru gönderme hakkı</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: "#92400e" }}>
                      <span className="text-base">🤖</span> TİS Sohbet Kotası
                    </label>
                    <input type="number" value={form.tisChatQuota} onChange={(e) => setForm({ ...form, tisChatQuota: parseInt(e.target.value) || 0 })}
                      className="w-full text-sm px-3 py-2.5 rounded-lg outline-none font-bold text-center"
                      style={{ background: "#ffffff", border: "1px solid #fde68a", color: "#1a1a2e" }} />
                    <p className="text-[10px] mt-1.5 text-center" style={{ color: "#92400e" }}>Aylık AI TİS Danışmanı sohbet hakkı</p>
                  </div>
                </div>

                {/* Boost & Acil İlan Grupları */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {/* 🚀 Boost Grubu — Yeşil */}
                  <div className="p-4 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #86efac" }}>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: "#166534" }}>
                      <span className="text-base">🚀</span> Boost Hakkı
                    </label>
                    <input type="number" value={form.boostQuota} onChange={(e) => setForm({ ...form, boostQuota: parseInt(e.target.value) || 0 })}
                      className="w-full text-sm px-3 py-2.5 rounded-lg outline-none font-bold text-center"
                      style={{ background: "#ffffff", border: "1px solid #86efac", color: "#1a1a2e" }} />
                    <p className="text-[10px] mt-1.5 text-center" style={{ color: "#166534" }}>İlanı öne çıkarma hakkı sayısı</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #86efac" }}>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: "#166534" }}>
                      <span className="text-base">⏱️</span> Boost Süresi (Gün)
                    </label>
                    <input type="number" value={form.boostDurationDays} onChange={(e) => setForm({ ...form, boostDurationDays: parseInt(e.target.value) || 7 })}
                      className="w-full text-sm px-3 py-2.5 rounded-lg outline-none font-bold text-center"
                      style={{ background: "#ffffff", border: "1px solid #86efac", color: "#1a1a2e" }} />
                    <p className="text-[10px] mt-1.5 text-center" style={{ color: "#166534" }}>Her boost kaç gün sürecek</p>
                  </div>

                  {/* 🚨 Acil İlan Grubu — Kırmızı */}
                  <div className="p-4 rounded-xl" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: "#991b1b" }}>
                      <span className="text-base">🚨</span> Acil İlan Hakkı
                    </label>
                    <input type="number" value={form.urgentQuota} onChange={(e) => setForm({ ...form, urgentQuota: parseInt(e.target.value) || 0 })}
                      className="w-full text-sm px-3 py-2.5 rounded-lg outline-none font-bold text-center"
                      style={{ background: "#ffffff", border: "1px solid #fecaca", color: "#1a1a2e" }} />
                    <p className="text-[10px] mt-1.5 text-center" style={{ color: "#991b1b" }}>İlanı acil olarak işaretleme hakkı</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: "#991b1b" }}>
                      <span className="text-base">⏱️</span> Acil İlan Süresi (Gün)
                    </label>
                    <input type="number" value={form.urgentDurationDays} onChange={(e) => setForm({ ...form, urgentDurationDays: parseInt(e.target.value) || 7 })}
                      className="w-full text-sm px-3 py-2.5 rounded-lg outline-none font-bold text-center"
                      style={{ background: "#ffffff", border: "1px solid #fecaca", color: "#1a1a2e" }} />
                    <p className="text-[10px] mt-1.5 text-center" style={{ color: "#991b1b" }}>Acil ilan kaç gün sürecek</p>
                  </div>
                </div>

                {/* 🎯 Kamulog Radar Toggle */}
                <div className="mt-4 p-4 rounded-xl" style={{ background: "#f5f3ff", border: "1px solid #c4b5fd" }}>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🎯</span>
                      <div>
                        <p className="text-sm font-bold" style={{ color: "#5b21b6" }}>Kamulog Radar</p>
                        <p className="text-[10px]" style={{ color: "#7c3aed" }}>Otomatik becayiş eşleştirme özelliği</p>
                      </div>
                    </div>
                    <div
                      onClick={() => setForm({ ...form, hasRadarFeature: !form.hasRadarFeature })}
                      className="relative w-11 h-6 rounded-full transition-colors cursor-pointer"
                      style={{ background: form.hasRadarFeature ? "#7c3aed" : "#d1d5db" }}>
                      <div className="absolute top-0.5 w-5 h-5 rounded-full transition-transform bg-white"
                        style={{ left: form.hasRadarFeature ? "22px" : "2px" }} />
                    </div>
                  </label>
                </div>

                {/* Radar Süresi (Gün) — toggle açıkken göster */}
                {form.hasRadarFeature && (
                  <div className="mt-3 p-3 rounded-xl" style={{ background: "#ede9fe", border: "1px solid #c4b5fd" }}>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "#5b21b6" }}>🎯 Radar Süresi (Gün)</label>
                    <input type="number" value={form.radarDurationDays} onChange={(e) => setForm({ ...form, radarDurationDays: parseInt(e.target.value) || 30 })}
                      className="w-full text-sm px-3 py-2.5 rounded-lg outline-none font-bold text-center"
                      style={{ background: "#ffffff", border: "1px solid #c4b5fd", color: "#1a1a2e" }}
                      min={1} />
                    <p className="text-[10px] mt-1 text-center" style={{ color: "#7c3aed" }}>Radar özelliği kaç gün aktif kalacak</p>
                  </div>
                )}
              </div>

              <div style={{ borderBottom: "1px solid #e5e7eb" }} />


              {/* ─── Sınırsız Özellik Toggle ─── */}
              <div className="px-8 py-4" style={{ background: "linear-gradient(135deg, #fef3c7, #fffbeb)", borderTop: "1px solid #fcd34d", borderBottom: "1px solid #fcd34d" }}>
                <label className="flex items-center gap-4 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">∞</span>
                    <div>
                      <span className="text-sm font-bold" style={{ color: "#92400e" }}>Sınırsız Özellik</span>
                      <p className="text-[10px]" style={{ color: "#b45309" }}>Bu plan seçildiğinde tüm kotalar sınırsız gösterilir</p>
                    </div>
                  </div>
                  <div className="ml-auto">
                    <button type="button"
                      onClick={() => setForm({ ...form, isUnlimited: !form.isUnlimited })}
                      className="relative w-11 h-6 rounded-full transition-all"
                      style={{ background: form.isUnlimited ? "#d97706" : "#d1d5db" }}>
                      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all"
                        style={{ left: form.isUnlimited ? "22px" : "2px" }} />
                    </button>
                  </div>
                </label>
              </div>

              {/* ─── BÖLÜM 4: Yetkiler & Özellikler ─── */}
              <div className="px-8 py-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}>
                    <span className="text-white text-sm font-bold">4</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#1a1a2e" }}>Yetkiler & Özellikler</h3>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>Kota, entitlements ve paywall maddeleri</p>
                  </div>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Yetkiler (Entitlements)</label>
                    <div className="flex gap-2">
                      <input value={entitlementInput} onChange={(e) => setEntitlementInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEntitlement(); } }}
                        className="flex-1 text-sm px-4 py-2.5 rounded-xl outline-none font-mono"
                        style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }}
                        placeholder="becayis_pro" />
                      <button onClick={addEntitlement}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
                        style={{ background: "#fef3c7", color: "#92400e" }}>+ Ekle</button>
                    </div>
                    {form.entitlements.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {form.entitlements.map((ent) => (
                          <span key={ent} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-mono font-semibold"
                            style={{ background: "#fef3c7", color: "#92400e" }}>
                            {ent}
                            <button onClick={() => removeEntitlement(ent)} className="transition-colors" style={{ color: "#b45309" }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "#b45309")}>
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: "#9ca3af" }}>RevenueCat entitlement kimlikleri (becayis_pro, jobs_pro vb.)</p>
                  </div>

                  {/* Features */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>Paywall Özellikleri</label>
                    <div className="flex gap-2">
                      <input value={featureInput} onChange={(e) => setFeatureInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                        className="flex-1 text-sm px-4 py-2.5 rounded-xl outline-none"
                        style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#1a1a2e" }}
                        placeholder="Sınırsız ilan yayınlama" />
                      <button onClick={addFeature}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
                        style={{ background: "#dbeafe", color: "#1e40af" }}>+ Ekle</button>
                    </div>
                    {form.features.length > 0 && (
                      <div className="space-y-1.5 mt-3">
                        {form.features.map((feat, i) => (
                          <div key={i} className="flex items-center justify-between text-sm px-4 py-2.5 rounded-xl"
                            style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                            <span className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: "#dcfce7", color: "#16a34a" }}>✓</span>
                              <span style={{ color: "#15803d" }}>{feat}</span>
                            </span>
                            <button onClick={() => removeFeature(feat)} className="transition-colors" style={{ color: "#9ca3af" }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}>
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] mt-1" style={{ color: "#9ca3af" }}>Uygulamadaki Paywall ekranında gösterilecek madde listesi</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Sağ altta butonlar */}
            <div className="flex items-center justify-end gap-3 px-8 py-5" style={{ borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <button onClick={closeDrawer}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: "#f3f4f6", color: "#6b7280", border: "1px solid #e5e7eb" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#f3f4f6")}>
                İptal
              </button>
              <button disabled={saving || !form.name} onClick={handleSave}
                className="px-8 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", boxShadow: "0 4px 14px rgba(59, 130, 246, 0.4)" }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editPlan ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editPlan ? "Güncelle" : "Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes modalScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes modalFade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}

// ── Cancellation Search ──
export function CancellationSearch({ cancellations }: { cancellations: CancelledSubscription[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return cancellations;
    const q = search.toLowerCase().trim();
    return cancellations.filter((c) => {
      const fullName = `${c.user.firstName || ""} ${c.user.lastName || ""}`.toLowerCase();
      const name = (c.user.name || "").toLowerCase();
      const email = (c.user.email || "").toLowerCase();
      const phone = (c.user.phone || c.user.phoneNumber || "").toLowerCase();
      const tc = (c.user.tcKimlik || "").toLowerCase();
      const orderNo = (c.order?.orderNumber || "").toLowerCase();
      return (
        fullName.includes(q) ||
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        tc.includes(q) ||
        orderNo.includes(q)
      );
    });
  }, [cancellations, search]);

  const getUserName = (u: CancelledSubscription["user"]) =>
    u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "—";

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
    } catch {
      return "—";
    }
  };

  return (
    <div>
      {/* Arama */}
      <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Sipariş no, isim, TC, e-posta veya telefon ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2"
            style={{
              background: "var(--bg-muted)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      {/* Tablo */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--bg-muted)" }}>
              <th className="text-left px-6 py-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Kullanıcı</th>
              <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Plan</th>
              <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Fiyat</th>
              <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Sipariş No</th>
              <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-secondary)" }}>İptal Tarihi</th>
              <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Bitiş Tarihi</th>
              <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Durum</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                  {search ? "Arama sonucu bulunamadı." : "İptal edilen abonelik yok."}
                </td>
              </tr>
            )}
            {filtered.map((c) => {
              const now = new Date();
              const endDate = new Date(c.endsAt);
              const isStillActive = endDate > now;
              return (
                <tr key={c.id} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-muted)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{getUserName(c.user)}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{c.user.email || "—"}</p>
                      {(c.user.phone || c.user.phoneNumber) && (
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{c.user.phone || c.user.phoneNumber}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: "#fef3c7", color: "#92400e" }}>
                      {c.plan.name}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold" style={{ color: "var(--text-primary)" }}>
                    {c.plan.price} ₺/{c.plan.interval === "yearly" ? "yıl" : "ay"}
                  </td>
                  <td className="px-4 py-4 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                    {c.order?.orderNumber || "—"}
                  </td>
                  <td className="px-4 py-4" style={{ color: "var(--text-secondary)" }}>
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="px-4 py-4" style={{ color: isStillActive ? "#16a34a" : "#dc2626" }}>
                    {formatDate(c.endsAt)}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${isStillActive ? "" : ""}`}
                      style={{
                        background: isStillActive ? "#fff7ed" : "#fef2f2",
                        color: isStillActive ? "#c2410c" : "#dc2626",
                      }}>
                      {isStillActive ? "İptal — Aktif" : "İptal — Sona Erdi"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
