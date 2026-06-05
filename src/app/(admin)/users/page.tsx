export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Users, Search, CheckCircle, XCircle, Crown, Shield, Briefcase, UserCheck, Filter, Mail, MessageCircle, Bell, Smartphone, Snowflake, Trash2, Camera, ClipboardCheck, Download } from "lucide-react";
import { formatDate } from "@/lib/utils";
import AssignSTKButton from "@/components/ui/AssignSTKButton";
import CreateUserModal from "@/components/ui/CreateUserModal";

// Employment type badge — matches mobile app values
function getEmploymentBadge(type: string | null) {
  const t = (type || "").toLowerCase();
  if (t.includes("4/d") || t.includes("işçi") || t.includes("isci")) return { label: "4/D İşçi", color: "badge-blue", icon: "👷" };
  if (t.includes("4/a") || t.includes("memur")) return { label: "4/A Memur", color: "badge-green", icon: "👔" };
  if (t.includes("4/b") || t.includes("sözleşmeli") || t.includes("sozlesmeli")) return { label: "4/B Sözleşmeli", color: "badge-purple", icon: "📝" };
  if (!type || type.trim() === "") return { label: "Belirsiz", color: "badge-gray", icon: "👤" };
  return { label: type, color: "badge-gray", icon: "👤" };
}

// Role badge
function getRoleBadge(role: string) {
  switch (role) {
    case "ADMIN": return { label: "Admin", color: "badge-red" };
    case "MODERATOR": return { label: "Moderatör", color: "badge-yellow" };
    case "CONSULTANT": return { label: "Danışman", color: "badge-purple" };
    case "STK_MANAGER": return { label: "STK Yönetici", color: "badge-green" };
    default: return { label: "Kullanıcı", color: "badge-blue" };
  }
}

