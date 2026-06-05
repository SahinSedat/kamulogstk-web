"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface StkData {
  stk: { id: string; name: string; type: string; status: string; email: string; phone: string; city: string; memberCount: number; smsCredits: number; pushCredits: number; whatsappCredits: number; emailCredits: number; registrationNumber: string; createdAt: string; };
  memberStats: { total: number; bySource: Record<string, number>; };
  boardMembers: { id: string; name: string; title: string; phone: string; email: string; }[];
  recentDecisions: { id: string; decisionNumber: string; subject: string; date: string; status: string; }[];
  assemblies: { id: string; assemblyType: string; assemblyNumber: number; date: string; status: string; location: string; }[];
  documents: { id: string; title: string; fileUrl: string; fileType: string; createdAt: string; }[];
  campaigns: { id: string; title: string; channel: string; targetCount: number; status: string; createdAt: string; }[];
  campaignStats: { total: number; totalSent: number; };
  financeSummary: { income: number; expense: number; balance: number; };
  financeRecords: { id: string; type: string; category: string; amount: number; description: string; date: string; }[];
}

const CAT_LABELS: Record<string, string> = { DUES: "Aidat", DONATION: "Bağış", RENT: "Kira", BILL: "Fatura", EVENT: "Etkinlik", OTHER: "Diğer" };
const SRC_LABELS: Record<string, string> = { ONLINE: "Online", MOBILE: "Mobil", IN_PERSON: "Elden", FOUNDER: "Kurucu", IMPORT: "İçe Aktarım" };

export default function STKRadarPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<StkData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try { const res = await fetch(`/api/admin/stk-insights/${id}`); const json = await res.json(); if (json.success) setData(json); } catch {} finally { setLoading(false); }
  }, [id]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " ₺";
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("tr-TR");

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-500">STK verisi bulunamadı</div>;

  const { stk, memberStats, boardMembers, recentDecisions, assemblies, documents, campaigns, campaignStats, financeSummary, financeRecords } = data;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xl font-bold">{stk.name.charAt(0)}</div>
            <div><h1 className="text-2xl font-bold text-gray-900">{stk.name}</h1><p className="text-sm text-gray-500">👁️ Gözetim Kulesi — Yalnızca Görüntüleme</p></div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm"><div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white">👥</div><p className="text-xs text-gray-500">Toplam Üye</p></div><p className="text-3xl font-extrabold text-gray-900">{memberStats.total}</p></div>
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm"><div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white">🏦</div><p className="text-xs text-gray-500">Net Kasa</p></div><p className={`text-3xl font-extrabold ${financeSummary.balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(financeSummary.balance)}</p></div>
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm"><div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white">📱</div><p className="text-xs text-gray-500">Kalan Kredi</p></div><p className="text-lg font-bold text-gray-900">SMS: {stk.smsCredits} · Push: {stk.pushCredits}</p><p className="text-xs text-gray-400">WA: {stk.whatsappCredits} · Email: {stk.emailCredits}</p></div>
        <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm"><div className="flex items-center gap-3 mb-2"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white">📨</div><p className="text-xs text-gray-500">Kampanya</p></div><p className="text-3xl font-extrabold text-gray-900">{campaignStats.total}</p><p className="text-xs text-gray-400">{campaignStats.totalSent} mesaj gönderildi</p></div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Üye Kaynakları */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs">📊</span>Üye Kaynakları</h2>
          <div className="space-y-3">
            {Object.entries(memberStats.bySource).map(([src, count]) => {
              const pct = memberStats.total > 0 ? Math.round((count / memberStats.total) * 100) : 0;
              return (
                <div key={src} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-24">{SRC_LABELS[src] || src}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} /></div>
                  <span className="text-sm font-bold text-gray-700 w-16 text-right">{count} ({pct}%)</span>
                </div>
              );
            })}
            {Object.keys(memberStats.bySource).length === 0 && <p className="text-sm text-gray-400">Veri yok</p>}
          </div>
        </div>

        {/* Yönetim Kurulu */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs">🏛️</span>Yönetim Kurulu ({boardMembers.length})</h2>
          {boardMembers.length === 0 ? <p className="text-sm text-gray-400">Kurul üyesi eklenmemiş</p> : (
            <div className="space-y-3">{boardMembers.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-sm font-bold text-indigo-700">{m.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                <div className="flex-1"><p className="text-sm font-medium text-gray-900">{m.name}</p><p className="text-xs text-gray-500">{m.title}</p></div>
                {m.phone && <span className="text-xs text-gray-400">{m.phone}</span>}
              </div>
            ))}</div>
          )}
        </div>

        {/* Finansal Özet */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs">💰</span>Finansal Özet</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl bg-emerald-50 p-3 text-center"><p className="text-xs text-emerald-600">Gelir</p><p className="text-lg font-bold text-emerald-700">{fmt(financeSummary.income)}</p></div>
            <div className="rounded-xl bg-red-50 p-3 text-center"><p className="text-xs text-red-600">Gider</p><p className="text-lg font-bold text-red-700">{fmt(financeSummary.expense)}</p></div>
            <div className="rounded-xl bg-indigo-50 p-3 text-center"><p className="text-xs text-indigo-600">Net</p><p className="text-lg font-bold text-indigo-700">{fmt(financeSummary.balance)}</p></div>
          </div>
          {financeRecords.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">{financeRecords.slice(0, 8).map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                <div><p className="text-sm text-gray-700">{r.description || CAT_LABELS[r.category]}</p><p className="text-xs text-gray-400">{fmtDate(r.date)}</p></div>
                <span className={`text-sm font-bold ${r.type === "INCOME" ? "text-emerald-600" : "text-red-600"}`}>{r.type === "INCOME" ? "+" : "-"}{fmt(r.amount)}</span>
              </div>
            ))}</div>
          )}
        </div>

        {/* Son Kararlar */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs">📋</span>Son Kararlar ({recentDecisions.length})</h2>
          {recentDecisions.length === 0 ? <p className="text-sm text-gray-400">Karar alınmamış</p> : (
            <div className="space-y-3">{recentDecisions.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div><p className="text-sm font-medium text-gray-900">{d.subject}</p><p className="text-xs text-gray-400">No: {d.decisionNumber} · {fmtDate(d.date)}</p></div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${d.status === "FINALIZED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{d.status === "FINALIZED" ? "✓" : "◷"}</span>
              </div>
            ))}</div>
          )}
        </div>
      </div>

      {/* Belgeler + Kampanyalar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-xs">📂</span>Resmi Belgeler ({documents.length})</h2>
          {documents.length === 0 ? <p className="text-sm text-gray-400">Belge yüklenmemiş</p> : (
            <div className="space-y-2">{documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500 text-xs font-bold">{doc.fileType}</div>
                <div className="flex-1"><p className="text-sm font-medium text-gray-900">{doc.title}</p><p className="text-xs text-gray-400">{fmtDate(doc.createdAt)}</p></div>
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-700 text-xs font-medium">İndir ↓</a>
              </div>
            ))}</div>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs">📨</span>Son Kampanyalar ({campaigns.length})</h2>
          {campaigns.length === 0 ? <p className="text-sm text-gray-400">Kampanya gönderilmemiş</p> : (
            <div className="space-y-2">{campaigns.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div><p className="text-sm font-medium text-gray-900">{c.title}</p><p className="text-xs text-gray-400">{c.channel} · {fmtDate(c.createdAt)}</p></div>
                <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs font-bold">{c.targetCount} kişi</span>
              </div>
            ))}</div>
          )}
        </div>
      </div>
    </div>
  );
}
