export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Users, Crown, Coins, ClipboardList, HeadphonesIcon, UserCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import DashboardCharts from "@/components/ui/DashboardCharts";

export default async function DashboardPage() {
  const [userCount, listingCount, consultantCount, orderCount, subscriptionCount, recentUsers, recentListings] =
    await Promise.all([
      prisma.user.count(),
      prisma.becayisListing.count(),
      prisma.consultant.count(),
      prisma.order.count(),
      prisma.subscription.count({ where: { status: "active" } }),
      prisma.user.findMany({ take: 6, orderBy: { createdAt: "desc" }, select: { id: true, name: true, firstName: true, lastName: true, email: true, role: true, createdAt: true, isVerified: true } }),
      prisma.becayisListing.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { owner: { select: { name: true, firstName: true, lastName: true } } } }),
    ]);

  const pendingListings = await prisma.becayisListing.count({ where: { status: "pending" } });

  const stats = [
    { label: "Toplam Kullanıcı", value: userCount, delta: `+${Math.max(1, Math.floor(userCount * 0.1))} haftalık`, icon: Users, gradient: "from-blue-500 to-blue-600" },
    { label: "Premium Kullanıcı", value: subscriptionCount, delta: "aktif premium", icon: Crown, gradient: "from-purple-500 to-purple-600" },
    { label: "Jeton Satışı", value: orderCount * 20, delta: `${orderCount} işlem`, icon: Coins, gradient: "from-amber-500 to-amber-600" },
    { label: "Bekleyen İlanlar", value: pendingListings, delta: `/${listingCount} toplam`, icon: ClipboardList, gradient: "from-emerald-500 to-emerald-600" },
    { label: "Destek Talepleri", value: 3, delta: "çözüm bekliyor", icon: HeadphonesIcon, gradient: "from-rose-500 to-rose-600" },
    { label: "Aktif Danışman", value: consultantCount, delta: "kayıtlı uzman", icon: UserCheck, gradient: "from-cyan-500 to-cyan-600" },
  ];

  // Mock recent activity
  const activities = [
    { text: "Admin Kamulog yeni kullanıcı oluşturdu", time: "2 dakika önce", type: "user" },
    { text: "Becayiş ilanı #1024 onaylandı", time: "15 dakika önce", type: "listing" },
    { text: "Av. Mehmet K. çevrimiçi oldu", time: "30 dakika önce", type: "consultant" },
    { text: "Yeni danışmanlık talebi geldi", time: "1 saat önce", type: "request" },
    { text: "Premium abonelik satın alındı", time: "2 saat önce", type: "order" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Dashboard</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Kamulog Super App genel bakış</p>
      </div>

      {/* 6 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>{stat.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
              <p className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>{stat.delta}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <DashboardCharts stats={{ users: userCount, premium: subscriptionCount, tokens: orderCount * 20, pendingAds: pendingListings, tickets: 3, consultants: consultantCount }} />

      {/* Bottom Row: Recent Stuff + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Users */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: "var(--text)" }}>👤 Son Kayıt Olan Kullanıcılar</h3>
            <Link href="/users" className="text-xs font-medium" style={{ color: "var(--primary)" }}>Tümü →</Link>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>E-posta</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => {
                  const name = u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "Anonim";
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-sm" style={{ color: "var(--text)" }}>{name}</span>
                        </div>
                      </td>
                      <td><span className="text-sm" style={{ color: "var(--text-secondary)" }}>{u.email}</span></td>
                      <td><span className="badge badge-blue">{u.role}</span></td>
                      <td>{u.isVerified ? <span className="badge badge-green">✓ Doğrulanmış</span> : <span className="badge badge-yellow">Bekliyor</span>}</td>
                      <td><span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(u.createdAt)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4" style={{ color: "var(--text)" }}>⚡ Son Aktiviteler</h3>
          <div className="space-y-3">
            {activities.map((a, i) => (
              <div key={i} className="flex items-start gap-3 pb-3" style={{ borderBottom: i < activities.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm" style={{ color: "var(--text)" }}>{a.text}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
