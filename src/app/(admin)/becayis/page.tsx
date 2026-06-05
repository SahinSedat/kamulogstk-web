export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeftRight, Eye, Search, Filter, CheckCircle, XCircle, Clock, MapPin, Building2, Briefcase, ArrowRight, Crown, Sparkles, Hash, Bot, AlertTriangle, Zap } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ApproveButton, RejectButton, DeleteListingButton, StatusChanger, DeactivateExpiredButton, ReactivateExpiredButton, PromoteVipButton, ToggleUrgentButton, ApproveEditButton, RejectEditButton } from "@/components/ui/BecayisActions";
import { JetonCostManager } from "@/components/ui/JetonCostManager";

// Kalan süre hesaplama yardımcı fonksiyonu
function getRemainingTime(expiresAt: Date | string | null | undefined): { text: string; color: string; urgent: boolean } {
  if (!expiresAt) return { text: "—", color: "var(--text-muted)", urgent: false };
  const now = new Date();
  const exp = new Date(expiresAt);
  const diff = exp.getTime() - now.getTime();
  if (diff <= 0) return { text: "Doldu", color: "#ef4444", urgent: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 7) return { text: `${days} gün`, color: "#22c55e", urgent: false };
  if (days > 2) return { text: `${days} gün`, color: "#eab308", urgent: false };
  if (days > 0) return { text: `${days}g ${hours}s`, color: "#f97316", urgent: true };
  return { text: `${hours} saat`, color: "#ef4444", urgent: true };
}

// Institution → Category mapping
const INSTITUTION_CATEGORIES: Record<string, { label: string; icon: string; gradient: string }> = {
  "Sağlık Bakanlığı": { label: "Sağlık", icon: "🏥", gradient: "from-red-500 to-rose-500" },
  "Milli Eğitim Bakanlığı": { label: "Eğitim", icon: "📚", gradient: "from-blue-500 to-blue-600" },
  "ADALET BAKANLIĞI": { label: "Adalet", icon: "⚖️", gradient: "from-indigo-500 to-indigo-600" },
  "Emniyet Genel Müdürlüğü": { label: "Güvenlik", icon: "🛡️", gradient: "from-green-600 to-emerald-600" },
  "İçişleri Bakanlığı": { label: "İçişleri", icon: "🏛️", gradient: "from-teal-500 to-teal-600" },
  "Hazine ve Maliye Bakanlığı": { label: "Maliye", icon: "🏦", gradient: "from-yellow-500 to-amber-500" },
  "Tarım ve Orman Bakanlığı": { label: "Tarım", icon: "🌾", gradient: "from-lime-500 to-green-500" },
  "Gençlik ve Spor Bakanlığı": { label: "Spor", icon: "⚽", gradient: "from-orange-500 to-orange-600" },
};

