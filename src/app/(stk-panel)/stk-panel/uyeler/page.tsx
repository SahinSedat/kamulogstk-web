"use client";

import { useState, useEffect, useCallback } from "react";
import PhoneInput, { formatPhoneForAPI } from "@/components/stk/PhoneInput";

interface Member {
  id: string;
  memberNumber: string | null;
  name: string;
  surname: string;
  tcKimlik: string | null;
  email: string;
  phone: string;
  status: string;
  category: string;
  registrationSource: string;
  joinDate: string | null;
  createdAt: string;
  city: string | null;
  district: string | null;
  premiumUntil: string | null;
}

interface PaidMember {
  id: string;
  name: string;
  phone: string;
  email: string;
  tcKimlik: string;
  paymentType: string;
  paymentDate: string;
  premiumUntil: string;
  applicationStatus: string;
}

interface Stats {
  total: number;
  active: number;
  pending: number;
  resigned: number;
  bySource: Record<string, number>;
}

const STATUS_OPTIONS = [
  { key: "ALL", label: "Tümü" },
  { key: "ACTIVE", label: "Aktif" },
  { key: "APPLIED", label: "Başvuru" },
  { key: "PENDING", label: "Beklemede" },
  { key: "APPROVED", label: "Onaylı" },
  { key: "RESIGNED", label: "İstifa" },
  { key: "SUSPENDED", label: "Pasif" },
  { key: "EXPELLED", label: "İhraç" },
  { key: "REJECTED", label: "Reddedildi" },
];

const STATUS_LABEL: Record<string, string> = { ACTIVE: "Aktif", APPLIED: "Başvuru", PENDING: "Beklemede", APPROVED: "Onaylı", RESIGNED: "İstifa", SUSPENDED: "Pasif", EXPELLED: "İhraç", REJECTED: "Reddedildi", DECEASED: "Vefat", RESIGNATION_REQ: "İstifa Talebi", RESIGNED_BOARD: "Kurul İstifası" };
const DUES_LABEL: Record<string, string> = { ANNUAL_DUES: "Yıllık Aidat", MONTHLY_DUES: "Aylık Aidat", ENTRANCE_FEE: "Giriş Aidatı", DONATION: "Bağış", OTHER: "Diğer" };

const SOURCE_MAP: Record<string, { label: string; bg: string; text: string }> = {
  ONLINE: { label: "Online", bg: "bg-violet-50 ring-1 ring-violet-200", text: "text-violet-700" },
  MOBILE: { label: "Mobil", bg: "bg-blue-50 ring-1 ring-blue-200", text: "text-blue-700" },
  IN_PERSON: { label: "Manuel", bg: "bg-gray-100 ring-1 ring-gray-200", text: "text-gray-700" },
  FOUNDER: { label: "Kurucu", bg: "bg-amber-50 ring-1 ring-amber-200", text: "text-amber-700" },
  IMPORT: { label: "İçe Aktarım", bg: "bg-emerald-50 ring-1 ring-emerald-200", text: "text-emerald-700" },
};

