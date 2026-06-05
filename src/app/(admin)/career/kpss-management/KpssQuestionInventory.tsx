"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, AlertTriangle, ChevronLeft, ChevronRight, BookOpen, GraduationCap, School, Library, Plus, X, CheckSquare } from "lucide-react";

interface KpssQuestion {
  id: string;
  category: string;
  subject: string;
  questionText: string;
  correctAnswer: string;
  createdAt: string;
}

interface Stats {
  total: number;
  lisans: number;
  onlisans: number;
  ortaogretim: number;
}

const TABS = [
  { key: "Tümü", label: "Tümü", icon: BookOpen, color: "text-blue-400" },
  { key: "Lisans", label: "Lisans", icon: GraduationCap, color: "text-purple-400" },
  { key: "Önlisans", label: "Önlisans", icon: School, color: "text-amber-400" },
  { key: "Ortaöğretim", label: "Ortaöğretim", icon: Library, color: "text-green-400" },
];

const SUBJECTS = ["Türkçe", "Matematik", "Tarih", "Coğrafya", "Vatandaşlık", "Güncel Bilgiler"];
const CATEGORIES = ["Lisans", "Önlisans", "Ortaöğretim"];
const ANSWERS = ["A", "B", "C", "D", "E"];

export default function KpssQuestionInventory({ refreshKey }: { refreshKey?: number }) {
  const [activeTab, setActiveTab] = useState("Tümü");
  const [questions, setQuestions] = useState<KpssQuestion[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, lisans: 0, onlisans: 0, ortaogretim: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [clearLoading, setClearLoading] = useState(false);
  const [mockLoading, setMockLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedCategory, setSeedCategory] = useState("Lisans");
  const [showAddModal, setShowAddModal] = useState(false);
  // ── Toplu seçim state'leri
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const limit = 15;

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/career/kpss/questions?category=${encodeURIComponent(activeTab)}&page=${page}&limit=${limit}`);
      const data = await res.json();
      setQuestions(data.questions || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
      setStats(data.stats || { total: 0, lisans: 0, onlisans: 0, ortaogretim: 0 });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [activeTab, page]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions, refreshKey]);
  useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [activeTab]);

  const handleDeleteOne = async (id: string) => {
    if (!confirm("Bu soruyu silmek istediğinize emin misiniz?")) return;
    setDeleteLoading(id);
    try {
      await fetch(`/api/admin/career/kpss/questions?id=${id}`, { method: "DELETE" });
      fetchQuestions();
    } catch (e) { console.error(e); }
    setDeleteLoading(null);
  };

  // ── Toplu silme (seçili checkbox'lar)
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`⚠️ SEÇİLİ ${selectedIds.size} SORUYU SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ?\n\nBu işlem geri alınamaz!`)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch(`/api/admin/career/kpss/questions?ids=${Array.from(selectedIds).join(",")}`, { method: "DELETE" });
      const data = await res.json();
      alert(data.message || "Silindi");
      setSelectedIds(new Set());
      fetchQuestions();
    } catch (e) { console.error(e); }
    setBulkDeleting(false);
  };

  const handleClearCategory = async () => {
    const cat = activeTab === "Tümü" ? null : activeTab;
    if (!cat) return alert("Lütfen önce bir kategori seçin.");
    const count = cat === "Lisans" ? stats.lisans : cat === "Önlisans" ? stats.onlisans : stats.ortaogretim;
    if (!confirm(`⚠️ DİKKAT!\n"${cat}" kategorisindeki ${count} sorunun TAMAMI silinecek.\nDevam?`)) return;
    if (!confirm(`Son onay: ${count} adet ${cat} sorusunu silmek istiyorsunuz?`)) return;
    setClearLoading(true);
    try {
      const res = await fetch(`/api/admin/career/kpss/questions?clearCategory=${encodeURIComponent(cat)}`, { method: "DELETE" });
      const data = await res.json();
      alert(data.message || "Silindi");
      fetchQuestions();
    } catch (e) { console.error(e); }
    setClearLoading(false);
  };

  // ── Tüm soruları sil
  const handleClearAll = async () => {
    if (!confirm(`⚠️ UYARI!\n\nVERİTABANINDAKİ TÜM ${stats.total} SORUYU SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ?\n\nBu işlem GERİ ALINAMAZ!`)) return;
    if (!confirm(`SON ONAY: ${stats.total} sorunun tamamını silmek istiyorsunuz?`)) return;
    setClearLoading(true);
    try {
      const res = await fetch(`/api/admin/career/kpss/questions?clearAll=true`, { method: "DELETE" });
      const data = await res.json();
      alert(data.message || "Silindi");
      fetchQuestions();
    } catch (e) { console.error(e); }
    setClearLoading(false);
  };

  const handleGenerateMock = async () => {
    if (!confirm(`📝 "${seedCategory}" kategorisi için 120 soru üretilecek.\n\n(ÖSYM dağılımına uygun: Türkçe 30, Matematik 30, Tarih 27, Coğrafya 18, Vatandaşlık 9, Güncel 6)\n\nDevam?`)) return;
    setMockLoading(true);
    try {
      const res = await fetch("/api/admin/career/kpss/generate-mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: seedCategory }),
      });
      const data = await res.json();
      alert(data.message || "Üretildi!");
      fetchQuestions();
    } catch (e) { console.error(e); }
    setMockLoading(false);
  };

  const handleSeedReal = async () => {
    if (!confirm("📚 Gerçek çıkmış KPSS soruları veritabanına eklenecek.\nDevam?")) return;
    setSeedLoading(true);
    try {
      const res = await fetch("/api/admin/career/kpss/seed-real", { method: "POST" });
      const data = await res.json();
      alert(data.message || "Yüklendi!");
      fetchQuestions();
    } catch (e) { console.error(e); }
    setSeedLoading(false);
  };

  const getStatForTab = (key: string) => {
    if (key === "Tümü") return stats.total;
    if (key === "Lisans") return stats.lisans;
    if (key === "Önlisans") return stats.onlisans;
    return stats.ortaogretim;
  };

  // ── Checkbox helpers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map(q => q.id)));
    }
  };

  return (
    <>
      <div className="glass-card overflow-hidden mt-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold">Soru Envanteri</h3>
            <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-bold">{stats.total} Toplam</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Manuel Soru Ekle */}
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Manuel Soru Ekle
            </button>
            {/* Seed: Kategori + Buton */}
            <select
              value={seedCategory}
              onChange={e => setSeedCategory(e.target.value)}
              className="bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5"
            >
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-gray-800">{c}</option>)}
            </select>
            <button
              onClick={handleGenerateMock}
              disabled={mockLoading}
              className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 inline-flex items-center gap-1"
            >
              {mockLoading ? <span className="animate-spin">⏳</span> : "🚀"} 120 Soru Üret
            </button>
            <button
              onClick={handleSeedReal}
              disabled={seedLoading}
              className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 inline-flex items-center gap-1"
            >
              {seedLoading ? <span className="animate-spin">⏳</span> : "📚"} Gerçek Soruları Yükle
            </button>
            {/* Kategori temizle veya Tümünü sil */}
            {activeTab !== "Tümü" ? (
              <button
                onClick={handleClearCategory}
                disabled={clearLoading}
                className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 inline-flex items-center gap-1"
              >
                {clearLoading ? <span className="animate-spin">⏳</span> : <AlertTriangle className="w-3 h-3" />}
                {activeTab} Temizle
              </button>
            ) : stats.total > 0 && (
              <button
                onClick={handleClearAll}
                disabled={clearLoading}
                className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 inline-flex items-center gap-1"
              >
                {clearLoading ? <span className="animate-spin">⏳</span> : <AlertTriangle className="w-3 h-3" />}
                Tümünü Sil
              </button>
            )}
          </div>
        </div>

        {/* Toplu Silme Çubuğu */}
        {selectedIds.size > 0 && (
          <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-red-400" />
              <span className="text-sm font-bold text-red-400">{selectedIds.size} soru seçildi</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-xs font-bold text-text-secondary hover:bg-white/10 rounded-lg transition"
              >
                Seçimi Temizle
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition disabled:opacity-50 inline-flex items-center gap-1"
              >
                {bulkDeleting ? <span className="animate-spin">⏳</span> : <Trash2 className="w-3 h-3" />}
                Seçilenleri Sil
              </button>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="px-6 py-3 grid grid-cols-4 gap-3">
          {TABS.map(tab => {
            const count = getStatForTab(tab.key);
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`p-3 rounded-lg border transition text-left ${isActive ? "border-blue-500/50 bg-blue-500/10" : "border-white/5 bg-white/5 hover:bg-white/10"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${tab.color}`} />
                  <span className="text-xs font-medium text-text-secondary">{tab.label}</span>
                </div>
                <span className="text-xl font-bold">{count}</span>
                <span className="text-xs text-text-secondary ml-1">soru</span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="px-6 pb-4">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full" /></div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Bu kategoride henüz soru yok.</p>
            </div>
          ) : (
            <>
              <div className="overflow-auto rounded-lg border border-white/5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left bg-white/5">
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === questions.length && questions.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded accent-red-500 cursor-pointer"
                        />
                      </th>
                      <th className="p-3 w-24">Kategori</th>
                      <th className="p-3 w-28">Ders</th>
                      <th className="p-3">Soru Metni</th>
                      <th className="p-3 w-20 text-center">Doğru</th>
                      <th className="p-3 w-24 text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map(q => (
                      <tr key={q.id} className={`border-b border-white/5 hover:bg-white/5 transition ${selectedIds.has(q.id) ? "bg-red-500/5" : ""}`}>
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(q.id)}
                            onChange={() => toggleSelect(q.id)}
                            className="rounded accent-red-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${q.category === "Lisans" ? "bg-purple-500/20 text-purple-400" : q.category === "Önlisans" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"}`}>{q.category}</span>
                        </td>
                        <td className="p-3 text-text-secondary text-xs">{q.subject}</td>
                        <td className="p-3 text-sm max-w-md truncate" title={q.questionText}>
                          {q.questionText.length > 80 ? q.questionText.slice(0, 80) + "..." : q.questionText}
                        </td>
                        <td className="p-3 text-center">
                          <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-bold">{q.correctAnswer}</span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleDeleteOne(q.id)}
                            disabled={deleteLoading === q.id}
                            className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-1 rounded text-xs font-bold transition disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            {deleteLoading === q.id ? <span className="animate-spin text-xs">⏳</span> : <Trash2 className="w-3 h-3" />} Sil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-text-secondary">Toplam {totalCount} soru • Sayfa {page}/{totalPages}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 transition"><ChevronLeft className="w-4 h-4" /></button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pn: number;
                    if (totalPages <= 5) pn = i + 1;
                    else if (page <= 3) pn = i + 1;
                    else if (page >= totalPages - 2) pn = totalPages - 4 + i;
                    else pn = page - 2 + i;
                    return (
                      <button key={pn} onClick={() => setPage(pn)} className={`w-8 h-8 rounded text-xs font-bold transition ${page === pn ? "bg-blue-500 text-white" : "bg-white/5 hover:bg-white/10"}`}>{pn}</button>
                    );
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 transition"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Manuel Soru Ekleme Modal */}
      {showAddModal && <AddQuestionModal onClose={() => setShowAddModal(false)} onSaved={fetchQuestions} />}
    </>
  );
}

