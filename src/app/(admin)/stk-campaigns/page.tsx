"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Bell, Send, Plus, X, Users, Clock, Mail, MessageSquare, Smartphone, User } from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  content: string;
  channels: string[];
  audience: string;
  stkId?: string;
  stk?: { id: string; name: string };
  status: string;
  sentCount: number;
  createdAt: string;
}

interface STKOrg {
  id: string;
  name: string;
}

const audienceLabels: Record<string, string> = {
  ALL_MEMBERS: "Tüm Üyeler",
  OVERDUE_DUES: "Aidatı Gecikenler",
  UPCOMING_DUES: "Aidatı Yaklaşanlar",
  INDIVIDUAL: "Münferit Kişi",
  CUSTOM: "Özel",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const channelIcons: Record<string, any> = { PUSH: Smartphone, WHATSAPP: MessageSquare, EMAIL: Mail };
const channelLabels: Record<string, string> = { PUSH: "Push Bildirim", WHATSAPP: "WhatsApp", EMAIL: "E-posta" };

export default function STKCampaignsPage() {
  const { data: sess } = useSession();
  const _managedStkId = (sess?.user as any)?.managedStkId || "";
  const _isSTKManager = (sess?.user as any)?.role === "STK_MANAGER";
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [orgs, setOrgs] = useState<STKOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [stkId, setStkId] = useState("");
  const [audience, setAudience] = useState("ALL_MEMBERS");
  const [channels, setChannels] = useState<string[]>(["PUSH"]);
  // Münferit gönderim
  const [individualMode, setIndividualMode] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/stk-campaigns" + (_managedStkId ? "?stkId=" + _managedStkId : ""));
      const d = await r.json();
      if (d.success) setCampaigns(d.data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  const loadOrgs = async () => {
    try {
      const r = await fetch("/api/admin/stk/organizations");
      const d = await r.json();
      if (d.success) { setOrgs(d.data); if (_managedStkId) setStkId(_managedStkId); }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
    loadOrgs();
  }, []);

  const toggleChannel = (ch: string) =>
    setChannels((prev) => (prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]));

  const resetModal = () => {
    setShowModal(false);
    setTitle("");
    setContent("");
    setStkId("");
    setAudience("ALL_MEMBERS");
    setChannels(["PUSH"]);
    setIndividualMode(false);
    setRecipientPhone("");
    setRecipientEmail("");
  };

  const handleSend = async () => {
    if (!title.trim() || !content.trim() || channels.length === 0)
      return alert("Başlık, içerik ve en az bir kanal seçmelisiniz.");

    if (individualMode) {
      if (!recipientPhone.trim() && !recipientEmail.trim()) {
        return alert("Münferit gönderim için telefon veya e-posta girilmelidir.");
      }
      if (channels.includes("WHATSAPP") && !recipientPhone.trim()) {
        return alert("WhatsApp için telefon numarası zorunludur.");
      }
      if (channels.includes("EMAIL") && !recipientEmail.trim()) {
        return alert("E-posta kanalı için e-posta adresi zorunludur.");
      }
    }

    setSending(true);
    try {
      const payload: Record<string, unknown> = { title, content, channels, audience, stkId: stkId || undefined };
      if (individualMode) {
        payload.individualMode = true;
        payload.recipientPhone = recipientPhone.trim() || undefined;
        payload.recipientEmail = recipientEmail.trim() || undefined;
      }

      const r = await fetch("/api/admin/stk-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.success) {
        resetModal();
        load();
        const stats = d.stats
          ? `\n📱 Push: ${d.stats.push || 0}\n📧 Email: ${d.stats.email || 0}\n💬 WhatsApp: ${d.stats.whatsapp || 0}`
          : "";
        const errInfo = d.errors ? `\n\n⚠️ Hatalar:\n${d.errors.join("\n")}` : "";
        alert(`✅ ${individualMode ? "Münferit bildirim" : "Kampanya"} gönderildi! ${d.sentCount} kişi hedeflendi.${stats}${errInfo}`);
      } else {
        alert("Hata: " + (d.error || "Bilinmeyen hata"));
      }
    } catch {
      alert("Bağlantı hatası");
    }
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-8 h-8" style={{ color: "var(--primary)" }} />
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              📢 STK Bildirim & Kampanya Yönetimi
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              STK üyelerine Push, WhatsApp ve E-posta bildirimleri gönderin
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setIndividualMode(true); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 border-2 border-purple-500 text-purple-600 bg-purple-50 rounded-xl font-semibold hover:bg-purple-100 transition-all"
          >
            <User className="w-4 h-4" />
            Münferit Bildirim
          </button>
          <button
            onClick={() => { setIndividualMode(false); setShowModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 gradient-primary text-white rounded-xl font-semibold glow-primary transition-all"
          >
            <Plus className="w-5 h-5" />
            Toplu Kampanya
          </button>
        </div>
      </div>

      {/* İstatistik */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Toplam Kampanya", value: campaigns.length, icon: Send, gradient: "from-blue-500 to-blue-600" },
          { label: "Toplam Gönderim", value: campaigns.reduce((s, c) => s + c.sentCount, 0), icon: Users, gradient: "from-green-500 to-emerald-500" },
          { label: "Son Kampanya", value: campaigns[0] ? new Date(campaigns[0].createdAt).toLocaleDateString("tr-TR") : "—", icon: Clock, gradient: "from-amber-500 to-amber-600" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: "var(--text)" }}>{s.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tablo */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-bold" style={{ color: "var(--text)" }}>Gönderilen Kampanyalar</h3>
        </div>
        {loading ? (
          <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>Yükleniyor...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
            <p style={{ color: "var(--text-muted)" }}>Henüz kampanya gönderilmemiş</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tarih</th><th>Başlık</th><th>STK</th><th>Hedef Kitle</th><th>Kanallar</th><th>Gönderim</th><th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(c.createdAt).toLocaleDateString("tr-TR")}{" "}
                      {new Date(c.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </td>
                  <td><span className="font-semibold text-sm" style={{ color: "var(--text)" }}>{c.title}</span></td>
                  <td>{c.stk?.name || <span className="badge badge-blue text-xs">Platform Geneli</span>}</td>
                  <td>
                    <span className={`badge ${c.audience === "INDIVIDUAL" ? "badge-purple" : "badge-blue"}`}>
                      {audienceLabels[c.audience] || c.audience}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1 justify-center">
                      {c.channels.map((ch) => {
                        const Icon = channelIcons[ch] || Bell;
                        return (
                          <span key={ch} title={channelLabels[ch]} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-muted)" }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td><span className="font-bold" style={{ color: "var(--text)" }}>{c.sentCount} kişi</span></td>
                  <td><span className="badge badge-green">✓ {c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl w-full max-w-lg shadow-2xl" style={{ background: "var(--bg-card)" }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>
                {individualMode ? "👤 Münferit Bildirim Gönder" : "➕ Yeni STK Kampanyası Oluştur"}
              </h3>
              <button onClick={resetModal} className="p-1 rounded-lg" style={{ color: "var(--text-secondary)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Münferit modda alıcı bilgileri */}
              {individualMode && (
                <div className="p-4 rounded-xl border-2 border-purple-200 bg-purple-50/50 space-y-3">
                  <p className="text-xs font-bold text-purple-600">👤 Alıcı Bilgileri</p>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">📱 Telefon (WhatsApp için zorunlu)</label>
                    <input type="text" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="905xxxxxxxxx"
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">📧 E-posta (Mail kanalı için zorunlu)</label>
                    <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="ornek@mail.com"
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg" />
                  </div>
                </div>
              )}

              {/* Toplu modda STK ve hedef kitle seçimi */}
              {!individualMode && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>🏛️ Hedef STK</label>
                    <select value={stkId} onChange={(e) => setStkId(e.target.value)} className="w-full text-sm" disabled={!!_managedStkId}>
                      <option value="">Tüm Platform</option>
                      {orgs.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>👥 Hedef Kitle</label>
                    <select value={audience} onChange={(e) => setAudience(e.target.value)} className="w-full text-sm">
                      <option value="ALL_MEMBERS">Tüm Üyeler</option>
                      <option value="OVERDUE_DUES">Aidatı Gecikenler</option>
                      <option value="UPCOMING_DUES">Aidatı Yaklaşanlar (3 gün)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Kanal Seçimi */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                  📡 Gönderim Kanalları {individualMode && <span className="text-purple-500">(istediğiniz kanalları seçin)</span>}
                </label>
                <div className="flex gap-3">
                  {(["PUSH", "WHATSAPP", "EMAIL"] as const).map((ch) => {
                    const Icon = channelIcons[ch];
                    const active = channels.includes(ch);
                    return (
                      <label key={ch}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${active ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}
                      >
                        <input type="checkbox" checked={active} onChange={() => toggleChannel(ch)} className="hidden" />
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-semibold">{channelLabels[ch]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Başlık ve İçerik */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>📌 Başlık</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bildirim Başlığı" className="w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>💬 Mesaj İçeriği</label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4}
                  placeholder="Sayın üyemiz, ..." className="w-full text-sm resize-none" />
              </div>
            </div>

            {/* Seçili kanalların özeti */}
            <div className="px-5 py-2" style={{ background: "var(--bg-muted)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                <strong>Seçili kanallar:</strong>{" "}
                {channels.length === 0 ? "Hiçbiri seçilmedi" : channels.map(ch => channelLabels[ch]).join(", ")}
                {individualMode && " • 👤 Münferit gönderim"}
              </p>
            </div>

            <div className="p-5 border-t flex gap-3" style={{ borderColor: "var(--border)" }}>
              <button onClick={resetModal}
                className="flex-1 py-2.5 border rounded-xl text-sm font-semibold transition-all"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                İptal
              </button>
              <button onClick={handleSend} disabled={sending}
                className={`flex-1 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 ${individualMode ? "bg-purple-600 hover:bg-purple-700" : "gradient-primary glow-primary"}`}>
                <Send className="w-4 h-4" />
                {sending ? "Gönderiliyor..." : individualMode ? "Münferit Gönder" : "Kampanyayı Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
