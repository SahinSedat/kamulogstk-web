"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Flag, CheckCircle, XCircle, Clock, Eye, Edit3, Save, X, ChevronLeft, ChevronRight, Loader2, AlertTriangle
} from "lucide-react";

interface KpssReport {
  id: string;
  questionId: string;
  userId: string;
  userName: string | null;
  reportType: string;
  suggestedAnswer: string | null;
  message: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  question: {
    id: string;
    category: string;
    subject: string;
    questionText: string;
    options: Record<string, string>;
    correctAnswer: string;
    explanation: string | null;
  };
}

interface ReportStats { pending: number; accepted: number; rejected: number; total: number; }

const STATUS_MAP: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  PENDING: { label: "Bekliyor", color: "text-amber-600", bgColor: "bg-amber-50", icon: <Clock className="w-4 h-4" /> },
  ACCEPTED: { label: "Kabul Edildi", color: "text-green-600", bgColor: "bg-green-50", icon: <CheckCircle className="w-4 h-4" /> },
  REJECTED: { label: "Reddedildi", color: "text-red-600", bgColor: "bg-red-50", icon: <XCircle className="w-4 h-4" /> },
};

export default function KpssReportManager({ onQuestionUpdated }: { onQuestionUpdated?: () => void }) {
  const [reports, setReports] = useState<KpssReport[]>([]);
  const [stats, setStats] = useState<ReportStats>({ pending: 0, accepted: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReport, setSelectedReport] = useState<KpssReport | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<KpssReport | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/career/kpss/reports?status=${filterStatus}&page=${page}&limit=15`);
      const data = await res.json();
      setReports(data.reports || []);
      setStats(data.stats || { pending: 0, accepted: 0, rejected: 0, total: 0 });
      setTotalPages(data.totalPages || 1);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filterStatus, page]);

  useEffect(() => { fetchReports(); }, [fetchReports]);
  useEffect(() => { setPage(1); }, [filterStatus]);

  const handleReviewReport = async (reportId: string, status: string, adminNote: string, fixCorrectAnswer?: string) => {
    try {
      const res = await fetch(`/api/admin/career/kpss/reports?id=${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote, fixCorrectAnswer }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedReport(null);
        fetchReports();
        onQuestionUpdated?.();
      } else {
        alert(data.error || "Hata");
      }
    } catch { alert("Sunucu hatası"); }
  };

  const handleEditQuestion = async (questionId: string, updates: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/admin/career/kpss/questions?id=${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setEditingQuestion(null);
        fetchReports();
        onQuestionUpdated?.();
        alert("Soru güncellendi ✅");
      } else {
        alert(data.error || "Hata");
      }
    } catch { alert("Sunucu hatası"); }
  };

  return (
    <div className="glass-card overflow-hidden mt-6">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flag className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold">Soru Şikayetleri</h3>
          {stats.pending > 0 && (
            <span className="bg-red-500 text-white px-2.5 py-0.5 rounded-full text-xs font-bold animate-pulse">
              {stats.pending} Bekleyen
            </span>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="px-6 py-3 grid grid-cols-4 gap-3">
        {([
          { key: "ALL", label: "Tümü", count: stats.total, color: "text-blue-400", bg: "border-blue-500/50 bg-blue-500/10" },
          { key: "PENDING", label: "Bekleyen", count: stats.pending, color: "text-amber-400", bg: "border-amber-500/50 bg-amber-500/10" },
          { key: "ACCEPTED", label: "Kabul", count: stats.accepted, color: "text-green-400", bg: "border-green-500/50 bg-green-500/10" },
          { key: "REJECTED", label: "Red", count: stats.rejected, color: "text-red-400", bg: "border-red-500/50 bg-red-500/10" },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`p-3 rounded-lg border transition text-left ${filterStatus === tab.key ? tab.bg : "border-white/5 bg-white/5 hover:bg-white/10"}`}
          >
            <span className={`text-xs font-medium ${tab.color}`}>{tab.label}</span>
            <div className="text-xl font-bold mt-1">{tab.count}</div>
          </button>
        ))}
      </div>

      {/* Tablo */}
      <div className="px-6 pb-4">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full" /></div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <Flag className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Şikayet bulunamadı.</p>
          </div>
        ) : (
          <>
            <div className="overflow-auto rounded-lg border border-white/5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left bg-white/5">
                    <th className="p-3 w-20">Durum</th>
                    <th className="p-3">Soru</th>
                    <th className="p-3 w-24">Mevcut</th>
                    <th className="p-3 w-24">Önerilen</th>
                    <th className="p-3 w-32">Şikayetçi</th>
                    <th className="p-3 w-28 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => {
                    const st = STATUS_MAP[r.status] || STATUS_MAP.PENDING;
                    return (
                      <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${st.bgColor} ${st.color}`}>
                            {st.icon} {st.label}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="max-w-xs truncate text-sm" title={r.question?.questionText}>
                            {r.question?.questionText?.slice(0, 60)}...
                          </div>
                          <div className="text-xs text-text-secondary mt-0.5">
                            {r.question?.category} • {r.question?.subject}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold">
                            {r.question?.correctAnswer}
                          </span>
                        </td>
                        <td className="p-3">
                          {r.suggestedAnswer ? (
                            <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-bold">
                              {r.suggestedAnswer}
                            </span>
                          ) : <span className="text-text-secondary text-xs">—</span>}
                        </td>
                        <td className="p-3">
                          <div className="text-xs">{r.userName || "Anonim"}</div>
                          <div className="text-xs text-text-secondary">{new Date(r.createdAt).toLocaleDateString("tr-TR")}</div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setSelectedReport(r)} className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded transition" title="İncele">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingQuestion(r)} className="p-1.5 text-amber-400 hover:bg-amber-500/20 rounded transition" title="Soruyu Düzenle">
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-text-secondary">Sayfa {page}/{totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 transition"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detay / İnceleme Modal */}
      {selectedReport && <ReviewModal report={selectedReport} onClose={() => setSelectedReport(null)} onReview={handleReviewReport} />}

      {/* Soru Düzenleme Modal */}
      {editingQuestion && <EditQuestionModal report={editingQuestion} onClose={() => setEditingQuestion(null)} onSave={handleEditQuestion} />}
    </div>
  );
}

// ─── Şikayet İnceleme Modalı ───
function ReviewModal({ report, onClose, onReview }: {
  report: KpssReport;
  onClose: () => void;
  onReview: (id: string, status: string, note: string, fix?: string) => void;
}) {
  const [adminNote, setAdminNote] = useState(report.adminNote || "");
  const [fixAnswer, setFixAnswer] = useState(report.suggestedAnswer || "");
  const [saving, setSaving] = useState(false);

  const handleAction = async (status: string) => {
    setSaving(true);
    await onReview(report.id, status, adminNote, status === "ACCEPTED" ? fixAnswer : undefined);
    setSaving(false);
  };

  const q = report.question;
  const opts = (q?.options || {}) as Record<string, string>;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-primary border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2"><Flag className="w-5 h-5 text-red-400" /> Şikayet Detayı</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Şikayetçi Bilgisi */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-text-secondary">Şikayetçi:</span>
            <span className="font-bold">{report.userName || "Anonim"}</span>
            <span className="text-text-secondary">•</span>
            <span className="text-text-secondary">{new Date(report.createdAt).toLocaleString("tr-TR")}</span>
          </div>

          {report.message && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-sm font-bold text-red-400 mb-1">Kullanıcı Mesajı:</p>
              <p className="text-sm">{report.message}</p>
            </div>
          )}

          {/* Soru Detayı */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">{q?.category}</span>
              <span className="text-xs font-bold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">{q?.subject}</span>
            </div>
            <p className="text-sm mb-3">{q?.questionText}</p>

            {/* Şıklar */}
            <div className="space-y-2">
              {["A", "B", "C", "D", "E"].filter(k => opts[k]).map(key => (
                <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  key === q?.correctAnswer ? "bg-green-500/10 border border-green-500/30" :
                  key === report.suggestedAnswer ? "bg-amber-500/10 border border-amber-500/30" :
                  "bg-white/5 border border-white/5"
                }`}>
                  <span className="font-bold w-6">{key})</span>
                  <span className="flex-1">{opts[key]}</span>
                  {key === q?.correctAnswer && <span className="text-xs text-green-400 font-bold">Mevcut Cevap</span>}
                  {key === report.suggestedAnswer && key !== q?.correctAnswer && <span className="text-xs text-amber-400 font-bold">Önerilen</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Doğru cevap düzeltmesi */}
          <div>
            <label className="block text-xs font-bold mb-2 text-text-secondary">Doğru Cevap (Kabul edilirse değişecek)</label>
            <div className="flex gap-2">
              {["A", "B", "C", "D", "E"].filter(k => opts[k]).map(key => (
                <button key={key} onClick={() => setFixAnswer(key)}
                  className={`w-10 h-10 rounded-lg text-sm font-bold transition ${fixAnswer === key ? "bg-green-500 text-white" : "bg-white/5 border border-white/10 hover:bg-white/10"}`}>
                  {key}
                </button>
              ))}
            </div>
          </div>

          {/* Admin notu */}
          <div>
            <label className="block text-xs font-bold mb-1 text-text-secondary">Admin Notu</label>
            <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none"
              placeholder="Değerlendirme notu..." />
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-white/5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition">İptal</button>
          <button onClick={() => handleAction("REJECTED")} disabled={saving}
            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-bold transition disabled:opacity-50 flex items-center gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Reddet
          </button>
          <button onClick={() => handleAction("ACCEPTED")} disabled={saving}
            className="px-5 py-2 rounded-lg bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition disabled:opacity-50 flex items-center gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Kabul Et & Düzelt
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Soru Düzenleme Modalı ───
function EditQuestionModal({ report, onClose, onSave }: {
  report: KpssReport;
  onClose: () => void;
  onSave: (questionId: string, updates: Record<string, unknown>) => void;
}) {
  const q = report.question;
  const [questionText, setQuestionText] = useState(q?.questionText || "");
  const [correctAnswer, setCorrectAnswer] = useState(q?.correctAnswer || "A");
  const [explanation, setExplanation] = useState(q?.explanation || "");
  const [options, setOptions] = useState<Record<string, string>>(
    (q?.options as Record<string, string>) || { A: "", B: "", C: "", D: "", E: "" }
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(q.id, { questionText, correctAnswer, explanation: explanation || null, options });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-primary border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-amber-400" /> Soruyu Düzenle
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-bold">{q?.category}</span>
            <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs font-bold">{q?.subject}</span>
            {report.suggestedAnswer && (
              <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Kullanıcı &quot;{report.suggestedAnswer}&quot; önerdi
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-text-secondary">Soru Metni</label>
            <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none" />
          </div>

          {/* Şıklar */}
          {["A", "B", "C", "D", "E"].map(key => (
            <div key={key} className="flex items-center gap-3">
              <button onClick={() => setCorrectAnswer(key)}
                className={`w-10 h-10 rounded-lg text-sm font-bold flex-shrink-0 transition ${correctAnswer === key ? "bg-green-500 text-white ring-2 ring-green-400" : "bg-white/5 border border-white/10 hover:bg-white/10"}`}>
                {key}
              </button>
              <input value={options[key] || ""} onChange={e => setOptions(prev => ({ ...prev, [key]: e.target.value }))}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" placeholder={`${key} şıkkı...`} />
              {correctAnswer === key && <span className="text-green-400 text-xs font-bold whitespace-nowrap">✓ Doğru</span>}
            </div>
          ))}

          <div>
            <label className="block text-xs font-bold mb-1 text-text-secondary">Açıklama (Opsiyonel)</label>
            <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none"
              placeholder="Doğru cevap ... çünkü..." />
          </div>
        </div>

        <div className="p-6 border-t border-white/5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition">İptal</button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition disabled:opacity-50 flex items-center gap-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
