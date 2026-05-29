"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Building2,
    Users,
    FileCheck,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
} from 'lucide-react'

// Stats Card Component
interface StatsCardProps {
    title: string
    value: string | number
    change?: number
    changeLabel?: string
    icon: React.ElementType
    iconColor: string
    trend?: 'up' | 'down'
}

function StatsCard({ title, value, change, changeLabel, icon: Icon, iconColor, trend }: StatsCardProps) {
    return (
        <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{value}</p>
                        {change !== undefined && (
                            <div className="flex items-center gap-1 mt-2">
                                {trend === 'up' ? (
                                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                                ) : (
                                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                                )}
                                <span className={trend === 'up' ? 'text-emerald-500' : 'text-red-500'}>
                                    {change}%
                                </span>
                                <span className="text-slate-500 text-sm">{changeLabel}</span>
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

// Recent Application Row Component
interface ApplicationRowProps {
    name: string
    type: string
    status: 'pending' | 'approved' | 'rejected'
    date: string
}

function ApplicationRow({ name, type, status, date }: ApplicationRowProps) {
    const statusConfig = {
        pending: { label: 'Beklemede', variant: 'warning' as const, icon: Clock },
        approved: { label: 'Onaylandı', variant: 'success' as const, icon: CheckCircle },
        rejected: { label: 'Reddedildi', variant: 'destructive' as const, icon: XCircle },
    }

    const config = statusConfig[status]

    return (
        <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="font-medium text-slate-900 dark:text-white">{name}</p>
                    <p className="text-sm text-slate-500">{type}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500">{date}</span>
                <Badge variant={config.variant} className="flex items-center gap-1">
                    <config.icon className="w-3 h-3" />
                    {config.label}
                </Badge>
            </div>
        </div>
    )
}

export default function AdminDashboard() {
    // Mock data - will be replaced with real data from API
    const stats = {
        totalSTKs: 156,
        activeSTKs: 142,
        pendingApplications: 12,
        monthlyRevenue: 45600,
    }

    const recentApplications: ApplicationRowProps[] = [
        { name: 'Türkiye Eğitim Vakfı', type: 'Vakıf', status: 'pending', date: '2 saat önce' },
        { name: 'İstanbul Yazılımcılar Derneği', type: 'Dernek', status: 'approved', date: '5 saat önce' },
        { name: 'Metal İş Sendikası', type: 'Sendika', status: 'pending', date: '1 gün önce' },
        { name: 'Ankara Esnaf Kooperatifi', type: 'Kooperatif', status: 'rejected', date: '2 gün önce' },
        { name: 'Mühendis Odaları Birliği', type: 'Meslek Odası', status: 'approved', date: '3 gün önce' },
    ]

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
                <p className="text-slate-500 mt-1">Sistem genel görünümü ve istatistikler</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Toplam STK"
                    value={stats.totalSTKs}
                    change={12}
                    changeLabel="bu ay"
                    icon={Building2}
                    iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
                    trend="up"
                />
                <StatsCard
                    title="Aktif STK"
                    value={stats.activeSTKs}
                    change={8}
                    changeLabel="bu ay"
                    icon={CheckCircle}
                    iconColor="bg-gradient-to-br from-emerald-500 to-emerald-600"
                    trend="up"
                />
                <StatsCard
                    title="Bekleyen Başvuru"
                    value={stats.pendingApplications}
                    icon={FileCheck}
                    iconColor="bg-gradient-to-br from-amber-500 to-orange-500"
                />
                <StatsCard
                    title="Aylık Gelir"
                    value={`₺${stats.monthlyRevenue.toLocaleString('tr-TR')}`}
                    change={15}
                    changeLabel="geçen aya göre"
                    icon={TrendingUp}
                    iconColor="bg-gradient-to-br from-purple-500 to-pink-500"
                    trend="up"
                />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Applications */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Son Başvurular</CardTitle>
                        <a href="/admin/stk-applications" className="text-sm text-blue-600 hover:underline">
                            Tümünü Gör
                        </a>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {recentApplications.map((app, index) => (
                                <ApplicationRow key={index} {...app} />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card>
                    <CardHeader>
                        <CardTitle>STK Dağılımı</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[
                            { label: 'Dernek', count: 78, color: 'bg-blue-500' },
                            { label: 'Vakıf', count: 34, color: 'bg-purple-500' },
                            { label: 'Sendika', count: 22, color: 'bg-emerald-500' },
                            { label: 'Meslek Odası', count: 15, color: 'bg-amber-500' },
                            { label: 'Kooperatif', count: 7, color: 'bg-pink-500' },
                        ].map((item) => (
                            <div key={item.label}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                                    <span className="text-sm text-slate-500">{item.count}</span>
                                </div>
                                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${item.color} rounded-full transition-all duration-500`}
                                        style={{ width: `${(item.count / stats.totalSTKs) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Alerts */}
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-amber-800 dark:text-amber-200">Dikkat Edilmesi Gereken İşlemler</h3>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                12 adet bekleyen STK başvurusu, 5 adet gözden geçirilmesi gereken üyelik başvurusu bulunmaktadır.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
