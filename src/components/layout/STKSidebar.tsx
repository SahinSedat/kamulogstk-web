"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, Building2, Calculator,
  LogOut, ChevronLeft, ChevronRight, FileText, UserMinus,
  MessageSquare, FolderOpen, Gavel, GitBranch, Sparkles,
  Calendar, Bell, CreditCard, ShoppingBag, Lock, Unlock, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const menuItems: MenuItem[] = [
  { label: "Anasayfa", href: "/stk-panel", icon: LayoutDashboard },
  { label: "Yönetim Kurulu", href: "/stk-panel/yonetim-kurulu", icon: Users },
  { label: "Genel Kurul", href: "/stk-panel/genel-kurul", icon: Gavel },
  { label: "Kararlar", href: "/stk-panel/kararlar", icon: FileText },
  { label: "Şubeler", href: "/stk-panel/subeler", icon: GitBranch },
  { label: "Üyeler", href: "/stk-panel/uyeler", icon: Users },
  { label: "İstifa Yönetimi", href: "/stk-panel/istifa-yonetimi", icon: UserMinus },
  { label: "Ödemeler", href: "/stk-panel/odemeler", icon: CreditCard },
  { label: "Muhasebe", href: "/stk-panel/muhasebe", icon: Calculator },
  { label: "Faaliyetler", href: "/stk-panel/faaliyetler", icon: Calendar },
  { label: "Üye Bildirimleri", href: "/stk-panel/kampanyalar", icon: MessageSquare },
  { label: "Kuruluş Profili", href: "/stk-panel/profil", icon: Building2 },
  { label: "Bildirimler", href: "/stk-panel/bildirimler", icon: Bell },
];

const premiumItems: MenuItem[] = [
  { label: "WhatsApp Bot", href: "/stk-panel/wa-bot", icon: MessageCircle },
  { label: "Market / Paketler", href: "/stk-panel/market", icon: ShoppingBag },
];

