"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, ArrowLeftRight, UserCheck, MessageSquare,
  CreditCard, ShoppingBag, Bell, FileText, Briefcase, Settings,
  ChevronLeft, ChevronRight, LogOut, Shield, Building2, Calculator,
  ClipboardList, Newspaper, MessageCircle, Activity, Flag, Brain, Database, Megaphone, Coins, Banknote, ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  label: string; href: string; icon: React.ElementType; roles: string[];
}

interface MenuGroup {
  title: string; items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: "GENEL",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MODERATOR", "CONSULTANT"] },
    ],
  },
  {
    title: "YÖNETİM",
    items: [
      { label: "Kullanıcılar", href: "/users", icon: Users, roles: ["ADMIN", "MODERATOR"] },
      { label: "Danışmanlar", href: "/consultants", icon: UserCheck, roles: ["ADMIN", "MODERATOR", "CONSULTANT"] },
      { label: "Talepler", href: "/requests", icon: ClipboardList, roles: ["ADMIN", "MODERATOR", "CONSULTANT"] },
    ],
  },
  {
    title: "İÇERİK",
    items: [
      { label: "İçerik Yönetimi", href: "/content", icon: Megaphone, roles: ["ADMIN", "MODERATOR"] },
      { label: "Becayiş", href: "/becayis", icon: ArrowLeftRight, roles: ["ADMIN", "MODERATOR"] },
      { label: "Mesajlar", href: "/messages", icon: MessageSquare, roles: ["ADMIN", "MODERATOR", "CONSULTANT"] },
      { label: "STK Yönetimi", href: "/stk", icon: Building2, roles: ["ADMIN", "MODERATOR"] },
      { label: "Kariyer", href: "/career", icon: Briefcase, roles: ["ADMIN", "MODERATOR"] },
      { label: "KPSS Soru Yönetimi", href: "/career/kpss-management", icon: Database, roles: ["ADMIN"] },
      { label: "Kariyer Plan Yönetimi", href: "/career/plans", icon: Briefcase, roles: ["ADMIN"] },
      { label: "Şikayetler", href: "/reports", icon: Flag, roles: ["ADMIN", "MODERATOR"] },
      { label: "TİS & Dosyalar", href: "/tis", icon: FileText, roles: ["ADMIN", "MODERATOR"] },
      { label: "Story Yönetimi", href: "/stories", icon: ImageIcon, roles: ["ADMIN"] },
    ],
  },
  {
    title: "İLETİŞİM",
    items: [
      { label: "Bildirimler", href: "/notifications", icon: Bell, roles: ["ADMIN", "MODERATOR"] },
      { label: "SMS Gönder", href: "/sms-gonder", icon: Megaphone, roles: ["ADMIN", "MODERATOR"] },
    ],
  },
  {
    title: "FİNANS",
    items: [
      { label: "Abonelikler", href: "/subscriptions", icon: CreditCard, roles: ["ADMIN"] },
      { label: "Jeton Paketleri", href: "/credit-packages", icon: Coins, roles: ["ADMIN"] },
      { label: "Danışman Ödemeleri", href: "/payouts", icon: Banknote, roles: ["ADMIN"] },
      { label: "Siparişler", href: "/orders", icon: ShoppingBag, roles: ["ADMIN", "MODERATOR"] },
      { label: "Maaş Hesaplama", href: "/maas-hesaplama", icon: Calculator, roles: ["ADMIN", "MODERATOR"] },
      { label: "Maaş Parametreleri", href: "/salary-settings", icon: Calculator, roles: ["ADMIN"] },
    ],
  },
  {
    title: "SİSTEM",
    items: [
      { label: "Loglar", href: "/logs", icon: Activity, roles: ["ADMIN"] },
      { label: "AI İstatistikleri", href: "/ai-statistics", icon: Brain, roles: ["ADMIN"] },
      { label: "Ayarlar", href: "/settings", icon: Settings, roles: ["ADMIN"] },
      { label: "Yasal Metinler", href: "/settings/documents", icon: FileText, roles: ["ADMIN"] },
      { label: "WhatsApp Bot", href: "/whatsapp-bot", icon: MessageCircle, roles: ["ADMIN"] },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role || "USER";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
      style={{ background: "var(--bg-sidebar)", borderRight: "1px solid var(--border)" }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--primary)" }}>Kamulog</h1>
              <p className="text-[10px] -mt-0.5" style={{ color: "var(--text-muted)" }}>Super App Admin</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.roles.includes(userRole));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title}>
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                        isActive ? "font-semibold" : ""
                      )}
                      style={{
                        background: isActive ? "var(--bg-active)" : "transparent",
                        color: isActive ? "var(--primary)" : "var(--text-secondary)",
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--bg-hover)"; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                    >
                      <Icon className="w-[18px] h-[18px] flex-shrink-0" style={{ color: isActive ? "var(--primary)" : "var(--text-muted)" }} />
                      {!collapsed && <span className="animate-fade-in truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 space-y-1" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={async () => { await signOut({ redirect: false }); window.location.href = "/login"; }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-red-500 transition-all"
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Çıkış Yap</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-1.5 rounded-lg transition-all"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
