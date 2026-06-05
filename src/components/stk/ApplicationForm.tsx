"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, Building2, User, Phone, Mail, FileText } from "lucide-react";

const STK_TYPES = [
  { value: "DERNEK", label: "Dernek" },
  { value: "SENDIKA", label: "Sendika" },
  { value: "VAKIF", label: "Vakıf" },
  { value: "KONFEDERASYON", label: "Konfederasyon" },
  { value: "MESLEK_ODASI", label: "Meslek Odası" },
  { value: "DIGER", label: "Diğer" },
];

export default function ApplicationFormClient() {
  const [form, setForm] = useState({
    stkName: "",
    stkType: "DERNEK",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/stk-panel/platform-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Başvuru gönderilemedi");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch {
      setError("Sunucu bağlantı hatası");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-10 rounded-3xl text-center space-y-4" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
          <CheckCircle2 className="w-8 h-8" style={{ color: '#10b981' }} />
        </div>
        <h3 className="text-xl font-bold text-white">Başvurunuz Alındı! 🎉</h3>
        <p className="text-slate-400">
          Ekibimiz en kısa sürede <span className="font-semibold text-emerald-400">{form.contactEmail}</span> adresinden sizinle iletişime geçecektir.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 md:p-10 rounded-3xl space-y-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(229, 62, 62, 0.1)', border: '1px solid rgba(229, 62, 62, 0.2)', color: '#E53E3E' }}>
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {/* STK Adı */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Kuruluş Adı
          </label>
          <input
            type="text"
            required
            value={form.stkName}
            onChange={(e) => setForm({ ...form, stkName: e.target.value })}
            placeholder="Örn: Kamu Çalışanları Dayanışma Derneği"
            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/30"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>

        {/* STK Türü */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Kuruluş Türü
          </label>
          <select
            value={form.stkType}
            onChange={(e) => setForm({ ...form, stkType: e.target.value })}
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all focus:ring-2 focus:ring-emerald-500/30"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {STK_TYPES.map((t) => (
              <option key={t.value} value={t.value} style={{ background: '#1e293b' }}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Yetkili Adı */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Yetkili Ad Soyad
          </label>
          <input
            type="text"
            required
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            placeholder="Ad Soyad"
            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/30"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>

        {/* Telefon */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> Telefon
          </label>
          <input
            type="tel"
            required
            value={form.contactPhone}
            onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            placeholder="05XX XXX XX XX"
            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/30"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>
      </div>

      {/* E-posta */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" /> E-posta
        </label>
        <input
          type="email"
          required
          value={form.contactEmail}
          onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
          placeholder="ornek@dernek.org.tr"
          className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all focus:ring-2 focus:ring-emerald-500/30"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
      </div>

      {/* Açıklama */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-400">Açıklama (Opsiyonel)</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Kuruluşunuz hakkında kısa bilgi..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all resize-none focus:ring-2 focus:ring-emerald-500/30"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-xl text-white font-semibold text-sm transition-all hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 8px 32px rgba(16, 185, 129, 0.25)' }}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Gönderiliyor...</>
        ) : (
          <>📝 Başvuruyu Gönder</>
        )}
      </button>
    </form>
  );
}