export default function STKSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [hasBot, setHasBot] = useState(false);
  const [planName, setPlanName] = useState<string | null>(null);
  const pathname = usePathname();
  const { data: session } = useSession();

  // WhatsApp bot + abonelik bilgisini kontrol et
  useEffect(() => {
    fetch("/api/stk-panel/wa-bot")
      .then(r => r.json())
      .then(d => { if (d.success) setHasBot(d.data.hasCustomWaBot); })
      .catch(() => {});
    fetch("/api/stk-panel/market")
      .then(r => r.json())
      .then(d => {
        if (d.success && d.requests) {
          const approved = d.requests.find((r: any) => r.status === "APPROVED" && r.package?.name);
          if (approved) setPlanName(approved.package.name);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-500 ease-out",
        collapsed ? "w-[76px]" : "w-[280px]"
      )}
      style={{
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderRight: "1px solid rgba(139, 92, 246, 0.08)",
        boxShadow: "4px 0 32px rgba(99, 102, 241, 0.04)",
      }}
    >
      {/* Logo Section — AI Premium Branding */}
      <div
        className="flex items-center h-[72px] px-5 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(139, 92, 246, 0.08)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #6366F1, #8B5CF6, #A78BFA)",
              boxShadow: "0 4px 16px rgba(99, 102, 241, 0.35)",
            }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-[17px] font-bold tracking-tight" style={{
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                Kamulog<span style={{ WebkitTextFillColor: "#8B5CF6" }}>STK</span>
              </h1>
              <p className="text-[10px] -mt-0.5 font-medium" style={{ color: "#A78BFA" }}>
                Dernek Yönetim Paneli
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Subscription Badge — clickable */}
      {!collapsed && (
        <Link href="/stk-panel/market" className="block mx-4 mt-4 mb-2 px-3 py-2 rounded-xl animate-fade-in transition-all duration-300 hover:shadow-md" style={{
          background: planName
            ? "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08))"
            : "rgba(248, 250, 252, 0.8)",
          border: planName ? "1px solid rgba(139, 92, 246, 0.15)" : "1px solid rgba(148, 163, 184, 0.2)",
        }}>
          <div className="flex items-center gap-2">
            {planName ? (
              <>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{
                  background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                  boxShadow: "0 0 8px rgba(99, 102, 241, 0.5)",
                }} />
                <span className="text-[11px] font-semibold truncate" style={{ color: "#6366F1" }}>
                  ✨ {planName}
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-slate-300" />
                <span className="text-[11px] font-medium text-slate-400">
                  Standart Plan
                </span>
              </>
            )}
          </div>
        </Link>
      )}

      {/* Navigation — Scrollable */}
      <nav className={cn(
        "flex-1 overflow-y-auto py-3 space-y-1 scrollbar-none",
        collapsed ? "px-2" : "px-3"
      )}>
        {menuItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/stk-panel" && pathname.startsWith(item.href + "/"));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden",
                collapsed && "justify-center px-0",
                isActive ? "text-white" : "text-slate-600 hover:text-indigo-700"
              )}
              style={{
                background: isActive
                  ? "linear-gradient(135deg, #6366F1, #8B5CF6)"
                  : "transparent",
                boxShadow: isActive
                  ? "0 4px 16px rgba(99, 102, 241, 0.3), 0 1px 3px rgba(99, 102, 241, 0.15)"
                  : "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.06))";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(99, 102, 241, 0.06)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              {/* Active indicator glow */}
              {isActive && (
                <div className="absolute inset-0 opacity-20"
                  style={{
                    background: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.4), transparent 60%)",
                  }}
                />
              )}
              <Icon
                className={cn(
                  "w-[18px] h-[18px] flex-shrink-0 transition-all duration-300 relative z-10",
                  isActive
                    ? "text-white drop-shadow-sm"
                    : "text-slate-400 group-hover:text-indigo-600"
                )}
              />
              {!collapsed && (
                <span className="animate-fade-in truncate relative z-10 font-medium">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}

        {/* Premium Section — Gold/Orange Gradient */}
        {!collapsed && (
          <div className="mt-3 mb-1 px-1">
            <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.3), transparent)" }} />
            <p className="text-[10px] font-bold uppercase tracking-widest mt-2 mb-1 px-2" style={{ color: "#D97706" }}>✨ Premium</p>
          </div>
        )}
        {collapsed && <div className="mt-3 mb-1 h-px mx-2" style={{ background: "rgba(245, 158, 11, 0.3)" }} />}

        {premiumItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/stk-panel" && pathname.startsWith(item.href + "/"));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden",
                collapsed && "justify-center px-0",
                isActive ? "text-white" : "text-amber-700 hover:text-orange-800"
              )}
              style={{
                background: isActive
                  ? "linear-gradient(135deg, #F59E0B, #EA580C)"
                  : "linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(234, 88, 12, 0.06))",
                boxShadow: isActive
                  ? "0 4px 16px rgba(245, 158, 11, 0.35), 0 1px 3px rgba(234, 88, 12, 0.2)"
                  : "none",
                border: isActive ? "none" : "1px solid rgba(245, 158, 11, 0.15)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(234, 88, 12, 0.12))";
                  e.currentTarget.style.boxShadow = "0 2px 12px rgba(245, 158, 11, 0.15)";
                  e.currentTarget.style.border = "1px solid rgba(245, 158, 11, 0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(234, 88, 12, 0.06))";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.border = "1px solid rgba(245, 158, 11, 0.15)";
                }
              }}
            >
              {isActive && (
                <div className="absolute inset-0 opacity-20"
                  style={{ background: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.4), transparent 60%)" }}
                />
              )}
              <Icon
                className={cn(
                  "w-[18px] h-[18px] flex-shrink-0 transition-all duration-300 relative z-10",
                  isActive ? "text-white drop-shadow-sm" : "text-amber-500 group-hover:text-orange-600"
                )}
              />
              {!collapsed && (
                <span className="animate-fade-in truncate relative z-10 flex items-center gap-1.5">
                  {item.label}
                  {item.href === "/stk-panel/wa-bot" && (
                    hasBot
                      ? <Unlock className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      : <Lock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapsed Tooltip (handled via CSS title for simplicity) */}

      {/* Footer */}
      <div className="flex-shrink-0 px-3 py-3 space-y-1" style={{ borderTop: "1px solid rgba(139, 92, 246, 0.08)" }}>
        {/* User Info */}
        {!collapsed && session?.user && (
          <div className="px-3 py-2 mb-2 rounded-xl animate-fade-in" style={{
            background: "rgba(248, 250, 252, 0.8)",
          }}>
            <p className="text-xs font-semibold text-slate-700 truncate">
              {session.user.name || "STK Yöneticisi"}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {session.user.email}
            </p>
          </div>
        )}

        <button
          onClick={async () => {
            await signOut({ redirect: false });
            window.location.href = "/login";
          }}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
            collapsed && "justify-center"
          )}
          style={{ color: "#EF4444" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Çıkış Yap</span>}
        </button>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 rounded-xl transition-all duration-300"
          style={{ color: "#A78BFA" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(139, 92, 246, 0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
