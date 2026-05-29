'use client'

import React, { useState } from 'react'
import {
    Target, Plus, Edit, Trash2, Building2, Users,
    TrendingUp, TrendingDown, Calendar, FileText, Search
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Mock competitor data
const competitors = [
    {
        id: '1',
        name: 'Metal-İş Sendikası',
        memberCount: 45000,
        city: 'İstanbul',
        dataSource: 'Resmi Açıklama 2025',
        reportDate: '2025-12-15',
        trend: 'up',
        change: 5.2
    },
    {
        id: '2',
        name: 'Birleşik Metal-İş',
        memberCount: 32000,
        city: 'İzmir',
        dataSource: 'Basın Açıklaması',
        reportDate: '2025-11-20',
        trend: 'down',
        change: -2.1
    },
    {
        id: '3',
        name: 'Türk Metal Sendikası',
        memberCount: 18000,
        city: 'Bursa',
        dataSource: 'Yıllık Kongre Raporu',
        reportDate: '2025-10-01',
        trend: 'up',
        change: 8.5
    },
    {
        id: '4',
        name: 'Özçelik-İş',
        memberCount: 12000,
        city: 'Kocaeli',
        dataSource: 'SGK Verileri',
        reportDate: '2025-09-15',
        trend: 'stable',
        change: 0.3
    },
]

const myStats = {
    memberCount: 12500,
    marketShare: 2.78,
    sectorTotal: 450000
}

export default function CompetitorsPage() {
    const [showAddModal, setShowAddModal] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    const totalCompetitorMembers = competitors.reduce((sum, c) => sum + c.memberCount, 0)
    const totalMarket = totalCompetitorMembers + myStats.memberCount

    const filteredCompetitors = competitors.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.city?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Target className="w-7 h-7 text-amber-500" />
                        Rakip Analizi
                    </h1>
                    <p className="text-slate-500">Sektördeki diğer STK&apos;ları takip edin (Anonimleştirilmiş veriler)</p>
                </div>
                <Button
                    onClick={() => setShowAddModal(true)}
                    className="bg-amber-600 hover:bg-amber-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Rakip Ekle
                </Button>
            </div>

            {/* Privacy Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-blue-800 dark:text-blue-300">Gizlilik Politikası</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                            Burada sadece kamuya açık veya resmi kaynaklardan elde edilen toplam üye sayıları görüntülenir.
                            Hiçbir üye kişisel bilgisi (Ad, Soyad, TC) paylaşılmaz veya görüntülenmez.
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                <Users className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {myStats.memberCount.toLocaleString('tr-TR')}
                                </div>
                                <div className="text-sm text-slate-500">Bizim Üye Sayımız</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Target className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">{competitors.length}</div>
                                <div className="text-sm text-slate-500">Takip Edilen Rakip</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <Building2 className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {totalCompetitorMembers.toLocaleString('tr-TR')}
                                </div>
                                <div className="text-sm text-slate-500">Toplam Rakip Üye</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">%{myStats.marketShare}</div>
                                <div className="text-sm text-emerald-100">Bizim Pazar Payımız</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Rakip ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                />
            </div>

            {/* Competitors Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Rakip STK Listesi</CardTitle>
                    <CardDescription>Manuel olarak eklenen veya kamuya açık kaynaklardan alınan veriler</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b dark:border-slate-700">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">STK Adı</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Üye Sayısı</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Pazar Payı</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Güçlü Bölge</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Veri Kaynağı</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Trend</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Our STK Row */}
                                <tr className="border-b dark:border-slate-700 bg-emerald-50 dark:bg-emerald-900/10">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                                                BZ
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900 dark:text-white">Bizim STK (Siz)</div>
                                                <div className="text-xs text-slate-500">Kendi verileriniz</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 font-semibold text-emerald-600">{myStats.memberCount.toLocaleString('tr-TR')}</td>
                                    <td className="py-3 px-4">
                                        <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-sm font-medium">
                                            %{myStats.marketShare}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">-</td>
                                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">Sistem Verisi</td>
                                    <td className="py-3 px-4">
                                        <span className="flex items-center text-emerald-600">
                                            <TrendingUp className="w-4 h-4 mr-1" /> +8.2%
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right text-slate-400">-</td>
                                </tr>

                                {/* Competitor Rows */}
                                {filteredCompetitors.map((competitor) => (
                                    <tr key={competitor.id} className="border-b last:border-0 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                                                    {competitor.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900 dark:text-white">{competitor.name}</div>
                                                    <div className="text-xs text-slate-500">{competitor.reportDate}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                                            {competitor.memberCount.toLocaleString('tr-TR')}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm">
                                                %{((competitor.memberCount / myStats.sectorTotal) * 100).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{competitor.city || '-'}</td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-1 text-slate-500 text-sm">
                                                <FileText className="w-3 h-3" />
                                                {competitor.dataSource}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`flex items-center ${competitor.trend === 'up' ? 'text-emerald-600' :
                                                    competitor.trend === 'down' ? 'text-red-600' : 'text-slate-500'
                                                }`}>
                                                {competitor.trend === 'up' && <TrendingUp className="w-4 h-4 mr-1" />}
                                                {competitor.trend === 'down' && <TrendingDown className="w-4 h-4 mr-1" />}
                                                {competitor.change > 0 ? '+' : ''}{competitor.change}%
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm">
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-red-600">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Add Competitor Modal would go here */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Rakip STK Ekle</h2>
                        <form className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">STK Adı</label>
                                <input type="text" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" placeholder="Örn: Metal-İş Sendikası" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Üye Sayısı</label>
                                <input type="number" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" placeholder="Örn: 25000" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Güçlü Olduğu İl</label>
                                <input type="text" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" placeholder="Örn: İstanbul" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Veri Kaynağı</label>
                                <input type="text" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" placeholder="Örn: Basın Açıklaması 2025" />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                                    İptal
                                </Button>
                                <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700">
                                    Ekle
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
