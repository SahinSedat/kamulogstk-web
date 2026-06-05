"use client";

import { useState, useRef } from "react";
import { Mail, Send, Loader2, Paperclip, X, FileText, CheckCircle } from "lucide-react";

export default function ManualMailPage() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!to.trim() || !subject.trim() || !message.trim()) {
      setStatus({ type: "error", message: "Alıcı, konu ve mesaj zorunludur!" });
      return;
    }

    setSending(true);
    setStatus(null);

    try {
      const fd = new FormData();
      fd.append("to", to);
      fd.append("subject", subject);
      fd.append("message", message);
      if (file) fd.append("attachment", file);

      const res = await fetch("/api/admin/send-manual-mail", { method: "POST", body: fd });
      const data = await res.json();

      if (data.success) {
        setStatus({ type: "success", message: `✅ Mail başarıyla gönderildi → ${to}` });
        setTo(""); setSubject(""); setMessage(""); setFile(null);
        if (fileRef.current) fileRef.current.value = "";
      } else {
        setStatus({ type: "error", message: data.error || "Mail gönderilemedi" });
      }
    } catch {
      setStatus({ type: "error", message: "Sunucuya ulaşılamadı" });
    }
    setSending(false);
    setTimeout(() => setStatus(null), 6000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: "var(--text)" }}>
          <Mail className="w-7 h-7" style={{ color: "var(--primary)" }} />
          Manuel Mail Gönderimi
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Fatura, belge veya özel mesajları doğrudan e-posta ile gönderin
        </p>
      </div>

      <div className="card p-6 space-y-4">
        {/* Alıcı */}
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Alıcı E-posta *</label>
          <input value={to} onChange={e => setTo(e.target.value)} type="email" className="w-full mt-1 text-sm" placeholder="ornek@gmail.com" />
        </div>

        {/* Konu */}
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Konu *</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full mt-1 text-sm" placeholder="Mail konusu..." />
        </div>

        {/* Mesaj */}
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Mesaj *</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full mt-1 text-sm min-h-[180px]" placeholder="Mail içeriğini yazın..." />
        </div>

        {/* Dosya Eki */}
        <div>
          <label className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
            <Paperclip className="w-3 h-3" /> Dosya / Belge Ekle (opsiyonel)
          </label>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
          {file ? (
            <div className="flex items-center gap-3 mt-2 p-3 rounded-xl" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
              <FileText className="w-5 h-5 flex-shrink-0" style={{ color: "var(--primary)" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{file.name}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="p-1 rounded hover:bg-red-500/10">
                <X className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="w-full mt-1 py-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors hover:brightness-95"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
              <Paperclip className="w-4 h-4" />
              <span className="text-xs font-medium">PDF, Görsel veya Belge Ekle</span>
            </button>
          )}
        </div>

        {/* Gönder */}
        <button onClick={handleSubmit} disabled={sending}
          className="w-full py-3 rounded-xl gradient-primary text-white text-sm font-semibold glow-primary flex items-center justify-center gap-2 disabled:opacity-50">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Gönderiliyor..." : "Maili Gönder"}
        </button>

        {/* Status */}
        {status && (
          <div className={`p-3 rounded-xl text-center text-sm font-medium animate-fade-in flex items-center justify-center gap-2 ${
            status.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}>
            {status.type === "success" && <CheckCircle className="w-4 h-4" />}
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}
