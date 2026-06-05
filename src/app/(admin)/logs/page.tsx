export const dynamic = "force-dynamic";

import { Activity, AlertTriangle, Shield, Clock, User, Globe, Server } from "lucide-react";

// Mock audit trail data
const auditTrail = [
    { id: 1, admin: "Admin Kamulog", action: "Kullanıcı oluşturdu: Ahmet Y.", timestamp: "2026-02-26 05:42", ip: "91.151.95.75", type: "user" },
    { id: 2, admin: "Admin Kamulog", action: "Becayiş ilanı onayladı: #1024", timestamp: "2026-02-26 05:30", ip: "91.151.95.75", type: "listing" },
    { id: 3, admin: "Admin Kamulog", action: "50 jeton ekledi: Fatma D.", timestamp: "2026-02-26 05:15", ip: "91.151.95.75", type: "token" },
    { id: 4, admin: "Mod Zeynep", action: "Danışman profili güncelledi: Av. Mehmet K.", timestamp: "2026-02-26 04:50", ip: "185.92.1.12", type: "consultant" },
    { id: 5, admin: "Admin Kamulog", action: "Bildirim gönderdi: Tüm kullanıcılar", timestamp: "2026-02-26 04:30", ip: "91.151.95.75", type: "notification" },
    { id: 6, admin: "Admin Kamulog", action: "Kullanıcı askıya aldı: Ali K.", timestamp: "2026-02-26 03:20", ip: "91.151.95.75", type: "user" },
    { id: 7, admin: "Mod Zeynep", action: "Haber yayınladı: Becayiş başvuruları açıldı", timestamp: "2026-02-25 22:10", ip: "185.92.1.12", type: "content" },
    { id: 8, admin: "Admin Kamulog", action: "Abonelik planı güncelledi: Premium Gold", timestamp: "2026-02-25 21:45", ip: "91.151.95.75", type: "subscription" },
];

const errorLogs = [
    { id: 1, level: "ERROR", message: "OTP doğrulama başarısız: +90 532 *** 45 12 — 3 deneme", timestamp: "2026-02-26 05:38", source: "auth-service" },
    { id: 2, level: "WARN", message: "Yüksek bellek kullanımı: 87% — PM2 cluster 1", timestamp: "2026-02-26 05:20", source: "system-monitor" },
    { id: 3, level: "ERROR", message: "Veritabanı bağlantı zaman aşımı: 5000ms", timestamp: "2026-02-26 04:55", source: "prisma-client" },
    { id: 4, level: "WARN", message: "Rate limit aşıldı: IP 185.92.1.12 — 100 istek/dk", timestamp: "2026-02-26 04:30", source: "middleware" },
    { id: 5, level: "INFO", message: "PM2 cluster yeniden başlatıldı", timestamp: "2026-02-26 04:00", source: "system-monitor" },
];

export default function LogsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text)" }}>
                    <Activity className="w-6 h-6" style={{ color: "var(--primary)" }} /> Sistem Logları
                </h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Audit trail ve hata logları</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "Audit Kaydı", value: auditTrail.length, icon: Shield, gradient: "from-blue-500 to-blue-600" },
                    { label: "Hata", value: errorLogs.filter(e => e.level === "ERROR").length, icon: AlertTriangle, gradient: "from-red-500 to-red-600" },
                    { label: "Uyarı", value: errorLogs.filter(e => e.level === "WARN").length, icon: AlertTriangle, gradient: "from-yellow-500 to-yellow-600" },
                    { label: "Aktif Oturum", value: 2, icon: User, gradient: "from-green-500 to-green-600" },
                ].map(s => (
                    <div key={s.label} className="stat-card">
                        <div className="flex items-center justify-between">
                            <div><p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p><p className="text-2xl font-bold mt-1" style={{ color: "var(--text)" }}>{s.value}</p></div>
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center`}><s.icon className="w-5 h-5 text-white" /></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Audit Trail */}
            <div className="card">
                <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}><Shield className="w-4 h-4" style={{ color: "var(--primary)" }} /> Audit Trail</h3>
                </div>
                <div className="overflow-x-auto">
                    <table>
                        <thead><tr>
                            <th>Admin</th><th>İşlem</th><th>Zaman</th><th>IP Adresi</th>
                        </tr></thead>
                        <tbody>
                            {auditTrail.map(a => (
                                <tr key={a.id}>
                                    <td><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-semibold">{a.admin.charAt(0)}</div><span className="text-sm font-medium" style={{ color: "var(--text)" }}>{a.admin}</span></div></td>
                                    <td><span className="text-sm" style={{ color: "var(--text-secondary)" }}>{a.action}</span></td>
                                    <td><div className="flex items-center gap-1"><Clock className="w-3 h-3" style={{ color: "var(--text-muted)" }} /><span className="text-xs" style={{ color: "var(--text-muted)" }}>{a.timestamp}</span></div></td>
                                    <td><div className="flex items-center gap-1"><Globe className="w-3 h-3" style={{ color: "var(--text-muted)" }} /><code className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>{a.ip}</code></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Error Logs */}
            <div className="card">
                <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    <h3 className="font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}><AlertTriangle className="w-4 h-4 text-red-500" /> Hata & Uyarı Logları</h3>
                </div>
                <div className="overflow-x-auto">
                    <table>
                        <thead><tr>
                            <th>Seviye</th><th>Mesaj</th><th>Kaynak</th><th>Zaman</th>
                        </tr></thead>
                        <tbody>
                            {errorLogs.map(e => (
                                <tr key={e.id}>
                                    <td>
                                        <span className={`badge ${e.level === "ERROR" ? "badge-red" : e.level === "WARN" ? "badge-yellow" : "badge-blue"}`}>
                                            {e.level}
                                        </span>
                                    </td>
                                    <td><span className="text-sm" style={{ color: "var(--text)" }}>{e.message}</span></td>
                                    <td><code className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>{e.source}</code></td>
                                    <td><span className="text-xs" style={{ color: "var(--text-muted)" }}>{e.timestamp}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
