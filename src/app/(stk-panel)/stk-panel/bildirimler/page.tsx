"use client";
import { useState, useEffect, useCallback } from "react";

interface Notification {
  id: string;
  type: "NEW_MEMBER" | "PAYMENT" | "RESIGNATION" | "ASSEMBLY" | "DECISION";
  title: string;
  message: string;
  date: string;
  icon: string;
}

const TYPE_FILTER: Record<string, { label: string; color: string }> = {
  ALL: { label: "Tümü", color: "bg-gray-600" },
  NEW_MEMBER: { label: "Yeni Üye", color: "bg-blue-600" },
  PAYMENT: { label: "Ödeme", color: "bg-emerald-600" },
  RESIGNATION: { label: "İstifa", color: "bg-red-600" },
  ASSEMBLY: { label: "Genel Kurul", color: "bg-violet-600" },
  DECISION: { label: "Karar", color: "bg-indigo-600" },
};

const TYPE_CARD: Record<string, { bg: string; border: string; accent: string }> = {
  NEW_MEMBER: { bg: "bg-blue-50", border: "border-blue-200", accent: "text-blue-700" },
  PAYMENT: { bg: "bg-emerald-50", border: "border-emerald-200", accent: "text-emerald-700" },
  RESIGNATION: { bg: "bg-red-50", border: "border-red-200", accent: "text-red-700" },
  ASSEMBLY: { bg: "bg-violet-50", border: "border-violet-200", accent: "text-violet-700" },
  DECISION: { bg: "bg-indigo-50", border: "border-indigo-200", accent: "text-indigo-700" },
};

export default function BildirimlerPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL");
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/stk-panel/notifications");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data);
        setUnreadCount(json.unreadCount);
      }
    } catch {
      console.error("Bildirimler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const filtered = filterType === "ALL" ? notifications : notifications.filter(n => n.type === filterType);

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Az önce";
    if (mins < 60) return `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} gün önce`;
    return date.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  };

  const typeCounts: Record<string, number> = {};
  notifications.forEach(n => { typeCounts[n.type] = (typeCounts[n.type] || 0) + 1; });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            🔔 Bildirim Merkezi
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-full bg-red-600 text-white text-xs font-bold px-2 shadow-lg shadow-red-200">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">STK&apos;nıza gelen tüm etkinlik ve bildirimleri buradan takip edin</p>
        </div>
        <button onClick={fetchNotifications} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
          🔄 Yenile
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(TYPE_FILTER).map(([key, val]) => (
          <button key={key} onClick={() => setFilterType(key)}
            className={`rounded-xl p-3 text-center transition-all duration-300 border ${
              filterType === key
                ? "bg-white ring-2 ring-indigo-400 border-indigo-200 shadow-lg shadow-indigo-100"
                : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
            }`}
          >
            <p className="text-xl font-bold text-gray-900">{key === "ALL" ? notifications.length : typeCounts[key] || 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">{val.label}</p>
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-4xl mb-3">🔔</p>
            <p className="text-gray-500 text-sm">{filterType === "ALL" ? "Henüz bildirim yok" : "Bu kategoride bildirim yok"}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(n => {
              const card = TYPE_CARD[n.type] || TYPE_CARD.NEW_MEMBER;
              return (
                <div key={n.id} className="px-6 py-5 hover:bg-gray-50/50 transition-colors flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl ${card.bg} border ${card.border} flex items-center justify-center text-xl flex-shrink-0`}>
                    {n.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${card.accent}`}>{n.title}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${card.bg} ${card.accent}`}>
                        {TYPE_FILTER[n.type]?.label || n.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1.5">{formatDate(n.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
      `}</style>
    </div>
  );
}
