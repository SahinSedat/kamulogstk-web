'use client'

import React from 'react'
import {
    PieChart, Users, TrendingUp, Building2,
    ArrowUpRight, Info
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Mock market share data
const sectorInfo = {
    name: 'Metal Sanayi',
    totalEmployees: 450000,
    dataSource: 'SGK 2025 Verileri',
    lastUpdated: '2025-12-01'
}

const myStats = {
    members: 12500,
    marketShare: 2.78,
    rank: 3,
    trendLastMonth: +0.12,
    trendLastYear: +0.85
}

const competitorShares = [
    { name: 'Bizim STK', members: 12500, share: 2.78, color: '#10b981', isUs: true },
    { name: 'Rakip A', members: 45000, share: 10.0, color: '#6366f1', isUs: false },
    { name: 'Rakip B', members: 32000, share: 7.11, color: '#8b5cf6', isUs: false },
    { name: 'Rakip C', members: 18000, share: 4.0, color: '#ec4899', isUs: false },
    { name: 'Rakip D', members: 8500, share: 1.89, color: '#f59e0b', isUs: false },
    { name: 'Diğerleri', members: 334000, share: 74.22, color: '#64748b', isUs: false },
]

const monthlyProgress = [
    { month: 'Ağu 2025', share: 2.45, members: 11020 },
    { month: 'Eyl 2025', share: 2.52, members: 11340 },
    { month: 'Eki 2025', share: 2.58, members: 11610 },
    { month: 'Kas 2025', share: 2.65, members: 11925 },
    { month: 'Ara 2025', share: 2.71, members: 12195 },
    { month: 'Oca 2026', share: 2.78, members: 12510 },
]

export default function MarketSharePage() {
    const totalCompetitorMembers = competitorShares.reduce((sum, c) => sum + c.members, 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <PieChart className="w-7 h-7 text-emerald-500" />
                        Pazar Payı Analizi
                    </h1>
                    <p className="text-slate-500">Sektördeki konumunuz ve rakip karşılaştırması</p>
                </div>
                <Link href="/stk/analytics">
                    <Button variant="outline">← Analytics</Button>
                </Link>
            </div>

            {/* Sector Info */}
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-slate-500" />
                    <span className="font-medium text-slate-900 dark:text-white">{sectorInfo.name}</span>
                </div>
                <div className="text-sm text-slate-500">
                    Toplam Çalışan: <span className="font-medium text-slate-700 dark:text-slate-300">
                        {sectorInfo.totalEmployees.toLocaleString('tr-TR')}
                    </span>
                </div>
                <div className="text-sm text-slate-500">
                    Kaynak: {sectorInfo.dataSource}
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
                    <CardContent className="p-6">
                        <div className="text-emerald-100 text-sm mb-2">Pazar Payımız</div>
                        <div className="text-4xl font-bold mb-1">%{myStats.marketShare}</div>
                        <div className="flex items-center gap-1 text-emerald-200 text-sm">
                            <ArrowUpRight className="w-4 h-4" />
                            +{myStats.trendLastMonth}% bu ay
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="text-slate-500 text-sm mb-2">Üye Sayımız</div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                            {myStats.members.toLocaleString('tr-TR')}
                        </div>
                        <div className="text-sm text-emerald-600">
                            Sektörde #{myStats.rank}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="text-slate-500 text-sm mb-2">Yıllık Büyüme</div>
                        <div className="text-3xl font-bold text-emerald-600 mb-1">
                            +%{myStats.trendLastYear}
                        </div>
                        <div className="text-sm text-slate-500">
                            Pazar payı artışı
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="text-slate-500 text-sm mb-2">Sektör Toplam</div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                            {(sectorInfo.totalEmployees / 1000).toFixed(0)}K
                        </div>
                        <div className="text-sm text-slate-500">
                            Potansiyel pazar
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pie Chart and Comparison */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pazar Payı Dağılımı</CardTitle>
                        <CardDescription>Sektördeki STK dağılımı</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center">
                            <div className="relative w-64 h-64">
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    {(() => {
                                        let currentAngle = 0
                                        return competitorShares.map((item, i) => {
                                            const angle = (item.share / 100) * 360
                                            const startAngle = currentAngle
                                            currentAngle += angle

                                            const x1 = 50 + 45 * Math.cos((startAngle * Math.PI) / 180)
                                            const y1 = 50 + 45 * Math.sin((startAngle * Math.PI) / 180)
                                            const x2 = 50 + 45 * Math.cos(((startAngle + angle) * Math.PI) / 180)
                                            const y2 = 50 + 45 * Math.sin(((startAngle + angle) * Math.PI) / 180)

                                            const largeArc = angle > 180 ? 1 : 0

                                            return (
                                                <path
                                                    key={i}
                                                    d={`M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                                    fill={item.color}
                                                    stroke="white"
                                                    strokeWidth="0.5"
                                                    className={`transition-opacity ${item.isUs ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}
                                                />
                                            )
                                        })
                                    })()}
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-slate-900 dark:text-white">%{myStats.marketShare}</div>
                                        <div className="text-sm text-slate-500">Bizim Payımız</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="mt-6 space-y-2">
                            {competitorShares.map((item, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center justify-between p-2 rounded ${item.isUs ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                                        <span className={`text-sm ${item.isUs ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {item.name} {item.isUs && '(Siz)'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-slate-500">{item.members.toLocaleString('tr-TR')} üye</span>
                                        <span className={`text-sm font-medium ${item.isUs ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                                            %{item.share}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Monthly Progress */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pazar Payı Gelişimi</CardTitle>
                        <CardDescription>Son 6 aylık trend</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {monthlyProgress.map((month, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-20 text-sm text-slate-500">{month.month}</div>
                                    <div className="flex-1">
                                        <div className="h-8 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden relative">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg transition-all"
                                                style={{ width: `${(month.share / 3) * 100}%` }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-end pr-3">
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                                    %{month.share}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-20 text-right text-sm text-slate-500">
                                        {month.members.toLocaleString('tr-TR')}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Trend indicator */}
                        <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                                <TrendingUp className="w-5 h-5" />
                                <span className="font-medium">Pozitif Trend</span>
                            </div>
                            <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">
                                Son 6 ayda pazar payınız %0.33 arttı. Bu hızla devam ederseniz,
                                1 yıl içinde %3.5 pazar payına ulaşabilirsiniz.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Competitor Comparison Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        Rakip Karşılaştırması
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b dark:border-slate-700">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Sıra</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">STK</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Üye Sayısı</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Pazar Payı</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Fark (Bize Göre)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {competitorShares.slice(0, 5).map((item, i) => (
                                    <tr
                                        key={i}
                                        className={`border-b last:border-0 dark:border-slate-700 ${item.isUs ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                                            }`}
                                    >
                                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                                            #{i + 1}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                                                <span className={item.isUs ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}>
                                                    {item.name} {item.isUs && '⭐'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">
                                            {item.members.toLocaleString('tr-TR')}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={`px-2 py-1 rounded-full text-sm ${item.isUs
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}>
                                                %{item.share}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            {item.isUs ? (
                                                <span className="text-slate-400">-</span>
                                            ) : (
                                                <span className={item.members > myStats.members ? 'text-red-600' : 'text-emerald-600'}>
                                                    {item.members > myStats.members ? '+' : ''}{(item.members - myStats.members).toLocaleString('tr-TR')}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-700 dark:text-blue-400">
                            <strong>Hesaplama Yöntemi:</strong> Pazar payı, STK üye sayınızın sektördeki toplam çalışan sayısına
                            bölünmesiyle hesaplanır. Rakip verileri manuel olarak girilen veya kamuya açık kaynaklardan
                            alınan bilgilere dayanmaktadır.
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
