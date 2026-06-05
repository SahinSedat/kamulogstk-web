"use client";

import { useState, useEffect } from "react";
import { Bell, Send, Target, Filter, Users, Smartphone, Mail, Clock, Edit, Trash2, Loader2, Search, UserCheck, X } from "lucide-react";

const templates = [
  { id: "1", name: "Yeni mesaj bildirimi", trigger: "Yeni mesaj geldiğinde", template: "{{user_name}} size bir mesaj gönderdi", active: true },
  { id: "2", name: "Becayiş eşleşme", trigger: "Eşleşme bulunduğunda", template: "{{city}} — {{institution}} için eşleşmeniz bulundu!", active: true },
  { id: "3", name: "Abonelik bitişi", trigger: "Abonelik 3 gün kala", template: "Premium aboneliğiniz {{days}} gün sonra bitiyor", active: true },
  { id: "4", name: "Jeton azalma", trigger: "Jeton ≤ 5", template: "Jeton bakiyeniz azaldı. Yeniden yükleyin!", active: false },
];

const cities = ["Tümü", "İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Konya", "Adana"];

export default function NotificationsPage() {
  const [tab, setTab] = useState<"send" | "history" | "templates">("send");
  const [targetType, setTargetType] = useState<"topic" | "token" | "premium" | "user">("topic");
  const [targetValue, setTargetValue] = useState("all_users");
  const [targetCity, setTargetCity] = useState("Tümü");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [premiumKurum, setPremiumKurum] = useState("");
  const [premiumIstihdam, setPremiumIstihdam] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<Array<{id:string;name:string|null;firstName:string|null;lastName:string|null;email:string|null;phone:string|null;hasFcmToken:boolean;}>>([]);
  const [selectedUser, setSelectedUser] = useState<{id:string;name:string|null;email:string|null;hasFcmToken:boolean;}|null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | "sending"; message: string } | null>(null);
  const [sentHistory, setSentHistory] = useState<Array<{
    id: string; title: string; target: string; sentAt: string; type: string; success: boolean; messageId?: string;
  }>>([]);
  const [bakanliklar, setBakanliklar] = useState<string[]>([]);
  const [istihdamTurleri, setIstihdamTurleri] = useState<string[]>([]);

  // DB'den dinamik filtre seçeneklerini çek
  useEffect(() => {
    fetch("/api/notifications/filters")
      .then((res) => res.json())
      .then((data) => {
        if (data.bakanliklar) setBakanliklar(data.bakanliklar);
        if (data.istihdamTurleri) setIstihdamTurleri(data.istihdamTurleri);
      })
      .catch(console.error);
  }, []);

  // 📋 Geçmiş bildirimleri DB'den çek (NotificationCampaign tablosu)
  useEffect(() => {
    fetch("/api/admin/notification-history")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setSentHistory(
            data.data.map((n: { id: string; title: string; content: string; channels: string[]; sentCount: number; createdAt: string; status: string }) => ({
              id: n.id,
              title: n.title,
              target: n.channels?.join(", ") || "PUSH",
              sentAt: new Date(n.createdAt).toLocaleString("tr-TR"),
              type: "campaign",
              success: n.status === "SENT",
              messageId: n.id,
              content: n.content,
              sentCount: n.sentCount,
            }))
          );
        }
      })
      .catch(console.error);
  }, []);

  const sendNotification = async () => {
    if (!title.trim() || !body.trim()) return;

    setSending(true);
    setStatus({ type: "sending", message: "Gönderiliyor... 🚀" });

    const payload: Record<string, unknown> = { title, message: body };

    if (link.trim()) {
      payload.route = link.trim();
    }

    if (targetType === "user") {
      if (!selectedUser) {
        setStatus({ type: "error", message: "Lütfen bir kullanıcı seçin!" });
        setSending(false);
        return;
      }
      payload.targetUserId = selectedUser.id;
    } else if (targetType === "token") {
      if (!targetValue.trim()) {
        setStatus({ type: "error", message: "FCM Token boş olamaz!" });
        setSending(false);
        return;
      }
      payload.targetToken = targetValue;
    } else if (targetType === "premium") {
      if (!premiumKurum && !premiumIstihdam) {
        setStatus({ type: "error", message: "En az bir Premium filtre seçmelisiniz!" });
        setSending(false);
        return;
      }
      const filters: Record<string, string> = {};
      if (premiumKurum) filters.kurum = premiumKurum;
      if (premiumIstihdam) filters.istihdam = premiumIstihdam;
      payload.premiumFilters = filters;
    } else {
      payload.topic = targetValue;
    }

    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        const statusMsg = data.messageId
          ? `✅ Bildirim gönderildi! (ID: ${data.messageId})`
          : data.stats
          ? `✅ Toplu bildirim gönderildi! ${data.stats.targetUsers || 0} kullanıcıya in-app, ${data.stats.totalTokens || 0} cihaza push gönderiliyor`
          : "✅ Bildirim gönderildi!";
        setStatus({ type: "success", message: statusMsg });

        // Geçmişe ekle
        setSentHistory(prev => [{
          id: data.messageId || Date.now().toString(),
          title,
          target: targetType === "user" ? `🎯 ${selectedUser?.name || selectedUser?.email}` : targetType === "topic" ? `Kanal: ${targetValue}` : targetType === "premium" ? "Premium Kesişim" : `Token: ${targetValue.slice(0, 20)}...`,
          sentAt: new Date().toLocaleString("tr-TR"),
          type: "push",
          success: true,
          messageId: data.messageId || `${data.stats?.targetUsers || 0} kullanıcı, ${data.stats?.totalTokens || 0} cihaz`,
        }, ...prev]);

        setTitle("");
        setBody("");
        setLink("");
      } else {
        setStatus({ type: "error", message: `❌ Hata: ${data.error}` });
      }
    } catch (err) {
      setStatus({ type: "error", message: "❌ Sunucuya ulaşılamadı." });
    } finally {
      setSending(false);
      // 5 saniye sonra status'u temizle
      setTimeout(() => setStatus(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
          <Bell className="w-6 h-6" style={{ color: "var(--primary)" }} /> Bildirim Komuta Merkezi
        </h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>FCM push bildirim gönder, geçmişi görüntüle, şablonları yönet</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Gönderilen", value: sentHistory.length, icon: Send, gradient: "from-blue-500 to-blue-600" },
          { label: "Başarılı", value: sentHistory.filter(h => h.success).length, icon: Smartphone, gradient: "from-green-500 to-emerald-500" },
          { label: "Kanallar", value: "3", icon: Users, gradient: "from-purple-500 to-purple-600" },
          { label: "Otomatik Tetikleyici", value: templates.filter(t => t.active).length, icon: Clock, gradient: "from-amber-500 to-amber-600" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div><p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p><p className="text-2xl font-bold mt-1" style={{ color: "var(--text)" }}>{s.value}</p></div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center`}><s.icon className="w-5 h-5 text-white" /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-muted)" }}>
        {[
          { key: "send" as const, label: "📤 Yeni Gönder", icon: Send },
          { key: "history" as const, label: "📋 Geçmiş", icon: Clock },
          { key: "templates" as const, label: "⚙️ Şablonlar", icon: Filter },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: tab === t.key ? "var(--bg-card)" : "transparent", color: tab === t.key ? "var(--primary)" : "var(--text-secondary)", boxShadow: tab === t.key ? "var(--shadow-sm)" : "none" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "send" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="card p-6 lg:col-span-2 space-y-4">
            <h3 className="font-semibold" style={{ color: "var(--text)" }}>🚀 Push Bildirim Gönder</h3>

            {/* Gönderim Tipi */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Gönderim Tipi</label>
                <select
                  className="w-full mt-1 text-sm"
                  value={targetType}
                  onChange={(e) => {
                    const val = e.target.value as "topic" | "token" | "premium";
                    setTargetType(val);
                    setTargetValue(val === "topic" ? "all_users" : "");
                    if (val !== "premium") { setPremiumKurum(""); setPremiumIstihdam(""); }
                  }}
                >
                  <option value="topic">📢 Toplu Gönderim (Kanal)</option>
                  <option value="token">🎯 Tekil Kullanıcı (FCM Token)</option>
                  <option value="premium">💎 Premium Çoklu Filtre (Kesişim)</option>
                </select>
              </div>
              {targetType !== "premium" && (
                <div>
                  <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    {targetType === "topic" ? "Kanal Seçimi" : "Kullanıcı FCM Token"}
                  </label>
                  {targetType === "topic" ? (
                    <select className="w-full mt-1 text-sm" value={targetValue} onChange={(e) => setTargetValue(e.target.value)}>
                      <optgroup label="Genel Kanallar">
                        <option value="all_users">Tüm Kamulog Kullanıcıları</option>
                        <option value="new_listings">Yeni İlan Aboneleri</option>
                        <option value="becayis_updates">Becayiş Süreci Güncellemeleri</option>
                      </optgroup>
                      {bakanliklar.length > 0 && (
                        <optgroup label="Kurum Bazlı Hedefleme">
                          {bakanliklar.map((b) => (
                            <option key={b} value={`kurum:${b}`}>{b}</option>
                          ))}
                        </optgroup>
                      )}
                      {istihdamTurleri.length > 0 && (
                        <optgroup label="İstihdam Türü Hedefleme">
                          {istihdamTurleri.map((i) => (
                            <option key={i} value={`istihdam:${i}`}>{i}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="w-full mt-1 text-sm"
                      placeholder="FCM Token'ı yapıştır..."
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                    />
                  )}
                </div>
              )}
            </div>

            {/* 💎 Premium Kesişim Paneli */}
            {targetType === "premium" && (
              <div className="p-4 border-2 border-yellow-400 rounded-xl space-y-4" style={{ background: "rgba(234, 179, 8, 0.08)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">👑</span>
                  <h4 className="font-bold text-yellow-600 dark:text-yellow-400">Premium Keskin Nişancı Hedefleme</h4>
                  <span className="text-[10px] bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-bold ml-auto">PRO</span>
                </div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Seçtiğiniz tüm şartları <strong>aynı anda sağlayan (VE)</strong> kullanıcılara bildirim gider.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>🏛️ Kurum / Bakanlık</label>
                    <select className="w-full mt-1 text-sm" value={premiumKurum} onChange={(e) => setPremiumKurum(e.target.value)}>
                      <option value="">-- Tüm Kurumlar --</option>
                      {bakanliklar.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>👔 İstihdam Türü / Statü</label>
                    <select className="w-full mt-1 text-sm" value={premiumIstihdam} onChange={(e) => setPremiumIstihdam(e.target.value)}>
                      <option value="">-- Tüm Statüler --</option>
                      {istihdamTurleri.map((i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {(premiumKurum || premiumIstihdam) && (
                  <div className="p-2 rounded-lg text-xs font-medium" style={{ background: "rgba(234, 179, 8, 0.12)", color: "var(--text)" }}>
                    🎯 Hedef: {[premiumKurum, premiumIstihdam].filter(Boolean).join(" + ")} personeline gönderilecek
                  </div>
                )}
              </div>
            )}

            {/* Başlık */}
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Bildirim Başlığı *</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full mt-1 text-sm"
                placeholder="Örn: Yeni Becayiş İlanı Eklendi!"
              />
            </div>

            {/* Mesaj */}
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Mesaj İçeriği *</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                className="w-full mt-1 text-sm min-h-[80px]"
                placeholder="Kullanıcılara iletilecek mesajı buraya yazın..."
              />
            </div>

            {/* Hedef Link */}
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Hedef Link (opsiyonel)</label>
              <input value={link} onChange={e => setLink(e.target.value)} className="w-full mt-1 text-sm" placeholder="/dashboard veya https://..." />
            </div>

            {/* Gönder Butonu */}
            <button
              onClick={sendNotification}
              disabled={sending || !title.trim() || !body.trim()}
              className="w-full py-3 rounded-xl gradient-primary text-white text-sm font-semibold glow-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? "Gönderiliyor..." : "Füzeyi Ateşle 🚀"}
            </button>

            {/* Status Feedback */}
            {status && (
              <div className={`p-4 rounded-xl text-center text-sm font-medium animate-fade-in ${
                status.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                status.type === "error" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              }`}>
                {status.message}
              </div>
            )}
          </div>

          {/* Targeting Panel */}
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}><Target className="w-4 h-4" style={{ color: "var(--primary)" }} /> Hedefleme</h3>
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Kullanıcı Tipi</label>
              <div className="space-y-2 mt-2">
                {[
                  { key: "topic", label: "📢 Toplu Gönderim", desc: "Kanal bazlı broadcast" },
                  { key: "token", label: "🎯 Tekil Kullanıcı", desc: "Spesifik cihaza gönder" },
                  { key: "premium", label: "💎 Premium Kesişim", desc: "Kurum + Statü filtresi (VE)" },
                  { key: "user", label: "🎯 Kişiye Özel", desc: "İsim, e-posta veya telefon ile ara" },
                ].map(t => (
                  <label key={t.key} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
                    style={{ background: targetType === t.key ? "var(--bg-active)" : "var(--bg-muted)" }}
                    onClick={() => {
                      setTargetType(t.key as "topic" | "token" | "premium" | "user");
                      setTargetValue(t.key === "topic" ? "all_users" : "");
                      if (t.key !== "premium") { setPremiumKurum(""); setPremiumIstihdam(""); }
                      if (t.key !== "user") { setSelectedUser(null); setUserSearchQuery(""); setUserSearchResults([]); }
                    }}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center`} style={{ borderColor: targetType === t.key ? "var(--primary)" : "var(--border)" }}>
                      {targetType === t.key && <div className="w-2 h-2 rounded-full" style={{ background: "var(--primary)" }} />}
                    </div>
                    <div>
                      <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{t.label}</span>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {targetType === "topic" && (
              <div>
                <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Şehir Filtresi</label>
                <select value={targetCity} onChange={e => setTargetCity(e.target.value)} className="w-full mt-1 text-sm">
                  {cities.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            )}
            {targetType === "user" && (
              <div className="space-y-3">
                <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Kullanıcı Ara (İsim, E-posta veya Telefon)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  <input
                    value={userSearchQuery}
                    onChange={async (e) => {
                      const q = e.target.value;
                      setUserSearchQuery(q);
                      if (q.length < 2) { setUserSearchResults([]); return; }
                      setSearchLoading(true);
                      try {
                        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
                        const data = await res.json();
                        setUserSearchResults(data.users || []);
                      } catch { setUserSearchResults([]); }
                      setSearchLoading(false);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl"
                    style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}
                    placeholder="Kullanıcı adı, e-posta veya telefon yazın..."
                  />
                  {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: "var(--primary)" }} />}
                </div>
                {selectedUser && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: "var(--bg-active)", borderColor: "var(--primary)" }}>
                    <UserCheck className="w-5 h-5 flex-shrink-0" style={{ color: "var(--primary)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>{selectedUser.name || "İsimsiz"}</p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{selectedUser.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedUser.hasFcmToken
                        ? <span className="badge badge-green text-[10px]">📱 Push Aktif</span>
                        : <span className="badge badge-gray text-[10px]">📱 Push Yok</span>
                      }
                      <button onClick={() => { setSelectedUser(null); setUserSearchQuery(""); }} className="p-1 rounded-lg hover:bg-red-500/10">
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                )}
                {userSearchResults.length > 0 && !selectedUser && (
                  <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                    {userSearchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUser({ id: u.id, name: u.name, email: u.email, hasFcmToken: u.hasFcmToken });
                          setUserSearchResults([]);
                          setUserSearchQuery(u.name || u.email || "");
                        }}
                        className="w-full flex items-center gap-3 p-3 text-left transition-colors hover:brightness-95"
                        style={{ background: "var(--bg-muted)", borderBottom: "1px solid var(--border)" }}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--primary)", color: "#fff" }}>
                          {(u.name || u.email || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "İsimsiz"}</p>
                          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
                        </div>
                        {u.hasFcmToken
                          ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">Push ✓</span>
                          : <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-400">Push ✗</span>
                        }
                      </button>
                    ))}
                  </div>
                )}
                {userSearchQuery.length >= 2 && userSearchResults.length === 0 && !searchLoading && !selectedUser && (
                  <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>Kullanıcı bulunamadı</p>
                )}
              </div>
            )}
            <div className="p-3 rounded-xl text-xs" style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>
              <p className="font-medium">📊 Gönderim Hedefi</p>
              <p className="mt-1">
                {targetType === "user"
                  ? `🎯 Kişiye Özel: ${selectedUser ? (selectedUser.name || selectedUser.email) : "Henüz seçilmedi"}`
                  : targetType === "topic"
                  ? `Kanal: ${targetValue === "all_users" ? "Tüm Kullanıcılar" : targetValue === "new_listings" ? "Yeni İlan Bildirimleri" : "Becayiş Güncellemeleri"}`
                  : targetType === "premium"
                  ? "💎 Premium Kesişim Filtresi"
                  : `Tekil Token: ${targetValue ? targetValue.slice(0, 30) + "..." : "Henüz girilmedi"}`
                }
                {targetType === "topic" && ` · ${targetCity === "Tümü" ? "Tüm şehirler" : targetCity}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="card overflow-hidden">
          {sentHistory.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Henüz bildirim gönderilmedi</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Yeni Gönder sekmesinden ilk bildirimi fırlat!</p>
            </div>
          ) : (
            <table>
              <thead><tr>
                <th>Başlık</th><th>Hedef</th><th>Gönderim</th><th>Durum</th><th>Mesaj ID</th>
              </tr></thead>
              <tbody>
                {sentHistory.map(n => (
                  <tr key={n.id}>
                    <td><span className="font-medium text-sm" style={{ color: "var(--text)" }}>{n.title}</span></td>
                    <td><span className="badge badge-blue">{n.target}</span></td>
                    <td><span className="text-xs" style={{ color: "var(--text-muted)" }}>{n.sentAt}</span></td>
                    <td><span className={`badge ${n.success ? "badge-green" : "badge-red"}`}>{n.success ? "Başarılı" : "Hata"}</span></td>
                    <td><span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{n.messageId?.slice(0, 20)}...</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "templates" && (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="card p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2"><h4 className="font-medium text-sm" style={{ color: "var(--text)" }}>{t.name}</h4><span className={`badge ${t.active ? "badge-green" : "badge-gray"}`}>{t.active ? "Aktif" : "Pasif"}</span></div>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Tetikleyici: {t.trigger}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Şablon: <code className="px-1 py-0.5 rounded text-[11px]" style={{ background: "var(--bg-muted)" }}>{t.template}</code></p>
              </div>
              <div className="flex gap-1">
                <button className="p-1.5 rounded-lg" style={{ color: "var(--primary)" }}><Edit className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
