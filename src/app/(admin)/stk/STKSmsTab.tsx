// STK SMS Yönetim Sekmesi - Admin STK Sayfası İçin
"use client";
import { useState, useEffect } from "react";
import { MessageSquare, Shield, Clock, CheckCircle, XCircle, Loader2, AlertTriangle, Search, Pause, Play, Timer, CalendarDays } from "lucide-react";

interface SmsActivation {
  id: string; stkId: string; status: string; requestedAt: string;
  approvedAt?: string; expiresAt?: string; suspendedAt?: string;
  suspendReason?: string; rejectReason?: string;
  stk: { id: string; name: string; email?: string; phone?: string; smsCredits?: number };
}

interface STKItem { id: string; name: string; }

export default function STKSmsTab() {
  const [activations, setActivations] = useState<SmsActivation[]>([]);
  const [allStks, setAllStks] = useState<STKItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState("");
  const [search, setSearch] = useState("");
  const [showGrant, setShowGrant] = useState(false);
  const [grantStkId, setGrantStkId] = useState("");
  const [grantExpiry, setGrantExpiry] = useState("");
  const [expiryModal, setExpiryModal] = useState<SmsActivation | null>(null);
  const [newExpiry, setNewExpiry] = useState("");

  const load = async () => {
    try {
      const [ar, sr] = await Promise.all([
        fetch("/api/admin/sms-activation"),
        fetch("/api/admin/stk-list"),
      ]);
      const ad = await ar.json();
      const sd = await sr.json();
      if (ad.success) setActivations(ad.data);
      if (sd.success) setAllStks(sd.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const doAction = async (params: Record<string, string | undefined>) => {
    setProcessing(params.id || params.stkId || "x");
    try {
      const method = params.stkId && !params.id && params.action === undefined ? "POST" : "PATCH";
      await fetch("/api/admin/sms-activation", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      load();
    } catch {}
    setProcessing("");
  };

  const handleGrant = async () => {
    if (!grantStkId) return;
    setProcessing("grant");
    try {
      await fetch("/api/admin/sms-activation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stkId: grantStkId, expiresAt: grantExpiry || null }),
      });
      setShowGrant(false); setGrantStkId(""); setGrantExpiry("");
      load();
    } catch {}
    setProcessing("");
  };

  const handleExpiryUpdate = async () => {
    if (!expiryModal) return;
    await doAction({ id: expiryModal.id, action: "UPDATE_EXPIRY", expiresAt: newExpiry || undefined });
    setExpiryModal(null); setNewExpiry("");
  };

  const filteredActivations = activations.filter(a =>
    a.stk?.name?.toLowerCase().includes(search.toLowerCase())
  );

  // İzni olmayan STK'lar
  const activeStkIds = new Set(activations.map(a => a.stkId));
  const availableStks = allStks.filter(s => !activeStkIds.has(s.id));

  const pendingCount = activations.filter(a => a.status === "PENDING").length;
  const approvedCount = activations.filter(a => a.status === "APPROVED").length;
  const suspendedCount = activations.filter(a => a.status === "SUSPENDED").length;

  const getStatusBadge = (a: SmsActivation) => {
    const now = new Date();
    const expired = a.expiresAt && new Date(a.expiresAt) < now;
    if (a.status === "APPROVED" && expired) return { label: "⏰ Süresi Dolmuş", cls: "bg-orange-50 text-orange-700" };
    const map: Record<string, { label: string; cls: string }> = {
      APPROVED: { label: "✅ Aktif", cls: "bg-emerald-50 text-emerald-700" },
      PENDING: { label: "⏳ Bekliyor", cls: "bg-amber-50 text-amber-700" },
      REJECTED: { label: "❌ Reddedildi", cls: "bg-red-50 text-red-700" },
      SUSPENDED: { label: "⏸️ Askıda", cls: "bg-gray-100 text-gray-700" },
    };
    return map[a.status] || { label: a.status, cls: "bg-gray-50 text-gray-600" };
  };

  const getRemainingDays = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Süresi doldu";
    const days = Math.ceil(diff / 86400000);
    return days > 1 ? `${days} gün kaldı` : "Son gün";
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-5">
      {/* Üst Kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl p-4 border bg-white"><p className="text-xs text-gray-400 uppercase font-medium">Toplam</p><p className="text-2xl font-bold text-gray-900">{activations.length}</p></div>
        <div className="rounded-xl p-4 border bg-emerald-50 border-emerald-200"><p className="text-xs text-emerald-600 uppercase font-medium">Aktif</p><p className="text-2xl font-bold text-emerald-700">{approvedCount}</p></div>
        <div className="rounded-xl p-4 border bg-amber-50 border-amber-200"><p className="text-xs text-amber-600 uppercase font-medium">Bekleyen</p><p className="text-2xl font-bold text-amber-700">{pendingCount}</p></div>
        <div className="rounded-xl p-4 border bg-gray-50 border-gray-200"><p className="text-xs text-gray-500 uppercase font-medium">Askıda</p><p className="text-2xl font-bold text-gray-700">{suspendedCount}</p></div>
      </div>

      {/* Arama + Yeni İzin */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="STK ara..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
        <button onClick={() => setShowGrant(!showGrant)} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition flex items-center gap-2">
          <Shield className="w-4 h-4" /> SMS İzni Ver
        </button>
      </div>

      {/* Yeni İzin Formu */}
      {showGrant && (
        <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-5">
          <h4 className="font-bold text-sm text-gray-900 mb-3">📲 Yeni SMS İzni Tanımla</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">STK Seçin</label>
              <select value={grantStkId} onChange={e => setGrantStkId(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm">
                <option value="">— STK Seçin —</option>
                {availableStks.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Bitiş Tarihi (Opsiyonel)</label>
              <input type="datetime-local" value={grantExpiry} onChange={e => setGrantExpiry(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm" />
              <p className="text-[10px] text-gray-400 mt-1">Boş = Süresiz</p>
            </div>
            <div className="flex items-end">
              <button onClick={handleGrant} disabled={!grantStkId || processing === "grant"} className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {processing === "grant" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Onayla</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tablo */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">STK</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">Durum</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">Süre</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">Kredi</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-gray-500">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filteredActivations.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">SMS kaydı bulunamadı</td></tr>
            ) : filteredActivations.map(a => {
              const badge = getStatusBadge(a);
              return (
                <tr key={a.id} className="border-b hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{a.stk?.name || "—"}</p>
                    <p className="text-[10px] text-gray-400">{a.stk?.email || a.stk?.phone || ""}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                    {a.suspendReason && a.status === "SUSPENDED" && <p className="text-[10px] text-gray-400 mt-0.5">{a.suspendReason}</p>}
                    {a.rejectReason && a.status === "REJECTED" && <p className="text-[10px] text-red-400 mt-0.5">{a.rejectReason}</p>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a.expiresAt ? (
                      <div>
                        <p className="text-xs font-medium text-gray-700">{new Date(a.expiresAt).toLocaleDateString("tr-TR")}</p>
                        <p className={`text-[10px] ${new Date(a.expiresAt) > new Date() ? "text-emerald-600" : "text-red-500 font-bold"}`}>
                          {getRemainingDays(a.expiresAt)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">♾️ Süresiz</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-indigo-600">{(a.stk?.smsCredits || 0).toLocaleString("tr-TR")}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {a.status === "PENDING" && (
                        <>
                          <button onClick={() => doAction({ id: a.id, action: "APPROVE" })} disabled={!!processing} className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-medium hover:bg-emerald-700 disabled:opacity-50">✅ Onayla</button>
                          <button onClick={() => { const r = prompt("Red sebebi:"); if (r) doAction({ id: a.id, action: "REJECT", rejectReason: r }); }} disabled={!!processing} className="px-2.5 py-1.5 bg-red-500 text-white rounded-lg text-[11px] font-medium hover:bg-red-600 disabled:opacity-50">❌ Reddet</button>
                        </>
                      )}
                      {a.status === "APPROVED" && (
                        <>
                          <button onClick={() => { const r = prompt("Askıya alma sebebi:"); if (r) doAction({ id: a.id, action: "SUSPEND", suspendReason: r }); }} disabled={!!processing} className="px-2.5 py-1.5 bg-gray-600 text-white rounded-lg text-[11px] font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1">
                            <Pause className="w-3 h-3" /> Askıya Al
                          </button>
                          <button onClick={() => { setExpiryModal(a); setNewExpiry(a.expiresAt ? a.expiresAt.slice(0, 16) : ""); }} className="px-2.5 py-1.5 bg-blue-500 text-white rounded-lg text-[11px] font-medium hover:bg-blue-600 flex items-center gap-1">
                            <Timer className="w-3 h-3" /> Süre
                          </button>
                        </>
                      )}
                      {(a.status === "SUSPENDED" || a.status === "REJECTED") && (
                        <button onClick={() => doAction({ id: a.id, action: "APPROVE" })} disabled={!!processing} className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1">
                          <Play className="w-3 h-3" /> Aktifleştir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Süre Güncelleme Modal */}
      {expiryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setExpiryModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">⏱️ Süre Güncelle</h3>
            <p className="text-sm text-gray-500 mb-4">{expiryModal.stk?.name}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Bitiş Tarihi</label>
                <input type="datetime-local" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} className="w-full p-2.5 rounded-lg border text-sm" />
                <p className="text-[10px] text-gray-400 mt-1">Boş bırakırsanız süresiz yapılır</p>
              </div>
              <div className="flex gap-2">
                {[7, 30, 90, 365].map(d => (
                  <button key={d} onClick={() => {
                    const dt = new Date(); dt.setDate(dt.getDate() + d);
                    setNewExpiry(dt.toISOString().slice(0, 16));
                  }} className="flex-1 py-2 bg-gray-100 rounded-lg text-xs font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition">
                    {d} gün
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setExpiryModal(null)} className="flex-1 py-2.5 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">İptal</button>
                <button onClick={handleExpiryUpdate} disabled={!!processing} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                  {newExpiry ? "Süreyi Kaydet" : "Süresiz Yap"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
