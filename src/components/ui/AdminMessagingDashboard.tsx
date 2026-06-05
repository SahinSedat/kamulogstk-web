"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    MessageSquare, ArrowLeftRight, Search, Filter, AlertTriangle,
    Check, CheckCheck, Eye, Trash2, ChevronLeft, ChevronRight,
    Send, Shield, Clock, Users, BarChart3, RefreshCw, X,
    MessageCircle, ArrowRight, ExternalLink, Flag, AlertCircle,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────── */
interface Stats {
    consultant: { conversations: number; messages: number; filtered: number; unread?: number; today?: number };
    becayis: { conversations?: number; messages: number; filtered: number; today?: number };
    complaints?: { total: number; pending: number };
}

interface ConsultantConversation {
    id: string;
    userId: string;
    lastMessage: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
    user: { id: string; name: string | null; firstName: string | null; lastName: string | null; email: string; avatarUrl: string | null; phone?: string | null; phoneNumber?: string | null; isPremium?: boolean; isActive?: boolean; accountFrozen?: boolean; role?: string };
    consultant: { id: string; name: string; avatarUrl: string | null; isOnline: boolean; category?: string };
    messages: { isFiltered: boolean; status: string }[];
}

interface BecayisConversation {
    senderId: string;
    receiverId: string;
    listingId: string;
    lastMessage: string;
    lastMessageAt: string;
    messageCount: number;
    unreadCount: number;
    hasFiltered: boolean;
    sender: { id: string; firstName: string | null; lastName: string | null; avatarUrl: string | null; email?: string; phone?: string | null; phoneNumber?: string | null; isPremium?: boolean; isActive?: boolean; accountFrozen?: boolean };
    receiver: { id: string; firstName: string | null; lastName: string | null; avatarUrl: string | null; email?: string };
    listing: { id: string; title: string; currentCity: string; targetCity: string; adNumber?: string | null; status?: string };
}

interface DetailMessage {
    id: string; senderId: string; text?: string; content?: string; type?: string; status: string;
    isFiltered?: boolean; createdAt: string;
    sender: { id: string; name?: string | null; firstName: string | null; lastName: string | null; avatarUrl?: string | null; email?: string };
}

interface Complaint {
    id: string;
    reporterId: string;
    targetUserId: string | null;
    reason: string;
    messageId: string | null;
    status: string;
    createdAt: string;
    reporter: { id: string; firstName: string | null; lastName: string | null; email: string; avatarUrl: string | null; phone?: string | null } | null;
    target: { id: string; firstName: string | null; lastName: string | null; email: string; avatarUrl: string | null; phone?: string | null } | null;
}

/* ─── Helpers ──────────────────────────────────────────────────── */
const userName = (u: { name?: string | null; firstName?: string | null; lastName?: string | null; email?: string }) =>
    u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "—";

const fmtDate = (d: string) => new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
const fmtTime = (d: string) => new Date(d).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const fmtFull = (d: string) => new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const StatusIcon = ({ status }: { status: string }) => {
    if (status === "READ") return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
    if (status === "DELIVERED") return <CheckCheck className="w-3.5 h-3.5 text-text-muted" />;
    return <Check className="w-3.5 h-3.5 text-text-muted" />;
};