// ─── Manuel Soru Ekleme Modalı ───
function AddQuestionModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [category, setCategory] = useState("Lisans");
  const [subject, setSubject] = useState("Türkçe");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState({ A: "", B: "", C: "", D: "", E: "" });
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState(2);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!questionText.trim()) return setError("Soru metni zorunlu.");
    if (!options.A || !options.B || !options.C || !options.D || !options.E) return setError("Tüm şıklar doldurulmalı.");
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/career/kpss/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, subject, questionText, options, correctAnswer, explanation, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Hata oluştu");
      } else {
        onSaved();
        onClose();
      }
    } catch { setError("Ağ hatası"); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg-primary border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-blue-400" /> Manuel Soru Ekle</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-500/20 text-red-400 p-3 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1 text-text-secondary">Kategori</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                {CATEGORIES.map(c => <option key={c} value={c} className="bg-gray-800">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-text-secondary">Ders</label>
              <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                {SUBJECTS.map(s => <option key={s} value={s} className="bg-gray-800">{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-text-secondary">Zorluk</label>
              <select value={difficulty} onChange={e => setDifficulty(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                <option value={1} className="bg-gray-800">Kolay</option>
                <option value={2} className="bg-gray-800">Orta</option>
                <option value={3} className="bg-gray-800">Zor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1 text-text-secondary">Soru Metni</label>
            <textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none" placeholder="Aşağıdakilerden hangisi..." />
          </div>

          {ANSWERS.map(a => (
            <div key={a} className="flex items-center gap-3">
              <button
                onClick={() => setCorrectAnswer(a)}
                className={`w-8 h-8 rounded-lg text-xs font-bold flex-shrink-0 transition ${correctAnswer === a ? "bg-green-500 text-white" : "bg-white/5 border border-white/10 hover:bg-white/10"}`}
              >{a}</button>
              <input
                value={options[a as keyof typeof options]}
                onChange={e => setOptions(prev => ({ ...prev, [a]: e.target.value }))}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                placeholder={`${a} şıkkı...`}
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-bold mb-1 text-text-secondary">Açıklama (Opsiyonel)</label>
            <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none" placeholder="Doğru cevap X'dir çünkü..." />
          </div>
        </div>
        <div className="p-6 border-t border-white/5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition">İptal</button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold transition disabled:opacity-50">
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
