"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { Calendar, Plus, Trash2, Loader2, Bell, Image, Building2, FileText, Send, Search, Upload, X, Mail, MessageCircle, Handshake } from "lucide-react";

interface STK { id: string; name: string; slug: string; logo: string | null; type: string }
interface Activity {
  id: string; title: string; content: string; imageUrl: string | null;
  createdAt: string; stk: { name: string; slug: string; logo: string | null };
}

export default function StkActivitiesPage() {
  const { data: session } = useSession();
  const _managedStkId = (session?.user as any)?.managedStkId || "";
  const _isSTKManager = (session?.user as any)?.role === "STK_MANAGER";
  const [stkList, setStkList] = useState<STK[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form
  const [selectedStk, setSelectedStk] = useState<STK | null>(null);
  const [stkSearch, setStkSearch] = useState("");
  const [showStkDropdown, setShowStkDropdown] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  // Haberleşme şalterleri
  const [sendPush, setSendPush] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/stk/organizations")
      .then(r => r.json())
      .then(d => { const list = d.data || (Array.isArray(d) ? d : []); setStkList(list); if (_managedStkId) { const mine = list.find((o: any) => o.id === _managedStkId); if (mine) setSelectedStk(mine); } })
      .catch(console.error);

    fetch("/api/admin/stk-activities" + (_managedStkId ? "?stkId=" + _managedStkId : ""))
      .then(r => r.json())
      .then(d => { if (d.activities) setActivities(d.activities); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowStkDropdown(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredStks = stkList.filter(s =>
    s.name.toLowerCase().includes(stkSearch.toLowerCase())
  );

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", imageFile);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      setUploading(false);
      if (data.success && data.url) return `https://kamulog.net${data.url}`;
      return null;
    } catch {
      setUploading(false);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!selectedStk || !title.trim() || !content.trim()) {
      setStatus({ type: "error", message: "STK, başlık ve içerik zorunludur!" });
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        const url = await uploadImage();
        if (url) imageUrl = url;
      }

      const res = await fetch("/api/admin/stk-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stkId: selectedStk.id,
          title,
          content,
          imageUrl,
          sendPush,
          sendEmail,
          sendWhatsapp,
        }),
      });
      const data = await res.json();

      if (data.success) {
        const parts: string[] = [];
        if (data.pushCount > 0) parts.push(`${data.pushCount} Push`);
        if (data.emailCount > 0) parts.push(`${data.emailCount} E-posta`);
        if (data.whatsappCount > 0) parts.push(`${data.whatsappCount} WhatsApp`);
        const msg = parts.length > 0
          ? `✅ Faaliyet eklendi! Gönderim: ${parts.join(" · ")}`
          : "✅ Faaliyet başarıyla eklendi!";
        setStatus({ type: "success", message: msg });
        setTitle(""); setContent(""); setImageFile(null); setImagePreview("");
        setSendPush(false); setSendEmail(false); setSendWhatsapp(false);

        const r2 = await fetch("/api/admin/stk-activities" + (_managedStkId ? "?stkId=" + _managedStkId : ""));
        const d2 = await r2.json();
        if (d2.activities) setActivities(d2.activities);
      } else {
        setStatus({ type: "error", message: data.error || "Bir hata oluştu" });
      }
    } catch {
      setStatus({ type: "error", message: "Sunucuya ulaşılamadı" });
    }
    setSaving(false);
    setTimeout(() => setStatus(null), 6000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu faaliyeti silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/admin/stk-activities?id=${id}`, { method: "DELETE" });
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const typeLabel = (t: string) => {
    const map: Record<string, string> = { SENDIKA: "Sendika", DERNEK: "Dernek", VAKIF: "Vakıf", KONFEDERASYON: "Konfederasyon", MESLEK_ODASI: "Meslek Odası", DIGER: "Diğer" };
    return map[t] || t;
  };

  const anyChannel = sendPush || sendEmail || sendWhatsapp;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: "var(--text)" }}>
          <Calendar className="w-7 h-7" style={{ color: "var(--primary)" }} />
          STK Faaliyet Yönetimi
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Kuruluş faaliyetlerini ekleyin ve aktif üyelere Push · E-posta · WhatsApp ile bildirin
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── FORM ─── */}
        <div className="lg:col-span-1 card p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <Plus className="w-4 h-4" style={{ color: "var(--primary)" }} /> Yeni Faaliyet Ekle
          </h3>

          {/* 🔍 Searchable STK Select + Logolar */}
          <div ref={dropdownRef} className="relative">
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Kuruluş *</label>
            <div className="relative mt-1">
              {selectedStk ? (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--bg-active)" }}>
                  {selectedStk.logo ? (
                    <img src={selectedStk.logo} alt="" className="w-7 h-7 object-cover rounded-full" />
                  ) : (
                    <Handshake className="w-4 h-4" style={{ color: "var(--primary)" }} />
                  )}
                </div>
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
              )}
              <input
                value={selectedStk ? selectedStk.name : stkSearch}
                onChange={e => { setStkSearch(e.target.value); setSelectedStk(null); setShowStkDropdown(true); }}
                onFocus={() => setShowStkDropdown(true)}
                className="w-full py-2.5 pr-8 text-sm rounded-xl"
                style={{ paddingLeft: selectedStk ? "42px" : "40px", background: "var(--bg-muted)", border: `1px solid ${selectedStk ? "var(--primary)" : "var(--border)"}` }}
                placeholder="STK adı yazarak ara..." readOnly={!!_managedStkId}
              />
              {selectedStk && (
                <button onClick={() => { if (!_managedStkId) { setSelectedStk(null); setStkSearch(""); } }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-red-500/10">
                  <X className="w-3.5 h-3.5 text-red-400" />
                </button>
              )}
            </div>
            {showStkDropdown && !selectedStk && (
              <div className="absolute z-50 w-full mt-1 max-h-52 overflow-y-auto rounded-xl border shadow-lg" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                {filteredStks.length === 0 ? (
                  <p className="p-3 text-xs text-center" style={{ color: "var(--text-muted)" }}>STK bulunamadı</p>
                ) : filteredStks.map(s => (
                  <button key={s.id} onClick={() => { setSelectedStk(s); setStkSearch(""); setShowStkDropdown(false); }}
                    className="w-full flex items-center gap-3 p-3 text-left transition-colors hover:brightness-95"
                    style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{ background: s.logo ? "transparent" : "var(--bg-active)" }}>
                      {s.logo ? (
                        <img src={s.logo} alt="" className="w-8 h-8 object-cover rounded-full" />
                      ) : (
                        <Handshake className="w-4 h-4" style={{ color: "var(--primary)" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{s.name}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{typeLabel(s.type)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Başlık */}
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Faaliyet Başlığı *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full mt-1 text-sm" placeholder="Örn: 2026 Yılı Genel Kurul Toplantısı" />
          </div>

          {/* İçerik */}
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>İçerik *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full mt-1 text-sm min-h-[120px]" placeholder="Faaliyet detaylarını yazın..." />
          </div>

          {/* 📸 Görsel */}
          <div>
            <label className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
              <Image className="w-3 h-3" /> Faaliyet Görseli (opsiyonel)
            </label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            {imagePreview ? (
              <div className="relative mt-2 rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                <img src={imagePreview} alt="Önizleme" className="w-full h-32 object-cover" />
                <button onClick={() => { setImageFile(null); setImagePreview(""); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="w-full mt-1 py-5 rounded-xl border-2 border-dashed flex flex-col items-center gap-1.5 transition-colors hover:brightness-95"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                <Upload className="w-5 h-5" />
                <span className="text-xs font-medium">Görsel Seç</span>
              </button>
            )}
          </div>

          {/* ─── HABERLEŞME ŞALTERLERİ ─── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>📡 Haberleşme Kanalları</p>

            {/* Push */}
            <ToggleSwitch icon={<Bell className="w-4 h-4" />} label="Push Bildirim" desc="Mobil cihazlarına anlık bildirim" active={sendPush} onToggle={() => setSendPush(!sendPush)} color="var(--primary)" />
            {/* Email */}
            <ToggleSwitch icon={<Mail className="w-4 h-4" />} label="E-posta Bildirimi" desc="Kayıtlı e-posta adreslerine" active={sendEmail} onToggle={() => setSendEmail(!sendEmail)} color="#059669" />
            {/* WhatsApp */}
            <ToggleSwitch icon={<MessageCircle className="w-4 h-4" />} label="WhatsApp Mesajı" desc="Kayıtlı telefon numaralarına" active={sendWhatsapp} onToggle={() => setSendWhatsapp(!sendWhatsapp)} color="#25D366" />
          </div>

          {/* Kaydet */}
          <button onClick={handleSubmit} disabled={saving || uploading}
            className="w-full py-3 rounded-xl gradient-primary text-white text-sm font-semibold glow-primary flex items-center justify-center gap-2 disabled:opacity-50">
            {saving || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {uploading ? "Görsel Yükleniyor..." : saving ? "Gönderiliyor..." : anyChannel ? "Kaydet ve Bildir 🔔" : "Faaliyeti Kaydet"}
          </button>

          {status && (
            <div className={`p-3 rounded-xl text-center text-sm font-medium animate-fade-in ${
              status.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>{status.message}</div>
          )}
        </div>

        {/* ─── FALİYET LİSTESİ ─── */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
            <FileText className="w-4 h-4" style={{ color: "var(--primary)" }} /> Mevcut Faaliyetler
            <span className="badge badge-blue ml-1">{activities.length}</span>
          </h3>

          {loading ? (
            <div className="card p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: "var(--primary)" }} /></div>
          ) : activities.length === 0 ? (
            <div className="card p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Henüz faaliyet eklenmedi</p>
            </div>
          ) : (
            activities.map(a => (
              <div key={a.id} className="card p-4 flex gap-4">
                {a.imageUrl ? (
                  <img src={a.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg-active)" }}>
                    {a.stk.logo ? <img src={a.stk.logo} alt="" className="w-10 h-10 rounded-full object-cover" /> : <Building2 className="w-6 h-6" style={{ color: "var(--primary)" }} />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{a.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs font-medium" style={{ color: "var(--primary)" }}>{a.stk.name}</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>·</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {new Date(a.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                          {" "}
                          {new Date(a.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs mt-2 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{a.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Toggle Switch Bileşeni ───
function ToggleSwitch({ icon, label, desc, active, onToggle, color }: { icon: React.ReactNode; label: string; desc: string; active: boolean; onToggle: () => void; color: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl transition-all" style={{ background: active ? `${color}10` : "var(--bg-muted)", border: `1px solid ${active ? color : "var(--border)"}` }}>
      <div className="flex items-center gap-2.5">
        <div style={{ color: active ? color : "var(--text-muted)" }}>{icon}</div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{label}</p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{desc}</p>
        </div>
      </div>
      <button onClick={onToggle} className="relative w-11 h-6 rounded-full transition-colors duration-200"
        style={{ background: active ? color : "var(--border)" }}>
        <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ transform: active ? "translateX(20px)" : "translateX(0)" }} />
      </button>
    </div>
  );
}
