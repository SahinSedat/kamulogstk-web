'use client'

import React, { useState } from 'react'
import {
    CreditCard, Search, Filter, Download, Plus,
    CheckCircle2, XCircle, Clock, TrendingUp, Calendar,
    ChevronLeft, ChevronRight, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Mock payment data
const payments = [
    { id: 1, member: 'Ahmet Yılmaz', type: 'Aidat', amount: 150, date: '2026-01-15', status: 'paid', method: 'Kredi Kartı' },
    { id: 2, member: 'Fatma Demir', type: 'Aidat', amount: 150, date: '2026-01-14', status: 'paid', method: 'Havale' },
    { id: 3, member: 'Mehmet Kaya', type: 'Bağış', amount: 500, date: '2026-01-13', status: 'paid', method: 'Kredi Kartı' },
    { id: 4, member: 'Ayşe Şahin', type: 'Aidat', amount: 150, date: '2026-01-12', status: 'pending', method: 'Beklemede' },
    { id: 5, member: 'Ali Öztürk', type: 'Aidat', amount: 150, date: '2026-01-11', status: 'failed', method: 'Kredi Kartı' },
    { id: 6, member: 'Zeynep Arslan', type: 'Aidat', amount: 150, date: '2026-01-10', status: 'paid', method: 'Havale' },
    { id: 7, member: 'Mustafa Çelik', type: 'Bağış', amount: 1000, date: '2026-01-09', status: 'paid', method: 'EFT' },
    { id: 8, member: 'Elif Yıldız', type: 'Aidat', amount: 150, date: '2026-01-08', status: 'paid', method: 'Kredi Kartı' },
]

const stats = [
    { label: 'Bu Ay Toplam', value: '₺24.500', change: '+12%', icon: TrendingUp, color: 'emerald' },
    { label: 'Başarılı İşlem', value: '156', change: '+8%', icon: CheckCircle2, color: 'blue' },
    { label: 'Bekleyen', value: '12', change: '-3%', icon: Clock, color: 'amber' },
    { label: 'Başarısız', value: '4', change: '-50%', icon: XCircle, color: 'red' },
]

const statusColors = {
    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const statusLabels = {
    paid: 'Ödendi',
    pending: 'Beklemede',
    failed: 'Başarısız',
}

export default function STKPaymentsPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    const filteredPayments = payments.filter(payment => {
        const matchesSearch = payment.member.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
        return matchesSearch && matchesStatus
    })

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ödemeler</h1>
                    <p className="text-slate-500">Aidat ve bağış ödemelerini takip edin</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Dışa Aktar
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Manuel Ödeme Ekle
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Card key={stat.label}>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className={`p-2 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}>
                                    <stat.icon className={`w-5 h-5 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                                </div>
                                <span className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-emerald-600' : 'text-red-600'
                                    }`}>
                                    {stat.change}
                                </span>
                            </div>
                            <div className="mt-3">
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                                <div className="text-sm text-slate-500">{stat.label}</div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Üye adı ile ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                            >
                                <option value="all">Tüm Durumlar</option>
                                <option value="paid">Ödendi</option>
                                <option value="pending">Beklemede</option>
                                <option value="failed">Başarısız</option>
                            </select>
                            <Button variant="outline">
                                <Filter className="w-4 h-4 mr-2" />
                                Filtrele
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payments Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Ödeme Geçmişi
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b dark:border-slate-700">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Üye</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Tür</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Tutar</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Tarih</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Yöntem</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Durum</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="border-b last:border-0 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="py-3 px-4">
                                            <span className="font-medium text-slate-900 dark:text-white">{payment.member}</span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{payment.type}</td>
                                        <td className="py-3 px-4">
                                            <span className="font-semibold text-slate-900 dark:text-white">₺{payment.amount}</span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {payment.date}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{payment.method}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[payment.status as keyof typeof statusColors]}`}>
                                                {statusLabels[payment.status as keyof typeof statusLabels]}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <Button variant="ghost" size="sm">
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-slate-700">
                        <span className="text-sm text-slate-500">Toplam {payments.length} kayıt</span>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-sm">1</span>
                            <Button variant="outline" size="sm">
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
