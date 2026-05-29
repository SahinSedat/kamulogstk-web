"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Users,
    UserPlus,
    Wallet,
    TrendingUp,
    ArrowUpRight,
    Clock,
    CheckCircle,
    AlertCircle,
    Calendar,
    Loader2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface StatsCardProps {
    title: string
    value: string | number
    change?: number
    icon: React.ElementType
    iconColor: string
    trend?: 'up' | 'down'
}

function StatsCard({ title, value, change, icon: Icon, iconColor, trend }: StatsCardProps) {
    return (
        <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{value}</p>
                        {change !== undefined && (
                            <div className="flex items-center gap-1 mt-2">
                                <ArrowUpRight className={`w-4 h-4 ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`} />
                                <span className={trend === 'up' ? 'text-emerald-500' : 'text-red-500'}>
                                    {change}%
                                </span>
                                <span className="text-slate-500 text-sm">bu ay</span>
                            </div>
                        )}
                    </div>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${iconColor}`}>
                        <Icon className="w-7 h-7 text-white" />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default function STKDashboard() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<{ stats: any, stkName: string } | null>(null)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/stk/stats')
                if (res.status === 404) {
                    setError('Bağlı bir STK bulunamadı. Lütfen yönetici ile iletişime geçin.')
                    return
                }
                const data = await res.json()
                if (data.success) {
                    setData(data)
                } else {
                    setError(data.error || 'İstatistikler yüklenemedi')
                }
            } catch (err) {
                console.error('Stats fetch error:', err)
                setError('Sunucu bağlantı hatası')
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white/5 rounded-2xl border border-white/10">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Hata Oluştu</h2>
                <p className="text-slate-400 mb-6">{error}</p>
                <Button onClick={() => window.location.href = '/'}>Ana Sayfaya Dön</Button>
            </div>
        )
    }

    const { stats, stkName } = data!

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
                    <p className="text-slate-500 mt-1">{stkName} genel görünümü ve istatistikler</p>
                </div>
                <Button className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                    <UserPlus className="w-4 h-4" />
                    Yeni Üye Ekle
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Toplam Üye"
                    value={stats.totalMembers}
                    icon={Users}
                    iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
                />
                <StatsCard
                    title="Aktif Üye"
                    value={stats.activeMembers}
                    icon={CheckCircle}
                    iconColor="bg-gradient-to-br from-emerald-500 to-emerald-600"
                />
                <StatsCard
                    title="Bekleyen Başvuru"
                    value={stats.pendingApplications}
                    icon={Clock}
                    iconColor="bg-gradient-to-br from-amber-500 to-orange-500"
                />
                <StatsCard
                    title="Aylık Tahsilat"
                    value={`₺${stats.collectedDues.toLocaleString('tr-TR')}`}
                    icon={Wallet}
                    iconColor="bg-gradient-to-br from-purple-500 to-pink-500"
                />
            </div>

            {/* Second Row Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-100">Tahsil Edilen</p>
                                <p className="text-3xl font-bold mt-2">₺{stats.collectedDues.toLocaleString('tr-TR')}</p>
                                <p className="text-sm text-emerald-100 mt-1">{stats.monthlyDues > 0 ? Math.round((stats.collectedDues / stats.monthlyDues) * 100) : 0}% tamamlandı</p>
                            </div>
                            <TrendingUp className="w-12 h-12 text-emerald-200" />
                        </div>
                        <div className="mt-4 h-2 bg-emerald-400/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full"
                                style={{ width: `${stats.monthlyDues > 0 ? (stats.collectedDues / stats.monthlyDues) * 100 : 0}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-amber-100">Bekleyen Aidat</p>
                                <p className="text-3xl font-bold mt-2">₺{stats.pendingDues.toLocaleString('tr-TR')}</p>
                                <p className="text-sm text-amber-100 mt-1">{stats.monthlyDues > 0 ? Math.round((stats.pendingDues / stats.monthlyDues) * 100) : 0}% bekliyor</p>
                            </div>
                            <AlertCircle className="w-12 h-12 text-amber-200" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-500">Hedef Tahsilat</p>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">₺{stats.monthlyDues.toLocaleString('tr-TR')}</p>
                                <p className="text-sm text-slate-500 mt-1">Bu ay</p>
                            </div>
                            <Wallet className="w-12 h-12 text-slate-300" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
