"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Wallet, TrendingUp, TrendingDown, Download, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function AccountingPage() {
    const stats = {
        totalMembers: 342,
        activeMembers: 298,
        collectedDues: 124500,
        pendingDues: 32000,
        monthlyTarget: 156500,
        previousMonth: 112000,
    }

    const monthlyData = [
        { month: 'Ağu', collected: 98000, target: 120000 },
        { month: 'Eyl', collected: 105000, target: 125000 },
        { month: 'Eki', collected: 112000, target: 130000 },
        { month: 'Kas', collected: 118000, target: 145000 },
        { month: 'Ara', collected: 124500, target: 156500 },
    ]

    const recentPayments = [
        { name: 'Ahmet Yılmaz', amount: 500, date: '13 Ocak 2024', type: 'Aidat' },
        { name: 'Fatma Demir', amount: 1000, date: '12 Ocak 2024', type: 'Bağış' },
        { name: 'Mehmet Kaya', amount: 500, date: '12 Ocak 2024', type: 'Aidat' },
        { name: 'Ayşe Çelik', amount: 500, date: '11 Ocak 2024', type: 'Aidat' },
        { name: 'Ali Öztürk', amount: 250, date: '10 Ocak 2024', type: 'Kayıt' },
    ]

    const change = ((stats.collectedDues - stats.previousMonth) / stats.previousMonth * 100).toFixed(1)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Muhasebe</h1>
                    <p className="text-slate-500 mt-1">Finansal özet ve raporlar</p>
                </div>
                <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Rapor İndir
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card><CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-slate-500">Toplam Üye</p>
                            <p className="text-3xl font-bold mt-2">{stats.totalMembers}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><Users className="w-6 h-6 text-blue-600" /></div>
                    </div>
                </CardContent></Card>

                <Card><CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-slate-500">Aktif Üye</p>
                            <p className="text-3xl font-bold mt-2">{stats.activeMembers}</p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center"><Users className="w-6 h-6 text-emerald-600" /></div>
                    </div>
                </CardContent></Card>

                <Card><CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-slate-500">Tahsil Edilen</p>
                            <p className="text-3xl font-bold mt-2">₺{stats.collectedDues.toLocaleString('tr-TR')}</p>
                            <div className="flex items-center gap-1 mt-1">
                                <ArrowUpRight className="w-4 h-4 text-emerald-500" /><span className="text-emerald-500 text-sm">%{change}</span>
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center"><TrendingUp className="w-6 h-6 text-emerald-600" /></div>
                    </div>
                </CardContent></Card>

                <Card><CardContent className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-slate-500">Geciken Aidatlar</p>
                            <p className="text-3xl font-bold mt-2">₺{stats.pendingDues.toLocaleString('tr-TR')}</p>
                        </div>
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center"><TrendingDown className="w-6 h-6 text-amber-600" /></div>
                    </div>
                </CardContent></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Aylık Tahsilat Trendi</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {monthlyData.map((item) => (
                                <div key={item.month}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium">{item.month}</span>
                                        <span className="text-slate-500">₺{item.collected.toLocaleString('tr-TR')} / ₺{item.target.toLocaleString('tr-TR')}</span>
                                    </div>
                                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${(item.collected / item.target) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Son Ödemeler</CardTitle>
                        <a href="/stk/payments" className="text-sm text-emerald-600 hover:underline">Tümünü Gör</a>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentPayments.map((payment, i) => (
                                <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center"><Wallet className="w-5 h-5 text-emerald-600" /></div>
                                        <div>
                                            <p className="font-medium">{payment.name}</p>
                                            <div className="flex items-center gap-2 text-sm text-slate-500"><Calendar className="w-3 h-3" />{payment.date}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-emerald-600">+₺{payment.amount}</p>
                                        <Badge variant="outline">{payment.type}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-emerald-100">Bu Ay Tahsilat Oranı</p>
                            <p className="text-4xl font-bold mt-2">{Math.round((stats.collectedDues / stats.monthlyTarget) * 100)}%</p>
                            <p className="text-emerald-100 mt-1">₺{stats.collectedDues.toLocaleString('tr-TR')} / ₺{stats.monthlyTarget.toLocaleString('tr-TR')}</p>
                        </div>
                        <div className="w-32 h-32 relative">
                            <svg className="w-full h-full -rotate-90"><circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.3)" strokeWidth="12" fill="none" />
                                <circle cx="64" cy="64" r="56" stroke="white" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray={`${(stats.collectedDues / stats.monthlyTarget) * 352} 352`} />
                            </svg>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
