'use client'

import React from 'react'
import {
    Brain, TrendingUp, AlertTriangle, CheckCircle2,
    ArrowUpRight, Calendar, Target, Info
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Mock prediction data - gerçek uygulamada API'den gelecek
const currentStats = {
    totalMembers: 12500,
    lastMonthGrowth: 156,
    avgMonthlyGrowth: 142
}

const predictions = [
    { year: 2026, month: 2, predicted: 12650, lower: 12400, upper: 12900 },
    { year: 2026, month: 3, predicted: 12810, lower: 12500, upper: 13120 },
    { year: 2026, month: 4, predicted: 12970, lower: 12580, upper: 13360 },
    { year: 2026, month: 5, predicted: 13130, lower: 12650, upper: 13610 },
    { year: 2026, month: 6, predicted: 13290, lower: 12710, upper: 13870 },
    { year: 2026, month: 7, predicted: 13450, lower: 12760, upper: 14140 },
]

const historicalData = [
    { year: 2025, month: 2, actual: 11200 },
    { year: 2025, month: 3, actual: 11350 },
    { year: 2025, month: 4, actual: 11480 },
    { year: 2025, month: 5, actual: 11650 },
    { year: 2025, month: 6, actual: 11820 },
    { year: 2025, month: 7, actual: 11950 },
    { year: 2025, month: 8, actual: 12050 },
    { year: 2025, month: 9, actual: 12150 },
    { year: 2025, month: 10, actual: 12280 },
    { year: 2025, month: 11, actual: 12350 },
    { year: 2025, month: 12, actual: 12420 },
    { year: 2026, month: 1, actual: 12500 },
]

const anomalies = [
    {
        id: 1,
        type: 'resignation_spike',
        severity: 'high',
        month: 'Aralık 2025',
        message: 'İstifa sayısı normalin %85 üzerinde',
        value: 45,
        expected: 24,
        zScore: 3.2
    },
    {
        id: 2,
        type: 'new_member_drop',
        severity: 'medium',
        month: 'Kasım 2025',
        message: 'Yeni üye sayısı normalin %40 altında',
        value: 48,
        expected: 80,
        zScore: -2.6
    },
]

const earlyWarnings = [
    {
        id: 1,
        type: 'resignation_trend',
        severity: 'critical',
        message: 'Son 3 ayda istifa trendi sürekli artıyor (+%67)',
        recommendation: 'Üye memnuniyet anketi yapılması önerilir'
    },
]

const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

export default function PredictionsPage() {
    const maxValue = Math.max(
        ...historicalData.map(d => d.actual),
        ...predictions.map(d => d.upper)
    )
    const minValue = Math.min(
        ...historicalData.map(d => d.actual),
        ...predictions.map(d => d.lower)
    )
    const range = maxValue - minValue

    const getY = (value: number) => {
        return ((maxValue - value) / range) * 200
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Brain className="w-7 h-7 text-purple-500" />
                        AI Tahminleri
                    </h1>
                    <p className="text-slate-500">Linear Regression ile 6 aylık üye büyüme projeksiyonu</p>
                </div>
                <Link href="/stk/analytics">
                    <Button variant="outline">← Analytics</Button>
                </Link>
            </div>

            {/* Early Warnings */}
            {earlyWarnings.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-red-800 dark:text-red-300">⚠️ Erken Uyarı</h3>
                            {earlyWarnings.map(warning => (
                                <div key={warning.id} className="mt-2">
                                    <p className="text-red-700 dark:text-red-400">{warning.message}</p>
                                    <p className="text-sm text-red-600 dark:text-red-500 mt-1">
                                        💡 Öneri: {warning.recommendation}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Summary */}
            <div className="grid md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-slate-500 mb-1">Şu Anki Üye</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {currentStats.totalMembers.toLocaleString('tr-TR')}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-0">
                    <CardContent className="p-4">
                        <div className="text-sm text-purple-200 mb-1">6 Ay Sonra (Tahmin)</div>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            {predictions[5].predicted.toLocaleString('tr-TR')}
                            <ArrowUpRight className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-slate-500 mb-1">Beklenen Büyüme</div>
                        <div className="text-2xl font-bold text-emerald-600">
                            +{((predictions[5].predicted - currentStats.totalMembers) / currentStats.totalMembers * 100).toFixed(1)}%
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-slate-500 mb-1">Model Güveni</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">%78</div>
                        <div className="text-xs text-slate-400">R² = 0.78</div>
                    </CardContent>
                </Card>
            </div>

            {/* Prediction Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-500" />
                        Üye Sayısı Projeksiyonu
                    </CardTitle>
                    <CardDescription>Geçmiş 12 ay + Gelecek 6 ay tahmini (güven aralıklı)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative h-64 pt-4">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-slate-500">
                            <span>{maxValue.toLocaleString('tr-TR')}</span>
                            <span>{Math.round((maxValue + minValue) / 2).toLocaleString('tr-TR')}</span>
                            <span>{minValue.toLocaleString('tr-TR')}</span>
                        </div>

                        {/* Chart area */}
                        <div className="ml-16 h-full">
                            <svg viewBox="0 0 600 220" className="w-full h-full" preserveAspectRatio="none">
                                {/* Grid lines */}
                                <line x1="0" y1="0" x2="600" y2="0" stroke="#e2e8f0" strokeWidth="1" />
                                <line x1="0" y1="100" x2="600" y2="100" stroke="#e2e8f0" strokeWidth="1" />
                                <line x1="0" y1="200" x2="600" y2="200" stroke="#e2e8f0" strokeWidth="1" />

                                {/* Confidence interval area */}
                                <path
                                    d={`
                    M ${12 * 33.33} ${getY(predictions[0].upper)}
                    ${predictions.map((p, i) => `L ${(12 + i) * 33.33} ${getY(p.upper)}`).join(' ')}
                    ${[...predictions].reverse().map((p, i) => `L ${(17 - i) * 33.33} ${getY(p.lower)}`).join(' ')}
                    Z
                  `}
                                    fill="rgba(139, 92, 246, 0.2)"
                                />

                                {/* Historical line */}
                                <path
                                    d={historicalData.map((d, i) =>
                                        `${i === 0 ? 'M' : 'L'} ${i * 33.33} ${getY(d.actual)}`
                                    ).join(' ')}
                                    fill="none"
                                    stroke="#10b981"
                                    strokeWidth="3"
                                />

                                {/* Prediction line */}
                                <path
                                    d={`M ${11 * 33.33} ${getY(historicalData[11].actual)} ${predictions.map((p, i) =>
                                        `L ${(12 + i) * 33.33} ${getY(p.predicted)}`
                                    ).join(' ')}`}
                                    fill="none"
                                    stroke="#8b5cf6"
                                    strokeWidth="3"
                                    strokeDasharray="8,4"
                                />

                                {/* Historical points */}
                                {historicalData.map((d, i) => (
                                    <circle key={`h-${i}`} cx={i * 33.33} cy={getY(d.actual)} r="4" fill="#10b981" />
                                ))}

                                {/* Prediction points */}
                                {predictions.map((p, i) => (
                                    <circle key={`p-${i}`} cx={(12 + i) * 33.33} cy={getY(p.predicted)} r="4" fill="#8b5cf6" />
                                ))}
                            </svg>
                        </div>

                        {/* X-axis labels */}
                        <div className="ml-16 flex justify-between text-xs text-slate-500 mt-2">
                            {[...historicalData.slice(0, 12, 2), ...predictions.slice(0, 6, 2)].map((d, i) => (
                                <span key={i}>
                                    {monthNames[('month' in d ? d.month : predictions[i]?.month || 1) - 1]}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                        <span className="flex items-center gap-2">
                            <span className="w-4 h-1 bg-emerald-500 rounded" />
                            Gerçek Veri
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-4 h-1 bg-purple-500 rounded" style={{ borderStyle: 'dashed' }} />
                            Tahmin
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-4 h-4 bg-purple-500/20 rounded" />
                            Güven Aralığı
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Predictions Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-500" />
                        Aylık Tahmin Detayları
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b dark:border-slate-700">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Dönem</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Tahmin</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Alt Sınır</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Üst Sınır</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Önceki Aya Göre</th>
                                </tr>
                            </thead>
                            <tbody>
                                {predictions.map((p, i) => (
                                    <tr key={i} className="border-b last:border-0 dark:border-slate-700">
                                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                                            {monthNames[p.month - 1]} {p.year}
                                        </td>
                                        <td className="py-3 px-4 text-right font-semibold text-purple-600">
                                            {p.predicted.toLocaleString('tr-TR')}
                                        </td>
                                        <td className="py-3 px-4 text-right text-slate-500">
                                            {p.lower.toLocaleString('tr-TR')}
                                        </td>
                                        <td className="py-3 px-4 text-right text-slate-500">
                                            {p.upper.toLocaleString('tr-TR')}
                                        </td>
                                        <td className="py-3 px-4 text-right text-emerald-600">
                                            +{(i === 0 ? p.predicted - currentStats.totalMembers : p.predicted - predictions[i - 1].predicted).toLocaleString('tr-TR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Anomalies */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Tespit Edilen Anomaliler
                    </CardTitle>
                    <CardDescription>Z-Score tabanlı olağandışı değişim tespiti</CardDescription>
                </CardHeader>
                <CardContent>
                    {anomalies.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                            <p>Herhangi bir anomali tespit edilmedi</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {anomalies.map(anomaly => (
                                <div
                                    key={anomaly.id}
                                    className={`p-4 rounded-xl border ${anomaly.severity === 'high'
                                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="font-medium text-slate-900 dark:text-white">{anomaly.message}</div>
                                            <div className="text-sm text-slate-500 mt-1">{anomaly.month}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-sm font-medium ${anomaly.severity === 'high' ? 'text-red-600' : 'text-amber-600'
                                                }`}>
                                                Z-Score: {anomaly.zScore}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                Gerçek: {anomaly.value} | Beklenen: {anomaly.expected}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Algorithm Info */}
            <Card className="bg-slate-50 dark:bg-slate-800/50">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                            <strong>Algoritma Bilgisi:</strong> Tahminler, son 12 aylık verilere uygulanan Simple Linear Regression
                            modeli ile oluşturulmaktadır. Güven aralıkları %95 güvenilirlik seviyesinde hesaplanmaktadır.
                            Anomali tespiti Z-Score yöntemi ile yapılmakta, |z| ≥ 2.5 değerler anormal kabul edilmektedir.
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