/* ─── Component ────────────────────────────────────────────────── */
export default function AdminMessagingDashboard({ initialStats }: { initialStats: Stats }) {
    const [activeTab, setActiveTab] = useState<"complaints" | "consultant" | "becayis" | "filtered" | "today">("consultant");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterMode, setFilterMode] = useState<"all" | "filtered" | "unread">("all");
    const [stats, setStats] = useState<Stats>(initialStats);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);

    // Consultant data
    const [conversations, setConversations] = useState<ConsultantConversation[]>([]);
    // Becayis data (grouped conversations)
    const [becayisConversations, setBecayisConversations] = useState<BecayisConversation[]>([]);
    // Detail view
    const [detailView, setDetailView] = useState<{ type: "consultant" | "becayis"; id: string; title: string; senderId?: string; receiverId?: string; listingId?: string } | null>(null);
    const [detailMessages, setDetailMessages] = useState<DetailMessage[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    // Delete confirmation
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: string } | null>(null);
    // Bulk delete confirmation
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<{
        action: "delete-conversation" | "delete-becayis-thread" | "delete-all-user-messages";
        label: string;
        conversationId?: string;
        senderId?: string;
        receiverId?: string;
        listingId?: string;
        userId?: string;
    } | null>(null);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    // Complaints data
    const [complaints, setComplaints] = useState<Complaint[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ─── Fetch Data ─────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Map UI tabs to API tabs
            let apiTab = activeTab;
            if (activeTab === "filtered") apiTab = "consultant";
            if (activeTab === "today") apiTab = "consultant";

            const params = new URLSearchParams({
                tab: apiTab,
                search: searchQuery,
                filter: activeTab === "filtered" ? "filtered" : filterMode,
                page: String(page),
            });
            const res = await fetch(`/api/admin/messages?${params}`);
            const data = await res.json();

            if (data.stats) setStats(data.stats);
            if (data.conversations) setConversations(data.conversations);
            if (data.becayisConversations) setBecayisConversations(data.becayisConversations);
            if (data.complaints) setComplaints(data.complaints);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [activeTab, searchQuery, filterMode, page]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reset page on tab/search/filter change
    useEffect(() => {
        setPage(1);
        setDetailView(null);
    }, [activeTab, searchQuery, filterMode]);

    // ─── Detail View ────────────────────────────────────────────
    const openConversationDetail = async (conv: ConsultantConversation) => {
        setDetailView({ type: "consultant", id: conv.id, title: `${userName(conv.user)} ↔ ${conv.consultant.name}` });
        setDetailLoading(true);
        try {
            const res = await fetch(`/api/admin/messages?tab=conversation-detail&conversationId=${conv.id}`);
            const data = await res.json();
            setDetailMessages(data.messages || []);
        } catch { setDetailMessages([]); }
        finally { setDetailLoading(false); }
    };

    const openBecayisDetail = async (conv: BecayisConversation) => {
        setDetailView({
            type: "becayis",
            id: conv.listingId,
            title: `${userName(conv.sender)} ↔ ${userName(conv.receiver)}`,
            senderId: conv.senderId,
            receiverId: conv.receiverId,
            listingId: conv.listingId,
        });
        setDetailLoading(true);
        try {
            const res = await fetch(`/api/admin/messages?tab=becayis-detail&senderId=${conv.senderId}&receiverId=${conv.receiverId}&listingId=${conv.listingId}`);
            const data = await res.json();
            setDetailMessages(data.messages || []);
        } catch { setDetailMessages([]); }
        finally { setDetailLoading(false); }
    };

    useEffect(() => {
        if (detailMessages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [detailMessages]);

    // ─── Delete Message ─────────────────────────────────────────
    const handleDelete = async (messageId: string, type: string) => {
        try {
            await fetch("/api/admin/messages", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messageId, type }),
            });
            setDeleteConfirm(null);
            if (detailView) {
                setDetailMessages((prev: DetailMessage[]) => prev.filter((m: DetailMessage) => m.id !== messageId));
            }
            fetchData();
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    // ─── Bulk Delete ─────────────────────────────────────────────
    const handleBulkDelete = async () => {
        if (!bulkDeleteConfirm) return;
        setBulkDeleting(true);
        try {
            const body: Record<string, string> = { action: bulkDeleteConfirm.action };
            if (bulkDeleteConfirm.conversationId) body.conversationId = bulkDeleteConfirm.conversationId;
            if (bulkDeleteConfirm.senderId) body.senderId = bulkDeleteConfirm.senderId;
            if (bulkDeleteConfirm.receiverId) body.receiverId = bulkDeleteConfirm.receiverId;
            if (bulkDeleteConfirm.listingId) body.listingId = bulkDeleteConfirm.listingId;
            if (bulkDeleteConfirm.userId) body.userId = bulkDeleteConfirm.userId;

            await fetch("/api/admin/messages", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            setBulkDeleteConfirm(null);
            setDetailView(null);
            setDetailMessages([]);
            fetchData();
        } catch (err) {
            console.error("Bulk delete error:", err);
        } finally {
            setBulkDeleting(false);
        }
    };

    // ─── Render ─────────────────────────────────────────────────
    return (
        <div className="space-y-5">
            {/* ─── Stats Cards (Clickable) ────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatCard
                    icon={<Flag className="w-5 h-5" />}
                    label="Mesaj Şikayetleri"
                    value={stats.complaints?.total || 0}
                    sub={`${stats.complaints?.pending || 0} bekleyen`}
                    color="orange"
                    active={activeTab === "complaints"}
                    onClick={() => setActiveTab("complaints")}
                />
                <StatCard
                    icon={<MessageSquare className="w-5 h-5" />}
                    label="Danışman Mesajları"
                    value={stats.consultant.messages}
                    sub={`${stats.consultant.conversations} konuşma`}
                    color="blue"
                    active={activeTab === "consultant"}
                    onClick={() => setActiveTab("consultant")}
                />
                <StatCard
                    icon={<ArrowLeftRight className="w-5 h-5" />}
                    label="Becayiş Mesajları"
                    value={stats.becayis.messages}
                    sub={`${stats.becayis.conversations || 0} konuşma`}
                    color="purple"
                    active={activeTab === "becayis"}
                    onClick={() => setActiveTab("becayis")}
                />
                <StatCard
                    icon={<Shield className="w-5 h-5" />}
                    label="Filtrelenen"
                    value={stats.consultant.filtered + stats.becayis.filtered}
                    sub="içerik filtresi"
                    color="red"
                    active={activeTab === "filtered"}
                    onClick={() => setActiveTab("filtered")}
                />
                <StatCard
                    icon={<Clock className="w-5 h-5" />}
                    label="Bugün"
                    value={(stats.consultant.today || 0) + (stats.becayis.today || 0)}
                    sub="yeni mesaj"
                    color="green"
                    active={activeTab === "today"}
                    onClick={() => setActiveTab("today")}
                />
            </div>

            {/* ─── Tab Bar + Controls ────────────────────────────── */}
            <div className="glass-card p-0 overflow-hidden">
                <div className="flex items-center border-b border-[var(--border)] overflow-x-auto">
                    {[
                        { key: "complaints" as const, label: "Mesaj Şikayetleri", icon: <Flag className="w-4 h-4" />, badge: stats.complaints?.pending },
                        { key: "consultant" as const, label: "Danışman Mesajları", icon: <MessageSquare className="w-4 h-4" />, badge: stats.consultant.filtered > 0 ? stats.consultant.filtered : undefined },
                        { key: "becayis" as const, label: "Becayiş Mesajları", icon: <ArrowLeftRight className="w-4 h-4" />, badge: stats.becayis.filtered > 0 ? stats.becayis.filtered : undefined },
                        { key: "filtered" as const, label: "Filtrelenen", icon: <Shield className="w-4 h-4" /> },
                        { key: "today" as const, label: "Yeni Mesajlar", icon: <Clock className="w-4 h-4" /> },
                    ].map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key)}
                            className={`flex items-center justify-center gap-2 py-3.5 px-4 text-xs font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === t.key
                                ? "border-[var(--primary)] text-[var(--primary)]"
                                : "border-transparent text-text-muted hover:text-text-secondary"
                                }`}
                        >
                            {t.icon}
                            {t.label}
                            {t.badge && t.badge > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-semibold">
                                    {t.badge} 🚩
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Search + Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 border-b border-[var(--border)]">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Ad, soyad, email veya ilan ara..."
                            className="w-full !pl-10 text-sm !py-2.5 !rounded-lg"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
                            {[
                                { key: "all" as const, label: "Tümü", icon: <BarChart3 className="w-3.5 h-3.5" /> },
                                { key: "filtered" as const, label: "Filtreli", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
                                { key: "unread" as const, label: "Okunmamış", icon: <Eye className="w-3.5 h-3.5" /> },
                            ].map((f) => (
                                <button
                                    key={f.key}
                                    onClick={() => setFilterMode(f.key)}
                                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${filterMode === f.key
                                        ? "bg-[var(--primary)] text-white"
                                        : "text-text-muted hover:bg-[var(--bg-hover)]"
                                        }`}
                                >
                                    {f.icon} {f.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => fetchData()}
                            className="p-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors text-text-muted"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex" style={{ height: "calc(100vh - 380px)", minHeight: "500px" }}>
                    {/* ─── Left Panel: Conversation List ─────────────── */}
                    <div className={`${detailView ? "hidden lg:flex" : "flex"} flex-col w-full lg:w-[400px] border-r border-[var(--border)]`}>
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <RefreshCw className="w-6 h-6 animate-spin text-[var(--primary)]" />
                                </div>
                            ) : activeTab === "complaints" ? (
                                complaints.length === 0 ? (
                                    <EmptyState text="Mesaj şikayeti bulunamadı" />
                                ) : (
                                    complaints.map((c) => (
                                        <div
                                            key={c.id}
                                            className="w-full flex items-start gap-3 px-4 py-3.5 border-b border-[var(--border-light)] text-left hover:bg-[var(--bg-hover)] transition-colors"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500/10 to-red-500/10 flex items-center justify-center flex-shrink-0">
                                                <Flag className="w-4 h-4 text-orange-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <p className="text-sm font-semibold truncate">
                                                            {c.reporter ? userName(c.reporter) : "Bilinmiyor"}
                                                        </p>
                                                        <ArrowRight className="w-3 h-3 text-text-muted flex-shrink-0" />
                                                        <p className="text-sm truncate text-red-400">
                                                            {c.target ? userName(c.target) : "Bilinmiyor"}
                                                        </p>
                                                    </div>
                                                    <span className="text-[10px] text-text-muted flex-shrink-0">{fmtFull(c.createdAt)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-semibold">
                                                        {c.reason}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.status === "pending"
                                                            ? "bg-yellow-500/10 text-yellow-500"
                                                            : c.status === "resolved"
                                                                ? "bg-green-500/10 text-green-500"
                                                                : "bg-gray-500/10 text-gray-400"
                                                        }`}>
                                                        {c.status === "pending" ? "⏳ Bekliyor" : c.status === "resolved" ? "✅ Çözüldü" : c.status}
                                                    </span>
                                                </div>
                                                {c.messageId && (
                                                    <p className="text-[10px] text-text-muted mt-1">Mesaj ID: {c.messageId}</p>
                                                )}
                                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-text-muted">
                                                    {c.reporter?.email && <span>📧 {c.reporter.email}</span>}
                                                    {c.target?.phone && <span>📱 {c.target.phone}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )
                            ) : activeTab === "consultant" || activeTab === "filtered" || activeTab === "today" ? (
                                conversations.length === 0 ? (
                                    <EmptyState text="Konuşma bulunamadı" />
                                ) : (
                                    conversations.map((conv) => (
                                        <button
                                            key={conv.id}
                                            onClick={() => openConversationDetail(conv)}
                                            className={`w-full flex items-start gap-3 px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border-light)] text-left ${detailView?.id === conv.id ? "bg-[var(--bg-active)] border-l-2 border-l-[var(--primary)]" : ""
                                                }`}
                                        >
                                            <Avatar name={userName(conv.user)} url={conv.user.avatarUrl} online={false} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <p className="text-sm font-semibold truncate">{userName(conv.user)}</p>
                                                        {conv.user.isPremium && <span className="text-[10px]">👑</span>}
                                                        {conv.user.accountFrozen && <span className="text-[10px]">🔒</span>}
                                                        {conv.messages[0]?.isFiltered && (
                                                            <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 text-[9px] font-bold">🚩 FİLTRE</span>
                                                        )}
                                                    </div>
                                                    {conv.lastMessageAt && (
                                                        <span className="text-[10px] text-text-muted flex-shrink-0">{fmtDate(conv.lastMessageAt)}</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-[var(--primary)] mt-0.5">
                                                    ↔ {conv.consultant.name} · {conv.consultant.category || "Genel"}
                                                </p>
                                                <div className="flex items-center justify-between mt-1">
                                                    <p className="text-xs text-text-muted truncate pr-2">{conv.lastMessage || "Mesaj yok"}</p>
                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        {conv.messages[0] && <StatusIcon status={conv.messages[0].status} />}
                                                        {conv.unreadCount > 0 && (
                                                            <span className="w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[10px] flex items-center justify-center font-bold">
                                                                {conv.unreadCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )
                            ) : becayisConversations.length === 0 ? (
                                <EmptyState text="Becayiş konuşması bulunamadı" />
                            ) : (
                                becayisConversations.map((conv) => (
                                    <button
                                        key={`${conv.senderId}_${conv.receiverId}_${conv.listingId}`}
                                        onClick={() => openBecayisDetail(conv)}
                                        className={`w-full flex items-start gap-3 px-4 py-3.5 hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border-light)] text-left ${detailView?.listingId === conv.listingId && detailView?.senderId === conv.senderId ? "bg-[var(--bg-active)] border-l-2 border-l-[var(--primary)]" : ""
                                            }`}
                                    >
                                        <Avatar name={userName(conv.sender)} url={conv.sender.avatarUrl} online={false} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <p className="text-sm font-semibold truncate">
                                                        {userName(conv.sender)}
                                                    </p>
                                                    <ArrowRight className="w-3 h-3 text-text-muted flex-shrink-0" />
                                                    <p className="text-sm truncate">{userName(conv.receiver)}</p>
                                                    {conv.hasFiltered && (
                                                        <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 text-[9px] font-bold">🚩 FİLTRE</span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-text-muted flex-shrink-0">{fmtDate(conv.lastMessageAt)}</span>
                                            </div>
                                            <p className="text-[11px] text-purple-400 mt-0.5 truncate">
                                                📋 {conv.listing.title || `${conv.listing.currentCity} → ${conv.listing.targetCity}`}
                                                {conv.listing.adNumber && ` · #${conv.listing.adNumber}`}
                                            </p>
                                            <div className="flex items-center justify-between mt-1">
                                                <p className="text-xs text-text-muted truncate pr-2">{conv.lastMessage}</p>
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <span className="text-[10px] text-text-muted">{conv.messageCount} msj</span>
                                                    {conv.unreadCount > 0 && (
                                                        <span className="w-5 h-5 rounded-full bg-[var(--primary)] text-white text-[10px] flex items-center justify-center font-bold">
                                                            {conv.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] bg-[var(--bg-muted)]">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] disabled:opacity-30 transition"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-text-muted">Sayfa {page}</span>
                            <button
                                onClick={() => setPage((p) => p + 1)}
                                disabled={
                                    activeTab === "complaints" ? complaints.length < 30 :
                                        activeTab === "becayis" ? becayisConversations.length < 30 :
                                            conversations.length < 30
                                }
                                className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] disabled:opacity-30 transition"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* ─── Right Panel: Conversation Detail ──────────── */}
                    <div className={`${!detailView ? "hidden lg:flex" : "flex"} flex-col flex-1`}>
                        {!detailView ? (
                            <div className="flex-1 flex items-center justify-center text-text-muted">
                                <div className="text-center">
                                    <div className="w-20 h-20 rounded-2xl bg-[var(--primary)]/10 mx-auto flex items-center justify-center mb-4">
                                        <MessageCircle className="w-9 h-9 text-[var(--primary)]" />
                                    </div>
                                    <p className="text-base font-medium text-text-secondary">Konuşma Seçin</p>
                                    <p className="text-sm mt-1">Sol taraftan bir konuşmaya tıklayarak mesajları görüntüleyin</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Detail Header */}
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-muted)]">
                                    <button onClick={() => setDetailView(null)} className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--bg-hover)]">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <MessageCircle className="w-5 h-5 text-[var(--primary)]" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{detailView.title}</p>
                                        <p className="text-[10px] text-text-muted">
                                            {detailMessages.length} mesaj · {detailMessages.filter((m: DetailMessage) => m.isFiltered).length} filtrelenmiş
                                        </p>
                                    </div>
                                    {/* Bulk Delete Button */}
                                    <button
                                        onClick={() => {
                                            if (detailView.type === "consultant") {
                                                setBulkDeleteConfirm({
                                                    action: "delete-conversation",
                                                    label: `"${detailView.title}" konuşmasındaki tüm mesajları ve konuşma kaydını`,
                                                    conversationId: detailView.id,
                                                });
                                            } else {
                                                setBulkDeleteConfirm({
                                                    action: "delete-becayis-thread",
                                                    label: `"${detailView.title}" arasındaki tüm becayiş mesajlarını`,
                                                    senderId: detailView.senderId,
                                                    receiverId: detailView.receiverId,
                                                    listingId: detailView.listingId,
                                                });
                                            }
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-medium transition-colors"
                                        title="Tüm konuşmayı sil"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Tümünü Sil
                                    </button>
                                    <button
                                        onClick={() => setDetailView(null)}
                                        className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition text-text-muted"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                    {detailLoading ? (
                                        <div className="flex items-center justify-center py-20">
                                            <RefreshCw className="w-6 h-6 animate-spin text-[var(--primary)]" />
                                        </div>
                                    ) : detailMessages.length === 0 ? (
                                        <EmptyState text="Bu konuşmada mesaj yok" />
                                    ) : (
                                        detailMessages.map((msg) => {
                                            const text = msg.text || msg.content || "";
                                            const senderName = userName(msg.sender);
                                            return (
                                                <div key={msg.id} className="group relative">
                                                    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-colors hover:bg-[var(--bg-hover)] ${msg.isFiltered ? "bg-red-500/5 border border-red-500/20" : ""
                                                        }`}>
                                                        <Avatar name={senderName} url={msg.sender.avatarUrl} size="sm" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-semibold">{senderName}</span>
                                                                <span className="text-[10px] text-text-muted">{fmtFull(msg.createdAt)}</span>
                                                                <StatusIcon status={msg.status} />
                                                                {msg.isFiltered && (
                                                                    <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 text-[9px] font-bold flex items-center gap-0.5">
                                                                        <AlertTriangle className="w-2.5 h-2.5" /> FİLTRELENDİ
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm mt-1 whitespace-pre-wrap break-words leading-relaxed">{text}</p>
                                                        </div>
                                                        {/* Admin action: Delete */}
                                                        <button
                                                            onClick={() => setDeleteConfirm({ id: msg.id, type: detailView.type })}
                                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-all"
                                                            title="Mesajı sil"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Admin Notice */}
                                <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[var(--bg-muted)]">
                                    <p className="text-[11px] text-text-muted flex items-center gap-1.5">
                                        <Shield className="w-3.5 h-3.5" />
                                        Admin olarak tüm mesajları görüntüleyebilir ve kural dışı mesajları silebilirsiniz.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Delete Confirmation Modal (tekil) ──────────────── */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--bg-card)] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold">Mesajı Sil</h3>
                                <p className="text-xs text-text-muted">Bu işlem geri alınamaz</p>
                            </div>
                        </div>
                        <p className="text-sm text-text-secondary mb-5">
                            Bu mesajı kalıcı olarak silmek istediğinize emin misiniz? Mobilden de silinecek.
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--bg-hover)] transition"
                            >
                                İptal
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm.id, deleteConfirm.type)}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition"
                            >
                                Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Bulk Delete Confirmation Modal ──────────────────── */}
            {bulkDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--bg-card)] rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-red-500">⚠️ Toplu Silme</h3>
                                <p className="text-xs text-text-muted">Bu işlem geri alınamaz!</p>
                            </div>
                        </div>
                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 mb-4">
                            <p className="text-sm text-text-secondary">
                                <strong>{bulkDeleteConfirm.label}</strong> kalıcı olarak silmek üzeresiniz.
                            </p>
                            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5" />
                                Mesajlar veritabanından silinir — mobil uygulamada da görünmez olur.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setBulkDeleteConfirm(null)}
                                disabled={bulkDeleting}
                                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--bg-hover)] transition disabled:opacity-50"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={bulkDeleting}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {bulkDeleting ? (
                                    <><RefreshCw className="w-4 h-4 animate-spin" /> Siliniyor...</>
                                ) : (
                                    <><Trash2 className="w-4 h-4" /> Tümünü Sil</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Sub-components ────────────────────────────────────────── */

function StatCard({ icon, label, value, sub, color, active, onClick }: { icon: React.ReactNode; label: string; value: number; sub: string; color: string; active?: boolean; onClick?: () => void }) {
    const colorMap: Record<string, string> = {
        blue: "from-blue-500/10 to-blue-600/5 text-blue-500",
        purple: "from-purple-500/10 to-purple-600/5 text-purple-500",
        red: "from-red-500/10 to-red-600/5 text-red-500",
        green: "from-green-500/10 to-green-600/5 text-green-500",
        orange: "from-orange-500/10 to-orange-600/5 text-orange-500",
    };
    return (
        <div
            className={`glass-card !p-4 cursor-pointer transition-all hover:scale-[1.02] ${active ? "ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--bg)]" : ""}`}
            onClick={onClick}
        >
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center`}>{icon}</div>
                <div>
                    <p className="text-xl font-bold">{value.toLocaleString("tr-TR")}</p>
                    <p className="text-[11px] text-text-muted">{label}</p>
                </div>
            </div>
            <p className="text-[10px] text-text-muted mt-2 pl-[52px]">{sub}</p>
        </div>
    );
}

function Avatar({ name, url, online, size = "md" }: { name: string; url?: string | null; online?: boolean; size?: "sm" | "md" }) {
    const dims = size === "sm" ? "w-7 h-7 text-[11px]" : "w-10 h-10 text-sm";
    return (
        <div className="relative flex-shrink-0">
            {url ? (
                <img src={url} alt={name} className={`${dims} rounded-full object-cover`} />
            ) : (
                <div className={`${dims} rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-light)] flex items-center justify-center text-white font-semibold`}>
                    {name[0]?.toUpperCase() || "?"}
                </div>
            )}
            {online && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-[var(--bg-card)]" />
            )}
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">{text}</p>
        </div>
    );
}
