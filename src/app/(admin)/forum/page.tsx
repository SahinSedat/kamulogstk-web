"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Trash2, Search, X, Loader2, Eye, Lock, Unlock, ChevronDown, ChevronRight, Plus, AlertTriangle, Shield, User, Phone, Mail, Clock, Smartphone, FileText, Edit3 } from "lucide-react";

interface ForumCat {
  id: string; name: string; slug: string; description?: string;
  icon?: string; color?: string; order: number; isActive: boolean;
  topicCount: number; postCount: number;
}
interface ForumTopic {
  isFeatured?: boolean;
  id: string; title: string; slug: string; authorId: string; authorName: string;
  status: string; replyCount: number; viewCount: number; likeCount: number;
  createdAt: string; category: { id: string; name: string; icon?: string };
}
interface ForumPost {
  id: string; content: string; authorId: string; authorName: string;
  likeCount: number; dislikeCount: number; createdAt: string;
}
interface UserDetail {
  id: string; email: string; phone?: string; phoneNumber?: string;
  name?: string; tcKimlik?: string; lastLoginMethod?: string;
  fcmToken?: string; createdAt: string; isPremium: boolean;
  role: string; city?: string; institutionName?: string;
}

export default function ForumAdminPage() {
  const [categories, setCategories] = useState<ForumCat[]>([]);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [tab, setTab] = useState<"categories" | "topics" | "reports">("categories");
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  // Ban Modal
  const [showBanModal, setShowBanModal] = useState(false);
  const [banUserId, setBanUserId] = useState("");
  const [banUserName, setBanUserName] = useState("");
  const [banType, setBanType] = useState("forum");
  const [banDays, setBanDays] = useState("3");
  const [banReason, setBanReason] = useState("");
  const [banSaving, setBanSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  // Kategori form
  const [showCatForm, setShowCatForm] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", description: "", icon: "", color: "" });
  const [catSaving, setCatSaving] = useState(false);

  useEffect(() => { fetchCategories(); fetchTopics(); }, []);

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const res = await fetch("/api/admin/forum/reports");
      const data = await res.json();
      setReports(data.data || []);
    } catch { }
    setReportsLoading(false);
  };

  const updateReportStatus = async (id: string, status: string) => {
    try {
      await fetch("/api/admin/forum/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch { }
  };

  const openBanModal = (userId: string, userName: string) => {
    setBanUserId(userId);
    setBanUserName(userName);
    setBanType("forum");
    setBanDays("3");
    setBanReason("");
    setShowBanModal(true);
  };

  
  const toggleFeatured = async (topicId: string, current: boolean) => {
    try {
      await fetch("/api/admin/forum/topics/featured", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, isFeatured: !current }),
      });
      fetchTopics();
    } catch { }
  };

  const submitBan = async () => {
    if (!banReason.trim()) return alert("Neden zorunlu!");
    setBanSaving(true);
    try {
      const res = await fetch("/api/admin/users/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: banUserId, banType, durationDays: parseInt(banDays), reason: banReason }),
      });
      if (res.ok) {
        alert("Kısıtlama uygulandı!");
        setShowBanModal(false);
      } else {
        const d = await res.json();
        alert(d.error || "Hata!");
      }
    } catch { alert("Sunucu hatası!"); }
    setBanSaving(false);
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/forum/categories");
      const data = await res.json();
      setCategories(data.data || []);
    } catch { }
    setLoading(false);
  };

  const fetchTopics = async () => {
    setTopicsLoading(true);
    try {
      const res = await fetch("/api/admin/forum/topics");
      const data = await res.json();
      setTopics(data.data || []);
    } catch { }
    setTopicsLoading(false);
  };

  const fetchTopicDetail = async (slug: string) => {
    setPostsLoading(true);
    try {
      const res = await fetch(`/api/public/forum/topics/${slug}`);
      const data = await res.json();
      setSelectedTopic(data.data);
      setPosts(data.data?.posts || []);
    } catch { }
    setPostsLoading(false);
  };

  const deleteCategory = async (id: string, name: string) => {
    if (!confirm(`"${name}" kategorisi ve altındaki tüm konular silinecek. Emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/admin/forum/categories?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== id));
        alert("Kategori silindi!");
      } else {
        const d = await res.json();
        alert(d.error || "Silme hatası!");
      }
    } catch { alert("Sunucu hatası!"); }
  };

  const toggleCategoryStatus = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/forum/categories?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      setCategories(prev => prev.map(c => c.id === id ? { ...c, isActive: !isActive } : c));
    } catch { }
  };

  const createCategory = async () => {
    if (!catForm.name.trim()) return;
    setCatSaving(true);
    try {
      const res = await fetch("/api/admin/forum/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catForm),
      });
      if (res.ok) {
        setShowCatForm(false);
        setCatForm({ name: "", description: "", icon: "", color: "" });
        fetchCategories();
      } else {
        const d = await res.json();
        alert(d.error || "Hata!");
      }
    } catch { }
    setCatSaving(false);
  };

  const updateTopicStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/admin/forum/topics/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setTopics(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    } catch { }
  };

  const deleteTopic = async (id: string, title: string) => {
    if (!confirm(`"${title}" konusu silinecek. Emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/admin/forum/topics/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTopics(prev => prev.filter(t => t.id !== id));
        if (selectedTopic?.id === id) { setSelectedTopic(null); setPosts([]); }
      }
    } catch { }
  };

  // ⚖️ ADLİ TAKİP — Kullanıcı detay çek
  const fetchUserDetail = async (userId: string) => {
    setUserDetailLoading(true);
    setShowUserModal(true);
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserDetail(data.user || data);
      } else {
        setUserDetail(null);
      }
    } catch { setUserDetail(null); }
    setUserDetailLoading(false);
  };

  const filteredTopics = topics.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.authorName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>💬 Forum Yönetimi</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Kategoriler, konular ve adli inceleme</p>
        </div>
      </div>

      {/* Tablar */}
      <div className="flex gap-2">
        {(["categories", "topics", "reports"] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); if (t === "reports" && reports.length === 0) fetchReports(); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === t ? "gradient-primary text-white" : ""}`}
            style={tab !== t ? { background: "var(--bg-muted)", color: "var(--text-secondary)" } : {}}>
            {t === "categories" ? "📁 Kategoriler" : t === "topics" ? "📋 Konular & Adli Takip" : "🚨 Şikayetler"}
          </button>
        ))}
      </div>

      {/* ════════ KATEGORİLER ════════ */}
      {tab === "categories" && (
        <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: "var(--text)" }}>Forum Kategorileri</h3>
            <button onClick={() => setShowCatForm(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium gradient-primary text-white">
              <Plus className="w-3 h-3" /> Yeni Kategori
            </button>
          </div>

          {showCatForm && (
            <div className="rounded-xl p-4 mb-4" style={{ background: "var(--bg-muted)", border: "1px solid var(--border)" }}>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs" style={{ color: "var(--text-secondary)" }}>İsim *</label>
                  <input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} className="w-full mt-1 text-sm" placeholder="Kategori adı" />
                </div>
                <div>
                  <label className="text-xs" style={{ color: "var(--text-secondary)" }}>İkon</label>
                  <input value={catForm.icon} onChange={e => setCatForm({ ...catForm, icon: e.target.value })} className="w-full mt-1 text-sm" placeholder="💬" />
                </div>
              </div>
              <div className="mb-3">
                <label className="text-xs" style={{ color: "var(--text-secondary)" }}>Açıklama</label>
                <input value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} className="w-full mt-1 text-sm" placeholder="Kategori açıklaması" />
              </div>
              <div className="flex gap-2">
                <button onClick={createCategory} disabled={catSaving} className="px-3 py-1.5 rounded-lg text-xs font-medium gradient-primary text-white disabled:opacity-50">
                  {catSaving ? "Kaydediliyor..." : "Oluştur"}
                </button>
                <button onClick={() => setShowCatForm(false)} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>İptal</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} /></div>
          ) : (
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl transition" style={{ background: "var(--bg-muted)" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{cat.icon || "📁"}</span>
                    <div>
                      <span className="font-medium text-sm" style={{ color: "var(--text)" }}>{cat.name}</span>
                      <div className="flex gap-3 mt-0.5">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{cat.topicCount} konu</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{cat.postCount} yorum</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleCategoryStatus(cat.id, cat.isActive)}
                      className={"badge " + (cat.isActive ? "badge-green" : "badge-yellow") + " cursor-pointer text-xs"}>
                      {cat.isActive ? "Aktif" : "Pasif"}
                    </button>
                    <button onClick={() => deleteCategory(cat.id, cat.name)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════ KONULAR & ADLİ TAKİP ════════ */}
      {tab === "topics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sol: Konu listesi */}
          <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Konu veya yazar ara..."
                  className="w-full pl-9 text-sm" />
              </div>
            </div>

            {topicsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} /></div>
            ) : (
              <div className="space-y-1 max-h-[65vh] overflow-y-auto">
                {filteredTopics.map(topic => (
                  <div key={topic.id} onClick={() => fetchTopicDetail(topic.slug)}
                    className={"flex items-center justify-between p-3 rounded-xl cursor-pointer transition " + (selectedTopic?.id === topic.id ? "ring-2 ring-blue-500" : "")}
                    style={{ background: selectedTopic?.id === topic.id ? "var(--bg-hover)" : "var(--bg-muted)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{topic.category?.icon || "💬"}</span>
                        <span className="font-medium text-sm truncate" style={{ color: "var(--text)" }}>{topic.title}</span>
                      </div>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>👤 {topic.authorName}</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>💬 {topic.replyCount}</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>👁 {topic.viewCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <span className={"badge text-xs " + (
                        topic.status === "OPEN" ? "badge-green" : topic.status === "LOCKED" ? "badge-yellow" : "badge-red"
                      )}>
                        {topic.status === "OPEN" ? "Açık" : topic.status === "LOCKED" ? "Kilitli" : topic.status}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); updateTopicStatus(topic.id, topic.status === "LOCKED" ? "OPEN" : "LOCKED"); }}
                        className="p-1 rounded" style={{ color: "var(--text-muted)" }} title={topic.status === "LOCKED" ? "Kilidi Aç" : "Kilitle"}>
                        {topic.status === "LOCKED" ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toggleFeatured(topic.id, !!topic.isFeatured); }}
                        className={topic.isFeatured ? 'px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-500 hover:bg-gray-200'}
                        title={topic.isFeatured ? 'Öne Çıkarmayı Kaldır' : 'Öne Çıkar'}>
                        {topic.isFeatured ? '⭐' : '☆'}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteTopic(topic.id, topic.title); }}
                        className="p-1 rounded text-red-400 hover:bg-red-500/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredTopics.length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Konu bulunamadı</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sağ: Konu detay + Yorumlar + Adli Takip */}
          <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {!selectedTopic ? (
              <div className="text-center py-16">
                <Shield className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Soldan bir konu seçin</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Yorumları inceleyin ve adli takip başlatın</p>
              </div>
            ) : postsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} /></div>
            ) : (
              <div>
                <div className="mb-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <h3 className="font-semibold text-sm" style={{ color: "var(--text)" }}>{selectedTopic.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <button onClick={() => fetchUserDetail(selectedTopic.authorId)}
                      className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: "var(--primary)" }}>
                      <Shield className="w-3 h-3" /> 👤 {selectedTopic.authorName}
                    </button>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(selectedTopic.createdAt).toLocaleDateString("tr-TR")}</span>
                  </div>
                  {selectedTopic.content && (
                    <p className="text-xs mt-2 p-2 rounded-lg" style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>
                      {selectedTopic.content.substring(0, 300)}{selectedTopic.content.length > 300 ? "..." : ""}
                    </p>
                  )}
                </div>

                <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                  Yorumlar ({posts.length})
                </h4>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {posts.map(post => (
                    <div key={post.id} className="p-3 rounded-xl" style={{ background: "var(--bg-muted)" }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium" style={{ color: "var(--text)" }}>{post.authorName}</span>
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(post.createdAt).toLocaleDateString("tr-TR")}</span>
                            <span className="text-xs" style={{ color: "var(--success)" }}>👍 {post.likeCount}</span>
                            <span className="text-xs" style={{ color: "var(--error)" }}>👎 {post.dislikeCount}</span>
                          </div>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{post.content}</p>
                        </div>
                        {/* ⚖️ ADLİ TAKİP BUTONU */}
                        <button onClick={() => fetchUserDetail(post.authorId)}
                          className="ml-2 p-1.5 rounded-lg transition flex items-center gap-1 text-xs font-medium"
                          style={{ color: "var(--warning)" }}
                          title="Kullanıcı Adli Bilgileri"
                          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"} 
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <Shield className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">İncele</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {posts.length === 0 && (
                    <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Henüz yorum yok</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ════════ ŞİKAYETLER ════════ */}
      {tab === "reports" && (
        <div className="rounded-2xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <h3 className="font-semibold mb-4" style={{ color: "var(--text)" }}>🚨 Forum Şikayetleri</h3>
          {reportsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} /></div>
          ) : reports.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Henüz şikayet yok</p>
          ) : (
            <div className="space-y-2">
              {reports.map((r: any) => (
                <div key={r.id} className="p-3 rounded-xl flex items-start justify-between" style={{ background: "var(--bg-muted)" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={"badge text-xs " + (r.status === "PENDING" ? "badge-yellow" : r.status === "RESOLVED" ? "badge-green" : "badge-red")}>{r.status}</span>
                      <span className="text-xs font-medium" style={{ color: "var(--text)" }}>{r.topic?.title || "Silinmiş konu"}</span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>📝 {r.reason}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Şikayet eden: {r.reporter?.name || "Bilinmiyor"} ({r.reporter?.email})</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Konu sahibi: {r.topic?.authorName}</p>
                    {r.post && <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Sikayet edilen yorum: "{r.post.content?.substring(0, 80)}..." - <strong>{r.post.authorName}</strong></p>}
                  </div>
                  <div className="flex gap-1 ml-2">
                    {r.status === "PENDING" && (
                      <>
                        <button onClick={() => updateReportStatus(r.id, "RESOLVED")} className="px-2 py-1 rounded text-xs font-medium badge-green cursor-pointer">✓ Çözüldü</button>
                        <button onClick={() => updateReportStatus(r.id, "DISMISSED")} className="px-2 py-1 rounded text-xs font-medium badge-red cursor-pointer">✗ Reddet</button>
                      </>
                    )}
                    <button onClick={() => openBanModal(r.topic?.authorName ? r.reporterId : "", r.topic?.authorName || "")} className="px-2 py-1 rounded text-xs font-medium" style={{ color: "var(--warning)" }}>⚖️ Ban</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ⚖️ BAN MODAL */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowBanModal(false)}>
          <div className="rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()} style={{ background: "var(--bg-modal)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text)" }}>⚖️ Kullanıcı Kısıtlama — {banUserName}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs" style={{ color: "var(--text-secondary)" }}>Kısıtlama Türü</label>
                <select value={banType} onChange={e => setBanType(e.target.value)} className="w-full mt-1 text-sm">
                  <option value="forum">Forum</option>
                  <option value="becayis">Becayiş</option>
                  <option value="both">Her İkisi</option>
                </select>
              </div>
              <div>
                <label className="text-xs" style={{ color: "var(--text-secondary)" }}>Süre</label>
                <select value={banDays} onChange={e => setBanDays(e.target.value)} className="w-full mt-1 text-sm">
                  <option value="1">1 Gün</option>
                  <option value="3">3 Gün</option>
                  <option value="7">1 Hafta</option>
                  <option value="30">1 Ay</option>
                  <option value="0">Sınırsız</option>
                </select>
              </div>
              <div>
                <label className="text-xs" style={{ color: "var(--text-secondary)" }}>Neden *</label>
                <input value={banReason} onChange={e => setBanReason(e.target.value)} className="w-full mt-1 text-sm" placeholder="Uygunsuz dil, spam vb." />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowBanModal(false)} className="flex-1 py-2 rounded-xl text-sm" style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>İptal</button>
                <button onClick={submitBan} disabled={banSaving} className="flex-1 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{ background: "var(--error)" }}>{banSaving ? "Uygulanıyor..." : "Kısıtla"}</button>
              </div>
            </div>
          </div>
        </div>
      )}


            {/* ⚖️ ADLİ TAKİP MODAL */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowUserModal(false); setUserDetail(null); }}>
          <div className="rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}
            style={{ background: "var(--bg-modal)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--bg-warning)" }}>
                  <Shield className="w-4 h-4" style={{ color: "var(--warning)" }} />
                </div>
                <h3 className="font-semibold text-sm" style={{ color: "var(--text)" }}>⚖️ Adli İnceleme</h3>
              </div>
              <button onClick={() => { setShowUserModal(false); setUserDetail(null); }} className="p-1 rounded-lg" style={{ color: "var(--text-muted)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {userDetailLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} /></div>
            ) : !userDetail ? (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>Kullanıcı bilgisi alınamadı</p>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl" style={{ background: "var(--bg-muted)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4" style={{ color: "var(--primary)" }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Kimlik</span>
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{userDetail.name || "İsim belirtilmemiş"}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>ID: {userDetail.id}</p>
                  {userDetail.tcKimlik && <p className="text-xs" style={{ color: "var(--text-muted)" }}>TC: {userDetail.tcKimlik}</p>}
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Rol: {userDetail.role} {userDetail.isPremium ? "👑 Premium" : ""}</p>
                </div>

                <div className="p-3 rounded-xl" style={{ background: "var(--bg-muted)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4" style={{ color: "var(--primary)" }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>İletişim</span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text)" }}>📧 {userDetail.email}</p>
                  {(userDetail.phone || userDetail.phoneNumber) && (
                    <p className="text-sm" style={{ color: "var(--text)" }}>📱 {userDetail.phone || userDetail.phoneNumber}</p>
                  )}
                </div>

                <div className="p-3 rounded-xl" style={{ background: "var(--bg-muted)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="w-4 h-4" style={{ color: "var(--primary)" }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Cihaz & Giriş</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text)" }}>Son Giriş: {userDetail.lastLoginMethod || "Bilinmiyor"}</p>
                  <p className="text-xs" style={{ color: "var(--text)" }}>FCM Token: {userDetail.fcmToken ? "✅ Mevcut" : "❌ Yok"}</p>
                  {userDetail.institutionName && (
                    <p className="text-xs" style={{ color: "var(--text)" }}>Kurum: {userDetail.institutionName}</p>
                  )}
                </div>

                <div className="p-3 rounded-xl" style={{ background: "var(--bg-muted)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4" style={{ color: "var(--primary)" }} />
                    <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Zaman</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text)" }}>Kayıt: {new Date(userDetail.createdAt).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>

                <div className="p-3 rounded-xl border" style={{ background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.2)" }}>
                  <p className="text-xs font-medium text-red-400">⚠️ Bu bilgiler yalnızca adli/resmi süreçlerde kullanılmak üzere gösterilmektedir. Gizlilik ilkelerine uygun davranınız.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
