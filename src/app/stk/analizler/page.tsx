'use client'

import React, { useState } from 'react'
import {
    TrendingUp, TrendingDown, Users, AlertTriangle,
    PieChart, MapPin, Target, Brain, ChevronRight,
    ArrowUpRight, ArrowDownRight, Bell, BarChart3
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Mock data - gerçek uygulamada API'den gelecek
const marketShareData = {
    myMembers: 12500,
    sectorTotal: 450000,
    marketShare: 2.78,
    rank: 3,
    trend: +0.12
}

const predictionData = {
    currentMembers: 12500,
    predicted6Months: 14200,
    growthRate: 13.6,
    confidence: 78
}

const anomalies = [
    { id: 1, type: 'warning', message: 'İstanbul bölgesinde istifa oranı %35 arttı', date: '2 gün önce' },
    { id: 2, type: 'info', message: 'Ankara\'da yeni üye artışı beklenenin üzerinde', date: '1 hafta önce' },
]

const earlyWarnings = [
    { id: 1, severity: 'critical', message: 'Son 3 ayda istifa trendi sürekli artıyor (+%67)', type: 'resignation_trend' },
]

const competitorData = [
    { name: 'Bizim STK', members: 12500, share: 2.78, color: '#10b981' },
    { name: 'Rakip A', members: 45000, share: 10.0, color: '#6366f1' },
    { name: 'Rakip B', members: 32000, share: 7.11, color: '#8b5cf6' },
    { name: 'Rakip C', members: 18000, share: 4.0, color: '#ec4899' },
    { name: 'Diğer', members: 342500, share: 76.11, color: '#475569' },
]

const cityStrength = [
    { city: 'İstanbul', members: 4500, strength: 'high' },
    { city: 'Ankara', members: 2800, strength: 'high' },
    { city: 'İzmir', members: 1200, strength: 'medium' },
    { city: 'Bursa', members: 800, strength: 'medium' },
    { city: 'Antalya', members: 350, strength: 'low' },
]

export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Brain className="w-7 h-7 text-emerald-500" />
                        STK Intelligence & Analytics
                    </h1>
                    <p className="text-slate-500">AI destekli pazar analizi ve büyüme tahminleri</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Rapor İndir
                    </Button>
                </div>
            </div>

            {/* Early Warnings */}
            {earlyWarnings.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-red-800 dark:text-red-300">Erken Uyarı Sistemi</h3>
                            <ul className="mt-2 space-y-1">
                                {earlyWarnings.map(warning => (
                                    <li key={warning.id} className="text-red-700 dark:text-red-400 text-sm">
                                        • {warning.message}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <Link href="/stk/analizler/tahminler">
                            <Button size="sm" variant="outline" className="text-red-600 border-red-300">
                                Detaylar
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            {/* Main Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Market Share */}
                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <PieChart className="w-8 h-8 opacity-80" />
                            <span className={`flex items-center text-sm ${marketShareData.trend >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                                {marketShareData.trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                {Math.abs(marketShareData.trend)}%
                            </span>
                        </div>
                        <div className="text-3xl font-bold mb-1">%{marketShareData.marketShare}</div>
                        <div className="text-emerald-100 text-sm">Pazar Payı</div>
                        <div className="text-xs text-emerald-200 mt-2">Sektörde #{marketShareData.rank}. sırada</div>
                    </CardContent>
                </Card>

                {/* Current Members */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Users className="w-8 h-8 text-blue-500" />
                            <span className="text-sm text-emerald-600 flex items-center">
                                <TrendingUp className="w-4 h-4 mr-1" />
                                +8.2%
                            </span>
                        </div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                            {marketShareData.myMembers.toLocaleString('tr-TR')}
                        </div>
                        <div className="text-slate-500 text-sm">Toplam Üye</div>
                    </CardContent>
                </Card>

                {/* AI Prediction */}
                <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-0">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Brain className="w-8 h-8 opacity-80" />
                            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                                %{predictionData.confidence} güven
                            </span>
                        </div>
                        <div className="text-3xl font-bold mb-1">
                            {predictionData.predicted6Months.toLocaleString('tr-TR')}
                        </div>
                        <div className="text-purple-100 text-sm">6 Ay Sonra (Tahmin)</div>
                        <div className="text-xs text-purple-200 mt-2">+%{predictionData.growthRate} büyüme bekleniyor</div>
                    </CardContent>
                </Card>

                {/* Anomalies */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <Bell className="w-8 h-8 text-amber-500" />
                            <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full">
                                {anomalies.length} uyarı
                            </span>
                        </div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{anomalies.length}</div>
                        <div className="text-slate-500 text-sm">Aktif Anomali</div>
                        <Link href="/stk/analizler/tahminler" className="text-xs text-amber-600 hover:underline mt-2 inline-block">
                            Detayları gör →
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Market Share Pie */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <PieChart className="w-5 h-5 text-emerald-500" />
                                Pazar Payı Dağılımı
                            </span>
                            <Link href="/stk/analizler/pazar-payi">
                                <Button variant="ghost" size="sm">
                                    Detay <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Simple visual pie representation */}
                        <div className="flex items-center gap-8">
                            <div className="relative w-40 h-40">
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    {(() => {
                                        let currentAngle = 0
                                        return competitorData.map((item, i) => {
                                            const angle = (item.share / 100) * 360
                                            const startAngle = currentAngle
                                            currentAngle += angle

                                            const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180)
                                            const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180)
                                            const x2 = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180)
                                            const y2 = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180)

                                            const largeArc = angle > 180 ? 1 : 0

                                            return (
                                                <path
                                                    key={i}
                                                    d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                                    fill={item.color}
                                                    className="hover:opacity-80 transition-opacity cursor-pointer"
                                                />
                                            )
                                        })
                                    })()}
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-slate-900 dark:text-white">%{marketShareData.marketShare}</div>
                                        <div className="text-xs text-slate-500">Bizim Pay</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-2">
                                {competitorData.slice(0, 4).map((item, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">{item.name}</span>
                                        </div>
                                        <span className="text-sm font-medium text-slate-900 dark:text-white">%{item.share}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Regional Strength */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-blue-500" />
                                Bölgesel Güç Dağılımı
                            </span>
                            <Link href="/stk/analizler/bolgesel-harita">
                                <Button variant="ghost" size="sm">
                                    Harita <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {cityStrength.map((city, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-20 text-sm font-medium text-slate-700 dark:text-slate-300">{city.city}</div>
                                    <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${city.strength === 'high' ? 'bg-emerald-500' :
                                                    city.strength === 'medium' ? 'bg-amber-500' : 'bg-red-400'
                                                }`}
                                            style={{ width: `${(city.members / 4500) * 100}%` }}
                                        />
                                    </div>
                                    <div className="w-16 text-right text-sm font-medium text-slate-900 dark:text-white">
                                        {city.members.toLocaleString('tr-TR')}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full" /> Güçlü</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-full" /> Orta</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-full" /> Zayıf</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Links */}
            <div className="grid md:grid-cols-4 gap-4">
                <Link href="/stk/analizler/pazar-payi">
                    <Card className="hover:border-emerald-500 transition-colors cursor-pointer group">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl group-hover:bg-emerald-200 transition-colors">
                                <PieChart className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <div className="font-medium text-slate-900 dark:text-white">Pazar Analizi</div>
                                <div className="text-sm text-slate-500">Detaylı pazar payı</div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/stk/analizler/tahminler">
                    <Card className="hover:border-purple-500 transition-colors cursor-pointer group">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl group-hover:bg-purple-200 transition-colors">
                                <Brain className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <div className="font-medium text-slate-900 dark:text-white">AI Tahminler</div>
                                <div className="text-sm text-slate-500">6 aylık projeksiyon</div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/stk/analizler/bolgesel-harita">
                    <Card className="hover:border-blue-500 transition-colors cursor-pointer group">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-200 transition-colors">
                                <MapPin className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <div className="font-medium text-slate-900 dark:text-white">Isı Haritası</div>
                                <div className="text-sm text-slate-500">Bölgesel dağılım</div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/stk/analizler/rakipler">
                    <Card className="hover:border-amber-500 transition-colors cursor-pointer group">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl group-hover:bg-amber-200 transition-colors">
                                <Target className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <div className="font-medium text-slate-900 dark:text-white">Rakip Analizi</div>
                                <div className="text-sm text-slate-500">Rekabet takibi</div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Recent Anomalies */}
            {anomalies.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Son Anomaliler
                        </CardTitle>
                        <CardDescription>Sistemin tespit ettiği olağandışı değişimler</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {anomalies.map(anomaly => (
                                <div key={anomaly.id} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <div className={`p-2 rounded-lg ${anomaly.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                                        }`}>
                                        {anomaly.type === 'warning' ? (
                                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                                        ) : (
                                            <TrendingUp className="w-4 h-4 text-blue-600" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-slate-900 dark:text-white">{anomaly.message}</div>
                                        <div className="text-xs text-slate-500">{anomaly.date}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
