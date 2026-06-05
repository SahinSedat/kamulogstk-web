"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Bot, Wifi, WifiOff, Loader2, QrCode, RefreshCw, Clock,
    Send, Phone, CheckCircle2, XCircle, AlertTriangle,
    Shield, Hash, RotateCcw,
} from "lucide-react";

const BOT_API = "/api/admin/whatsapp-bot";

interface LogEntry {
    id: string;
    phoneNumber: string;
    message: string;
    messageType: string;
    status: string;
    errorMessage: string | null;
    createdAt: string;
}

export default function WhatsAppBotPage() {
    const [status, setStatus] = useState("loading");
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [connectedNumber, setConnectedNumber] = useState<string | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [stats, setStats] = useState({ total: 0, sent: 0, verified: 0, failed: 0 });
    const [actionLoading, setActionLoading] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const [sRes, lRes] = await Promise.all([
                fetch(BOT_API),
                fetch(`${BOT_API}/logs`),
            ]);
            if (sRes.ok) {
                const d = await sRes.json();
                setStatus(d.status || "disconnected");
                setQrDataUrl(d.qrDataUrl || null);
                setConnectedNumber(d.connectedNumber || null);
                setLastError(d.lastError || null);
            }
            if (lRes.ok) {
                const d = await lRes.json();
                setLogs(d.logs || []);
                setStats(d.stats || { total: 0, sent: 0, verified: 0, failed: 0 });
            }
        } catch { }
    }, []);

    useEffect(() => {
        fetchStatus();
        const iv = setInterval(fetchStatus, 3000);
        return () => clearInterval(iv);
    }, [fetchStatus]);

    const handleRestart = async () => {
        setActionLoading(true);
        try {
            await fetch(BOT_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "restart" }),
            });
            await new Promise(r => setTimeout(r, 3000));
            await fetchStatus();
        } finally { setActionLoading(false); }
    };

    const fmtDate = (d: string) =>
        new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        WhatsApp Bot
                    </h2>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                        7/24 aktif mesaj botu
                    </p>
                </div>
                <button
                    onClick={handleRestart}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    Yeniden Başlat
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={<Hash className="w-4 h-4" />} label="Toplam" value={stats.total} color="var(--primary)" />
                <StatCard icon={<Send className="w-4 h-4" />} label="Gönderildi" value={stats.sent} color="#25D366" />
                <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Doğrulandı" value={stats.verified} color="#3182CE" />
                <StatCard icon={<XCircle className="w-4 h-4" />} label="Başarısız" value={stats.failed} color="#E53E3E" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* ─── SOL: Durum + QR (2 col) ─── */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Connection Status */}
                    <StatusCard status={status} connectedNumber={connectedNumber} lastError={lastError} />

                    {/* QR Code — Auto-ready */}
                    {(status === "waiting_qr" || status === "connecting") && qrDataUrl && (
                        <div className="rounded-2xl p-5 text-center animate-scale-in"
                            style={{ background: "var(--bg-card)", border: "1px solid rgba(37,211,102,.2)" }}>
                            <div className="flex items-center justify-center gap-2 mb-3">
                                <QrCode className="w-5 h-5" style={{ color: "#25D366" }} />
                                <h3 className="font-semibold text-sm">QR Kodu Okutun</h3>
                            </div>
                            <div className="inline-block p-2 bg-white rounded-2xl shadow-sm">
                                <img src={qrDataUrl} alt="WhatsApp QR" width={260} height={260}
                                    className="rounded-lg" style={{ imageRendering: "pixelated" }} />
                            </div>
                            <div className="mt-3 space-y-1">
                                <p className="text-xs font-medium" style={{ color: "#25D366" }}>
                                    WhatsApp → Bağlı Cihazlar → QR Okut
                                </p>
                                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    QR kodu otomatik yenilenir, sürekli günceldir
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Connected Info */}
                    {status === "connected" && connectedNumber && (
                        <div className="rounded-2xl p-5 animate-scale-in"
                            style={{ background: "rgba(37,211,102,.05)", border: "1px solid rgba(37,211,102,.15)" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                                    style={{ background: "rgba(37,211,102,.12)" }}>
                                    <Phone className="w-6 h-6" style={{ color: "#25D366" }} />
                                </div>
                                <div>
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Bağlı Numara</p>
                                    <p className="font-bold font-mono text-lg" style={{ color: "#25D366" }}>
                                        +{connectedNumber}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5" style={{ color: "#25D366" }} />
                                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                                    OTP mesajları bu numaradan otomatik gönderilecek
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Loading state */}
                    {status === "loading" && (
                        <div className="rounded-2xl p-8 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "var(--primary)" }} />
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Bot durumu kontrol ediliyor...</p>
                        </div>
                    )}
                </div>

                {/* ─── SAĞ: Loglar (3 col) ─── */}
                <div className="lg:col-span-3">
                    <div className="rounded-2xl overflow-hidden"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                            <span className="text-sm font-semibold flex items-center gap-2">
                                <Clock className="w-4 h-4" style={{ color: "var(--primary)" }} /> OTP Logları
                                <span className="text-xs font-normal px-2 py-0.5 rounded-full"
                                    style={{ background: "var(--bg-muted)", color: "var(--text-muted)" }}>Son 50</span>
                            </span>
                            <button onClick={fetchStatus} style={{ color: "var(--text-muted)" }}>
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="max-h-[460px] overflow-y-auto">
                            {logs.length === 0 ? (
                                <div className="p-10 text-center">
                                    <Clock className="w-7 h-7 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Henüz OTP logu yok</p>
                                </div>
                            ) : logs.map((l) => (
                                <div key={l.id} className="px-4 py-2.5 transition-colors"
                                    style={{ borderBottom: "1px solid var(--border-light)" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono">{l.phoneNumber}</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                            style={{
                                                background: l.status === "VERIFIED" ? "rgba(49,130,206,.1)" : l.status === "SENT" ? "rgba(72,187,120,.1)" : "rgba(229,62,62,.1)",
                                                color: l.status === "VERIFIED" ? "#3182CE" : l.status === "SENT" ? "#48BB78" : "#E53E3E",
                                            }}>
                                            {l.status === "VERIFIED" ? "✓ Doğrulandı" : l.status === "SENT" ? "● Gönderildi" : "✗ Başarısız"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between mt-0.5">
                                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                                            {l.messageType === "OTP" ? `OTP: ${l.message.slice(0, 3)}***` : l.message.slice(0, 30)}
                                        </span>
                                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{fmtDate(l.createdAt)}</span>
                                    </div>
                                    {l.errorMessage && (
                                        <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: "#E53E3E" }}>
                                            <AlertTriangle className="w-3 h-3" /> {l.errorMessage}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatusCard({ status, connectedNumber, lastError }: { status: string; connectedNumber: string | null; lastError: string | null }) {
    const isConnected = status === "connected";
    const isQR = status === "waiting_qr";
    const isConnecting = status === "connecting";
    const color = isConnected ? "#25D366" : isQR ? "#ED8936" : "var(--text-muted)";
    return (
        <div className="flex items-center gap-4 p-4 rounded-2xl"
            style={{ background: isConnected ? "rgba(37,211,102,.05)" : "var(--bg-card)", border: `1px solid ${isConnected ? "rgba(37,211,102,.15)" : "var(--border)"}` }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: isConnected ? "rgba(37,211,102,.12)" : isQR || isConnecting ? "rgba(237,137,54,.12)" : "var(--bg-muted)" }}>
                {isConnected ? <Wifi className="w-6 h-6" style={{ color: "#25D366" }} /> :
                    isQR || isConnecting ? <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#ED8936" }} /> :
                        <WifiOff className="w-6 h-6" style={{ color: "var(--text-muted)" }} />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">
                    {isConnected ? "Bot Aktif — 7/24" : isQR ? "QR Kodu Hazır" : isConnecting ? "Bağlanıyor..." : "Başlatılıyor..."}
                </p>
                <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                    {isConnected ? `${connectedNumber} numarası ile bağlı` :
                        isQR ? "QR kodu okutarak bağlanın" :
                            lastError ? lastError : "Bot başlatılıyor..."}
                </p>
            </div>
            <div className="px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 flex-shrink-0"
                style={{ background: `${color}18`, color }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
                {isConnected ? "Online" : isQR ? "QR Hazır" : "Bağlanıyor"}
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
    return (
        <div className="rounded-xl p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-1">
                <span style={{ color }} className="opacity-60">{icon}</span>
                <span className="text-xl font-bold" style={{ color }}>{value}</span>
            </div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{label}</p>
        </div>
    );
}
