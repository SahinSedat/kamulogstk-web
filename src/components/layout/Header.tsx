"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Bell, Search, Moon, Sun, User, Settings, LogOut, ChevronDown,
  CreditCard, Coins, Megaphone, ArrowLeftRight, FileText, Brain,
  AlertTriangle, UserX, Shield, CheckCircle,
} from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

// ─── Yetki Rozeti ───────────────────────────────────────
function getRoleBadge(role: string) {
  switch (role) {
    case "ADMIN": return { label: "Admin", color: "bg-indigo-100 text-indigo-700" };
    case "MODERATOR": return { label: "Moderatör", color: "bg-emerald-100 text-emerald-700" };
    case "CONSULTANT": return { label: "Danışman", color: "bg-amber-100 text-amber-700" };
    default: return { label: "Kullanıcı", color: "bg-gray-100 text-gray-600" };
  }
}
function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Bildirim Kategori Renkleri ─────────────────────────
interface NotifStyle {
  bg: string;
  text: string;
  icon: React.ElementType;
  dotColor: string;
}

function getNotifStyle(type: string): NotifStyle {
  switch (type) {
    // 💚 Yeşil — Para / Satın Alım
    case "SUBSCRIPTION_CAREER":
    case "SUBSCRIPTION_BECAYIS":
    case "PURCHASE_TOKEN":
    case "STK_PAYMENT_REPORT":
    case "STK_PAYMENT_APPROVED":
      return { bg: "bg-emerald-50", text: "text-emerald-700", icon: CreditCard, dotColor: "bg-emerald-500" };

    // 🟡 Sarı — İlan & Talep
    case "AD_NEW_BECAYIS":
    case "REQUEST_BECAYIS":
    case "STK_APPLICATION":
    case "NEW_FORUM_TOPIC":
      return { bg: "bg-amber-50", text: "text-amber-700", icon: ArrowLeftRight, dotColor: "bg-amber-500" };

    // 🔵 Mavi — Kariyer / AI
    case "AI_CV_CREATED":
    case "CV_UPLOADED":
    case "CONSULTANT_MEETING":
      return { bg: "bg-blue-50", text: "text-blue-700", icon: Brain, dotColor: "bg-blue-500" };

    // 🔴 Kırmızı — Güvenlik / Moderasyon
    case "REPORT_COMPLAINT":
    case "ACCOUNT_DELETE_REQUEST":
    case "ACCOUNT_FREEZE_REQUEST":
    case "FORUM_REPORT":
    case "USER_BAN":
      return { bg: "bg-red-50", text: "text-red-700", icon: AlertTriangle, dotColor: "bg-red-500" };

    // ⚪ Sistem
    default:
      return { bg: "bg-gray-50", text: "text-gray-600", icon: Bell, dotColor: "bg-gray-400" };
  }
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Az önce";
  if (mins < 60) return mins + " dk";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + " sa";
  const days = Math.floor(hours / 24);
  return days + " gün";
}

// ─── Bildirim Tipi ──────────────────────────────────────
interface AdminNotif {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function Header() {
  const { data: session } = useSession();
  const user = session?.user;
  const role = getRoleBadge((user as { role?: string })?.role || "USER");
  const { theme, toggleTheme } = useTheme();

  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications?limit=20");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  }, []);

  // İlk yükleme + 30 saniyede bir polling
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  const markAllRead = async () => {
    try {
      await fetch("/api/admin/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  // Close dropdowns on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header
      className="sticky top-0 z-30 h-16 flex items-center justify-between px-6"
      style={{ background: "var(--bg-header)", borderBottom: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
    >
      {/* Search */}
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="Kullanıcı, ilan veya danışman ara..."
          className="w-full !pl-10 pr-4 py-2 text-sm rounded-xl"
          style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          title={theme === "light" ? "Karanlık Mod" : "Aydınlık Mod"}
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        {/* ─── Bildirimler (Renk Kodlu) ─────────────── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotif(!showNotif); setShowProfile(false); if (!showNotif) fetchNotifs(); }}
            className="relative p-2.5 rounded-xl transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div
              className="absolute right-0 mt-2 w-96 rounded-2xl overflow-hidden animate-scale-in"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
            >
              {/* Başlık */}
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                <h4 className="font-semibold text-sm" style={{ color: "var(--text)" }}>Bildirim Merkezi</h4>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium">
                      Tümünü Oku
                    </button>
                  )}
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                    {unreadCount} yeni
                  </span>
                </div>
              </div>

              {/* Bildirim Listesi */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">Henüz bildirim yok</div>
                ) : (
                  notifications.map(n => {
                    const style = getNotifStyle(n.type);
                    const Icon = style.icon;
                    return (
                      <div
                        key={n.id}
                        className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-all border-l-4 ${
                          n.isRead ? "border-transparent opacity-70" : "border-l-4"
                        }`}
                        style={{
                          background: n.isRead ? "transparent" : "var(--bg-active)",
                          borderLeftColor: n.isRead ? "transparent" : undefined,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = n.isRead ? "transparent" : "var(--bg-active)")}
                      >
                        {/* İkon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                          <Icon className={`w-4 h-4 ${style.text}`} />
                        </div>
                        {/* İçerik */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{n.title}</p>
                            {!n.isRead && <div className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dotColor}`} />}
                          </div>
                          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{n.message}</p>
                          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{timeAgo(n.createdAt)} önce</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Alt Link */}
              <Link href="/system-notifications" className="block text-center py-2.5 text-xs font-medium" style={{ color: "var(--primary)", borderTop: "1px solid var(--border)" }}>
                Tüm Bildirimleri Gör →
              </Link>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-sm font-semibold">
              {getInitials(user?.name || "A")}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium leading-tight" style={{ color: "var(--text)" }}>{user?.name || "Admin"}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${role.color}`}>{role.label}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 hidden md:block" style={{ color: "var(--text-muted)" }} />
          </button>

          {showProfile && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-2xl overflow-hidden animate-scale-in"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
            >
              <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <User className="w-4 h-4" /> Profil
              </Link>
              <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <Settings className="w-4 h-4" /> Ayarlar
              </Link>
              <div style={{ borderTop: "1px solid var(--border)" }}>
                <button onClick={async () => { await signOut({ redirect: false }); window.location.href = "/login"; }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <LogOut className="w-4 h-4" /> Çıkış Yap
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
