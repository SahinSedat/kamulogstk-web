"use client";

import { useState, useEffect } from "react";

interface ReportedAdOwner {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    phoneNumber: string | null;
    avatarUrl: string | null;
    isPremium: boolean;
    isActive: boolean;
    accountFrozen: boolean;
    city: string | null;
    employmentType: string | null;
    createdAt: string;
}

interface ReportedAd {
    id: string;
    title: string;
    currentCity: string;
    targetCity: string;
    branch: string;
    status: string;
    adNumber: string | null;
    isPremium: boolean;
    owner: ReportedAdOwner;
}

interface Report {
    id: string;
    reporterId: string;
    reportedAdId: string;
    reason: string;
    status: string;
    createdAt: string;
    reporter?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string | null;
        phoneNumber: string | null;
    };
    reportedAd?: ReportedAd;
}

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [actionLoading, setActionLoading] = useState(false);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/reports");
            const data = await res.json();
            setReports(data.reports || []);
        } catch {
            console.error("Şikayetler yüklenemedi");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const filtered =
        statusFilter === "all"
            ? reports
            : reports.filter((r) => r.status === statusFilter);

    const statusBadge = (status: string) => {
        const colors: Record<string, string> = {
            pending: "bg-yellow-100 text-yellow-700",
            reviewed: "bg-blue-100 text-blue-700",
            resolved: "bg-green-100 text-green-700",
            dismissed: "bg-gray-100 text-gray-500",
        };
        const labels: Record<string, string> = {
            pending: "Bekliyor",
            reviewed: "İnceleniyor",
            resolved: "Çözüldü",
            dismissed: "Reddedildi",
        };
        return (
            <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || "bg-gray-100 text-gray-500"
                    }`}
            >
                {labels[status] || status}
            </span>
        );
    };

    const handleUpdateStatus = async (reportId: string, newStatus: string) => {
        setActionLoading(true);
        try {
            await fetch("/api/admin/reports", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reportId, status: newStatus }),
            });
            await fetchReports();
            if (selectedReport?.id === reportId) {
                setSelectedReport((prev) =>
                    prev ? { ...prev, status: newStatus } : null
                );
            }
        } catch {
            console.error("Durum güncellenemedi");
        }
        setActionLoading(false);
    };

    const handleSuspendListing = async (listingId: string) => {
        setActionLoading(true);
        try {
            await fetch(`/api/becayis`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: listingId, status: "suspended" }),
            });
            alert("İlan askıya alındı.");
            await fetchReports();
        } catch {
            console.error("İlan askıya alınamadı");
        }
        setActionLoading(false);
    };

    const pendingCount = reports.filter((r) => r.status === "pending").length;
    const resolvedCount = reports.filter((r) => r.status === "resolved").length;

    const ownerName = (ad?: ReportedAd) => {
        if (!ad?.owner) return "—";
        return [ad.owner.firstName, ad.owner.lastName].filter(Boolean).join(" ") || ad.owner.email;
    };

    const reporterName = (report: Report) => {
        if (!report.reporter) return report.reporterId.slice(0, 8);
        return [report.reporter.firstName, report.reporter.lastName].filter(Boolean).join(" ") || "—";
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        🚩 Şikayet Yönetimi
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Kullanıcılardan gelen ilan şikayetlerini inceleyin ve yönetin
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                            {pendingCount}
                        </div>
                        <div className="text-xs text-yellow-600">Bekleyen</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {resolvedCount}
                        </div>
                        <div className="text-xs text-green-600">Çözülen</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                            {reports.length}
                        </div>
                        <div className="text-xs text-blue-600">Toplam</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {["all", "pending", "reviewed", "resolved", "dismissed"].map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === s
                            ? "bg-blue-600 text-white shadow"
                            : "bg-white text-gray-600 border hover:bg-gray-50"
                            }`}
                    >
                        {s === "all"
                            ? "Tümü"
                            : s === "pending"
                                ? "Bekleyen"
                                : s === "reviewed"
                                    ? "İnceleniyor"
                                    : s === "resolved"
                                        ? "Çözülen"
                                        : "Reddedilen"}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Report List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center text-gray-400">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
                                Yükleniyor...
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <div className="text-4xl mb-3">📋</div>
                                Şikayet bulunamadı
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                                            Şikayet Eden
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                                            Şikayet Edilen
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                                            Sebep
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                                            Durum
                                        </th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                                            Tarih
                                        </th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((report) => (
                                        <tr
                                            key={report.id}
                                            className={`border-b hover:bg-blue-50 cursor-pointer transition-colors ${selectedReport?.id === report.id ? "bg-blue-50" : ""
                                                }`}
                                            onClick={() => setSelectedReport(report)}
                                        >
                                            <td className="px-4 py-3 text-sm">
                                                {reporterName(report)}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {ownerName(report.reportedAd)}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium">
                                                {report.reason}
                                            </td>
                                            <td className="px-4 py-3">
                                                {statusBadge(report.status)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {new Date(report.createdAt).toLocaleDateString("tr-TR")}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button className="text-blue-500 hover:text-blue-700 text-sm font-medium">
                                                    Detay →
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Detail Panel */}
                <div className="lg:col-span-1">
                    {selectedReport ? (
                        <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-4 sticky top-6">
                            <h3 className="font-bold text-lg">Şikayet Detayı</h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-gray-400 uppercase">
                                        Sebep
                                    </label>
                                    <p className="text-sm font-semibold text-red-600">
                                        {selectedReport.reason}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-400 uppercase">
                                        Durum
                                    </label>
                                    <div className="mt-1">{statusBadge(selectedReport.status)}</div>
                                </div>

                                {/* Şikayet Eden Kullanıcı */}
                                <div className="bg-orange-50 rounded-xl p-3">
                                    <label className="text-xs text-orange-600 uppercase font-semibold">
                                        🙋 Şikayet Eden Kullanıcı
                                    </label>
                                    <p className="text-sm font-bold mt-1">
                                        {reporterName(selectedReport)}
                                    </p>
                                    {selectedReport.reporter?.email && (
                                        <p className="text-xs text-gray-500">
                                            📧 {selectedReport.reporter.email}
                                        </p>
                                    )}
                                    {(selectedReport.reporter?.phone || selectedReport.reporter?.phoneNumber) && (
                                        <p className="text-xs text-gray-500">
                                            📞 {selectedReport.reporter.phone || selectedReport.reporter.phoneNumber}
                                        </p>
                                    )}
                                </div>

                                {/* Şikayet Edilen İlan */}
                                {selectedReport.reportedAd && (
                                    <div className="bg-blue-50 rounded-xl p-3">
                                        <label className="text-xs text-blue-600 uppercase font-semibold">
                                            📋 Şikayet Edilen İlan
                                        </label>
                                        <p className="text-sm font-bold mt-1">{selectedReport.reportedAd.title}</p>
                                        {selectedReport.reportedAd.adNumber && (
                                            <p className="text-xs font-mono text-blue-500 mt-0.5">
                                                #{selectedReport.reportedAd.adNumber}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-600">
                                            {selectedReport.reportedAd.currentCity} → {selectedReport.reportedAd.targetCity}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Branş: {selectedReport.reportedAd.branch}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${selectedReport.reportedAd.status === 'published' || selectedReport.reportedAd.status === 'approved'
                                                    ? 'bg-green-100 text-green-700'
                                                    : selectedReport.reportedAd.status === 'suspended'
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {selectedReport.reportedAd.status}
                                            </span>
                                            {selectedReport.reportedAd.isPremium && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold">
                                                    👑 VIP
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Şikayet Edilen İlan Sahibi */}
                                {selectedReport.reportedAd?.owner && (
                                    <div className="bg-red-50 rounded-xl p-3">
                                        <label className="text-xs text-red-600 uppercase font-semibold">
                                            👤 İlan Sahibi (Şikayet Edilen)
                                        </label>
                                        <p className="text-sm font-bold mt-1">
                                            {ownerName(selectedReport.reportedAd)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            📧 {selectedReport.reportedAd.owner.email}
                                        </p>
                                        {(selectedReport.reportedAd.owner.phone || selectedReport.reportedAd.owner.phoneNumber) && (
                                            <p className="text-xs text-gray-500">
                                                📞 {selectedReport.reportedAd.owner.phone || selectedReport.reportedAd.owner.phoneNumber}
                                            </p>
                                        )}
                                        {selectedReport.reportedAd.owner.city && (
                                            <p className="text-xs text-gray-500">
                                                📍 {selectedReport.reportedAd.owner.city}
                                            </p>
                                        )}
                                        {selectedReport.reportedAd.owner.employmentType && (
                                            <p className="text-xs text-gray-500">
                                                💼 {selectedReport.reportedAd.owner.employmentType}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1.5">
                                            {selectedReport.reportedAd.owner.isPremium && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold">
                                                    👑 Premium
                                                </span>
                                            )}
                                            {selectedReport.reportedAd.owner.accountFrozen && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                                                    🔒 Dondurulmuş
                                                </span>
                                            )}
                                            {!selectedReport.reportedAd.owner.isActive && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">
                                                    ⚪ İnaktif
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            Kayıt: {new Date(selectedReport.reportedAd.owner.createdAt).toLocaleDateString("tr-TR")}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs text-gray-400 uppercase">
                                        Tarih
                                    </label>
                                    <p className="text-sm">
                                        {new Date(selectedReport.createdAt).toLocaleString("tr-TR")}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="border-t pt-4 space-y-2">
                                <p className="text-xs text-gray-400 uppercase font-semibold">
                                    İşlemler
                                </p>
                                {selectedReport.status === "pending" && (
                                    <>
                                        <button
                                            disabled={actionLoading}
                                            onClick={() =>
                                                handleUpdateStatus(selectedReport.id, "reviewed")
                                            }
                                            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                                        >
                                            📋 İncelemeye Al
                                        </button>
                                        <button
                                            disabled={actionLoading}
                                            onClick={() =>
                                                handleUpdateStatus(selectedReport.id, "dismissed")
                                            }
                                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                                        >
                                            ❌ Şikayeti Reddet
                                        </button>
                                    </>
                                )}
                                {selectedReport.status === "reviewed" && (
                                    <>
                                        <button
                                            disabled={actionLoading}
                                            onClick={() =>
                                                handleUpdateStatus(selectedReport.id, "resolved")
                                            }
                                            className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                                        >
                                            ✅ Çözüldü Olarak İşaretle
                                        </button>
                                        {selectedReport.reportedAd && selectedReport.reportedAd.status !== "suspended" && (
                                            <button
                                                disabled={actionLoading}
                                                onClick={() =>
                                                    handleSuspendListing(selectedReport.reportedAdId)
                                                }
                                                className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                                            >
                                                🚫 İlanı Askıya Al
                                            </button>
                                        )}
                                    </>
                                )}
                                {(selectedReport.status === "resolved" ||
                                    selectedReport.status === "dismissed") && (
                                        <button
                                            disabled={actionLoading}
                                            onClick={() =>
                                                handleUpdateStatus(selectedReport.id, "pending")
                                            }
                                            className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-700 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                                        >
                                            🔄 Tekrar Bekleyene Al
                                        </button>
                                    )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center text-gray-400">
                            <div className="text-4xl mb-3">👈</div>
                            <p className="text-sm">
                                Detay görmek için bir şikayete tıklayın
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
