"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ImageIcon, Plus, Trash2, Edit3, Loader2, Eye, EyeOff, Upload } from "lucide-react";

interface Story {
  id: string;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
}

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Story | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [order, setOrder] = useState(0);
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stories");
      const data = await res.json();
      if (data.success) setStories(data.data);
    } catch (e) {
      console.error("Story yüklenemedi:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  const resetForm = () => {
    setTitle(""); setImageUrl(""); setLinkUrl(""); setOrder(0); setExpiresAt("");
    setEditing(null); setShowForm(false);
  };

  const handleEdit = (s: Story) => {
    setEditing(s);
    setTitle(s.title || "");
    setImageUrl(s.imageUrl);
    setLinkUrl(s.linkUrl || "");
    setOrder(s.order);
    setExpiresAt(s.expiresAt ? s.expiresAt.slice(0, 16) : "");
    setShowForm(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Tip kontrolü
    if (!file.type.startsWith("image/")) {
      alert("Lütfen bir görsel dosyası seçin (JPG, PNG, WEBP)");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/stories/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.fileUrl) {
        setImageUrl(data.fileUrl);
      } else {
        alert(data.error || "Yükleme başarısız oldu");
      }
    } catch (err) {
      console.error("Upload hatası:", err);
      alert("Dosya yüklenemedi");
    } finally {
      setUploading(false);
      // input'u temizle (aynı dosyayı tekrar seçebilmek için)
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!imageUrl) return alert("Görsel zorunludur! Lütfen bir dosya yükleyin.");
    setSaving(true);
    try {
      const body = {
        title: title || null,
        imageUrl,
        linkUrl: linkUrl || null,
        order,
        expiresAt: expiresAt || null,
      };

      if (editing) {
        await fetch(`/api/admin/stories?id=${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/admin/stories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      resetForm();
      fetchStories();
    } catch (e) {
      console.error("Story kaydedilemedi:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu story silinsin mi?")) return;
    try {
      await fetch(`/api/admin/stories?id=${id}`, { method: "DELETE" });
      setStories(prev => prev.filter(s => s.id !== id));
    } catch {}
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      await fetch(`/api/admin/stories?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      setStories(prev => prev.map(s => s.id === id ? { ...s, isActive: !current } : s));
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-text-secondary" /> Story Yönetimi
          </h2>
          <p className="text-text-secondary text-sm mt-1">
            Mobil anasayfadaki manşet hikayelerini yönetin (1920×1080 yatay görsel önerilir)
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90 transition-all glow-primary"
        >
          <Plus className="w-4 h-4" /> Yeni Story
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-card p-6" style={{ border: "1px solid rgba(var(--primary-rgb, 56,189,248), 0.2)" }}>
          <h3 className="text-lg font-semibold mb-4">
            {editing ? "Story Düzenle" : "Yeni Story Ekle"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-text-secondary">Başlık (opsiyonel)</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Kampanya Duyurusu"
                className="w-full text-sm mt-1 px-3 py-2 rounded-lg"
                style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }} />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary">Görsel Yükle *</label>
              <div className="flex gap-2 mt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> {imageUrl ? "Değiştir" : "Görsel Seç"}</>
                  )}
                </button>
                {imageUrl && (
                  <span className="text-xs text-green-500 flex items-center gap-1">✅ Yüklendi</span>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary">Link URL (opsiyonel)</label>
              <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..."
                className="w-full text-sm mt-1 px-3 py-2 rounded-lg"
                style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary">Sıra</label>
                <input type="number" value={order} onChange={e => setOrder(Number(e.target.value))}
                  className="w-full text-sm mt-1 px-3 py-2 rounded-lg"
                  style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary">Bitiş Tarihi</label>
                <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                  className="w-full text-sm mt-1 px-3 py-2 rounded-lg"
                  style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }} />
              </div>
            </div>
          </div>

          {/* Preview — 1920x1080 yatay format */}
          {imageUrl && (
            <div className="mt-4">
              <p className="text-xs text-text-muted mb-2">Önizleme (1920×1080 yatay):</p>
              <div className="w-full max-w-md rounded-xl overflow-hidden border border-white/10" style={{ aspectRatio: "16/9" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} disabled={saving || !imageUrl}
              className="px-4 py-2 rounded-xl gradient-primary text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50">
              {saving ? "Kaydediliyor..." : editing ? "Güncelle" : "Ekle"}
            </button>
            <button onClick={resetForm}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Story List */}
      <div className="glass-card p-6">
        {stories.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Henüz story eklenmemiş</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stories.map(s => (
              <div key={s.id} className={`relative group rounded-2xl overflow-hidden border transition-all ${s.isActive ? 'border-primary/30' : 'border-white/5 opacity-50'}`}>
                <div className="relative" style={{ aspectRatio: "16/9" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.imageUrl} alt={s.title || "story"} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-xs font-semibold truncate">{s.title || "—"}</p>
                    <p className="text-white/60 text-[10px]">Sıra: {s.order}</p>
                  </div>
                  {/* Hover actions */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(s)}
                      className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleToggleActive(s.id, s.isActive)}
                      className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 transition">
                      {s.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => handleDelete(s.id)}
                      className="p-1.5 rounded-lg bg-red-500/30 backdrop-blur-sm text-white hover:bg-red-500/50 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
