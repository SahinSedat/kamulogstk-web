"use client";

import { useState, useEffect } from "react";

interface DashboardData {
  stkName: string;
  memberStats: { total: number; active: number; pending: number; resigned: number };
  pendingApps: number;
  recentMembers: { id: string; name: string; surname: string; phone: string; registrationSource: string; createdAt: string }[];
  recentDecisions: { id: string; decisionNumber: string; date: string; subject: string; status: string }[];
  nextAssembly: { date: string; location: string; assemblyNumber: number; assemblyType: string } | null;
  daysUntilAssembly: number | null;
  credits: { sms: number; push: number; whatsapp: number; email: number };
  resignationsPending: number;
  paymentsCount: number;
}

export default function STKDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredUntil, setFeaturedUntil] = useState<string | null>(null);
  const [waBotUntil, setWaBotUntil] = useState<string | null>(null);
  const [hasWaBot, setHasWaBot] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [profileRes, membersRes, decisionsRes, assemblyRes, messagesRes, paymentsRes, activitiesRes, branchesRes] = await Promise.all([
          fetch("/api/stk-panel/profile"),
          fetch("/api/stk-panel/members"),
          fetch("/api/stk-panel/decisions"),
          fetch("/api/stk-panel/assembly"),
          fetch("/api/stk-panel/messages"),
          fetch("/api/stk-panel/payments").catch(() => ({ json: () => ({ success: false }) })),
          fetch("/api/stk-panel/activities").catch(() => ({ json: () => ({ success: false }) })),
          fetch("/api/stk-panel/branches").catch(() => ({ json: () => ({ success: false }) })),
        ]);
        const [profile, members, decisions, assembly, messages, payments, activities, branches] = await Promise.all([
          profileRes.json(), membersRes.json(), decisionsRes.json(), assemblyRes.json(), messagesRes.json(), (paymentsRes as any).json(), (activitiesRes as any).json(), (branchesRes as any).json(),
        ]);

        // Yaklaşan genel kurul
        let nextAssembly = null;
        let daysUntilAssembly = null;
        if (assembly.success && assembly.data?.length) {
          const planned = assembly.data
            .filter((a: any) => a.status === "PLANNED" && new Date(a.date) > new Date())
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
          if (planned.length > 0) {
            nextAssembly = planned[0];
            daysUntilAssembly = Math.ceil((new Date(planned[0].date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          }
        }

        const ms = members.success ? members.stats : {};
        const totalMembers = (ms.total || 0) + (ms.appApproved || 0);
        const activeMembers = (ms.active || 0) + (ms.appApproved || 0);
        setData({
          stkName: profile.success ? profile.data?.name || "STK" : "STK",
          memberStats: { total: totalMembers, active: activeMembers, pending: ms.appPending || ms.pending || 0, resigned: ms.resigned || 0 },
          pendingApps: ms.appPending || 0,
          recentMembers: members.success ? (members.data || []).slice(0, 5) : [],
          recentDecisions: decisions.success ? (decisions.data || []).slice(0, 5) : [],
          nextAssembly,
          daysUntilAssembly,
          credits: messages.success && messages.credits ? messages.credits : { sms: 0, push: 0, whatsapp: 0, email: 0 },
          resignationsPending: ms.resigned || 0,
          paymentsCount: payments.success ? (payments.data?.length || 0) : 0,
          activitiesCount: activities.success ? (activities.data?.length || 0) : 0,
          branchesCount: branches.success ? (branches.data?.length || 0) : 0,
          decisionsCount: decisions.success ? (decisions.data?.length || 0) : 0,
        } as any);

        // Öne çıkar & WA Bot durumu
        if (profile.success && profile.data) {
          setIsFeatured(profile.data.isFeatured || false);
          setFeaturedUntil(profile.data.featuredUntil || null);
          setHasWaBot(profile.data.hasCustomWaBot || false);
          setWaBotUntil(profile.data.waBotUntil || null);
        }
      } catch (err) {
        console.error("Dashboard veri yüklenemedi:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (!data) return <div className="text-center py-20 text-gray-400">Veriler yüklenemedi</div>;

  const d = data as any;
  const STATS = [
    { label: "Toplam Üye", value: data.memberStats.total.toString(), icon: "👥", change: `${data.memberStats.active} aktif`, color: "from-indigo-500 to-violet-500" },
    { label: "Bekleyen Başvuru", value: data.pendingApps.toString(), icon: "📋", change: "onay bekliyor", color: "from-amber-400 to-orange-500" },
    { label: "Ödemeler", value: (d.paymentsCount || 0).toString(), icon: "💳", change: "toplam ödeme", color: "from-emerald-500 to-teal-500" },
    { label: "Faaliyetler", value: (d.activitiesCount || 0).toString(), icon: "📅", change: "yayınlanan", color: "from-cyan-500 to-blue-500" },
    { label: "Kararlar", value: (d.decisionsCount || 0).toString(), icon: "📜", change: "karar alındı", color: "from-violet-500 to-purple-500" },
    { label: "Şubeler", value: (d.branchesCount || 0).toString(), icon: "🏢", change: "aktif şube", color: "from-rose-500 to-pink-500" },
    { label: "Genel Kurul", value: data.daysUntilAssembly != null ? `${data.daysUntilAssembly} Gün` : "—", icon: "🏛️", change: data.nextAssembly ? new Date(data.nextAssembly.date).toLocaleDateString("tr-TR") : "Planlanmamış", color: "from-blue-500 to-indigo-500" },
    { label: "İstifa", value: data.resignationsPending.toString(), icon: "🚪", change: "istifa eden", color: "from-gray-500 to-slate-500" },
  ];

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("tr-TR");
  const SOURCE_MAP: Record<string, { label: string; bg: string }> = {
    ONLINE: { label: "Online", bg: "bg-violet-50 text-violet-700" },
    MOBILE: { label: "Mobil", bg: "bg-blue-50 text-blue-700" },
    IN_PERSON: { label: "Manuel", bg: "bg-gray-100 text-gray-600" },
    FOUNDER: { label: "Kurucu", bg: "bg-amber-50 text-amber-700" },
    IMPORT: { label: "İçe Aktarım", bg: "bg-emerald-50 text-emerald-700" },
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdi0yMEgtMTB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')] opacity-50" />
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight">Hoş Geldiniz! 👋</h1>
          <p className="mt-2 text-indigo-100 text-sm max-w-xl">
            <strong>{data.stkName}</strong> yönetim panelinize hoş geldiniz. Üye başvurularını, yönetim kurulu kararlarını ve genel kurul süreçlerini buradan yönetebilirsiniz.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-indigo-200 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1">🤖 AI Destekli Yönetim</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1">🔒 Güvenli Altyapı</span>
            {featuredUntil && new Date(featuredUntil) > new Date() && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 backdrop-blur-sm px-3 py-1 text-amber-100">⭐ Öne Çıkartma: {Math.ceil((new Date(featuredUntil).getTime() - Date.now()) / 86400000)} gün kaldı</span>
            )}
            {hasWaBot && waBotUntil && new Date(waBotUntil) > new Date() && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 backdrop-blur-sm px-3 py-1 text-emerald-100">📲 WA Bot: {Math.ceil((new Date(waBotUntil).getTime() - Date.now()) / 86400000)} gün kaldı</span>
            )}
          </div>
          {/* Öne Çıkar Self-Service */}
          {featuredUntil && new Date(featuredUntil) > new Date() && (
            <div className="mt-4">
              <button
                onClick={async () => {
                  setToggling(true);
                  try {
                    const r = await fetch("/api/stk-panel/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isFeatured: !isFeatured }) });
                    const j = await r.json();
                    if (j.success) setIsFeatured(!isFeatured);
                  } catch {} finally { setToggling(false); }
                }}
                disabled={toggling}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg ${isFeatured ? 'bg-amber-400 text-amber-900 hover:bg-amber-300 shadow-amber-500/30' : 'bg-white/20 text-white hover:bg-white/30 shadow-white/10'} disabled:opacity-50`}
              >
                {toggling ? "İşleniyor..." : isFeatured ? "⭐ Öne Çıkartma Aktif — Kapat" : "⭐ STK'yı Öne Çıkar"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {STATS.map((stat, i) => (
          <div key={i} className="group relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[3rem] bg-gradient-to-br ${stat.color} opacity-10 group-hover:opacity-20 transition-opacity duration-500`} />
            <div className="relative">
              <div className="text-2xl mb-3">{stat.icon}</div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="mt-1 text-3xl font-extrabold text-gray-900 tracking-tight">{stat.value}</p>
              <p className="mt-2 text-xs text-gray-400">{stat.change}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Decisions */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm">📋</span>
              Son Alınan Kararlar
            </h2>
            <a href="/stk-panel/kararlar" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors">Tümünü Gör →</a>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentDecisions.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-400">Henüz karar alınmamış</div>
            ) : data.recentDecisions.map((d) => (
              <div key={d.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{d.subject}</p>
                  <p className="text-xs text-gray-400 mt-1">Karar No: {d.decisionNumber} · {fmtDate(d.date)}</p>
                </div>
                <span className={`ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  d.status === "FINALIZED" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                }`}>
                  {d.status === "FINALIZED" ? "✓ Kesinleşti" : "◷ Taslak"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Members */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-sm">👥</span>
              Son Eklenen Üyeler
            </h2>
            <a href="/stk-panel/uyeler" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors">Tümünü Gör →</a>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentMembers.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-400">Henüz üye eklenmemiş</div>
            ) : data.recentMembers.map((m) => {
              const src = SOURCE_MAP[m.registrationSource] || { label: m.registrationSource, bg: "bg-gray-100 text-gray-600" };
              return (
                <div key={m.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-sm font-bold text-indigo-700">
                      {m.name.charAt(0)}{m.surname?.charAt(0) || ""}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.name} {m.surname}</p>
                      <p className="text-xs text-gray-400">{m.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${src.bg}`}>{src.label}</span>
                    <p className="text-xs text-gray-400 mt-1">{fmtDate(m.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
      `}</style>
    </div>
  );
}
