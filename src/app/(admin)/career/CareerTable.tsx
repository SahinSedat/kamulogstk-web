"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trash2, Loader2, CheckSquare, Square, MinusSquare,
  Building2, MapPin, Calendar, Briefcase,
} from "lucide-react";
import CareerDeleteBtn from "./CareerDeleteBtn";
import { formatDate } from "@/lib/utils";

interface Job {
  id: string;
  code: string | null;
  title: string;
  company: string;
  location: string | null;
  type: string;
  sourceUrl: string | null;
  deadline: string | null;
  createdAt: string;
}

export default function CareerTable({ jobs }: { jobs: Job[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const allSelected = jobs.length > 0 && selected.size === jobs.length;
  const someSelected = selected.size > 0 && selected.size < jobs.length;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(jobs.map((j) => j.id)));
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (
      !confirm(
        `${selected.size} ilanı silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`
      )
    )
      return;

    setLoading(true);
    const ids = Array.from(selected);
    let success = 0;
    let fail = 0;

    for (let i = 0; i < ids.length; i += 5) {
      const batch = ids.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map((id) => fetch(`/api/kariyer/jobs/${id}`, { method: "DELETE" }))
      );
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value.ok) success++;
        else fail++;
      });
    }

    setSelected(new Set());
    setLoading(false);
    if (fail > 0) alert(`${success} ilan silindi, ${fail} ilan silinemedi.`);
    router.refresh();
  };

  return (
    <>
      {/* Toplu Silme Toolbar */}
      {selected.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3 transition-all animate-in slide-in-from-top-2"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.04))",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm font-medium transition hover:opacity-70"
            style={{ color: "#ef4444" }}
          >
            {allSelected ? <CheckSquare className="w-4 h-4" /> : <MinusSquare className="w-4 h-4" />}
            {allSelected ? "Seçimi Kaldır" : "Tümünü Seç"}
          </button>
          <span className="text-xs font-semibold" style={{ color: "#ef4444" }}>
            {selected.size} ilan seçildi
          </span>
          <div className="flex-1" />
          <button
            onClick={handleBulkDelete}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "#ef4444" }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Seçilenleri Sil ({selected.size})
          </button>
        </div>
      )}

      {/* Tablo */}
      <div className="card overflow-hidden">
        <table>
          <thead>
            <tr>
              <th style={{ width: 36, textAlign: "center" }}>
                <button onClick={toggleAll} className="flex items-center justify-center w-full opacity-60 hover:opacity-100 transition">
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4" style={{ color: "#ef4444" }} />
                  ) : someSelected ? (
                    <MinusSquare className="w-4 h-4" style={{ color: "#ef4444" }} />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th>İlan No</th>
              <th>İlan Başlığı</th>
              <th>Kurum</th>
              <th>Şehir</th>
              <th>Tür</th>
              <th>Son Tarih</th>
              <th>Eklenme</th>
              <th style={{ textAlign: "right" }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                    <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Henüz iş ilanı bulunmuyor</p>
                    <p className="text-xs mt-1">Yeni İlan Ekle butonuyla başlayın</p>
                  </div>
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr
                  key={job.id}
                  className="transition-colors"
                  style={selected.has(job.id) ? { background: "rgba(239,68,68,0.04)" } : {}}
                >
                  <td style={{ textAlign: "center" }}>
                    <button
                      onClick={() => toggle(job.id)}
                      className="flex items-center justify-center w-full transition hover:opacity-70"
                    >
                      {selected.has(job.id) ? (
                        <CheckSquare className="w-4 h-4" style={{ color: "#ef4444" }} />
                      ) : (
                        <Square className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                      )}
                    </button>
                  </td>
                  <td>
                    <span
                      className="text-xs font-mono px-2 py-1 rounded-lg"
                      style={{ background: "var(--bg-muted)", color: "var(--primary)" }}
                    >
                      {job.code || "—"}
                    </span>
                  </td>
                  <td>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                        {job.title}
                      </p>
                      {job.sourceUrl && (
                        <a
                          href={job.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] hover:underline"
                          style={{ color: "var(--primary)" }}
                        >
                          Kaynak ↗
                        </a>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {job.company}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {job.location || "—"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${job.type === "PUBLIC" ? "badge-blue" : "badge-green"}`}>
                      {job.type === "PUBLIC" ? "🏛️ Kamu" : "🏢 Özel"}
                    </span>
                  </td>
                  <td>
                    {job.deadline ? (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                        <span
                          className="text-xs"
                          style={{
                            color:
                              new Date(job.deadline) < new Date()
                                ? "#ef4444"
                                : "var(--text-secondary)",
                          }}
                        >
                          {formatDate(job.deadline)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        —
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {formatDate(job.createdAt)}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/career/${job.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                        style={{ background: "var(--primary)", color: "white" }}
                      >
                        Düzenle
                      </Link>
                      <CareerDeleteBtn id={job.id} title={job.title} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
