"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Upload, FileJson, CheckCircle, AlertCircle, Loader2, Trash2, Database, FileText } from "lucide-react";
import KpssQuestionInventory from "./KpssQuestionInventory";
import KpssReportManager from "./KpssReportManager";

const CATEGORIES = ["Lisans", "Önlisans", "Ortaöğretim"];

export default function KpssManagementPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pdfCategory, setPdfCategory] = useState("Lisans");
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    insertedCount?: number;
    totalQuestionsInDb?: Record<string, number>;
    errors?: string[];
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPdf = file?.name.endsWith(".pdf");
  const isJson = file?.name.endsWith(".json");

  // ── Drag handlers
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && (droppedFile.name.endsWith(".json") || droppedFile.name.endsWith(".pdf"))) {
      setFile(droppedFile);
      setResult(null);
    } else {
      setResult({ success: false, message: "Yalnızca .json ve .pdf dosyaları kabul edilir." });
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && (selected.name.endsWith(".json") || selected.name.endsWith(".pdf"))) {
      setFile(selected);
      setResult(null);
    } else if (selected) {
      setResult({ success: false, message: "Yalnızca .json ve .pdf dosyaları kabul edilir." });
    }
  };

  // ── JSON upload
  const handleJsonUpload = async () => {
    if (!file || !isJson) return;
    setUploading(true);
    setResult(null);

    try {
      const text = await file.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        setResult({ success: false, message: "Geçersiz JSON formatı. Dosyayı kontrol edin." });
        setUploading(false);
        return;
      }

      const questions = payload.questions || payload;
      if (!Array.isArray(questions)) {
        setResult({ success: false, message: "JSON içinde 'questions' dizisi bulunamadı." });
        setUploading(false);
        return;
      }

      const res = await fetch("/api/admin/career/kpss/bulk-insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          message: data.message || `${data.insertedCount} soru başarıyla yüklendi.`,
          insertedCount: data.insertedCount,
          totalQuestionsInDb: data.totalQuestionsInDb,
        });
        setFile(null);
      } else {
        setResult({
          success: false,
          message: data.error || "Yükleme başarısız.",
          errors: data.errors,
        });
      }
    } catch (err) {
      setResult({ success: false, message: `Bağlantı hatası: ${err}` });
    } finally {
      setUploading(false);
    }
  };

  // ── PDF upload (Gemini Vision)
  const handlePdfUpload = async () => {
    if (!file || !isPdf) return;
    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", pdfCategory);

      const res = await fetch("/api/admin/career/kpss/pdf-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          message: data.message || `${data.insertedCount} soru başarıyla yüklendi.`,
          insertedCount: data.insertedCount,
          totalQuestionsInDb: data.totalQuestionsInDb,
          errors: data.errors,
        });
        setFile(null);
      } else {
        setResult({
          success: false,
          message: data.error || "PDF yükleme başarısız.",
          errors: data.errors,
        });
      }
    } catch (err) {
      setResult({ success: false, message: `Bağlantı hatası: ${err}` });
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = () => {
    if (isPdf) handlePdfUpload();
    else if (isJson) handleJsonUpload();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Database className="w-7 h-7 text-amber-500" />
            KPSS Soru Yönetimi
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            JSON veya PDF ile toplu soru yükleyin, soruları yönetin.
          </p>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 cursor-pointer ${
          dragActive
            ? "border-amber-400 bg-amber-50/50"
            : file
            ? isPdf ? "border-blue-400 bg-blue-50/20" : "border-green-400 bg-green-50/20"
            : "border-gray-300 hover:border-amber-300 hover:bg-amber-50/20"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json,.pdf"
          className="hidden"
          onChange={handleFileSelect}
        />

        {file ? (
          <div className="flex flex-col items-center gap-3">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isPdf ? "bg-blue-100" : "bg-green-100"}`}>
              {isPdf ? <FileText className="w-8 h-8 text-blue-600" /> : <FileJson className="w-8 h-8 text-green-600" />}
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{file.name}</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {(file.size / 1024).toFixed(1)} KB — {isPdf ? "PDF — OpenAI ile Ayrıştır" : "JSON — Doğrudan yüklenecek"}
              </p>
            </div>
            {/* PDF ise kategori seçimi */}
            {isPdf && (
              <div className="flex items-center gap-2 mt-1" onClick={e => e.stopPropagation()}>
                <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>Kategori:</span>
                <select
                  value={pdfCategory}
                  onChange={e => setPdfCategory(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
              className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 mt-1"
            >
              <Trash2 className="w-4 h-4" /> Dosyayı Kaldır
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-100/60 flex items-center justify-center">
              <Upload className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Sürükle & Bırak veya Dosya Seç
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                <span className="font-mono font-bold">.json</span> veya <span className="font-mono font-bold">.pdf</span> dosyaları — KPSS soru formatı
              </p>
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg">
                <FileJson className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-green-700">JSON — Toplu Yükleme</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">PDF — AI ile Ayrıştır</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Button */}
      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-base disabled:opacity-50 transition-all"
          style={{ background: isPdf ? "linear-gradient(135deg, #3B82F6, #6366F1)" : "linear-gradient(135deg, #EAB308, #F59E0B)" }}
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isPdf ? "OpenAI ile ayrıştırılıyor..." : "Yükleniyor..."}
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              {isPdf ? `${file.name} — AI ile Ayrıştır & Yükle` : `${file.name} — Yükle`}
            </>
          )}
        </button>
      )}

      {/* Result */}
      {result && (
        <div
          className={`p-5 rounded-xl border ${
            result.success
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-500 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-bold text-base ${result.success ? "text-green-700" : "text-red-600"}`}>
                {result.success ? "✅ Başarılı!" : "❌ Hata"}
              </p>
              <p className={`text-sm mt-1 ${result.success ? "text-green-600" : "text-red-500"}`}>
                {result.message}
              </p>

              {/* İstatistikler */}
              {result.success && result.totalQuestionsInDb && (
                <div className="flex gap-4 mt-3">
                  {Object.entries(result.totalQuestionsInDb).map(([cat, count]) => (
                    <div key={cat} className="px-3 py-2 rounded-lg bg-white border border-green-200 text-center">
                      <p className="text-xs text-green-500 font-semibold">{cat}</p>
                      <p className="text-lg font-bold text-green-700">{count}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Hata detayları */}
              {result.errors && result.errors.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto bg-red-100/50 rounded-lg p-3">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600 mb-1">• {err}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Format Guides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* JSON Format Guide */}
        <div className="p-5 rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <FileJson className="w-4 h-4 text-green-500" /> JSON Dosya Formatı
          </h4>
          <pre className="text-xs p-4 rounded-lg overflow-x-auto" style={{ background: "var(--bg-muted)", color: "var(--text-primary)" }}>
{`{
  "questions": [
    {
      "category": "Lisans",
      "subject": "Tarih",
      "questionText": "Soru metni...",
      "options": {
        "A": "Şık A", "B": "Şık B",
        "C": "Şık C", "D": "Şık D",
        "E": "Şık E"
      },
      "correctAnswer": "A",
      "explanation": "Açıklama (opsiyonel)"
    }
  ]
}`}
          </pre>
        </div>

        {/* PDF Guide */}
        <div className="p-5 rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <FileText className="w-4 h-4 text-blue-500" /> PDF Yükleme Bilgisi
          </h4>
          <div className="space-y-3 text-sm" style={{ color: "var(--text-muted)" }}>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">🤖</span>
              <p>PDF dosyası <strong>OpenAI GPT-4o</strong> ile otomatik ayrıştırılır</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">📋</span>
              <p>Soru metni, şıklar ve doğru cevap otomatik tanınır</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">📂</span>
              <p>Kategori (Lisans/Önlisans/Ortaöğretim) seçebilirsiniz</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">⚠️</span>
              <p>Taranmış PDF&apos;ler de desteklenir (OCR)</p>
            </div>
          </div>
        </div>
      </div>
      {/* ── Soru Şikayetleri ── */}
      <KpssReportManager onQuestionUpdated={() => setInventoryRefreshKey(k => k + 1)} />

      {/* ── Soru Envanteri ── */}
      <KpssQuestionInventory refreshKey={inventoryRefreshKey} />
    </div>
  );
}
