"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Tv, Save, Check, Loader2, Upload, X, Eye, Smartphone,
  BellRing, Image as ImageIcon, Link as LinkIcon, Type, AlignLeft,
  ToggleLeft, ToggleRight, Megaphone, Hash, Repeat,
} from "lucide-react";

// ── SystemSetting key'leri ──────────────────────────────────────
const MARQUEE_KEYS = {
  text: "MARQUEE_TEXT",
  enabled: "MARQUEE_ENABLED",
};

const POPUP_KEYS = {
  active: "POPUP_ACTIVE",
  title: "POPUP_TITLE",
  body: "POPUP_BODY",
  imageUrl: "POPUP_IMAGE_URL",
  ctaText: "POPUP_CTA_TEXT",
  ctaUrl: "POPUP_CTA_URL",
  showCount: "POPUP_SHOW_COUNT",
};

const STK_POPUP_KEYS = {
  active: "STK_POPUP_ACTIVE",
  title: "STK_POPUP_TITLE",
  body: "STK_POPUP_BODY",
  imageUrl: "STK_POPUP_IMAGE_URL",
  ctaText: "STK_POPUP_CTA_TEXT",
  ctaUrl: "STK_POPUP_CTA_URL",
  showCount: "STK_POPUP_SHOW_COUNT",
};

const BECAYIS_POPUP_KEYS = {
  active: "BECAYIS_POPUP_ACTIVE",
  title: "BECAYIS_POPUP_TITLE",
  body: "BECAYIS_POPUP_BODY",
  imageUrl: "BECAYIS_POPUP_IMAGE_URL",
  ctaText: "BECAYIS_POPUP_CTA_TEXT",
  ctaUrl: "BECAYIS_POPUP_CTA_URL",
  showCount: "BECAYIS_POPUP_SHOW_COUNT",
};


