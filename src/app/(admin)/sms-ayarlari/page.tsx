"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Upload, Save, Loader2, CheckCircle, FileText, Eye, Phone } from "lucide-react";

export default function SmsAyarlariPage() {
  const [settings, setSettings] = useState({
    smsContractUrl: "",
    smsContractExampleUrl: "",
    smsExampleDocUrl: "",
    whatsappNumber: "905392647655",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingContract, setUploadingContract] = useState(false);
  const [uploadingContractExample, setUploadingContractExample] = useState(false);
  const [uploadingExample, setUploadingExample] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sms-settings");
      const data = await res.json();
      if (data.success && data.data) {
        setSettings({
          smsContractUrl: data.data.smsContractUrl || "",
          smsContractExampleUrl: data.data.smsContractExampleUrl || "",
          smsExampleDocUrl: data.data.smsExampleDocUrl || "",
          whatsappNumber: data.data.whatsappNumber || "905392647655",
        });
      }
    } catch (e) { console.error("SMS ayarları alınamadı:", e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const uploadFile = async (file: File, type: "contract" | "contractExample" | "example") => {
    const setters: Record<string, (v: boolean) => void> = {
      contract: setUploadingContract,
      contractExample: setUploadingContractExample,
      example: setUploadingExample,
    };
    const keys: Record<string, string> = {
      contract: "smsContractUrl",
      contractExample: "smsContractExampleUrl",
      example: "smsExampleDocUrl",
    };
    setters[type](true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success && data.url) {
        const fullUrl = `https://kamulog.net${data.url}`;
        setSettings(prev => ({ ...prev, [keys[type]]: fullUrl }));
      }
    } catch (e) { console.error("Dosya yükleme hatası:", e); }
    finally { setters[type](false); }
  };

  const saveSettings = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch("/api/admin/sms-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } catch (e) { console.error("Kaydetme hatası:", e); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
          <MessageSquare className="w-6 h-6" style={{ color: "var(--primary)" }} /> Toplu SMS Ayarları
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          STK panellerinde gösterilecek SMS başvuru belgelerini yönetin.
        </p>
      </div>

      <div className="card p-4" style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.04))", border: "1px solid rgba(99, 102, 241, 0.15)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          ℹ️ Burada yüklediğiniz dosyalar <strong>tüm STK panellerinde</strong> otomatik olarak görünecektir.
        </p>
      </div>

      {/* Mobilişim Sözleşmesi */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4" style={{ color: "var(--text)" }}>
          <FileText className="w-5 h-5 text-blue-500" /> Mobilişim Sözleşmesi (SMS Servisi Sözleşmesi)
        </h3>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          STK yöneticileri bu dosyayı indirip ıslak imza ile imzalayacak.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "white" }}>
            {uploadingContract ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploadingContract ? "Yükleniyor..." : "Sözleşme Yükle"}
            <input type="file" accept=".pdf,.doc,.docx" className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "contract")} />
          </label>
          {settings.smsContractUrl && (
            <a href={settings.smsContractUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "var(--bg-muted)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              <Eye className="w-4 h-4" /> Yüklenen Sözleşmeyi Gör
            </a>
          )}
        </div>
        {settings.smsContractUrl && <p className="text-xs mt-2 break-all" style={{ color: "var(--text-muted)" }}>📎 {settings.smsContractUrl}</p>}
      </div>

      {/* Sözleşme Örneği */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4" style={{ color: "var(--text)" }}>
          <FileText className="w-5 h-5 text-indigo-500" /> Sözleşme Örneği (Doldurulmuş Örnek)
        </h3>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          STK yöneticilerine rehber olacak doldurulmuş sözleşme örneği. Nasıl dolduracaklarını bu örnekten görecekler.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{ background: "linear-gradient(135deg, #4F46E5, #6366F1)", color: "white" }}>
            {uploadingContractExample ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploadingContractExample ? "Yükleniyor..." : "Sözleşme Örneği Yükle"}
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "contractExample")} />
          </label>
          {settings.smsContractExampleUrl && (
            <a href={settings.smsContractExampleUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "var(--bg-muted)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              <Eye className="w-4 h-4" /> Yüklenen Örneği Gör
            </a>
          )}
        </div>
        {settings.smsContractExampleUrl && <p className="text-xs mt-2 break-all" style={{ color: "var(--text-muted)" }}>📎 {settings.smsContractExampleUrl}</p>}
      </div>

      {/* Karar Defteri Örneği */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4" style={{ color: "var(--text)" }}>
          <FileText className="w-5 h-5 text-purple-500" /> Karar Defteri Örneği
        </h3>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          Yönetim kurulu karar defterinin ilk mühürlü sayfasının örneği.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #A855F7)", color: "white" }}>
            {uploadingExample ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploadingExample ? "Yükleniyor..." : "Karar Defteri Örneği Yükle"}
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "example")} />
          </label>
          {settings.smsExampleDocUrl && (
            <a href={settings.smsExampleDocUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "var(--bg-muted)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              <Eye className="w-4 h-4" /> Yüklenen Örneği Gör
            </a>
          )}
        </div>
        {settings.smsExampleDocUrl && <p className="text-xs mt-2 break-all" style={{ color: "var(--text-muted)" }}>📎 {settings.smsExampleDocUrl}</p>}
      </div>

      {/* WhatsApp Numarası */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4" style={{ color: "var(--text)" }}>
          <Phone className="w-5 h-5 text-green-500" /> WhatsApp İletişim Numarası
        </h3>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          STK yöneticileri evraklarını bu numaraya WhatsApp üzerinden gönderecek. Başında 9 ile yazın (Örn: 905392647655).
        </p>
        <input type="text" value={settings.whatsappNumber}
          onChange={(e) => setSettings(prev => ({ ...prev, whatsappNumber: e.target.value }))}
          placeholder="905XXXXXXXXX" className="w-full max-w-md text-sm px-4 py-2.5 rounded-xl"
          style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }} />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={saveSettings} disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? "Kaydediliyor..." : saved ? "Kaydedildi ✓" : "Ayarları Kaydet"}
        </button>
        {saved && <span className="text-sm text-green-500 font-medium animate-pulse">✅ Tüm STK panellerine yansıdı!</span>}
      </div>
    </div>
  );
}
