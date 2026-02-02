"use client"

import React from 'react'
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
} from 'lucide-react'

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
    const stats = {
        totalMembers: 342,
        activeMembers: 298,
        pendingApplications: 8,
        monthlyDues: 15600,
        collectedDues: 12400,
        pendingDues: 3200,
    }

    const recentMembers = [
        { name: 'Mehmet Kaya', status: 'active', date: '2 saat önce' },
        { name: 'Ayşe Demir', status: 'pending', date: '5 saat önce' },
        { name: 'Fatma Yıldız', status: 'active', date: '1 gün önce' },
        { name: 'Ali Çelik', status: 'resignation', date: '2 gün önce' },
    ]

    const upcomingPayments = [
        { member: 'Ahmet Yılmaz', amount: 500, dueDate: '15 Ocak 2024' },
        { member: 'Elif Arslan', amount: 500, dueDate: '15 Ocak 2024' },
        { member: 'Mustafa Öz', amount: 500, dueDate: '20 Ocak 2024' },
    ]

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
                    <p className="text-slate-500 mt-1">STK genel görünümü ve istatistikler</p>
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
                    change={12}
                    icon={Users}
                    iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
                    trend="up"
                />
                <StatsCard
                    title="Aktif Üye"
                    value={stats.activeMembers}
                    change={8}
                    icon={CheckCircle}
                    iconColor="bg-gradient-to-br from-emerald-500 to-emerald-600"
                    trend="up"
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
                    change={15}
                    icon={Wallet}
                    iconColor="bg-gradient-to-br from-purple-500 to-pink-500"
                    trend="up"
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
                                <p className="text-sm text-emerald-100 mt-1">{Math.round((stats.collectedDues / stats.monthlyDues) * 100)}% tamamlandı</p>
                            </div>
                            <TrendingUp className="w-12 h-12 text-emerald-200" />
                        </div>
                        <div className="mt-4 h-2 bg-emerald-400/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full"
                                style={{ width: `${(stats.collectedDues / stats.monthlyDues) * 100}%` }}
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
                                <p className="text-sm text-amber-100 mt-1">{Math.round((stats.pendingDues / stats.monthlyDues) * 100)}% bekliyor</p>
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

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Members */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Son Üye Hareketleri</CardTitle>
                        <a href="/stk/members" className="text-sm text-emerald-600 hover:underline">
                            Tümünü Gör
                        </a>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentMembers.map((member, index) => (
                                <div key={index} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-medium">
                                            {member.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">{member.name}</p>
                                            <p className="text-sm text-slate-500">{member.date}</p>
                                        </div>
                                    </div>
                                    <Badge variant={
                                        member.status === 'active' ? 'success' :
                                            member.status === 'pending' ? 'warning' : 'destructive'
                                    }>
                                        {member.status === 'active' ? 'Aktif' :
                                            member.status === 'pending' ? 'Beklemede' : 'İstifa Talebi'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Upcoming Payments */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Yaklaşan Ödemeler</CardTitle>
                        <a href="/stk/payments" className="text-sm text-emerald-600 hover:underline">
                            Tümünü Gör
                        </a>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {upcomingPayments.map((payment, index) => (
                                <div key={index} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                                            <Calendar className="w-5 h-5 text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">{payment.member}</p>
                                            <p className="text-sm text-slate-500">{payment.dueDate}</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-semibold text-slate-900 dark:text-white">
                                        ₺{payment.amount}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Member Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle>Üye Durumu Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            { label: 'Aktif', count: 298, color: 'bg-emerald-500', percent: 87 },
                            { label: 'Beklemede', count: 8, color: 'bg-amber-500', percent: 2 },
                            { label: 'İstifa Talebi', count: 5, color: 'bg-orange-500', percent: 2 },
                            { label: 'Pasif', count: 28, color: 'bg-slate-400', percent: 8 },
                            { label: 'Vefat', count: 3, color: 'bg-slate-600', percent: 1 },
                        ].map((item) => (
                            <div key={item.label} className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <div className={`w-12 h-12 ${item.color} rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3`}>
                                    {item.count}
                                </div>
                                <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
                                <p className="text-sm text-slate-500">{item.percent}%</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