function getCategoryForInstitution(instName: string | undefined | null): { label: string; icon: string; gradient: string } {
  if (!instName) return { label: "Diğer", icon: "📋", gradient: "from-gray-500 to-gray-600" };
  for (const [key, val] of Object.entries(INSTITUTION_CATEGORIES)) {
    if (instName.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return { label: "Diğer", icon: "📋", gradient: "from-gray-500 to-gray-600" };
}

// Assignment method badge
function getMethodBadge(method: string | null) {
  if (method === "khk") return { label: "696 KHK", color: "badge-purple" };
  if (method === "iskur") return { label: "İŞKUR", color: "badge-blue" };
  return { label: method || "—", color: "badge-gray" };
}

// Status badge
function getStatusBadge(status: string) {
  switch (status) {
    case "published": return { label: "Yayında", color: "badge-green" };
    case "pending": return { label: "Onay Bekliyor", color: "badge-yellow" };
    case "draft": return { label: "Taslak", color: "badge-gray" };
    case "rejected": return { label: "Reddedildi", color: "badge-red" };
    case "approved": return { label: "Onaylandı", color: "badge-green" };
    case "matched": return { label: "Eşleşti", color: "badge-purple" };
    case "pending_edit": return { label: "Düzenleme Onayı", color: "badge-orange" };
    case "removed": return { label: "Kaldırıldı", color: "badge-orange" };
    case "expired": return { label: "Süresi Dolmuş", color: "badge-gray" };
    case "passive": return { label: "Pasif", color: "badge-gray" };
    default: return { label: status, color: "badge-gray" };
  }
}

// Role badge  
function getRoleBadge(role: string) {
  if (role === "isci") return { label: "İşçi", color: "badge-blue", icon: "👷" };
  if (role === "memur") return { label: "Memur", color: "badge-green", icon: "👔" };
  if (role === "sozlesmeli") return { label: "Sözleşmeli", color: "badge-purple", icon: "📝" };
  return { label: role, color: "badge-gray", icon: "👤" };
}

export default async function BecayisAdminPage({ searchParams }: { searchParams: Promise<{ status?: string; city?: string; role?: string; institution?: string; view?: string; detail?: string; adNumber?: string; isPremium?: string; search?: string; aiGenerated?: string; urgent?: string; boosted?: string }> }) {
  const params = await searchParams;
  const statusFilter = params.status || "";
  const cityFilter = params.city || "";
  const roleFilter = params.role || "";
  const institutionFilter = params.institution || "";
  const viewMode = params.view || "cards";
  const detailId = params.detail || "";
  const adNumberFilter = params.adNumber || "";
  const isPremiumFilter = params.isPremium || "";
  const searchFilter = params.search || "";
  const aiGeneratedFilter = params.aiGenerated || "";
  const urgentFilter = params.urgent || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (statusFilter === "pending") {
    where.status = { in: ["pending", "pending_edit", "draft"] };
  } else if (statusFilter) {
    where.status = statusFilter;
  }
  if (roleFilter) where.role = roleFilter;
  if (institutionFilter) where.institutionId = institutionFilter;
  if (adNumberFilter) where.adNumber = { contains: adNumberFilter, mode: "insensitive" };
  if (isPremiumFilter === "true") where.isPremium = true;
  if (isPremiumFilter === "false") where.isPremium = false;
  if (cityFilter) {
    where.OR = [
      { currentCity: { contains: cityFilter, mode: "insensitive" } },
      { targetCity: { contains: cityFilter, mode: "insensitive" } },
    ];
  }
  if (searchFilter) {
    where.OR = [
      ...(where.OR || []),
      { adNumber: { contains: searchFilter, mode: "insensitive" } },
      { title: { contains: searchFilter, mode: "insensitive" } },
      { branch: { contains: searchFilter, mode: "insensitive" } },
      { owner: { firstName: { contains: searchFilter, mode: "insensitive" } } },
      { owner: { lastName: { contains: searchFilter, mode: "insensitive" } } },
      { owner: { email: { contains: searchFilter, mode: "insensitive" } } },
      { owner: { phone: { contains: searchFilter, mode: "insensitive" } } },
      { owner: { phoneNumber: { contains: searchFilter, mode: "insensitive" } } },
    ];
  }
  if (aiGeneratedFilter === "true") where.isGeneratedByKamulogAI = true;
  if (urgentFilter === "true") where.isUrgent = true;
  if ((params.boosted || "") === "true") where.boostedUntil = { gte: new Date() };

  const [listings, institutions, totalAll] = await Promise.all([
    prisma.becayisListing.findMany({
      where,
      orderBy: [{ boostedUntil: { sort: "desc", nulls: "last" } }, { isPremium: "desc" }, { createdAt: "desc" }],
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, phoneNumber: true, isPremium: true } },
        institution: { select: { id: true, name: true } },
      },
    }),
    prisma.institution.findMany({ orderBy: { name: "asc" } }),
    prisma.becayisListing.count(),
  ]);

  const pendingCount = await prisma.becayisListing.count({ where: { status: "pending" } });
  const pendingEditCount = await prisma.becayisListing.count({ where: { status: "pending_edit" } });
  const publishedCount = await prisma.becayisListing.count({ where: { status: "published" } });
  const matchedCount = await prisma.becayisListing.count({ where: { status: "matched" } });
  const vipCount = await prisma.becayisListing.count({ where: { isPremium: true } });
  const aiGeneratedCount = await prisma.becayisListing.count({ where: { isGeneratedByKamulogAI: true } });
  const urgentCount = await prisma.becayisListing.count({ where: { isUrgent: true } });
  const boostedCount = await prisma.becayisListing.count({ where: { boostedUntil: { gte: new Date() } } });
  const draftCount = await prisma.becayisListing.count({ where: { status: "draft" } });
  const rejectedCount = await prisma.becayisListing.count({ where: { status: "rejected" } });
  const removedCount = await prisma.becayisListing.count({ where: { status: "removed" } });

  // Jeton cost from SystemSetting
  const jetonSetting = await prisma.systemSetting.findUnique({ where: { key: "becayis_listing_cost" } });
  const jetonCost = jetonSetting ? parseInt(jetonSetting.value) : 30;

  // Category stats
  const categoryStats = new Map<string, number>();
  const allListingsForStats = await prisma.becayisListing.findMany({ include: { institution: { select: { name: true } } } });
  for (const l of allListingsForStats) {
    const cat = getCategoryForInstitution(l.institution?.name);
    categoryStats.set(cat.label, (categoryStats.get(cat.label) || 0) + 1);
  }

  // Detail view listing
  const detailListing = detailId ? listings.find(l => l.id === detailId) : null;

  // All unique cities
  const cities = [...new Set(allListingsForStats.flatMap(l => [l.currentCity, l.targetCity]).filter(Boolean))].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <ArrowLeftRight className="w-6 h-6" style={{ color: "var(--primary)" }} /> Becayiş İlanları
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Toplam {totalAll} ilan · {pendingCount + pendingEditCount} onay bekliyor · {publishedCount} yayında
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <DeactivateExpiredButton />
          <ReactivateExpiredButton />
          <Link href="/becayis/public" target="_blank" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            <Eye className="w-4 h-4" /> Herkese Açık
          </Link>
        </div>
      </div>

      {/* Jeton Cost Manager */}
      <JetonCostManager currentCost={jetonCost} />

      {/* Quick Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Toplam İlan", value: totalAll, icon: Briefcase, gradient: "from-blue-500 to-blue-600", href: "/becayis" },
          { label: "Onay Bekleyen", value: pendingCount + pendingEditCount + draftCount, icon: Clock, gradient: "from-yellow-500 to-amber-500", href: "/becayis?status=pending" },
          { label: "Yayında", value: publishedCount, icon: CheckCircle, gradient: "from-green-500 to-emerald-500", href: "/becayis?status=published" },
          { label: "VIP İlan", value: vipCount, icon: Crown, gradient: "from-amber-500 to-yellow-500", href: "/becayis?isPremium=true" },
          { label: "Eşleşen", value: matchedCount, icon: Sparkles, gradient: "from-purple-500 to-purple-600", href: "/becayis?status=matched" },
          { label: "🚨 Acil İlan", value: urgentCount, icon: AlertTriangle, gradient: "from-red-500 to-rose-600", href: "/becayis?urgent=true" },
          { label: "⚡ Öne Çıkan", value: boostedCount, icon: Zap, gradient: "from-violet-500 to-purple-600", href: "/becayis?boosted=true" },
          { label: "Kurum", value: institutions.length, icon: Building2, gradient: "from-indigo-500 to-indigo-600", href: "/becayis" },
          { label: "✨ AI İlan", value: aiGeneratedCount, icon: Bot, gradient: "from-cyan-500 to-blue-500", href: "/becayis?aiGenerated=true" },
          { label: "📝 Taslak", value: draftCount, icon: Clock, gradient: "from-slate-500 to-slate-600", href: "/becayis?status=draft" },
          { label: "❌ Reddedilen", value: rejectedCount, icon: XCircle, gradient: "from-red-600 to-red-700", href: "/becayis?status=rejected" },
          { label: "📤 Kaldırılan", value: removedCount, icon: XCircle, gradient: "from-orange-500 to-amber-600", href: "/becayis?status=removed" },
        ].map(s => (
          <Link key={s.label} href={s.href} className="stat-card block cursor-pointer transition-all hover:scale-[1.03] hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: "var(--text)" }}>{s.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Category Cards (like mobile app) */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: "var(--text)" }}>📂 Kategoriler</h3>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Toplam {totalAll} ilan</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {[
            { label: "Sağlık", icon: "🏥", gradient: "from-red-500 to-rose-500", instKey: "Sağlık" },
            { label: "Eğitim", icon: "📚", gradient: "from-blue-500 to-blue-600", instKey: "Eğitim" },
            { label: "Adalet", icon: "⚖️", gradient: "from-indigo-500 to-indigo-600", instKey: "Adalet" },
            { label: "Güvenlik", icon: "🛡️", gradient: "from-green-600 to-emerald-600", instKey: "Güvenlik" },
            { label: "Maliye", icon: "🏦", gradient: "from-yellow-500 to-amber-500", instKey: "Maliye" },
            { label: "Tarım", icon: "🌾", gradient: "from-lime-500 to-green-500", instKey: "Tarım" },
            { label: "İçişleri", icon: "🏛️", gradient: "from-teal-500 to-teal-600", instKey: "İçişleri" },
            { label: "Diğer", icon: "📋", gradient: "from-gray-500 to-gray-600", instKey: "" },
          ].map(cat => {
            // Find matching institution ID for this category
            const matchingInst = cat.instKey ? institutions.find(i => i.name.toLowerCase().includes(cat.instKey.toLowerCase())) : null;
            const href = matchingInst ? `/becayis?institution=${matchingInst.id}` : "/becayis";
            return (
              <Link key={cat.label} href={href} className="flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-all hover:scale-105 hover:shadow-md"
                style={{ background: "var(--bg-muted)" }}>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center text-xl`}>
                  {cat.icon}
                </div>
                <span className="text-xs font-medium" style={{ color: "var(--text)" }}>{cat.label}</span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{categoryStats.get(cat.label) || 0}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <form className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input name="search" defaultValue={searchFilter} placeholder="Ad, Email, Telefon, İlan No..." className="w-full !pl-10 text-sm" />
          </div>
          <div className="relative min-w-[180px]">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input name="adNumber" defaultValue={adNumberFilter} placeholder="İlan No (BCY-...)" className="w-full !pl-10 text-sm" />
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input name="city" defaultValue={cityFilter} placeholder="Şehir ara..." className="w-full !pl-10 text-sm" />
          </div>
          <select name="status" defaultValue={statusFilter} className="text-sm min-w-[140px]">
            <option value="">Tüm Durumlar</option>
            <option value="pending">Onay Bekliyor</option>
            <option value="approved">Onaylandı</option>
            <option value="published">Yayında</option>
            <option value="active">Aktif</option>
            <option value="passive">Pasif</option>
            <option value="draft">Taslak</option>
            <option value="rejected">Reddedildi</option>
            <option value="pending_edit">Düzenleme Onayı</option>
            <option value="matched">Eşleşti</option>
            <option value="removed">Kaldırıldı</option>
            <option value="expired">Süresi Dolmuş</option>
          </select>
          <select name="isPremium" defaultValue={isPremiumFilter} className="text-sm min-w-[130px]">
            <option value="">Tüm İlanlar</option>
            <option value="true">👑 Premium</option>
            <option value="false">Standart</option>
          </select>
          <select name="role" defaultValue={roleFilter} className="text-sm min-w-[130px]">
            <option value="">Tüm Tipler</option>
            <option value="isci">👷 İşçi</option>
            <option value="memur">👔 Memur</option>
            <option value="sozlesmeli">📝 Sözleşmeli</option>
          </select>
          <select name="institution" defaultValue={institutionFilter} className="text-sm min-w-[160px]">
            <option value="">Tüm Kurumlar</option>
            {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
          <select name="view" defaultValue={viewMode} className="text-sm min-w-[100px]">
            <option value="cards">📇 Kart</option>
            <option value="table">📋 Tablo</option>
          </select>
          <button type="submit" className="px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90">
            <Filter className="w-4 h-4 inline mr-1" /> Filtrele
          </button>
          <a
            href={aiGeneratedFilter === "true" ? "/becayis" : "/becayis?aiGenerated=true"}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${aiGeneratedFilter === "true" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg" : ""}`}
            style={aiGeneratedFilter !== "true" ? { background: "var(--bg-muted)", color: "var(--text-secondary)", border: "1px solid var(--border)" } : {}}
          >
            <Bot className="w-4 h-4" /> ✨ KamulogAI İlanları
          </a>
        </form>
      </div>

      {/* Detail Modal */}
      {detailListing && (
        <div className="card p-6 border-2 animate-fade-in" style={{ borderColor: "var(--primary)" }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>{detailListing.title}</h3>
                {detailListing.adNumber && (
                  <span className="badge badge-blue text-[10px] font-mono">
                    <Hash className="w-3 h-3 inline mr-0.5" />{detailListing.adNumber}
                  </span>
                )}
              </div>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{detailListing.branch}</p>
            </div>
            <div className="flex items-center gap-2">
              {detailListing.isPremium && <span className="badge badge-yellow flex items-center gap-1"><Crown className="w-3 h-3" /> VIP</span>}
              <span className={getStatusBadge(detailListing.status).color + " badge"}>{getStatusBadge(detailListing.status).label}</span>
              <Link href="/becayis" className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>✕ Kapat</Link>
            </div>
          </div>

          {/* Route Visualization */}
          <div className="p-4 rounded-xl mb-4" style={{ background: "var(--bg-muted)" }}>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <MapPin className="w-5 h-5 mx-auto text-red-500 mb-1" />
                <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{detailListing.currentCity}</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-8 h-0.5 rounded" style={{ background: "var(--border)" }} />
                <ArrowLeftRight className="w-5 h-5" style={{ color: "var(--primary)" }} />
                <div className="w-8 h-0.5 rounded" style={{ background: "var(--border)" }} />
              </div>
              <div className="text-center">
                <MapPin className="w-5 h-5 mx-auto text-green-500 mb-1" />
                <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{detailListing.targetCity}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="p-3 rounded-xl" style={{ background: "var(--bg-muted)" }}>
              <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>İlan Numarası</p>
              <p className="text-sm font-medium font-mono mt-0.5" style={{ color: "var(--text)" }}>{detailListing.adNumber || "—"}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "var(--bg-muted)" }}>
              <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Kurum</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text)" }}>{detailListing.institution?.name || "—"}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "var(--bg-muted)" }}>
              <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Personel Tipi</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text)" }}>{getRoleBadge(detailListing.role).icon} {getRoleBadge(detailListing.role).label}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "var(--bg-muted)" }}>
              <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Bakanlık</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text)" }}>{detailListing.bakanlik || "—"}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "var(--bg-muted)" }}>
              <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Ünvan</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text)" }}>{detailListing.unvan || "—"}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "var(--bg-muted)" }}>
              <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Atama Yöntemi</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text)" }}>{detailListing.atamaUsulu || getMethodBadge(detailListing.assignmentMethod).label}</p>
            </div>
          </div>

          {/* Extra Info Row */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-xl" style={{ background: "var(--bg-muted)" }}>
              <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Oluşturulma Tarihi</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text)" }}>{formatDate(detailListing.createdAt)}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: "var(--bg-muted)" }}>
              <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Onay Tarihi</p>
              <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text)" }}>{detailListing.approvedAt ? formatDate(detailListing.approvedAt) : "—"}</p>
            </div>
          </div>

          {/* Description */}
          <div className="p-4 rounded-xl mb-4" style={{ background: "var(--bg-muted)" }}>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Açıklama</p>
            <p className="text-sm" style={{ color: "var(--text)" }}>{detailListing.description}</p>
          </div>

          {/* Rejection Reason */}
          {(detailListing as any).rejectionReason && (
            <div className="p-4 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <span className="text-xs">❌</span>
                </div>
                <p className="text-xs font-semibold text-red-400">Admin Red Gerekçesi</p>
              </div>
              <p className="text-sm" style={{ color: "var(--text)" }}>{(detailListing as any).rejectionReason}</p>
            </div>
          )}

          {/* Removal Reason */}
          {(detailListing as any).removalReason && (
            <div className="p-4 rounded-xl mb-4" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <span className="text-xs">📤</span>
                </div>
                <p className="text-xs font-semibold text-amber-400">Kullanıcı Kaldırma Gerekçesi</p>
              </div>
              <p className="text-sm" style={{ color: "var(--text)" }}>{(detailListing as any).removalReason}</p>
            </div>
          )}

          {/* Owner Info */}
          <div className="p-4 rounded-xl mb-4" style={{ background: "var(--bg-muted)" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>İlan Sahibi</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-semibold text-sm">
                {(detailListing.owner.firstName || detailListing.owner.email || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                  {[detailListing.owner.firstName, detailListing.owner.lastName].filter(Boolean).join(" ") || detailListing.owner.email}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{detailListing.owner.email} · {detailListing.owner.phone || "Tel yok"}</p>
              </div>
              <Link href={`/users/${detailListing.owner.id}`} className="ml-auto text-xs px-3 py-1.5 rounded-lg" style={{ background: "var(--primary)", color: "white" }}>Profil</Link>
            </div>
          </div>

          {/* Pending Edit Comparison */}
          {detailListing.status === "pending_edit" && detailListing.pendingChanges && (() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pending = detailListing.pendingChanges as any;
            const changes = pending?.changes || {};
            const fieldLabels: Record<string, string> = {
              title: "Başlık", branch: "Branş", currentCity: "Mevcut Şehir",
              targetCity: "Hedef Şehir", description: "Açıklama", role: "Kadro", assignmentMethod: "Atama Yöntemi",
            };
            const changedFields = Object.keys(changes);
            if (changedFields.length === 0) return null;
            return (
              <div className="glass-card p-4 mt-4" style={{ border: "2px solid var(--warning, #f59e0b)" }}>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--warning, #f59e0b)" }}>
                  ⚠️ Düzenleme Talebi — Karşılaştırma
                </h4>
                <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                  Talep eden: {pending?.requestedBy || "?"} · {pending?.requestedAt ? new Date(pending.requestedAt).toLocaleString("tr-TR") : ""}
                </p>
                <div className="space-y-2">
                  {changedFields.map(field => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const oldVal = (detailListing as any)[field] || "—";
                    const newVal = changes[field] || "—";
                    const changed = oldVal !== newVal;
                    return (
                      <div key={field} className="grid grid-cols-3 gap-2 text-xs p-2 rounded-lg" style={{ background: changed ? "rgba(245,158,11,0.08)" : "transparent" }}>
                        <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{fieldLabels[field] || field}</span>
                        <span style={{ color: "var(--text-muted)", textDecoration: changed ? "line-through" : "none" }}>{String(oldVal)}</span>
                        <span className="font-semibold" style={{ color: changed ? "var(--warning, #f59e0b)" : "var(--text)" }}>{String(newVal)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1 mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  <span className="px-1.5 py-0.5 rounded" style={{ background: "var(--bg-muted)" }}>Sol: Mevcut</span>
                  <span className="px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.15)", color: "var(--warning, #f59e0b)" }}>Sağ: Yeni (Talep)</span>
                </div>
              </div>
            );
          })()}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            {(detailListing.status === "pending" || detailListing.status === "draft") && (
              <>
                <ApproveButton listingId={detailListing.id} />
                <RejectButton listingId={detailListing.id} />
              </>
            )}
            {detailListing.status === "pending_edit" && (
              <>
                <ApproveEditButton listingId={detailListing.id} />
                <RejectEditButton listingId={detailListing.id} />
              </>
            )}
            <PromoteVipButton listingId={detailListing.id} isPremium={detailListing.isPremium} />
            <StatusChanger listingId={detailListing.id} currentStatus={detailListing.status} />
            <DeleteListingButton listingId={detailListing.id} />
          </div>
        </div>
      )}

      {/* Listing Cards View */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {listings.map((listing, idx) => {
            const st = getStatusBadge(listing.status);
            const rb = getRoleBadge(listing.role);
            const mb = getMethodBadge(listing.assignmentMethod);
            const cat = getCategoryForInstitution(listing.institution?.name);
            const ownerName = [listing.owner.firstName, listing.owner.lastName].filter(Boolean).join(" ") || listing.owner.email || "Anonim";
            const isDetailOpen = detailId === listing.id;
            return (
              <div key={listing.id} className="card p-0 overflow-hidden transition-all hover:scale-[1.01]" style={{ borderColor: isDetailOpen ? "var(--primary)" : undefined, borderWidth: isDetailOpen ? "2px" : undefined }}>
                {/* Card Header */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${cat.gradient} flex items-center justify-center text-lg`}>{cat.icon}</div>
                      <div>
                        <span className={`badge ${rb.color} text-[10px]`}>{rb.icon} {rb.label}</span>
                        {listing.isPremium && <span className="badge badge-yellow text-[10px] ml-1"><Crown className="w-2.5 h-2.5 inline" /> VIP</span>}
                      </div>
                    </div>
                    <span className={`badge ${st.color}`}>{st.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-semibold text-sm line-clamp-1" style={{ color: "var(--text)" }}>{listing.title}</h4>
                    {listing.adNumber && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}>{listing.adNumber}</span>}
                  </div>
                  <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-muted)" }}>
                    {listing.institution?.name || "—"} · {listing.branch || listing.unvan || "—"}
                  </p>
                </div>

                {/* Route */}
                <div className="px-4 py-3 mx-4 rounded-xl mb-3" style={{ background: "var(--bg-muted)" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{listing.currentCity}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2">
                      <div className="w-5 h-px" style={{ background: "var(--border)" }} />
                      <ArrowLeftRight className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                      <div className="w-5 h-px" style={{ background: "var(--border)" }} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{listing.targetCity}</span>
                      <MapPin className="w-3.5 h-3.5 text-green-500" />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg gradient-primary flex items-center justify-center text-white text-[10px] font-bold">
                      {ownerName[0].toUpperCase()}
                    </div>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{ownerName}</span>
                    {listing.owner.isPremium && <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-600 font-semibold">👑 Premium</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <ToggleUrgentButton listingId={listing.id} isUrgent={(listing as any).isUrgent ?? false} />
                    <PromoteVipButton listingId={listing.id} isPremium={listing.isPremium} />
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{formatDate(listing.createdAt)}</span>
                    <Link href={`/becayis?${new URLSearchParams({ ...params, detail: listing.id } as Record<string, string>).toString()}`}
                      className="ml-2 text-xs px-2.5 py-1 rounded-lg font-medium transition-all"
                      style={{ background: "var(--primary)", color: "white" }}>
                      Detay
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="card overflow-hidden">
          <table>
            <thead>
              <tr>
                <th>İlan No</th><th>Tip</th><th>İlan</th><th>Kurum</th><th>Ünvan</th><th>Güzergah</th><th>İlan Sahibi</th><th>Yöntem</th><th>Durum</th><th>Kalan Süre</th><th>Acil/Boost</th><th>Tarih</th><th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {listings.map(listing => {
                const st = getStatusBadge(listing.status);
                const rb = getRoleBadge(listing.role);
                const mb = getMethodBadge(listing.assignmentMethod);
                const ownerName = [listing.owner.firstName, listing.owner.lastName].filter(Boolean).join(" ") || listing.owner.email || "Anonim";
                return (
                  <tr key={listing.id}>
                    <td><span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>{listing.adNumber || "—"}</span></td>
                    <td><span className={`badge ${rb.color}`}>{rb.icon} {rb.label}</span></td>
                    <td>
                      <div>
                        <p className="font-medium text-sm" style={{ color: "var(--text)" }}>{listing.title}</p>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{listing.branch}</p>
                      </div>
                    </td>
                    <td><span className="text-xs" style={{ color: "var(--text-secondary)" }}>{listing.institution?.name || "—"}</span></td>
                    <td><span className="text-xs" style={{ color: "var(--text-secondary)" }}>{listing.unvan || "—"}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-500" />
                        <span className="text-xs" style={{ color: "var(--text)" }}>{listing.currentCity}</span>
                        <ArrowRight className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                        <span className="text-xs" style={{ color: "var(--text)" }}>{listing.targetCity}</span>
                      </div>
                    </td>
                    <td><span className="text-xs" style={{ color: "var(--text-secondary)" }}>{ownerName}</span></td>
                    <td><span className={`badge ${mb.color}`}>{mb.label}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <span className={`badge ${st.color}`}>{st.label}</span>
                        {listing.isPremium && <Crown className="w-3 h-3 text-yellow-500" />}
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const remaining = getRemainingTime((listing as any).expiresAt);
                        return (
                          <span className="text-[11px] font-semibold" style={{ color: remaining.color }}>
                            {remaining.urgent && "⚠ "}{remaining.text}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <div className="flex items-center gap-1 flex-wrap">
                        {(listing as any).isUrgent && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 font-semibold">🚨 Acil</span>}
                        {(listing as any).boostedUntil && new Date((listing as any).boostedUntil) > new Date() && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-semibold">⚡ Boost</span>
                        )}
                        {(listing as any).boostedUntil && (
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{formatDate((listing as any).boostedUntil)}</span>
                        )}
                        {!(listing as any).isUrgent && !(listing as any).boostedUntil && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>—</span>}
                      </div>
                    </td>
                    <td><span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(listing.createdAt)}</span></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <ToggleUrgentButton listingId={listing.id} isUrgent={(listing as any).isUrgent ?? false} />
                        <PromoteVipButton listingId={listing.id} isPremium={listing.isPremium} />
                        <Link href={`/becayis?detail=${listing.id}`} className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--primary)", color: "white" }}>Detay</Link>
                        {listing.status === "pending" && <><ApproveButton listingId={listing.id} /><RejectButton listingId={listing.id} /></>}
                        <StatusChanger listingId={listing.id} currentStatus={listing.status} />
                        <DeleteListingButton listingId={listing.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {listings.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-lg" style={{ color: "var(--text-muted)" }}>Filtrelere uygun ilan bulunamadı.</p>
        </div>
      )}
    </div>
  );
}
