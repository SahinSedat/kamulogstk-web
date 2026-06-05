export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Briefcase, Search, Filter, Building2, MapPin, Calendar, TrendingUp, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import CareerActions from "./CareerActions";
import CareerDeleteBtn from "./CareerDeleteBtn";
import CareerTable from "./CareerTable";

export default async function CareerPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; type?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const typeFilter = params.type || "";
  const perPage = 20;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (typeFilter && typeFilter !== "ALL") {
    where.type = typeFilter;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      { code: { contains: search.toUpperCase(), mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }

  const [jobs, total, totalAll, publicCount, privateCount, recentCount] =
    await Promise.all([
      prisma.jobListing.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: "desc" },
      }),
      prisma.jobListing.count({ where }),
      prisma.jobListing.count(),
      prisma.jobListing.count({ where: { type: "PUBLIC" } }),
      prisma.jobListing.count({ where: { type: "PRIVATE" } }),
      prisma.jobListing.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: "var(--text)" }}
          >
            <Briefcase className="w-6 h-6" style={{ color: "var(--primary)" }} /> Kariyer & İş İlanları
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Toplam {totalAll} ilan yönetiliyor
          </p>
        </div>
        <CareerActions />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Toplam İlan", value: totalAll, icon: Briefcase, gradient: "from-indigo-500 to-indigo-600" },
          { label: "🏛️ Kamu", value: publicCount, icon: Building2, gradient: "from-blue-500 to-blue-600" },
          { label: "🏢 Özel Sektör", value: privateCount, icon: TrendingUp, gradient: "from-emerald-500 to-green-600" },
          { label: "📅 Son 7 Gün", value: recentCount, icon: Clock, gradient: "from-amber-500 to-amber-600" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                <p className="text-xl font-bold mt-0.5" style={{ color: "var(--text)" }}>{s.value}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center`}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <form className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input name="search" defaultValue={search} placeholder="İlan başlığı, kurum veya kod ara..." className="w-full !pl-10 text-sm" />
          </div>
          <select name="type" defaultValue={typeFilter} className="text-sm min-w-[140px]">
            <option value="">Tüm Türler</option>
            <option value="PUBLIC">🏛️ Kamu</option>
            <option value="PRIVATE">🏢 Özel Sektör</option>
          </select>
          <button type="submit" className="px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90">
            <Filter className="w-4 h-4 inline mr-1" /> Filtrele
          </button>
        </form>
      </div>

      {/* Table with Bulk Delete */}
      <CareerTable jobs={jobs.map(j => ({
        id: j.id,
        code: j.code,
        title: j.title,
        company: j.company,
        location: j.location,
        type: j.type,
        sourceUrl: j.sourceUrl,
        deadline: j.deadline ? j.deadline.toISOString() : null,
        createdAt: j.createdAt.toISOString(),
      }))} />

      {totalPages > 1 && (
          <div className="card flex items-center justify-between px-4 py-3">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {total} sonuçtan {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} gösteriliyor · Sayfa {page}/{totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/career?page=${page - 1}&search=${search}&type=${typeFilter}`}
                  className="px-3 py-1.5 text-xs rounded-lg transition-all"
                  style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}
                >
                  ← Önceki
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/career?page=${page + 1}&search=${search}&type=${typeFilter}`}
                  className="px-3 py-1.5 text-xs rounded-lg transition-all"
                  style={{ background: "var(--primary)", color: "white" }}
                >
                  Sonraki →
                </Link>
              )}
            </div>
          </div>
        )}
    </div>
  );
}