export default function UyelerPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, pending: 0, resigned: 0, bySource: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ name: "", surname: "", tcKimlik: "", email: "", phone: "", city: "", district: "" });
  const [confirmDelete, setConfirmDelete] = useState<{id:string;name:string;source?:string;status?:string;type?:string}|null>(null);
  const [deleting, setDeleting] = useState(false);
  const [apps, setApps] = useState<any[]>([]);
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [detailApp, setDetailApp] = useState<any>(null);
  const [stkIdRef, setStkIdRef] = useState<string|null>(null);
  const [paidMembers, setPaidMembers] = useState<PaidMember[]>([]);
  const [actionLoading, setActionLoading] = useState<string|null>(null);
  const [rejectModal, setRejectModal] = useState<{id:string;name:string}|null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectMember, setRejectMember] = useState<{id:string;name:string;status:string}|null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/stk-panel/members");
      const json = await res.json();
      if (json.success) {
        setMembers(json.data);
        setStats(json.stats);
        if (json.paidMembers) setPaidMembers(json.paidMembers);
      }
    } catch {
      console.error("Üyeler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const fetchApps = useCallback(async (id: string) => {
    try { const r = await fetch(`/api/admin/stk/applications?stkId=${id}`); const j = await r.json(); if(j.success) setApps(j.data); } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/stk-panel/profile").then(r=>r.json()).then(d=>{
      if(d.success&&d.data?.id){ setStkIdRef(d.data.id); fetchApps(d.data.id); }
    }).catch(()=>{});
    fetch("/api/stk-panel/board").then(r=>r.json()).then(j=>{if(j.success)setBoardMembers(j.data);}).catch(()=>{});
  }, [fetchApps]);

  const handleDeleteMember = async (id:string, permanent:boolean) => {
    setDeleting(true);
    try {
      const url = permanent ? `/api/stk-panel/members?id=${id}&permanent=true` : `/api/stk-panel/members?id=${id}`;
      await fetch(url,{method:"DELETE"});
      showToast(permanent ? "✅ Üye kalıcı olarak silindi" : "Üye pasife alındı","success");
      setConfirmDelete(null); fetchMembers(); if(stkIdRef) fetchApps(stkIdRef);
    } catch { showToast("Hata","error"); } finally { setDeleting(false); }
  };

  const handleDeleteApp = async (id:string) => {
    setDeleting(true);
    try {
      await fetch(`/api/admin/stk/applications`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids:[id]})});
      showToast("✅ Başvuru kalıcı olarak silindi","success");
      setConfirmDelete(null); fetchMembers(); if(stkIdRef) fetchApps(stkIdRef);
    } catch { showToast("Hata","error"); } finally { setDeleting(false); }
  };

  const handleApprove = async (appId: string) => {
    setActionLoading(appId);
    try { const r = await fetch(`/api/admin/stk/applications?id=${appId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"APPROVED"})}); const j = await r.json(); if(j.success){showToast("✅ Başvuru onaylandı","success"); if(stkIdRef) fetchApps(stkIdRef); fetchMembers();} else showToast(j.error||"Hata","error"); }
    catch { showToast("Hata","error"); } finally { setActionLoading(null); }
  };
  const handleReject = async (appId: string, reason: string) => {
    if (!reason.trim()) return;
    setActionLoading(appId);
    try { const r = await fetch(`/api/admin/stk/applications?id=${appId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"REJECTED",rejectionReason:reason})}); const j = await r.json(); if(j.success){showToast("❌ Başvuru reddedildi","success"); setRejectModal(null); setRejectReason(""); if(stkIdRef) fetchApps(stkIdRef);} else showToast(j.error||"Hata","error"); }
    catch { showToast("Hata","error"); } finally { setActionLoading(null); }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/stk-panel/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, phone: formatPhoneForAPI(form.phone) }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("✅ Üye başarıyla eklendi!", "success");
        setShowAddModal(false);
        setForm({ name: "", surname: "", tcKimlik: "", email: "", phone: "", city: "", district: "" });
        fetchMembers();
      } else {
        showToast(json.error || "Hata oluştu", "error");
      }
    } catch {
      showToast("Sunucu hatası", "error");
    } finally {
      setSaving(false);
    }
  };

  // Premium kontrolü: member.premiumUntil VEYA paidMembers eşleşmesi
  const getPaidInfo = (m: Member): PaidMember | null => {
    const mPhone10 = m.phone?.replace(/\D/g, "").slice(-10) || "";
    return paidMembers.find(p => {
      const pPhone10 = p.phone?.replace(/\D/g, "").slice(-10) || "";
      return (mPhone10 && pPhone10 && mPhone10 === pPhone10) ||
             (m.email && p.email && m.email.toLowerCase() === p.email.toLowerCase());
    }) || null;
  };
  const isPremium = (m: Member) => {
    if (m.premiumUntil && new Date(m.premiumUntil) > new Date()) return true;
    const paid = getPaidInfo(m);
    return paid ? new Date(paid.premiumUntil) > new Date() : false;
  };
  const daysLeft = (m: Member) => {
    // Önce member.premiumUntil kontrol et, yoksa paidMembers'dan al
    let until = m.premiumUntil ? new Date(m.premiumUntil) : null;
    if (!until || until <= new Date()) {
      const paid = getPaidInfo(m);
      if (paid) until = new Date(paid.premiumUntil);
    }
    return until ? Math.max(0, Math.ceil((until.getTime() - Date.now()) / 86400000)) : 0;
  };

  const filtered = members.filter(m => {
    if(m.status==="SUSPENDED" && statusFilter !== "SUSPENDED") return false;
    if(premiumOnly) {
      // Premium filtre: Member tablosundaki eşleşenler + eşleşmeyenler (sanal satır)
      return isPremium(m);
    }
    const matchSearch = search === "" ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.surname.toLowerCase().includes(search.toLowerCase()) ||
      (m.tcKimlik && m.tcKimlik.includes(search)) ||
      m.phone.includes(search) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredApps = apps.filter(a => {
    const matchSearch = search === "" ||
      (a.name && a.name.toLowerCase().includes(search.toLowerCase())) ||
      (a.tcKimlik && a.tcKimlik.includes(search)) ||
      (a.phone && a.phone.includes(search)) ||
      (a.email && a.email.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "ALL" || statusFilter === "APPLIED" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Member tablosunda eşleşmeyen ödeme yapan kişiler (her zaman hesapla — Tümü'de de göster)
  const unmatchedPaid = paidMembers.filter(p => {
    const pPhone10 = p.phone?.replace(/\D/g, "").slice(-10) || "";
    const alreadyInMembers = members.some(m => {
      const mPhone10 = m.phone?.replace(/\D/g, "").slice(-10) || "";
      return (pPhone10 && mPhone10 && pPhone10 === mPhone10) ||
             (p.email && m.email && p.email.toLowerCase() === m.email.toLowerCase());
    });
    return !alreadyInMembers && new Date(p.premiumUntil) > new Date();
  });
  // Arama filtresi uygula
  const filteredPaidOnly = unmatchedPaid.filter(p => {
    if (premiumOnly) return true; // Premium modda hepsini göster
    if (statusFilter !== "ALL") return false; // Durum filtreliyken gizle
    return true; // Tümü modda göster
  }).filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s) || p.phone.includes(search) ||
           p.email.toLowerCase().includes(s) || (p.tcKimlik && p.tcKimlik.includes(search));
  });

  const hasData = filtered.length > 0 || filteredApps.length > 0 || boardMembers.length > 0 || filteredPaidOnly.length > 0;

  const maskTC = (tc: string | null) => tc || "—";
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("tr-TR") : "—";
  const formatEmail = (email: string | null | undefined) => {
    if (!email || email.trim() === "" || email.includes("no-email")) return "—";
    return email;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white animate-slide-in ${
          toast.type === "success" ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-red-500 to-rose-500"
        }`}>{toast.message}</div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">👥 Üye Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">Dernek üyelerini ve başvuruları yönetin</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:from-indigo-700 hover:to-violet-700 transition-all duration-300 active:scale-95"
        ><span className="text-lg">+</span> Manuel Üye Ekle</button>
      </div>

      <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="rounded-xl bg-white border border-gray-100 p-4 shadow-sm text-center"><p className="text-2xl font-bold text-gray-900">{(stats.total || 0) + ((stats as any).appTotal || 0)}</p><p className="text-xs text-gray-500">Toplam</p></div>
        <div className="rounded-xl bg-white border border-emerald-100 p-4 shadow-sm text-center"><p className="text-2xl font-bold text-emerald-600">{(stats.active || 0) + ((stats as any).appApproved || 0)}</p><p className="text-xs text-gray-500">✅ Aktif Üye</p></div>
        <div className="rounded-xl bg-white border border-amber-100 p-4 shadow-sm text-center"><p className="text-2xl font-bold text-amber-600">{(stats.pending || 0) + ((stats as any).appPending || 0)}</p><p className="text-xs text-gray-500">⏳ Beklemede</p></div>
        <div className="rounded-xl bg-white border border-red-100 p-4 shadow-sm text-center"><p className="text-2xl font-bold text-red-600">{(stats as any).appRejected || 0}</p><p className="text-xs text-gray-500">❌ Reddedilen</p></div>
        <div className="rounded-xl border p-4 shadow-sm text-center cursor-pointer hover:ring-2 hover:ring-amber-300 transition-all" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,88,12,0.05))", borderColor: "#F59E0B" }} onClick={() => { setPremiumOnly(!premiumOnly); setStatusFilter("ALL"); }}><p className="text-2xl font-bold text-amber-700">{(stats as any).paidCount || paidMembers.length}</p><p className="text-xs text-amber-600 font-semibold">💰 Aidat Ödeyen</p></div>
        <div className="rounded-xl bg-white border border-blue-100 p-4 shadow-sm text-center"><p className="text-2xl font-bold text-blue-600">{stats.bySource?.MOBILE || 0}</p><p className="text-xs text-gray-500">📱 Mobil</p></div>
        <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm text-center"><p className="text-2xl font-bold text-gray-600">{stats.bySource?.IN_PERSON || 0}</p><p className="text-xs text-gray-500">✋ Manuel</p></div>
        <div className="rounded-xl bg-white border border-violet-100 p-4 shadow-sm text-center"><p className="text-2xl font-bold text-violet-600">{(stats as any).appApproved || 0}</p><p className="text-xs text-gray-500">📋 Başvuru Onaylı</p></div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input type="text" placeholder="İsim, T.C., telefon, e-posta ile ara..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => { setPremiumOnly(!premiumOnly); if(!premiumOnly) setStatusFilter("ALL"); }}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${premiumOnly ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200" : "bg-amber-50 text-amber-700 border border-amber-200 hover:border-amber-400"}`}
          >💰 Aidat Ödeyen Üyeler</button>
          <div className="w-px h-6 bg-gray-200" />
          {STATUS_OPTIONS.map(f => (
            <button key={f.key} onClick={() => { setStatusFilter(f.key); setPremiumOnly(false); }}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${statusFilter === f.key && !premiumOnly ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600"}`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : !hasData ? (
          <div className="py-20 text-center">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-gray-500 text-sm">{search || statusFilter !== "ALL" ? "Sonuç bulunamadı" : "Henüz üye bulunmuyor"}</p>
            {!search && statusFilter === "ALL" && (
              <button onClick={() => setShowAddModal(true)} className="mt-3 text-indigo-600 text-sm font-medium hover:text-indigo-800">+ İlk üyeyi ekleyin</button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50/80">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Üye</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">T.C. Kimlik</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefon</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kaynak</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kayıt</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlem</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(m => {
                  const src = SOURCE_MAP[m.registrationSource] || { label: m.registrationSource, bg: "bg-gray-100", text: "text-gray-600" };
                  
                  // Board (Yönetim Kurulu) eşleşmesini bul (telefon veya e-posta ile)
                  const mPhone10 = m.phone?.replace(/\D/g, "").slice(-10) || "";
                  const boardMatch = boardMembers.find(b => {
                    const bPhone10 = b.phone?.replace(/\D/g, "").slice(-10) || "";
                    return (mPhone10 && bPhone10 && mPhone10 === bPhone10) ||
                           (m.email && b.email && m.email.toLowerCase() === b.email.toLowerCase()) ||
                           (m.name.toLowerCase() === b.name.toLowerCase()); // İsimle de eşleşebilir
                  });

                  return (
                    <tr key={m.id} className={`transition-colors duration-200 ${isPremium(m) ? "border-l-4 border-l-amber-400" : "hover:bg-indigo-50/30"}`} style={isPremium(m) ? { background: "linear-gradient(90deg, rgba(245,158,11,0.08), rgba(251,191,36,0.04), transparent)" } : undefined}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${isPremium(m) ? "bg-gradient-to-br from-amber-300 to-orange-300 text-amber-900 ring-2 ring-amber-400 shadow-md shadow-amber-200" : boardMatch ? "bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700" : "bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700"}`}>
                            {m.name.charAt(0)}{m.surname.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                              {m.name} {m.surname}
                              {isPremium(m) && <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm text-white" style={{ background: "linear-gradient(135deg, #F59E0B, #EA580C)" }}>💰 AİDAT</span>}
                            </p>
                            <p className="text-xs text-gray-400">{formatEmail(m.email)}</p>
                            {isPremium(m) && (
                              <p className={`text-[11px] font-bold mt-0.5 ${daysLeft(m) <= 7 ? "text-red-600 animate-pulse" : daysLeft(m) <= 30 ? "text-amber-600" : "text-emerald-600"}`}>
                                ⏳ {daysLeft(m)} Gün Kaldı {daysLeft(m) <= 3 && "🔴"} {daysLeft(m) > 3 && daysLeft(m) <= 7 && "⚠️"}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">{maskTC(m.tcKimlik)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{m.phone}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${src.bg} ${src.text}`}>{src.label}</span>
                          {boardMatch && <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-violet-50 ring-1 ring-violet-200 text-violet-700">🏛️ {boardMatch.title}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={m.status}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            if (newStatus === m.status) return;
                            // REJECTED seçilirse gerekçe modalı aç
                            if (newStatus === "REJECTED") {
                              // Select'i hemen eski değere döndür (fetchMembers ile)
                              setRejectMember({id:m.id, name:`${m.name} ${m.surname}`, status:newStatus});
                              setRejectReason("");
                              fetchMembers(); // Select'i resetle
                              return;
                            }
                            setActionLoading(m.id);
                            fetch(`/api/stk-panel/members?id=${m.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:newStatus})})
                              .then(r => r.json())
                              .then(j => {
                                if(j.success){showToast(`✅ ${m.name} ${m.surname} → ${STATUS_LABEL[newStatus]||newStatus}`,"success"); fetchMembers();}
                                else showToast(j.error||"Hata","error");
                              })
                              .catch(() => showToast("Hata","error"))
                              .finally(() => setActionLoading(null));
                          }}
                          disabled={actionLoading===m.id}
                          className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400/40 ${
                            m.status==="ACTIVE"||m.status==="APPROVED"?"bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200":
                            m.status==="APPLIED"||m.status==="PENDING"?"bg-amber-50 text-amber-700 ring-1 ring-amber-200":
                            "bg-red-50 text-red-700 ring-1 ring-red-200"
                          }`}
                        >
                          {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{formatDate(m.joinDate || m.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={()=>setConfirmDelete({id:m.id,name:`${m.name} ${m.surname}`,source:m.registrationSource,status:m.status})} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-[11px] font-semibold ring-1 ring-red-200 hover:bg-red-100 transition-colors">🗑 Sil</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {/* Başvurular — premiumOnly aktifken gizle */}
                {!premiumOnly && filteredApps.map(a=>{const st=a.status==="APPROVED"?"bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200":a.status==="PENDING"||a.status==="APPLIED"?"bg-amber-50 text-amber-700 ring-1 ring-amber-200":"bg-red-50 text-red-700 ring-1 ring-red-200";return(
                  <tr key={`app_${a.id}`} className="hover:bg-blue-50/30 transition-colors duration-200 group">
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-sm font-bold text-blue-700">{a.name?.split(" ").map((n:string)=>n[0]).join("").slice(0,2)}</div><div><p className="text-sm font-semibold text-gray-900">{a.name}</p><p className="text-xs text-gray-400">{formatEmail(a.email)}</p></div></div></td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{a.tcKimlik}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{a.phone}</td>
                    <td className="px-6 py-4"><span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-50 ring-1 ring-blue-200 text-blue-700">Başvuru</span></td>
                    <td className="px-6 py-4">
                      <select
                        value={a.status}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          if (newStatus === a.status) return;
                          if (newStatus === "REJECTED") {
                            setRejectModal({id:a.id,name:a.name||'Üye'});
                            setRejectReason("");
                            return;
                          }
                          setActionLoading(a.id);
                          fetch(`/api/admin/stk/applications?id=${a.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:newStatus})})
                            .then(r => r.json())
                            .then(j => {
                              if(j.success){showToast(`✅ ${a.name} → ${STATUS_LABEL[newStatus]||newStatus}`,"success"); if(stkIdRef) fetchApps(stkIdRef); fetchMembers();}
                              else showToast(j.error||"Hata","error");
                            })
                            .catch(() => showToast("Hata","error"))
                            .finally(() => setActionLoading(null));
                        }}
                        disabled={actionLoading===a.id}
                        className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400/40 ${
                          a.status==="APPROVED"?"bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200":
                          a.status==="PENDING"||a.status==="APPLIED"?"bg-amber-50 text-amber-700 ring-1 ring-amber-200":
                          a.status==="REJECTED"?"bg-red-50 text-red-700 ring-1 ring-red-200":
                          "bg-gray-50 text-gray-700 ring-1 ring-gray-200"
                        }`}
                      >
                        {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(a.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(a.status==="PENDING"||a.status==="APPLIED")&&<>
                          <button onClick={()=>handleApprove(a.id)} disabled={actionLoading===a.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">✓ Onayla</button>
                          <button onClick={()=>setRejectModal({id:a.id,name:a.name||'Üye'})} disabled={actionLoading===a.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">✕ Reddet</button>
                        </>}
                        <button onClick={()=>setDetailApp(a)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[11px] font-semibold ring-1 ring-indigo-200 hover:bg-indigo-100 transition-colors">📋 Detay</button>
                        <button onClick={()=>setConfirmDelete({id:a.id,name:a.name||'Üye',type:'app'})} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-[11px] font-semibold ring-1 ring-red-200 hover:bg-red-100 transition-colors">🗑 Sil</button>
                      </div>
                    </td>
                  </tr>)})}
                {/* Aidat Ödeyen (Member tablosunda olmayan) */}
                {filteredPaidOnly.length > 0 && <tr><td colSpan={7} className="px-6 py-3" style={{ background: "linear-gradient(90deg, rgba(245,158,11,0.12), transparent)" }}><p className="text-xs font-bold text-amber-600">💰 Aidat Ödeyen Üyeler (Başvuru Üzerinden) — {filteredPaidOnly.length} kişi</p></td></tr>}
                {filteredPaidOnly.map((p, i) => {
                  const dl = Math.max(0, Math.ceil((new Date(p.premiumUntil).getTime() - Date.now()) / 86400000));
                  const appStatusStyle = p.applicationStatus === "APPROVED" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" :
                    p.applicationStatus === "REJECTED" ? "bg-red-50 text-red-700 ring-1 ring-red-200" :
                    p.applicationStatus === "RESIGNED" || p.applicationStatus === "RESIGN_PENDING" ? "bg-purple-50 text-purple-700 ring-1 ring-purple-200" :
                    "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
                  return (
                    <tr key={`paid_${i}`} className="border-l-4 border-l-amber-400 transition-colors" style={{ background: "linear-gradient(90deg, rgba(245,158,11,0.08), rgba(251,191,36,0.04), transparent)" }}>
                      <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 to-orange-300 flex items-center justify-center text-sm font-bold text-amber-900 ring-2 ring-amber-400 shadow-md shadow-amber-200">{p.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}</div><div><div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-semibold text-gray-900">{p.name}</p><span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm text-white" style={{ background: "linear-gradient(135deg, #F59E0B, #EA580C)" }}>💰 AİDAT</span></div><p className="text-xs text-gray-400">{formatEmail(p.email)}</p>{dl > 0 && <p className={`text-xs font-bold mt-0.5 ${dl <= 7 ? "text-red-600 animate-pulse" : dl <= 30 ? "text-amber-600" : "text-emerald-600"}`}>⏳ {dl} Gün Kaldı</p>}</div></div></td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">{p.tcKimlik ? maskTC(p.tcKimlik) : "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{p.phone}</td>
                      <td className="px-6 py-4"><span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-50 ring-1 ring-amber-200 text-amber-700">{DUES_LABEL[p.paymentType] || p.paymentType}</span></td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${appStatusStyle}`}>{STATUS_LABEL[p.applicationStatus] || p.applicationStatus}</span></td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(p.paymentDate).toLocaleDateString("tr-TR")}</td>
                      <td className="px-6 py-4 text-right"><button onClick={()=>setConfirmDelete({id:p.id,name:p.name,type:'app'})} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-[11px] font-semibold ring-1 ring-red-200 hover:bg-red-100 transition-colors">🗑 Sil</button></td>
                    </tr>
                  );
                })}
                {/* Pasif/Silinen Üyeler */}
                {members.filter(m=>m.status==="SUSPENDED").length>0&&<tr><td colSpan={7} className="px-6 py-3 bg-red-50/50"><p className="text-xs font-semibold text-red-400">⚠️ Pasife Alınan Üyeler (log kaydı — sistemden silinmedi)</p></td></tr>}
                {members.filter(m=>m.status==="SUSPENDED").map(m=>(
                  <tr key={`inactive_${m.id}`} className="bg-red-50/30 opacity-60">
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-sm font-bold text-red-400">{m.name.charAt(0)}{m.surname.charAt(0)}</div><div><p className="text-sm font-semibold text-red-400 line-through">{m.name} {m.surname}</p><p className="text-xs text-red-300">{formatEmail(m.email)}</p></div></div></td>
                    <td className="px-6 py-4 text-sm text-red-300 font-mono">{maskTC(m.tcKimlik)}</td>
                    <td className="px-6 py-4 text-sm text-red-300">{m.phone}</td>
                    <td className="px-6 py-4"><span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-500 ring-1 ring-red-200">{(SOURCE_MAP[m.registrationSource]||{label:m.registrationSource}).label}</span></td>
                    <td className="px-6 py-4"><span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-500 ring-1 ring-red-200">Pasif</span></td>
                    <td className="px-6 py-4 text-sm text-red-300">{formatDate(m.joinDate||m.createdAt)}</td>
                    <td className="px-6 py-4 text-right"><button onClick={()=>setConfirmDelete({id:m.id,name:`${m.name} ${m.surname}`,source:m.registrationSource,status:m.status})} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-[11px] font-semibold ring-1 ring-red-200 hover:bg-red-100 transition-colors">🗑 Sil</button></td>
                  </tr>))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Delete */}
      {confirmDelete&&(<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setConfirmDelete(null)}><div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/><div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-scale-in" onClick={e=>e.stopPropagation()}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><span className="text-3xl">⚠️</span></div>
          <h3 className="text-lg font-bold text-gray-900">{confirmDelete.type==='app'?'Başvuru Sil':'Üye Sil'}</h3>
          <p className="text-sm text-gray-500 mt-2"><strong>{confirmDelete.name}</strong></p>
          <p className="text-xs text-red-500 mt-1">Bu işlem geri alınamaz!</p>
        </div>
        <div className="flex flex-col gap-2 mt-6">
          <button onClick={()=>setConfirmDelete(null)} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
        {confirmDelete.type==='app' ? (
            <button onClick={()=>handleDeleteMember(confirmDelete.id, false)} disabled={deleting} className="w-full px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50">{deleting?"İşleniyor...":"⏸️ Pasife Al"}</button>
          ) : (<>
            {confirmDelete.status!=="SUSPENDED"&&<button onClick={()=>handleDeleteMember(confirmDelete.id, false)} disabled={deleting} className="w-full px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50">{deleting?"İşleniyor...":"⏸️ Pasife Al (Kayıt kalır)"}</button>}
          </>)}
        </div>
      </div></div>)}

      {/* Detail Modal */}
      {detailApp&&(<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setDetailApp(null)}><div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/><div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-scale-in" onClick={e=>e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 flex items-center justify-between sticky top-0 z-10"><h3 className="text-lg font-bold text-white">📋 Başvuru Detayı</h3><button onClick={()=>setDetailApp(null)} className="text-white/70 hover:text-white text-2xl">×</button></div>
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-2"><span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${detailApp.status==="APPROVED"?"bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200":detailApp.status==="PENDING"||detailApp.status==="APPLIED"?"bg-amber-50 text-amber-700 ring-1 ring-amber-200":"bg-red-50 text-red-700 ring-1 ring-red-200"}`}>● {STATUS_LABEL[detailApp.status]||detailApp.status}</span><span className="text-xs text-gray-400">{formatDate(detailApp.createdAt)}</span></div>
          <div><h4 className="text-xs font-semibold text-indigo-600 mb-2">👤 KİŞİSEL BİLGİLER</h4><div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-gray-400">Ad Soyad</p><p className="font-semibold text-gray-900">{detailApp.name}</p></div><div><p className="text-xs text-gray-400">TC Kimlik</p><p className="font-mono text-gray-900">{detailApp.tcKimlik||"—"}</p></div><div><p className="text-xs text-gray-400">E-posta</p><p className="text-gray-700">{formatEmail(detailApp.email)}</p></div><div><p className="text-xs text-gray-400">Telefon</p><p className="text-gray-700">{detailApp.phone}</p></div></div></div>

          {/* Durum Değiştirme */}
          <div><h4 className="text-xs font-semibold text-indigo-600 mb-2">⭐ ÜYELİK DURUMU</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-1">Durum Değiştir</p>
                <select
                  value={detailApp.status}
                  onChange={async (e) => {
                    const newStatus = e.target.value;
                    if (newStatus === detailApp.status) return;
                    setActionLoading(detailApp.id);
                    try {
                      const r = await fetch(`/api/admin/stk/applications?id=${detailApp.id}`, {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:newStatus})});
                      const j = await r.json();
                      if (j.success) { showToast(`✅ Durum güncellendi: ${STATUS_LABEL[newStatus]||newStatus}`, "success"); setDetailApp({...detailApp, status: newStatus}); if(stkIdRef) fetchApps(stkIdRef); fetchMembers(); }
                      else showToast(j.error||"Hata","error");
                    } catch { showToast("Hata","error"); }
                    finally { setActionLoading(null); }
                  }}
                  disabled={actionLoading===detailApp.id}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><p className="text-xs text-gray-400">Aidat Türü</p><p className="mt-1">{DUES_LABEL[detailApp.duesType]||detailApp.duesType||"—"}</p></div>
            </div>
          </div>

          {detailApp.stk&&<div><h4 className="text-xs font-semibold text-indigo-600 mb-2">🏢 STK</h4><p className="text-sm font-semibold text-gray-900">{detailApp.stk.name}</p><p className="text-xs text-gray-400">Onay: {formatDate(detailApp.updatedAt||detailApp.createdAt)}</p></div>}
          {detailApp.consentGiven!==undefined&&<div><h4 className="text-xs font-semibold text-emerald-600 mb-2">✅ ONAM & SÖZLEŞME</h4><p className="text-sm">{detailApp.consentGiven?"✅ Onam verildi":"❌ Onam verilmedi"}</p></div>}
          {detailApp.signatureUrl&&<div><h4 className="text-xs font-semibold text-indigo-600 mb-2">✍️ İMZA</h4><div className="border rounded-lg p-2 bg-gray-50 inline-block"><img src={detailApp.signatureUrl} alt="İmza" className="max-w-[220px] max-h-[160px]"/></div><div className="mt-2"><a href={detailApp.signatureUrl} download className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">⬇️ İmzayı İndir</a></div></div>}
          {detailApp.documentUrl&&<div><h4 className="text-xs font-semibold text-orange-600 mb-2">📄 YÜKLENEN BELGE (TARAMA)</h4><div className="border-2 border-dashed border-orange-300 rounded-lg p-2 bg-orange-50/30">{detailApp.documentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)?<img src={detailApp.documentUrl} alt="Belge" className="max-w-full max-h-[300px] rounded-lg mx-auto"/>:<iframe src={detailApp.documentUrl} className="w-full h-[300px] rounded-lg border-0"/>}</div><div className="mt-2"><a href={detailApp.documentUrl} target="_blank" download className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium hover:bg-orange-700">📄 Belgeyi İndir</a></div></div>}
          {detailApp.contractUrl&&<div><h4 className="text-xs font-semibold text-amber-600 mb-2">📝 ÜYELİK SÖZLEŞMESİ</h4><div className="border-2 border-dashed border-amber-300 rounded-lg p-2 bg-amber-50/30">{detailApp.contractUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)?<img src={detailApp.contractUrl} alt="Sözleşme" className="max-w-full max-h-[300px] rounded-lg mx-auto"/>:<iframe src={detailApp.contractUrl} className="w-full h-[300px] rounded-lg border-0"/>}</div><div className="mt-2"><a href={detailApp.contractUrl} target="_blank" download className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700">📄 Sözleşmeyi İndir</a></div></div>}
          <div className="flex justify-end pt-2 gap-2">
            {(detailApp.status==="PENDING"||detailApp.status==="APPLIED")&&<>
              <button onClick={()=>{handleApprove(detailApp.id);setDetailApp({...detailApp,status:"APPROVED"});}} disabled={actionLoading===detailApp.id} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">✓ Onayla</button>
              <button onClick={()=>{setRejectModal({id:detailApp.id,name:detailApp.name||'Üye'});}} disabled={actionLoading===detailApp.id} className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">✕ Reddet</button>
            </>}
            <button onClick={()=>setDetailApp(null)} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">Kapat</button>
          </div>
        </div>
      </div></div>)}
      </>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">+ Manuel Üye Ekle</h3>
                <button onClick={() => setShowAddModal(false)} className="text-white/70 hover:text-white text-2xl">×</button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Ad *</label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ahmet" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Soyad *</label>
                  <input required value={form.surname} onChange={e => setForm(p => ({ ...p, surname: e.target.value }))} placeholder="Yılmaz" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">T.C. Kimlik No</label>
                <input value={form.tcKimlik} onChange={e => setForm(p => ({ ...p, tcKimlik: e.target.value }))} maxLength={11} placeholder="12345678901" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">E-posta *</label>
                  <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="ahmet@mail.com" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Telefon *</label>
                  <PhoneInput required value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Şehir</label>
                  <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="İstanbul" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">İlçe</label>
                  <input value={form.district} onChange={e => setForm(p => ({ ...p, district: e.target.value }))} placeholder="Kadıköy" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all" />
                </div>
              </div>
              <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3">
                <p className="text-xs text-indigo-700">ℹ️ Manuel eklenen üyeler <strong>&quot;IN_PERSON&quot;</strong> kaynağıyla kaydedilir ve istatistiklerde ayrıca görünür.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 transition-colors">İptal</button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all disabled:opacity-50">
                  {saving ? "Kaydediliyor..." : "Üyeyi Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => {setRejectModal(null);setRejectReason("");}}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5">
              <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-white">❌ Başvuru Reddet</h3><button onClick={() => {setRejectModal(null);setRejectReason("");}} className="text-white/70 hover:text-white text-2xl">×</button></div>
              <p className="text-white/80 text-sm mt-1">{rejectModal.name} adlı üyenin başvurusu reddedilecek</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Red Gerekçesi <span className="text-red-500">*</span></label>
                <textarea rows={4} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Başvurunun neden reddedildiğini yazın... (Zorunlu)" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all resize-none" />
                {rejectReason.trim() === "" && <p className="text-xs text-red-500 mt-1">⚠️ Red gerekçesi zorunludur</p>}
              </div>
              <p className="text-xs text-gray-400">📨 Üyeye e-posta, push bildirim ve WhatsApp mesajı olarak bildirilecektir.</p>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => {setRejectModal(null);setRejectReason("");}} className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800">İptal</button>
                <button onClick={() => handleReject(rejectModal.id, rejectReason)} disabled={!rejectReason.trim() || actionLoading === rejectModal.id} className="px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-all">
                  {actionLoading === rejectModal.id ? "İşleniyor..." : "Reddet ve Bildir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Üye Durum Değişikliği — Ret Gerekçesi Modalı */}
      {rejectMember && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setRejectMember(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-5 rounded-t-2xl">
              <h3 className="text-lg font-bold text-white">❌ Üye Reddetme Gerekçesi</h3>
              <p className="text-red-100 text-sm mt-1">{rejectMember.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">Bu üyeyi &quot;Reddedildi&quot; olarak işaretlemek üzeresiniz. Lütfen ret gerekçesini yazınız:</p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Ret gerekçesi yazınız..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-300 resize-none"
                autoFocus
              />
              <div className="flex gap-3">
                <button onClick={() => setRejectMember(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">İptal</button>
                <button
                  disabled={!rejectReason.trim() || actionLoading === rejectMember.id}
                  onClick={async () => {
                    if (!rejectReason.trim()) return;
                    setActionLoading(rejectMember.id);
                    try {
                      const r = await fetch(`/api/stk-panel/members?id=${rejectMember.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "REJECTED", rejectionReason: rejectReason.trim() }),
                      });
                      const j = await r.json();
                      if (j.success) {
                        showToast(`❌ ${rejectMember.name} → Reddedildi`, "success");
                        setRejectMember(null);
                        setRejectReason("");
                        fetchMembers();
                      } else showToast(j.error || "Hata", "error");
                    } catch { showToast("Hata", "error"); } finally { setActionLoading(null); }
                  }}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-all"
                >❌ Reddet</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes slide-in { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .animate-scale-in { animation: scale-in 0.3s ease-out; }
        .animate-slide-in { animation: slide-in 0.4s ease-out; }
      `}</style>
    </div>
  );
}
