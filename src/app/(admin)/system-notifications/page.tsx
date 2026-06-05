"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard, ArrowLeftRight, Brain, AlertTriangle, Bell,
  Search, CheckCircle, X, RefreshCw, Mail, User,
} from "lucide-react";

// ─── Tipler ─────────────────────────────────────────────
interface AdminNotif {
  id: string;
  type: string;
  title: string;
  message: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  senderName: string | null;
  relatedId: string | null;
  details: string | null;
  metadata: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

// ─── Renk & İkon Sistemi ────────────────────────────────
interface NotifStyle {
  bg: string; text: string; border: string;
  icon: React.ElementType; label: string; category: string;
}

const CATEGORY_MAP: Record<string, NotifStyle> = {
  SUBSCRIPTION_CAREER:    { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-300", icon: CreditCard,     label: "Kariyer Aboneliği",   category: "money" },
  SUBSCRIPTION_BECAYIS:   { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-300", icon: CreditCard,     label: "Becayiş Aboneliği",   category: "money" },
  PURCHASE_TOKEN:         { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-300", icon: CreditCard,     label: "Jeton Satışı",        category: "money" },
  AD_NEW_BECAYIS:         { bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-300",   icon: ArrowLeftRight, label: "Yeni İlan",           category: "activity" },
  REQUEST_BECAYIS:        { bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-300",   icon: ArrowLeftRight, label: "Becayiş Talebi",      category: "activity" },
  AI_CV_CREATED:          { bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-300",    icon: Brain,          label: "AI CV Oluşturma",     category: "career" },
  CV_UPLOADED:            { bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-300",    icon: Brain,          label: "CV Yükleme",          category: "career" },
  CONSULTANT_MEETING:     { bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-300",    icon: Brain,          label: "Danışman Görüşme",    category: "career" },
  REPORT_COMPLAINT:       { bg: "bg-red-50",      text: "text-red-700",     border: "border-red-300",     icon: AlertTriangle,  label: "Şikayet",             category: "security" },
  ACCOUNT_DELETE_REQUEST: { bg: "bg-red-50",      text: "text-red-700",     border: "border-red-300",     icon: AlertTriangle,  label: "Hesap Silme Talebi",  category: "security" },
  ACCOUNT_FREEZE_REQUEST: { bg: "bg-red-50",      text: "text-red-700",     border: "border-red-300",     icon: AlertTriangle,  label: "Hesap Dondurma",      category: "security" },
  STK_APPLICATION:        { bg: "bg-indigo-50",   text: "text-indigo-700",  border: "border-indigo-300",  icon: User,           label: "STK Başvurusu",       category: "activity" },
  STK_PAYMENT_REPORT:     { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-300", icon: CreditCard,     label: "Ödeme Bildirimi",     category: "money" },
  STK_PAYMENT_APPROVED:   { bg: "bg-green-50",    text: "text-green-700",   border: "border-green-300",   icon: CheckCircle,    label: "Ödeme Onayı",         category: "money" },
  NEW_FORUM_TOPIC:        { bg: "bg-purple-50",   text: "text-purple-700",  border: "border-purple-300",  icon: Mail,           label: "Yeni Forum Konusu",   category: "activity" },
  FORUM_REPORT:           { bg: "bg-red-50",      text: "text-red-700",     border: "border-red-300",     icon: AlertTriangle,  label: "Forum Şikayeti",      category: "security" },
  USER_BAN:               { bg: "bg-red-50",      text: "text-red-700",     border: "border-red-300",     icon: AlertTriangle,  label: "Kullanıcı Ban",       category: "security" },
  SYSTEM:                 { bg: "bg-gray-50",     text: "text-gray-600",    border: "border-gray-300",    icon: Bell,           label: "Sistem",              category: "system" },
};

function getStyle(type: string): NotifStyle {
  return CATEGORY_MAP[type] || CATEGORY_MAP.SYSTEM;
}

function formatDate(d: string) {
  return new Date(d).toLocaleString("tr-TR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Az önce";
  if (mins < 60) return mins + " dk önce";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + " sa önce";
  const days = Math.floor(hours / 24);
  return days + " gün önce";
}

// Metadata'dan önemli bilgileri insan diline çevir
function humanizeMetadata(meta: Record<string, any> | null): { key: string; value: string }[] {
  if (!meta) return [];
  const labels: Record<string, string> = {
    store: "Mağaza", amount: "Tutar", productId: "Ürün", jetons: "Jeton Adedi",
  };
  return Object.entries(meta)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => ({
      key: labels[k] || k,
      value: k === "amount" ? v + " ₺" : k === "store" ? (v === "APPLE" ? "🍎 App Store" : v === "GOOGLE" ? "🤖 Google Play" : String(v)) : String(v),
    }));
}

// ─── Filtre Sekmeleri ───────────────────────────────────
const FILTERS = [
  { key: "all",      label: "Tümü",       color: "bg-gray-100 text-gray-700" },
  { key: "money",    label: "💰 Satışlar", color: "bg-emerald-100 text-emerald-700" },
  { key: "activity", label: "📋 İlanlar",  color: "bg-amber-100 text-amber-700" },
  { key: "career",   label: "🧠 Kariyer",  color: "bg-blue-100 text-blue-700" },
  { key: "security", label: "🔴 Güvenlik", color: "bg-red-100 text-red-700" },
];

export default function SystemNotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedNotif, setSelectedNotif] = useState<AdminNotif | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications?limit=200");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const markAllRead = async () => {
    await fetch("/api/admin/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const markRead = async (id: string) => {
    await fetch("/api/admin/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Filtrelenmiş liste
  const filtered = notifications.filter(n => {
    const style = getStyle(n.type);
    const matchFilter = filter === "all" || style.category === filter;
    const q = search.toLowerCase();
    const matchSearch = !search || 
      n.title.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q) ||
      (n.userName || "").toLowerCase().includes(q) ||
      (n.userEmail || "").toLowerCase().includes(q) ||
      (n.senderName || "").toLowerCase().includes(q) ||
      (n.details || "").toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  // Kategori sayaçları
  const counts: Record<string, number> = { all: notifications.length };
  notifications.forEach(n => {
    const cat = getStyle(n.type).category;
    counts[cat] = (counts[cat] || 0) + 1;
  });

  // Kullanıcı ad/soyad gösterimi
  const getDisplayName = (n: AdminNotif) => n.userName || n.senderName || null;
  const getInitials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            📡 Sistem Bildirimleri
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tüm sistem olaylarını takip edin — Kim, neyi, ne zaman yaptı?
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchNotifs} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors" title="Yenile">
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Tümünü Okundu Yap ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* Filtreler + Arama */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === f.key ? f.color + " ring-2 ring-offset-1 ring-gray-300" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
            }`}
          >
            {f.label} ({counts[f.key] || 0})
          </button>
        ))}
        <div className="ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Kullanıcı adı, e-posta, işlem ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border rounded-xl w-72 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          />
        </div>
      </div>

      {/* İçerik: Liste + Detay Panel */}
      <div className="flex gap-4">
        {/* Sol: Bildirim Listesi */}
        <div className={"flex-1 space-y-2 " + (selectedNotif ? "max-w-[55%]" : "")}>
          {loading ? (
            <div className="py-16 text-center text-gray-400">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border rounded-xl py-16 text-center">
              <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">Bu kategoride bildirim bulunamadı.</p>
            </div>
          ) : (
            filtered.map(n => {
              const style = getStyle(n.type);
              const Icon = style.icon;
              const isSelected = selectedNotif?.id === n.id;
              const displayName = getDisplayName(n);

              return (
                <div
                  key={n.id}
                  onClick={() => { setSelectedNotif(n); if (!n.isRead) markRead(n.id); }}
                  className={`bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? "ring-2 ring-indigo-400 shadow-md" : ""
                  } ${!n.isRead ? "border-l-4 " + style.border : "border-l-4 border-transparent opacity-75"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                      <Icon className={`w-5 h-5 ${style.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900 truncate">{n.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        {!n.isRead && <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />}
                      </div>
                      {/* İnsan dostu özet: detay varsa onu göster, yoksa message */}
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{n.details || n.message}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        {displayName && (
                          <span className="text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <User className="w-3 h-3" /> {displayName}
                          </span>
                        )}
                        {n.userEmail && (
                          <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {n.userEmail}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ───── Sağ: Detay Paneli (İnsanlaştırılmış) ───── */}
        {selectedNotif && (() => {
          const style = getStyle(selectedNotif.type);
          const Icon = style.icon;
          const displayName = getDisplayName(selectedNotif);
          const metaItems = humanizeMetadata(selectedNotif.metadata);

          return (
            <div className="w-[45%] sticky top-20 self-start">
              <div className="bg-white border rounded-2xl shadow-lg overflow-hidden">
                {/* Detay Header */}
                <div className={`px-6 py-4 flex items-center justify-between ${style.bg}`}>
                  <div className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${style.text}`} />
                    <div>
                      <h3 className="font-bold text-gray-900">{selectedNotif.title}</h3>
                      <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedNotif(null)} className="p-1.5 rounded-lg hover:bg-white/50 transition-colors">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* Detay İçerik */}
                <div className="px-6 py-5 space-y-4">

                  {/* 👤 KİM — En üstte, gözün ilk çarptığı yer */}
                  {(displayName || selectedNotif.userEmail) && (
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">İşlemi Yapan</label>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                          {displayName ? getInitials(displayName) : "?"}
                        </div>
                        <div>
                          {displayName && <p className="text-sm font-semibold text-gray-900">{displayName}</p>}
                          {selectedNotif.userEmail && (
                            <p className="text-xs text-indigo-600 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" /> {selectedNotif.userEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 📝 NE YAPTI — İşlem detayı */}
                  {selectedNotif.details && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">İşlem Detayı</label>
                      <div className="mt-1 bg-gray-50 rounded-xl p-3">
                        <p className="text-sm text-gray-800 font-medium">{selectedNotif.details}</p>
                      </div>
                    </div>
                  )}

                  {/* 📋 Açıklama */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Açıklama</label>
                    <p className="text-sm text-gray-600 mt-1">{selectedNotif.message}</p>
                  </div>

                  {/* 💰 Önemli Bilgiler (Metadata — insan dilinde) */}
                  {metaItems.length > 0 && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">İşlem Bilgileri</label>
                      <div className="bg-gray-50 rounded-xl p-3 mt-1 divide-y divide-gray-100">
                        {metaItems.map(({ key, value }) => (
                          <div key={key} className="flex justify-between py-1.5 text-sm">
                            <span className="text-gray-500">{key}</span>
                            <span className="text-gray-800 font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 📅 Tarih */}
                  <div className="pt-3 border-t flex justify-between items-center">
                    <span className="text-xs text-gray-400">Tarih</span>
                    <span className="text-xs text-gray-600 font-medium">{formatDate(selectedNotif.createdAt)}</span>
                  </div>

                  {/* 🔧 Teknik Log (en altta, küçük yazıyla) */}
                  {(selectedNotif.userId || selectedNotif.relatedId) && (
                    <details className="pt-2">
                      <summary className="text-[10px] text-gray-300 cursor-pointer hover:text-gray-400 transition-colors">
                        Teknik Detaylar
                      </summary>
                      <div className="mt-2 bg-gray-50 rounded-lg p-2 space-y-1 text-[10px] font-mono text-gray-400">
                        {selectedNotif.userId && <div>userId: {selectedNotif.userId}</div>}
                        {selectedNotif.relatedId && <div>relatedId: {selectedNotif.relatedId}</div>}
                        <div>notifId: {selectedNotif.id}</div>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