// Status badge
function getStatusBadge(user: { isDeactivated: boolean; accountDeleted: boolean; accountFrozen: boolean; isActive: boolean }) {
  if (user.accountDeleted) return { label: "🗑️ Hesap Sildi", color: "badge-red" };
  if (user.accountFrozen) return { label: "❄️ Dondurdu", color: "badge-purple" };
  if (user.isDeactivated) return { label: "🔒 Deaktif", color: "badge-red" };
  if (!user.isActive) return { label: "⛔ Pasif", color: "badge-gray" };
  return null;
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; role?: string; verified?: string; employment?: string; premium?: string; status?: string; avatar?: string; profile?: string }> }) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const roleFilter = params.role || "";
  const verifiedFilter = params.verified || "";
  const employmentFilter = params.employment || "";
  const premiumFilter = params.premium || "";
  const statusFilter = params.status || "";
  const avatarFilter = params.avatar || "";
  const profileFilter = params.profile || "";
  const perPage = 20;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }
  if (roleFilter) where.role = roleFilter;
  if (verifiedFilter === "true") where.isVerified = true;
  if (verifiedFilter === "false") where.isVerified = false;
  if (employmentFilter) where.istihdamTuru = { contains: employmentFilter, mode: "insensitive" };
  
  // Premium / Abonelik filtresi
  if (premiumFilter === "premium_becayis") where.isPremium = true;
  else if (premiumFilter === "premium_kariyer") where.isCareerPremium = true;
  else if (premiumFilter === "true") where.OR = [...(where.OR || []), { isPremium: true }, { isCareerPremium: true }];
  else if (premiumFilter === "false") { where.isPremium = false; where.isCareerPremium = false; }

  // Hesap durumu filtresi
  if (statusFilter === "active") { where.isDeactivated = false; where.accountDeleted = false; where.accountFrozen = false; where.isActive = true; }
  else if (statusFilter === "deactivated") where.isDeactivated = true;
  else if (statusFilter === "deleted") where.accountDeleted = true;
  else if (statusFilter === "frozen") where.accountFrozen = true;

  // Profil resmi filtresi
  if (avatarFilter === "true") where.avatarUrl = { not: null };
  else if (avatarFilter === "false") where.avatarUrl = null;

  // Profil bilgisi dolu/boş filtresi
  if (profileFilter === "complete") {
    where.city = { not: null };
    where.istihdamTuru = { not: null };
    where.firstName = { not: null };
  } else if (profileFilter === "incomplete") {
    where.OR = [...(where.OR || []), { city: null }, { istihdamTuru: null }, { firstName: null }];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * perPage,
      take: perPage,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, email: true, firstName: true, lastName: true, name: true,
        phone: true, role: true, isVerified: true, isActive: true, isPremium: true,
        credits: true, aiTokens: true, istihdamTuru: true, createdAt: true, avatarUrl: true,
        subscriptionTier: true, isDeactivated: true, accountDeleted: true, accountFrozen: true,
        accountDeletedAt: true, deactivatedAt: true, deactivationReason: true,
        isCareerPremium: true, city: true,
        notifEmail: true, notifWhatsapp: true, notifPush: true, notifSms: true,
        _count: { select: { becayisListings: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  // ── İstatistik sayaçları (paralel) ──
  const [
    totalAll, isciCount, memurCount, sozlesmeliCount, premiumBecayisCount,
    premiumKariyerCount, deactivatedCount, deletedCount, frozenCount,
    hasAvatarCount, profileCompleteCount
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { istihdamTuru: { contains: "4/D", mode: "insensitive" } } }),
    prisma.user.count({ where: { istihdamTuru: { contains: "4/A", mode: "insensitive" } } }),
    prisma.user.count({ where: { istihdamTuru: { contains: "4/B", mode: "insensitive" } } }),
    prisma.user.count({ where: { isPremium: true } }),
    prisma.user.count({ where: { isCareerPremium: true } }),
    prisma.user.count({ where: { isDeactivated: true } }),
    prisma.user.count({ where: { accountDeleted: true } }),
    prisma.user.count({ where: { accountFrozen: true } }),
    prisma.user.count({ where: { avatarUrl: { not: null } } }),
    prisma.user.count({ where: { city: { not: null }, istihdamTuru: { not: null }, firstName: { not: null } } }),
  ]);

  // Aktif filtre sayısını hesapla
  const activeFilterCount = [roleFilter, verifiedFilter, employmentFilter, premiumFilter, statusFilter, avatarFilter, profileFilter].filter(Boolean).length;

  // Query string builder
  const buildQuery = (overrides: Record<string, string>) => {
    const p = { search, role: roleFilter, verified: verifiedFilter, employment: employmentFilter, premium: premiumFilter, status: statusFilter, avatar: avatarFilter, profile: profileFilter, page: "1", ...overrides };
    const qs = Object.entries(p).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    return `/users?${qs}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Users className="w-6 h-6" style={{ color: "var(--primary)" }} /> Kullanıcılar
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Toplam {totalAll} kullanıcı{activeFilterCount > 0 && ` · ${activeFilterCount} filtre aktif · ${total} sonuç`}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/users/export?format=csv"
            className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all hover:opacity-80"
            style={{ background: "var(--bg-muted)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            title="Tüm kullanıcı verilerini CSV olarak indir"
          >
            <Download className="w-4 h-4" /> CSV
          </a>
          <CreateUserModal />
        </div>
      </div>

      {/* ── İstatistik Kartları — Tıklanabilir Filtre ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Toplam", value: totalAll, icon: Users, gradient: "from-blue-500 to-blue-600", href: "/users" },
          { label: "👷 İşçi", value: isciCount, icon: Briefcase, gradient: "from-sky-500 to-sky-600", href: buildQuery({ employment: "4/D" }) },
          { label: "👔 Memur", value: memurCount, icon: Shield, gradient: "from-green-500 to-emerald-500", href: buildQuery({ employment: "4/A" }) },
          { label: "📝 Sözleşmeli", value: sozlesmeliCount, icon: UserCheck, gradient: "from-purple-500 to-purple-600", href: buildQuery({ employment: "4/B" }) },
          { label: "⭐ Premium Becayiş", value: premiumBecayisCount, icon: Crown, gradient: "from-amber-500 to-amber-600", href: buildQuery({ premium: "premium_becayis" }) },
          { label: "💼 Premium Kariyer", value: premiumKariyerCount, icon: Crown, gradient: "from-pink-500 to-rose-500", href: buildQuery({ premium: "premium_kariyer" }) },
          { label: "🔒 Deaktif", value: deactivatedCount, icon: Snowflake, gradient: "from-red-500 to-red-600", href: buildQuery({ status: "deactivated" }) },
          { label: "🗑️ Hesap Sildi", value: deletedCount, icon: Trash2, gradient: "from-gray-500 to-gray-600", href: buildQuery({ status: "deleted" }) },
          { label: "❄️ Dondurdu", value: frozenCount, icon: Snowflake, gradient: "from-indigo-400 to-indigo-500", href: buildQuery({ status: "frozen" }) },
          { label: "📸 Profil Resmi", value: hasAvatarCount, icon: Camera, gradient: "from-teal-500 to-teal-600", href: buildQuery({ avatar: "true" }) },
          { label: "📋 Profil Dolu", value: profileCompleteCount, icon: ClipboardCheck, gradient: "from-emerald-500 to-green-600", href: buildQuery({ profile: "complete" }) },
          { label: "📋 Profil Eksik", value: totalAll - profileCompleteCount, icon: ClipboardCheck, gradient: "from-orange-400 to-orange-500", href: buildQuery({ profile: "incomplete" }) },
        ].map(s => (
          <Link key={s.label} href={s.href} className="stat-card group cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                <p className="text-xl font-bold mt-0.5" style={{ color: "var(--text)" }}>{s.value}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center`}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Filtreler ── */}
      <div className="card p-4">
        <form className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input name="search" defaultValue={search} placeholder="İsim, e-posta veya telefon ara..." className="w-full !pl-10 text-sm" />
          </div>
          <select name="role" defaultValue={roleFilter} className="text-sm min-w-[130px]">
            <option value="">Tüm Roller</option>
            <option value="ADMIN">Admin</option>
            <option value="MODERATOR">Moderatör</option>
            <option value="CONSULTANT">Danışman</option>
            <option value="STK_MANAGER">STK Yönetici</option>
            <option value="USER">Kullanıcı</option>
          </select>
          <select name="employment" defaultValue={employmentFilter} className="text-sm min-w-[140px]">
            <option value="">Tüm Personel</option>
            <option value="4/D">👷 4/D İşçi</option>
            <option value="4/A">👔 4/A Memur</option>
            <option value="4/B">📝 4/B Sözleşmeli</option>
          </select>
          <select name="status" defaultValue={statusFilter} className="text-sm min-w-[150px]">
            <option value="">Tüm Hesap Durumu</option>
            <option value="active">✅ Aktif</option>
            <option value="deactivated">🔒 Deaktif Edilmiş</option>
            <option value="deleted">🗑️ Hesap Silmiş</option>
            <option value="frozen">❄️ Hesap Dondurmuş</option>
          </select>
          <select name="verified" defaultValue={verifiedFilter} className="text-sm min-w-[130px]">
            <option value="">Tüm Doğrulama</option>
            <option value="true">✅ Doğrulanmış</option>
            <option value="false">❌ Doğrulanmamış</option>
          </select>
          <select name="premium" defaultValue={premiumFilter} className="text-sm min-w-[150px]">
            <option value="">Tüm Abonelik</option>
            <option value="premium_becayis">⭐ Premium Becayiş</option>
            <option value="premium_kariyer">💼 Premium Kariyer</option>
            <option value="true">👑 Tüm Premium</option>
            <option value="false">Ücretsiz</option>
          </select>
          <select name="avatar" defaultValue={avatarFilter} className="text-sm min-w-[140px]">
            <option value="">Profil Resmi</option>
            <option value="true">📸 Resmi Var</option>
            <option value="false">🚫 Resmi Yok</option>
          </select>
          <select name="profile" defaultValue={profileFilter} className="text-sm min-w-[130px]">
            <option value="">Profil Durumu</option>
            <option value="complete">📋 Dolu</option>
            <option value="incomplete">⚠️ Eksik</option>
          </select>
          <button type="submit" className="px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90">
            <Filter className="w-4 h-4 inline mr-1" /> Filtrele
          </button>
          {activeFilterCount > 0 && (
            <a href="/users" className="px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80" style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}>
              ✕ Temizle
            </a>
          )}
        </form>
      </div>

      {/* ── Tablo ── */}
      <div className="card overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Kullanıcı</th>
              <th>Telefon</th>
              <th>Personel Tipi</th>
              <th>Rol</th>
              <th>Durum</th>
              <th>Plan</th>
              <th>Bildirim</th>
              <th>İlan</th>
              <th>Kayıt</th>
              <th style={{ textAlign: "right" }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const role = getRoleBadge(user.role);
              const emp = getEmploymentBadge(user.istihdamTuru);
              const statusBadge = getStatusBadge(user);
              const displayName = user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || (user.email && !user.email.endsWith("@kamulog.net") ? user.email : `Kullanıcı-${user.id.substring(0, 5)}`);
              return (
                <tr key={user.id} className={user.accountDeleted || user.accountFrozen ? "opacity-60" : ""}>
                  <td>
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `https://kamulog.net${user.avatarUrl}`}
                          alt={displayName}
                          className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                          {displayName[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{displayName}</p>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{user.email && !user.email.endsWith("@kamulog.net") ? user.email : <span className="italic opacity-50">E-posta yok</span>}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="text-sm" style={{ color: "var(--text-secondary)" }}>{user.phone || "—"}</span></td>
                  <td><span className={`badge ${emp.color}`}>{emp.icon} {emp.label}</span></td>
                  <td><span className={`badge ${role.color}`}>{role.label}</span></td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        {user.isVerified ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                        {user.isPremium && <span className="badge badge-yellow text-[9px]">⭐ PRO</span>}
                        {user.isCareerPremium && <span className="badge badge-pink text-[9px]">💼 KRY</span>}
                      </div>
                      {statusBadge && (
                        <span className={`badge ${statusBadge.color} text-[9px]`}>{statusBadge.label}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {user.isPremium ? (
                      <span className="badge badge-yellow text-[9px]">👑 {user.subscriptionTier || "Premium"}</span>
                    ) : user.isCareerPremium ? (
                      <span className="badge badge-pink text-[9px]">💼 Kariyer Pro</span>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>Standart</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5" title="Bildirim Tercihleri">
                      <Mail className={`w-3.5 h-3.5 ${user.notifEmail ? "text-blue-500" : "text-gray-400 opacity-40"}`}  />
                      <MessageCircle className={`w-3.5 h-3.5 ${user.notifWhatsapp ? "text-green-500" : "text-gray-400 opacity-40"}`}  />
                      <Bell className={`w-3.5 h-3.5 ${user.notifPush ? "text-purple-500" : "text-gray-400 opacity-40"}`}  />
                      <Smartphone className={`w-3.5 h-3.5 ${user.notifSms ? "text-yellow-500" : "text-gray-400 opacity-40"}`} />
                    </div>
                  </td>
                  <td>
                    {user._count.becayisListings > 0 ? (
                      <span className="badge badge-blue">{user._count.becayisListings} ilan</span>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td><span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(user.createdAt)}</span></td>
                  <td style={{ textAlign: "right" }}>
                    <AssignSTKButton userId={user.id} userName={user.name || user.email || ""} currentRole={user.role} />
                    <Link href={`/users/${user.id}`} className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                      style={{ background: "var(--primary)", color: "white" }}>
                      Detay
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {total} sonuçtan {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} gösteriliyor · Sayfa {page}/{totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={buildQuery({ page: String(page - 1) })}
                  className="px-3 py-1.5 text-xs rounded-lg transition-all" style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>
                  ← Önceki
                </Link>
              )}
              {page < totalPages && (
                <Link href={buildQuery({ page: String(page + 1) })}
                  className="px-3 py-1.5 text-xs rounded-lg transition-all" style={{ background: "var(--primary)", color: "white" }}>
                  Sonraki →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
