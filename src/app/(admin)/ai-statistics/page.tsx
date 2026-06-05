"use client";

import { useEffect, useState } from "react";
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { Brain, TrendingUp, Zap, BarChart3, RefreshCw } from "lucide-react";

interface ModuleData {
    name: string;
    value: number;
    color: string;
}

interface DailyData {
    date: string;
    count: number;
    tokens: number;
}

interface StatsData {
    totalUsage: number;
    dailyAvg: number;
    totalTokens: number;
    topModule: string;
    moduleDistribution: ModuleData[];
    dailyTrend: DailyData[];
}

const MODULE_LABELS: Record<string, string> = {
    BECAYIS_MATCH: "Becayiş Eşleştirme",
    CV_ANALYSIS: "CV Analizi",
    WORK_INFO_CHAT: "Çalışma Bilgileri AI",
    GENERATE_AD: "İlan Jeneratörü",
    GENERATE_WORK_INFO: "Çalışma Bilgisi AI",
    OTHER: "Diğer",
};

const COLORS = [
    "#4299E1",
    "#9F7AEA",
    "#48BB78",
    "#ED8936",
    "#F56565",
    "#38B2AC",
    "#ECC94B",
    "#667EEA",
];

export default function AIStatisticsPage() {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchStats = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/admin/ai-statistics");
            if (!res.ok) throw new Error("Veriler yüklenemedi");
            const data = await res.json();
            setStats(data);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Verileri yüklerken hata oluştu."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
                        style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)" }}
                    />
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        AI istatistikleri yükleniyor...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-3">
                    <p className="text-red-500 text-sm">{error}</p>
                    <button
                        onClick={fetchStats}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                        style={{ background: "var(--primary)" }}
                    >
                        Tekrar Dene
                    </button>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const statCards = [
        {
            label: "Toplam AI Kullanımı",
            value: stats.totalUsage,
            icon: Brain,
            gradient: "from-blue-500 to-blue-600",
            delta: "tüm zamanlar",
        },
        {
            label: "Günlük Ortalama",
            value: stats.dailyAvg,
            icon: TrendingUp,
            gradient: "from-purple-500 to-purple-600",
            delta: "son 30 gün",
        },
        {
            label: "Toplam Token",
            value: stats.totalTokens.toLocaleString("tr-TR"),
            icon: Zap,
            gradient: "from-amber-500 to-amber-600",
            delta: "tahmini tüketim",
        },
        {
            label: "En Çok Kullanılan",
            value: MODULE_LABELS[stats.topModule] || stats.topModule,
            icon: BarChart3,
            gradient: "from-emerald-500 to-emerald-600",
            delta: "modül",
            isText: true,
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                        🤖 AI İstatistikleri
                    </h2>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        Yapay zeka modüllerinin kullanım analitiği
                    </p>
                </div>
                <button
                    onClick={fetchStats}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--primary)";
                        e.currentTarget.style.color = "var(--primary)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                >
                    <RefreshCw className="w-4 h-4" />
                    Yenile
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="stat-card">
                            <div className="flex items-center justify-between mb-3">
                                <div
                                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}
                                >
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <p
                                className={`${stat.isText ? "text-lg" : "text-2xl"} font-bold`}
                                style={{ color: "var(--text)" }}
                            >
                                {stat.value}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                {stat.label}
                            </p>
                            <p className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>
                                {stat.delta}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pie Chart — Modül Dağılımı */}
                <div className="card p-5">
                    <h3 className="font-semibold mb-4" style={{ color: "var(--text)" }}>
                        📊 Modül Kullanım Dağılımı
                    </h3>
                    {stats.moduleDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={stats.moduleDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={4}
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {stats.moduleDistribution.map((_, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                            strokeWidth={0}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--bg-card)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "12px",
                                        color: "var(--text)",
                                        fontSize: "13px",
                                    }}
                                    formatter={(value, name) => [
                                        `${value} kullanım`,
                                        MODULE_LABELS[String(name)] || String(name),
                                    ]}
                                />
                                <Legend
                                    formatter={(value) => (
                                        <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                                            {MODULE_LABELS[String(value)] || String(value)}
                                        </span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[280px]">
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                Henüz veri bulunmuyor
                            </p>
                        </div>
                    )}
                </div>

                {/* Bar Chart — Günlük Trend */}
                <div className="card p-5 lg:col-span-2">
                    <h3 className="font-semibold mb-4" style={{ color: "var(--text)" }}>
                        📈 Günlük AI Kullanım Trendi (Son 30 Gün)
                    </h3>
                    {stats.dailyTrend.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={stats.dailyTrend}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="var(--border-light)"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                                    axisLine={{ stroke: "var(--border)" }}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--bg-card)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "12px",
                                        color: "var(--text)",
                                        fontSize: "13px",
                                    }}
                                    formatter={(value, name) => [
                                        value,
                                        name === "count" ? "Kullanım" : "Token",
                                    ]}
                                    labelFormatter={(label) => `Tarih: ${label}`}
                                />
                                <Legend
                                    formatter={(value) => (
                                        <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                                            {value === "count" ? "Kullanım Sayısı" : "Token Tüketimi"}
                                        </span>
                                    )}
                                />
                                <Bar
                                    dataKey="count"
                                    fill="#4299E1"
                                    radius={[6, 6, 0, 0]}
                                    maxBarSize={24}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[280px]">
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                                Henüz veri bulunmuyor
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
