"use client";

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";
import { useTheme } from "@/components/providers/ThemeProvider";

const monthlyUsers = [
    { name: "Oca", value: 120 }, { name: "Şub", value: 190 }, { name: "Mar", value: 280 },
    { name: "Nis", value: 350 }, { name: "May", value: 420 }, { name: "Haz", value: 580 },
    { name: "Tem", value: 650 }, { name: "Ağu", value: 720 }, { name: "Eyl", value: 850 },
    { name: "Eki", value: 950 }, { name: "Kas", value: 1100 }, { name: "Ara", value: 1280 },
];

const moduleUsage = [
    { name: "Becayiş", value: 42, color: "#2C5282" },
    { name: "Danışmanlık", value: 28, color: "#4299E1" },
    { name: "Forum", value: 18, color: "#90CDF4" },
    { name: "Kariyer", value: 8, color: "#FFB800" },
    { name: "STK", value: 4, color: "#48BB78" },
];

const monthlyRevenue = [
    { name: "Oca", premium: 450, consultant: 120, token: 80 },
    { name: "Şub", premium: 720, consultant: 180, token: 110 },
    { name: "Mar", premium: 980, consultant: 250, token: 150 },
    { name: "Nis", premium: 1200, consultant: 320, token: 200 },
    { name: "May", premium: 1500, consultant: 400, token: 250 },
    { name: "Haz", premium: 1800, consultant: 480, token: 300 },
];

interface DashboardChartsProps {
    stats: { users: number; premium: number; tokens: number; pendingAds: number; tickets: number; consultants: number };
}

export default function DashboardCharts({ stats }: DashboardChartsProps) {
    const { theme } = useTheme();
    const textColor = theme === "dark" ? "#9CA3AF" : "#718096";
    const gridColor = theme === "dark" ? "#2D3148" : "#E2E8F0";
    const tooltipBg = theme === "dark" ? "#1A1D2E" : "#FFFFFF";
    const tooltipBorder = theme === "dark" ? "#2D3148" : "#E2E8F0";

    const tooltipStyle = {
        background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "12px",
        boxShadow: theme === "dark" ? "0 4px 12px rgba(0,0,0,0.4)" : "0 4px 12px rgba(0,0,0,0.08)",
    };

    return (
        <div className="space-y-6">
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Growth - Line Chart */}
                <div className="card p-6">
                    <h3 className="text-base font-semibold mb-4" style={{ color: "var(--text)" }}>📈 Aylık Kullanıcı Büyümesi</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={monthlyUsers}>
                            <defs>
                                <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4299E1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#4299E1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: textColor }} />
                            <YAxis tick={{ fontSize: 12, fill: textColor }} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Area type="monotone" dataKey="value" name="Kullanıcı" stroke="#4299E1" strokeWidth={2.5} fillOpacity={1} fill="url(#gradUsers)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Module Usage - Pie Chart */}
                <div className="card p-6">
                    <h3 className="text-base font-semibold mb-4" style={{ color: "var(--text)" }}>🎯 Modül Kullanım Dağılımı</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie data={moduleUsage} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name || ""} %${((percent || 0) * 100).toFixed(0)}`}>
                                {moduleUsage.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-3 justify-center mt-2">
                        {moduleUsage.map(c => (
                            <div key={c.name} className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{c.name} (%{c.value})</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Revenue Bar Chart */}
            <div className="card p-6">
                <h3 className="text-base font-semibold mb-4" style={{ color: "var(--text)" }}>💰 Aylık Gelir Dağılımı (₺)</h3>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: textColor }} />
                        <YAxis tick={{ fontSize: 12, fill: textColor }} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v?: number) => v != null ? `₺${v.toLocaleString("tr-TR")}` : ""} />
                        <Legend wrapperStyle={{ fontSize: "12px", color: textColor }} />
                        <Bar dataKey="premium" name="Premium" fill="#2C5282" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="consultant" name="Danışmanlık" fill="#4299E1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="token" name="Jeton" fill="#FFB800" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
