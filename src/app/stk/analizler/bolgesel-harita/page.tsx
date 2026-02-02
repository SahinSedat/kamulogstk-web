'use client'

import React, { useState } from 'react'
import {
    MapPin, Users, TrendingUp, TrendingDown,
    ChevronDown, Info
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Türkiye illeri ve mock üye verileri
const cityData: Record<string, { members: number; strength: 'high' | 'medium' | 'low' | 'none'; growth: number }> = {
    '34': { members: 4500, strength: 'high', growth: 12.5 },    // İstanbul
    '06': { members: 2800, strength: 'high', growth: 8.2 },     // Ankara
    '35': { members: 1200, strength: 'medium', growth: 15.3 },  // İzmir
    '16': { members: 800, strength: 'medium', growth: 5.1 },    // Bursa
    '07': { members: 350, strength: 'low', growth: -2.4 },      // Antalya
    '41': { members: 620, strength: 'medium', growth: 22.1 },   // Kocaeli
    '42': { members: 450, strength: 'low', growth: 3.2 },       // Konya
    '01': { members: 280, strength: 'low', growth: 7.8 },       // Adana
    '27': { members: 180, strength: 'low', growth: -5.2 },      // Gaziantep
    '33': { members: 220, strength: 'low', growth: 11.4 },      // Mersin
}

const cityNames: Record<string, string> = {
    '34': 'İstanbul', '06': 'Ankara', '35': 'İzmir', '16': 'Bursa',
    '07': 'Antalya', '41': 'Kocaeli', '42': 'Konya', '01': 'Adana',
    '27': 'Gaziantep', '33': 'Mersin', '31': 'Hatay', '21': 'Diyarbakır',
    '55': 'Samsun', '26': 'Eskişehir', '25': 'Erzurum', '44': 'Malatya',
    '38': 'Kayseri', '54': 'Sakarya', '10': 'Balıkesir', '20': 'Denizli'
}

// Tüm iller (simplified)
const allCities = [
    '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
    '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
    '31', '32', '33', '34', '35', '36', '37', '38', '39', '40',
    '41', '42', '43', '44', '45', '46', '47', '48', '49', '50',
    '51', '52', '53', '54', '55', '56', '57', '58', '59', '60',
    '61', '62', '63', '64', '65', '66', '67', '68', '69', '70',
    '71', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81'
]

const strengthColors = {
    high: '#10b981',
    medium: '#f59e0b',
    low: '#ef4444',
    none: '#e2e8f0'
}

export default function HeatmapPage() {
    const [selectedCity, setSelectedCity] = useState<string | null>(null)
    const [sortBy, setSortBy] = useState<'members' | 'growth'>('members')

    const totalMembers = Object.values(cityData).reduce((sum, c) => sum + c.members, 0)
    const strongCities = Object.entries(cityData).filter(([_, d]) => d.strength === 'high').length
    const weakCities = Object.entries(cityData).filter(([_, d]) => d.strength === 'low').length

    const sortedCities = Object.entries(cityData)
        .sort((a, b) => sortBy === 'members' ? b[1].members - a[1].members : b[1].growth - a[1].growth)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <MapPin className="w-7 h-7 text-blue-500" />
                        Bölgesel Isı Haritası
                    </h1>
                    <p className="text-slate-500">İl bazlı üye dağılımı ve güç analizi</p>
                </div>
                <Link href="/stk/analytics">
                    <Button variant="outline">← Analytics</Button>
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-slate-500 mb-1">Toplam Üye</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {totalMembers.toLocaleString('tr-TR')}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-slate-500 mb-1">Aktif İl</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {Object.keys(cityData).length}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                    <CardContent className="p-4">
                        <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Güçlü Bölge</div>
                        <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                            {strongCities} il
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <CardContent className="p-4">
                        <div className="text-sm text-red-600 dark:text-red-400 mb-1">Zayıf Bölge</div>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                            {weakCities} il
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Map Visualization */}
            <Card>
                <CardHeader>
                    <CardTitle>Türkiye Üye Dağılım Haritası</CardTitle>
                    <CardDescription>Renk yoğunluğu üye sayısına göre değişir</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Simplified Turkey Map Grid */}
                    <div className="relative bg-slate-100 dark:bg-slate-800 rounded-xl p-8 overflow-x-auto">
                        <div className="min-w-[600px]">
                            {/* Grid-based simplified map */}
                            <div className="grid grid-cols-12 gap-1">
                                {/* Row 1 - Northern Turkey */}
                                <div className="col-span-2" />
                                {['55', '61', '62', '63'].map(code => (
                                    <div
                                        key={code}
                                        className="aspect-square rounded cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all flex items-center justify-center text-xs font-medium"
                                        style={{
                                            backgroundColor: cityData[code]
                                                ? strengthColors[cityData[code].strength]
                                                : strengthColors.none
                                        }}
                                        onClick={() => setSelectedCity(code)}
                                    >
                                        {code}
                                    </div>
                                ))}
                                <div className="col-span-6" />

                                {/* Row 2 */}
                                {['10', '11', '17', '41', '34', '54', '67', '78', '81'].map(code => (
                                    <div
                                        key={code}
                                        className="aspect-square rounded cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all flex items-center justify-center text-xs font-medium"
                                        style={{
                                            backgroundColor: cityData[code]
                                                ? strengthColors[cityData[code].strength]
                                                : strengthColors.none
                                        }}
                                        onClick={() => setSelectedCity(code)}
                                    >
                                        {code}
                                    </div>
                                ))}
                                <div className="col-span-3" />

                                {/* Row 3 */}
                                {['35', '45', '43', '16', '26', '06', '38', '44', '23', '25'].map(code => (
                                    <div
                                        key={code}
                                        className="aspect-square rounded cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all flex items-center justify-center text-xs font-medium"
                                        style={{
                                            backgroundColor: cityData[code]
                                                ? strengthColors[cityData[code].strength]
                                                : strengthColors.none
                                        }}
                                        onClick={() => setSelectedCity(code)}
                                    >
                                        {code}
                                    </div>
                                ))}
                                <div className="col-span-2" />

                                {/* Row 4 */}
                                <div className="col-span-1" />
                                {['48', '20', '42', '32', '70', '51', '21', '27'].map(code => (
                                    <div
                                        key={code}
                                        className="aspect-square rounded cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all flex items-center justify-center text-xs font-medium"
                                        style={{
                                            backgroundColor: cityData[code]
                                                ? strengthColors[cityData[code].strength]
                                                : strengthColors.none
                                        }}
                                        onClick={() => setSelectedCity(code)}
                                    >
                                        {code}
                                    </div>
                                ))}
                                <div className="col-span-3" />

                                {/* Row 5 - Southern Turkey */}
                                <div className="col-span-2" />
                                {['07', '33', '01', '80', '31'].map(code => (
                                    <div
                                        key={code}
                                        className="aspect-square rounded cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all flex items-center justify-center text-xs font-medium"
                                        style={{
                                            backgroundColor: cityData[code]
                                                ? strengthColors[cityData[code].strength]
                                                : strengthColors.none
                                        }}
                                        onClick={() => setSelectedCity(code)}
                                    >
                                        {code}
                                    </div>
                                ))}
                                <div className="col-span-5" />
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center justify-center gap-6 mt-6 text-sm">
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded" style={{ backgroundColor: strengthColors.high }} />
                                Güçlü (1000+ üye)
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded" style={{ backgroundColor: strengthColors.medium }} />
                                Orta (300-999 üye)
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded" style={{ backgroundColor: strengthColors.low }} />
                                Zayıf (1-299 üye)
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded" style={{ backgroundColor: strengthColors.none }} />
                                Üye Yok
                            </span>
                        </div>
                    </div>

                    {/* Selected City Info */}
                    {selectedCity && cityData[selectedCity] && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-blue-800 dark:text-blue-300">
                                        {cityNames[selectedCity] || `İl ${selectedCity}`}
                                    </h3>
                                    <p className="text-sm text-blue-600 dark:text-blue-400">
                                        {cityData[selectedCity].members.toLocaleString('tr-TR')} üye
                                    </p>
                                </div>
                                <div className={`flex items-center gap-1 ${cityData[selectedCity].growth >= 0 ? 'text-emerald-600' : 'text-red-600'
                                    }`}>
                                    {cityData[selectedCity].growth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    {cityData[selectedCity].growth > 0 ? '+' : ''}{cityData[selectedCity].growth}%
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* City List */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            İl Bazlı Detay
                        </CardTitle>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'members' | 'growth')}
                            className="px-3 py-1 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700"
                        >
                            <option value="members">Üye Sayısına Göre</option>
                            <option value="growth">Büyümeye Göre</option>
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {sortedCities.map(([code, data]) => (
                            <div
                                key={code}
                                className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                                    style={{ backgroundColor: strengthColors[data.strength] }}
                                >
                                    {code}
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-slate-900 dark:text-white">
                                        {cityNames[code] || `İl ${code}`}
                                    </div>
                                    <div className="text-sm text-slate-500">{data.members.toLocaleString('tr-TR')} üye</div>
                                </div>
                                <div className="flex-1">
                                    <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${(data.members / 4500) * 100}%`,
                                                backgroundColor: strengthColors[data.strength]
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className={`flex items-center gap-1 w-20 justify-end ${data.growth >= 0 ? 'text-emerald-600' : 'text-red-600'
                                    }`}>
                                    {data.growth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    {data.growth > 0 ? '+' : ''}{data.growth}%
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-amber-800 dark:text-amber-300">Büyüme Önerileri</h3>
                            <ul className="text-sm text-amber-700 dark:text-amber-400 mt-2 space-y-1">
                                <li>• <strong>Kocaeli:</strong> +%22.1 büyüme - bu ivmeyi koruyun ve kaynakları artırın</li>
                                <li>• <strong>Antalya:</strong> -%2.4 düşüş - bölgesel kampanya önerilir</li>
                                <li>• <strong>Gaziantep:</strong> -%5.2 düşüş - acil müdahale gerekebilir</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