export default function ContentPage() {
  // ─── Marquee State ─────────────────────────────────────────
  const [marqueeText, setMarqueeText] = useState("");
  const [marqueeEnabled, setMarqueeEnabled] = useState(false);

  // ─── Popup State ───────────────────────────────────────────
  const [popupActive, setPopupActive] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupBody, setPopupBody] = useState("");
  const [popupImageUrl, setPopupImageUrl] = useState("");
  const [popupCtaText, setPopupCtaText] = useState("Şimdi İncele");
  const [popupCtaUrl, setPopupCtaUrl] = useState("");
  const [popupShowCount, setPopupShowCount] = useState(1);

  // ─── STK Popup State ───────────────────────────────────────
  const [stkPopupActive, setStkPopupActive] = useState(false);
  const [stkPopupTitle, setStkPopupTitle] = useState("");
  const [stkPopupBody, setStkPopupBody] = useState("");
  const [stkPopupImageUrl, setStkPopupImageUrl] = useState("");
  const [stkPopupCtaText, setStkPopupCtaText] = useState("İncele");
  const [stkPopupCtaUrl, setStkPopupCtaUrl] = useState("");
  const [stkPopupShowCount, setStkPopupShowCount] = useState(1);
  const stkFileInputRef = useRef<HTMLInputElement>(null);
  const [stkUploading, setStkUploading] = useState(false);

  // ─── Becayis Popup State ───────────────────────────────────────
  const [becayisPopupActive, setBecayisPopupActive] = useState(false);
  const [becayisPopupTitle, setBecayisPopupTitle] = useState("");
  const [becayisPopupBody, setBecayisPopupBody] = useState("");
  const [becayisPopupImageUrl, setBecayisPopupImageUrl] = useState("");
  const [becayisPopupCtaText, setBecayisPopupCtaText] = useState("İncele");
  const [becayisPopupCtaUrl, setBecayisPopupCtaUrl] = useState("");
  const [becayisPopupShowCount, setBecayisPopupShowCount] = useState(1);
  const becayisFileInputRef = useRef<HTMLInputElement>(null);
  const [becayisUploading, setBecayisUploading] = useState(false);

  // ─── UI State ──────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Load Settings ─────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      const map: Record<string, string> = {};
      if (data.settingsMap) {
        Object.assign(map, data.settingsMap);
      } else if (Array.isArray(data.settings)) {
        for (const item of data.settings as { key: string; value: string }[]) {
          map[item.key] = item.value;
        }
      }

      // Marquee
      setMarqueeText(map[MARQUEE_KEYS.text] || "");
      setMarqueeEnabled(map[MARQUEE_KEYS.enabled] === "true");

      // Popup
      setPopupActive(map[POPUP_KEYS.active] === "true");
      setPopupTitle(map[POPUP_KEYS.title] || "");
      setPopupBody(map[POPUP_KEYS.body] || "");
      setPopupImageUrl(map[POPUP_KEYS.imageUrl] || "");
      setPopupCtaText(map[POPUP_KEYS.ctaText] || "Şimdi İncele");
      setPopupCtaUrl(map[POPUP_KEYS.ctaUrl] || "");
      setPopupShowCount(parseInt(map[POPUP_KEYS.showCount] || "1", 10) || 1);

      // STK Popup
      setStkPopupActive(map[STK_POPUP_KEYS.active] === "true");
      setStkPopupTitle(map[STK_POPUP_KEYS.title] || "");
      setStkPopupBody(map[STK_POPUP_KEYS.body] || "");
      setStkPopupImageUrl(map[STK_POPUP_KEYS.imageUrl] || "");
      setStkPopupCtaText(map[STK_POPUP_KEYS.ctaText] || "İncele");
      setStkPopupCtaUrl(map[STK_POPUP_KEYS.ctaUrl] || "");
      setStkPopupShowCount(parseInt(map[STK_POPUP_KEYS.showCount] || "1", 10) || 1);

      // Becayis Popup
      setBecayisPopupActive(map[BECAYIS_POPUP_KEYS.active] === "true");
      setBecayisPopupTitle(map[BECAYIS_POPUP_KEYS.title] || "");
      setBecayisPopupBody(map[BECAYIS_POPUP_KEYS.body] || "");
      setBecayisPopupImageUrl(map[BECAYIS_POPUP_KEYS.imageUrl] || "");
      setBecayisPopupCtaText(map[BECAYIS_POPUP_KEYS.ctaText] || "İncele");
      setBecayisPopupCtaUrl(map[BECAYIS_POPUP_KEYS.ctaUrl] || "");
      setBecayisPopupShowCount(parseInt(map[BECAYIS_POPUP_KEYS.showCount] || "1", 10) || 1);
    } catch (e) {
      console.error("Ayarlar yüklenemedi:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // ─── Save All ──────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = [
        { key: MARQUEE_KEYS.text, value: marqueeText },
        { key: MARQUEE_KEYS.enabled, value: String(marqueeEnabled) },
        { key: POPUP_KEYS.active, value: String(popupActive) },
        { key: POPUP_KEYS.title, value: popupTitle },
        { key: POPUP_KEYS.body, value: popupBody },
        { key: POPUP_KEYS.imageUrl, value: popupImageUrl },
        { key: POPUP_KEYS.ctaText, value: popupCtaText },
        { key: POPUP_KEYS.ctaUrl, value: popupCtaUrl },
        { key: POPUP_KEYS.showCount, value: String(popupShowCount) },
        { key: STK_POPUP_KEYS.active, value: String(stkPopupActive) },
        { key: STK_POPUP_KEYS.title, value: stkPopupTitle },
        { key: STK_POPUP_KEYS.body, value: stkPopupBody },
        { key: STK_POPUP_KEYS.imageUrl, value: stkPopupImageUrl },
        { key: STK_POPUP_KEYS.ctaText, value: stkPopupCtaText },
        { key: STK_POPUP_KEYS.ctaUrl, value: stkPopupCtaUrl },
        { key: STK_POPUP_KEYS.showCount, value: String(stkPopupShowCount) },
        { key: BECAYIS_POPUP_KEYS.active, value: String(becayisPopupActive) },
        { key: BECAYIS_POPUP_KEYS.title, value: becayisPopupTitle },
        { key: BECAYIS_POPUP_KEYS.body, value: becayisPopupBody },
        { key: BECAYIS_POPUP_KEYS.imageUrl, value: becayisPopupImageUrl },
        { key: BECAYIS_POPUP_KEYS.ctaText, value: becayisPopupCtaText },
        { key: BECAYIS_POPUP_KEYS.ctaUrl, value: becayisPopupCtaUrl },
        { key: BECAYIS_POPUP_KEYS.showCount, value: String(becayisPopupShowCount) },
      ];
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch (e) {
      console.error("Kaydetme hatası:", e);
    } finally {
      setSaving(false);
    }
  };

  // ─── Image Upload ──────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setPopupImageUrl(data.url);
    } catch (e) {
      console.error("Upload hatası:", e);
    } finally {
      setUploading(false);
    }
  };

  const handleStkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStkUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setStkPopupImageUrl(data.url);
    } catch (e) {
      console.error("Upload hatası:", e);
    } finally {
      setStkUploading(false);
    }
  };

  const handleBecayisUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBecayisUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setBecayisPopupImageUrl(data.url);
    } catch (e) {
      console.error("Upload hatası:", e);
    } finally {
      setBecayisUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Megaphone className="w-6 h-6" style={{ color: "var(--primary)" }} /> İçerik Yönetimi
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Kayan alt yazı ve uygulama pop-up ayarlarını yönetin
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90 transition-all glow-primary disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor...</>
          ) : saved ? (
            <><Check className="w-4 h-4" /> Kaydedildi!</>
          ) : (
            <><Save className="w-4 h-4" /> Tümünü Kaydet</>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════
          📺 Kayan Alt Yazı (Marquee)
          ═══════════════════════════════════════════════════════ */}
      <div className="glass-card p-6" style={{ border: "1px solid rgba(239, 68, 68, 0.25)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Tv className="w-5 h-5 text-red-400" /> Kayan Alt Yazı (Marquee)
          </h3>
          <button
            onClick={() => setMarqueeEnabled(!marqueeEnabled)}
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: marqueeEnabled ? "#22c55e" : "var(--text-muted)" }}
          >
            {marqueeEnabled ? (
              <><ToggleRight className="w-6 h-6" /> Aktif</>
            ) : (
              <><ToggleLeft className="w-6 h-6" /> Pasif</>
            )}
          </button>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          Uygulamanın ana sayfasında kırmızı şeritte kayan metin olarak görünür. Aktif ettiğinizde tüm kullanıcılar anında görecek.
        </p>
        <textarea
          value={marqueeText}
          onChange={(e) => setMarqueeText(e.target.value)}
          placeholder="📢 Kayan metin yazınız... (Örn: Haziran ayı aidat ödemeleriniz başlamıştır)"
          rows={2}
          className="w-full text-sm px-4 py-3 rounded-xl resize-none"
          style={{
            background: "var(--bg-muted)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          }}
        />
        {/* Marquee Live Preview */}
        {marqueeEnabled && marqueeText.trim() && (
          <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="h-7 flex items-center" style={{ background: "linear-gradient(90deg, #B91C1C, #DC2626)" }}>
              <div className="px-2 h-full flex items-center" style={{ background: "rgba(255,255,255,0.15)" }}>
                <span className="text-[9px] font-black text-white tracking-wider">📢 DUYURU</span>
              </div>
              <div className="flex-1 overflow-hidden px-3">
                <p className="text-[11px] font-semibold text-white whitespace-nowrap animate-marquee-scroll">
                  {marqueeText}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          🔔 Pop-up Yönetimi
          ═══════════════════════════════════════════════════════ */}
      <div className="glass-card p-6" style={{ border: `1px solid ${popupActive ? "rgba(34,197,94,0.3)" : "rgba(var(--primary-rgb, 56,189,248), 0.15)"}` }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <BellRing className="w-5 h-5 text-amber-400" /> Pop-up Yönetimi
          </h3>
          <button
            onClick={() => setPopupActive(!popupActive)}
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: popupActive ? "#22c55e" : "var(--text-muted)" }}
          >
            {popupActive ? (
              <><ToggleRight className="w-6 h-6" /> Yayında 🟢</>
            ) : (
              <><ToggleLeft className="w-6 h-6" /> Pasif</>
            )}
          </button>
        </div>
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          Aktif edildiğinde, uygulama her açılışında kullanıcıların ekranında tam ekran bir pop-up duyuru gösterilir.
          Trendyol, Hepsiburada gibi devlerin kullandığı &quot;In-App Messaging&quot; sistemi.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Sol: Form Alanları ── */}
          <div className="lg:col-span-3 space-y-4">
            {/* Başlık */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <Type className="w-3.5 h-3.5" /> Başlık *
              </label>
              <input
                value={popupTitle}
                onChange={(e) => setPopupTitle(e.target.value)}
                placeholder="Örn: Haziran Ayı Aidat Hatırlatma"
                className="w-full text-sm px-4 py-2.5 rounded-xl"
                style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
            </div>

            {/* Alt Metin */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <AlignLeft className="w-3.5 h-3.5" /> Alt Metin
              </label>
              <textarea
                value={popupBody}
                onChange={(e) => setPopupBody(e.target.value)}
                placeholder="Örn: Aidat ödeme son tarihi 15 Haziran'dır. Gecikme halinde faiz uygulanacaktır."
                rows={3}
                className="w-full text-sm px-4 py-2.5 rounded-xl resize-none"
                style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
            </div>

            {/* Görsel */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <ImageIcon className="w-3.5 h-3.5" /> Pop-up Görseli
              </label>
              <div className="flex items-center gap-3">
                {popupImageUrl && (
                  <div className="relative group">
                    <img src={popupImageUrl} alt="popup" className="w-24 h-16 rounded-xl object-cover" style={{ border: "1px solid var(--border)" }} />
                    <button
                      onClick={() => setPopupImageUrl("")}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleUpload} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
                  style={{ background: "var(--bg-muted)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Yükleniyor..." : "Görsel Yükle"}
                </button>
              </div>
            </div>

            {/* CTA Buton */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  <Smartphone className="w-3.5 h-3.5" /> Buton Metni
                </label>
                <input
                  value={popupCtaText}
                  onChange={(e) => setPopupCtaText(e.target.value)}
                  placeholder="Şimdi İncele"
                  className="w-full text-sm px-4 py-2.5 rounded-xl"
                  style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  <LinkIcon className="w-3.5 h-3.5" /> Buton Linki
                </label>
                <input
                  value={popupCtaUrl}
                  onChange={(e) => setPopupCtaUrl(e.target.value)}
                  placeholder="https://kamulog.net/odeme"
                  className="w-full text-sm px-4 py-2.5 rounded-xl"
                  style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
              </div>
            </div>

            {/* Gösterim Limiti */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <Repeat className="w-3.5 h-3.5" /> Kullanıcı Başına Gösterim Limiti
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={popupShowCount}
                  onChange={(e) => setPopupShowCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 text-sm px-4 py-2.5 rounded-xl text-center font-bold"
                  style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Her kullanıcı bu pop-up&apos;ı en fazla <strong>{popupShowCount}</strong> kez görecek.
                  Başlık değiştiğinde sayaç sıfırlanır.
                </span>
              </div>
            </div>

            {/* Status Badge */}
            {popupActive && (
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-500">
                  Pop-up şu an yayında — Uygulamayı açan tüm kullanıcılar bu pop-up&apos;ı görecek
                </span>
              </div>
            )}
          </div>

          {/* ── Sağ: Canlı Telefon Önizleme ── */}
          <div className="lg:col-span-2 flex justify-center">
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-3 justify-center">
                <Eye className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                <span className="text-[11px] font-semibold tracking-wide" style={{ color: "var(--text-muted)" }}>
                  CANLI ÖNİZLEME
                </span>
              </div>
              {/* Phone Frame */}
              <div
                className="w-[260px] h-[480px] rounded-[28px] p-2 shadow-2xl"
                style={{
                  background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                  border: "3px solid #2a2a4a",
                }}
              >
                {/* Phone Notch */}
                <div className="flex justify-center mb-1">
                  <div className="w-20 h-4 rounded-b-xl" style={{ background: "#0a0a1a" }} />
                </div>

                {/* Screen Content */}
                <div className="h-full rounded-[20px] overflow-hidden relative" style={{ background: "#f1f5f9" }}>
                  {/* Fake App Bar */}
                  <div className="h-10 flex items-center px-3" style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)" }}>
                    <div className="w-4 h-4 rounded bg-white/20" />
                    <span className="text-[10px] text-white font-bold ml-2">Kamulog</span>
                  </div>

                  {/* Fake Content */}
                  <div className="p-2 space-y-1.5">
                    <div className="h-6 rounded-lg w-full" style={{ background: "#e2e8f0" }} />
                    <div className="h-14 rounded-lg w-full" style={{ background: "#e2e8f0" }} />
                    <div className="h-8 rounded-lg w-3/4" style={{ background: "#e2e8f0" }} />
                  </div>

                  {/* Popup Overlay */}
                  {(popupTitle || popupImageUrl) && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
                      <div
                        className="w-[85%] rounded-2xl overflow-hidden shadow-2xl"
                        style={{ background: "white", maxHeight: "75%" }}
                      >
                        {/* Close Button */}
                        <div className="flex justify-end p-1.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#f1f5f9" }}>
                            <X className="w-3 h-3 text-gray-400" />
                          </div>
                        </div>

                        {/* Image */}
                        {popupImageUrl ? (
                          <img src={popupImageUrl} alt="" className="w-full h-24 object-cover" />
                        ) : (
                          <div className="w-full h-20 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                            <ImageIcon className="w-6 h-6 text-white/60" />
                          </div>
                        )}

                        {/* Content */}
                        <div className="p-3">
                          <p className="text-[11px] font-bold text-gray-800 leading-tight">
                            {popupTitle || "Başlık giriniz..."}
                          </p>
                          {popupBody && (
                            <p className="text-[8px] text-gray-500 mt-1 leading-tight line-clamp-2">
                              {popupBody}
                            </p>
                          )}
                          {/* CTA Button */}
                          <div
                            className="mt-2.5 w-full py-2 rounded-xl text-center"
                            style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)" }}
                          >
                            <span className="text-[10px] font-bold text-white">
                              {popupCtaText || "Şimdi İncele"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          🛡️ STK (Dernekler & Sendikalar) Özel Pop-up
          ═══════════════════════════════════════════════════════ */}
      <div className="glass-card p-6" style={{ border: `1px solid ${stkPopupActive ? "rgba(34,197,94,0.3)" : "rgba(var(--primary-rgb, 56,189,248), 0.15)"}` }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <BellRing className="w-5 h-5 text-purple-400" /> STK Özel Pop-up Yönetimi
          </h3>
          <button
            onClick={() => setStkPopupActive(!stkPopupActive)}
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: stkPopupActive ? "#22c55e" : "var(--text-muted)" }}
          >
            {stkPopupActive ? (
              <><ToggleRight className="w-6 h-6" /> Yayında 🟢</>
            ) : (
              <><ToggleLeft className="w-6 h-6" /> Pasif</>
            )}
          </button>
        </div>
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          Aktif edildiğinde, kullanıcı sadece <strong>Dernekler & Sendikalar</strong> sekmesine (sayfasına) girdiğinde tetiklenir.
          Bu sistem ana pop-up ile çakışmaz, tamamen bağımsız çalışır.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <Type className="w-3.5 h-3.5" /> Başlık *
              </label>
              <input
                value={stkPopupTitle}
                onChange={(e) => setStkPopupTitle(e.target.value)}
                placeholder="Örn: STK'lara Özel Fırsat"
                className="w-full text-sm px-4 py-2.5 rounded-xl"
                style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <AlignLeft className="w-3.5 h-3.5" /> Alt Metin
              </label>
              <textarea
                value={stkPopupBody}
                onChange={(e) => setStkPopupBody(e.target.value)}
                placeholder="Örn: STK üyeliğinizi hemen başlatın."
                rows={3}
                className="w-full text-sm px-4 py-2.5 rounded-xl resize-none"
                style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <ImageIcon className="w-3.5 h-3.5" /> Pop-up Görseli
              </label>
              <div className="flex items-center gap-3">
                {stkPopupImageUrl && (
                  <div className="relative group">
                    <img src={stkPopupImageUrl} alt="stk-popup" className="w-24 h-16 rounded-xl object-cover" style={{ border: "1px solid var(--border)" }} />
                    <button
                      onClick={() => setStkPopupImageUrl("")}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <input type="file" ref={stkFileInputRef} accept="image/*" onChange={handleStkUpload} className="hidden" />
                <button
                  onClick={() => stkFileInputRef.current?.click()}
                  disabled={stkUploading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
                  style={{ background: "var(--bg-muted)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                >
                  {stkUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {stkUploading ? "Yükleniyor..." : "Görsel Yükle"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  <Smartphone className="w-3.5 h-3.5" /> Buton Metni
                </label>
                <input
                  value={stkPopupCtaText}
                  onChange={(e) => setStkPopupCtaText(e.target.value)}
                  placeholder="İncele"
                  className="w-full text-sm px-4 py-2.5 rounded-xl"
                  style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  <LinkIcon className="w-3.5 h-3.5" /> Buton Linki
                </label>
                <input
                  value={stkPopupCtaUrl}
                  onChange={(e) => setStkPopupCtaUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-sm px-4 py-2.5 rounded-xl"
                  style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <Repeat className="w-3.5 h-3.5" /> Kullanıcı Başına Gösterim Limiti
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={stkPopupShowCount}
                  onChange={(e) => setStkPopupShowCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 text-sm px-4 py-2.5 rounded-xl text-center font-bold"
                  style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Sayfaya her girdiğinde gösterilir. Toplam <strong>{stkPopupShowCount}</strong> limit.
                </span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 flex justify-center">
             <div className="relative">
              <div className="flex items-center gap-1.5 mb-3 justify-center">
                <Eye className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                <span className="text-[11px] font-semibold tracking-wide" style={{ color: "var(--text-muted)" }}>
                  CANLI ÖNİZLEME (STK EKRANI)
                </span>
              </div>
              <div className="w-[260px] h-[480px] rounded-[28px] p-2 shadow-2xl" style={{ background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", border: "3px solid #2a2a4a" }}>
                <div className="flex justify-center mb-1"><div className="w-20 h-4 rounded-b-xl" style={{ background: "#0a0a1a" }} /></div>
                <div className="h-full rounded-[20px] overflow-hidden relative" style={{ background: "#f1f5f9" }}>
                  <div className="h-10 flex items-center px-3" style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)" }}>
                    <div className="w-4 h-4 rounded bg-white/20" />
                    <span className="text-[10px] text-white font-bold ml-2">STK Listesi</span>
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="h-10 rounded-lg w-full" style={{ background: "#e2e8f0" }} />
                    <div className="h-16 rounded-lg w-full" style={{ background: "#e2e8f0" }} />
                  </div>
                  {(stkPopupTitle || stkPopupImageUrl) && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
                      <div className="w-[85%] rounded-2xl overflow-hidden shadow-2xl" style={{ background: "white", maxHeight: "75%" }}>
                        <div className="flex justify-end p-1.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#f1f5f9" }}>
                            <X className="w-3 h-3 text-gray-400" />
                          </div>
                        </div>
                        {stkPopupImageUrl ? (
                          <img src={stkPopupImageUrl} alt="" className="w-full h-24 object-cover" />
                        ) : (
                          <div className="w-full h-20 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                            <ImageIcon className="w-6 h-6 text-white/60" />
                          </div>
                        )}
                        <div className="p-3">
                          <p className="text-[11px] font-bold text-gray-800 leading-tight">{stkPopupTitle || "Başlık giriniz..."}</p>
                          {stkPopupBody && <p className="text-[8px] text-gray-500 mt-1 leading-tight line-clamp-2">{stkPopupBody}</p>}
                          <div className="mt-2.5 w-full py-2 rounded-xl text-center" style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)" }}>
                            <span className="text-[10px] font-bold text-white">{stkPopupCtaText || "İncele"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          🛡️ Becayiş (Becayiş) Özel Pop-up
          ═══════════════════════════════════════════════════════ */}
      <div className="glass-card p-6" style={{ border: `1px solid ${becayisPopupActive ? "rgba(34,197,94,0.3)" : "rgba(var(--primary-rgb, 56,189,248), 0.15)"}` }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <BellRing className="w-5 h-5 text-purple-400" /> Becayiş Özel Pop-up Yönetimi
          </h3>
          <button
            onClick={() => setBecayisPopupActive(!becayisPopupActive)}
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: becayisPopupActive ? "#22c55e" : "var(--text-muted)" }}
          >
            {becayisPopupActive ? (
              <><ToggleRight className="w-6 h-6" /> Yayında 🟢</>
            ) : (
              <><ToggleLeft className="w-6 h-6" /> Pasif</>
            )}
          </button>
        </div>
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          Aktif edildiğinde, kullanıcı sadece <strong>Becayiş</strong> sekmesine (sayfasına) girdiğinde tetiklenir.
          Bu sistem ana pop-up ile çakışmaz, tamamen bağımsız çalışır.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <Type className="w-3.5 h-3.5" /> Başlık *
              </label>
              <input
                value={becayisPopupTitle}
                onChange={(e) => setBecayisPopupTitle(e.target.value)}
                placeholder="Örn: Becayiş'lara Özel Fırsat"
                className="w-full text-sm px-4 py-2.5 rounded-xl"
                style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <AlignLeft className="w-3.5 h-3.5" /> Alt Metin
              </label>
              <textarea
                value={becayisPopupBody}
                onChange={(e) => setBecayisPopupBody(e.target.value)}
                placeholder="Örn: Becayiş üyeliğinizi hemen başlatın."
                rows={3}
                className="w-full text-sm px-4 py-2.5 rounded-xl resize-none"
                style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <ImageIcon className="w-3.5 h-3.5" /> Pop-up Görseli
              </label>
              <div className="flex items-center gap-3">
                {becayisPopupImageUrl && (
                  <div className="relative group">
                    <img src={becayisPopupImageUrl} alt="becayis-popup" className="w-24 h-16 rounded-xl object-cover" style={{ border: "1px solid var(--border)" }} />
                    <button
                      onClick={() => setBecayisPopupImageUrl("")}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <input type="file" ref={becayisFileInputRef} accept="image/*" onChange={handleBecayisUpload} className="hidden" />
                <button
                  onClick={() => becayisFileInputRef.current?.click()}
                  disabled={becayisUploading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
                  style={{ background: "var(--bg-muted)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                >
                  {becayisUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {becayisUploading ? "Yükleniyor..." : "Görsel Yükle"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  <Smartphone className="w-3.5 h-3.5" /> Buton Metni
                </label>
                <input
                  value={becayisPopupCtaText}
                  onChange={(e) => setBecayisPopupCtaText(e.target.value)}
                  placeholder="İncele"
                  className="w-full text-sm px-4 py-2.5 rounded-xl"
                  style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  <LinkIcon className="w-3.5 h-3.5" /> Buton Linki
                </label>
                <input
                  value={becayisPopupCtaUrl}
                  onChange={(e) => setBecayisPopupCtaUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-sm px-4 py-2.5 rounded-xl"
                  style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <Repeat className="w-3.5 h-3.5" /> Kullanıcı Başına Gösterim Limiti
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={becayisPopupShowCount}
                  onChange={(e) => setBecayisPopupShowCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 text-sm px-4 py-2.5 rounded-xl text-center font-bold"
                  style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
                />
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Sayfaya her girdiğinde gösterilir. Toplam <strong>{becayisPopupShowCount}</strong> limit.
                </span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 flex justify-center">
             <div className="relative">
              <div className="flex items-center gap-1.5 mb-3 justify-center">
                <Eye className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                <span className="text-[11px] font-semibold tracking-wide" style={{ color: "var(--text-muted)" }}>
                  CANLI ÖNİZLEME (Becayiş EKRANI)
                </span>
              </div>
              <div className="w-[260px] h-[480px] rounded-[28px] p-2 shadow-2xl" style={{ background: "linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", border: "3px solid #2a2a4a" }}>
                <div className="flex justify-center mb-1"><div className="w-20 h-4 rounded-b-xl" style={{ background: "#0a0a1a" }} /></div>
                <div className="h-full rounded-[20px] overflow-hidden relative" style={{ background: "#f1f5f9" }}>
                  <div className="h-10 flex items-center px-3" style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)" }}>
                    <div className="w-4 h-4 rounded bg-white/20" />
                    <span className="text-[10px] text-white font-bold ml-2">Becayiş Listesi</span>
                  </div>
                  <div className="p-2 space-y-1.5">
                    <div className="h-10 rounded-lg w-full" style={{ background: "#e2e8f0" }} />
                    <div className="h-16 rounded-lg w-full" style={{ background: "#e2e8f0" }} />
                  </div>
                  {(becayisPopupTitle || becayisPopupImageUrl) && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
                      <div className="w-[85%] rounded-2xl overflow-hidden shadow-2xl" style={{ background: "white", maxHeight: "75%" }}>
                        <div className="flex justify-end p-1.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#f1f5f9" }}>
                            <X className="w-3 h-3 text-gray-400" />
                          </div>
                        </div>
                        {becayisPopupImageUrl ? (
                          <img src={becayisPopupImageUrl} alt="" className="w-full h-24 object-cover" />
                        ) : (
                          <div className="w-full h-20 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                            <ImageIcon className="w-6 h-6 text-white/60" />
                          </div>
                        )}
                        <div className="p-3">
                          <p className="text-[11px] font-bold text-gray-800 leading-tight">{becayisPopupTitle || "Başlık giriniz..."}</p>
                          {becayisPopupBody && <p className="text-[8px] text-gray-500 mt-1 leading-tight line-clamp-2">{becayisPopupBody}</p>}
                          <div className="mt-2.5 w-full py-2 rounded-xl text-center" style={{ background: "linear-gradient(135deg, #0f172a, #1e3a8a)" }}>
                            <span className="text-[10px] font-bold text-white">{becayisPopupCtaText || "İncele"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

