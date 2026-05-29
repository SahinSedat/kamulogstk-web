"use client"

import React, { useState, useEffect } from 'react'
import { Search, Filter, CreditCard, Download, CheckCircle, XCircle, Clock, Building2, User, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface Payment {
    id: string
    type: string
    amount: string
    currency: string
    status: string
    createdAt: string
    paymentDate: string | null
    stk: { id: string; name: string }
    member: { id: string; name: string; surname: string; email: string } | null
    transactionRef: string | null
    description: string | null
}

const statusLabels: Record<string, string> = {
    PENDING: 'Bekliyor',
    CONFIRMED: 'Onaylandı',
    REJECTED: 'Reddedildi',
    CANCELLED: 'İptal',
    REFUNDED: 'İade'
}

const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    CONFIRMED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-slate-100 text-slate-700',
    REFUNDED: 'bg-purple-100 text-purple-700'
}

const typeLabels: Record<string, string> = {
    DUES: 'Aidat',
    DONATION: 'Bağış',
    REGISTRATION: 'Kayıt Ücreti',
    OTHER: 'Diğer'
}

export default function AdminPaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    // Detail dialog
    const [viewPayment, setViewPayment] = useState<Payment | null>(null)

    const fetchPayments = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (search) params.append('search', search)
            if (statusFilter !== 'all') params.append('status', statusFilter)
            if (typeFilter !== 'all') params.append('type', typeFilter)
            params.append('page', page.toString())

            const res = await fetch(`/api/admin/payments?${params.toString()}`)
            const data = await res.json()

            if (data.success) {
                setPayments(data.payments)
                setTotalPages(data.pagination.totalPages)
                setTotal(data.pagination.total)
            }
        } catch (error) {
            console.error('Ödemeler yüklenirken hata:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timeout = setTimeout(fetchPayments, 300)
        return () => clearTimeout(timeout)
    }, [search, statusFilter, typeFilter, page])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <CreditCard className="w-7 h-7 text-blue-600" />
                        Finansal İşlemler
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Sistemdeki tüm aidat, bağış ve ödeme işlemlerini yönetin ({total} işlem)
                    </p>
                </div>
                <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Dışa Aktar
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        placeholder="Üye adı, STK veya işlem no ara..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        className="pl-10"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-slate-400" />
                    <select
                        value={typeFilter}
                        onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
                        className="h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                        <option value="all">Tüm İşlemler</option>
                        <option value="DUES">Aidat</option>
                        <option value="DONATION">Bağış</option>
                        <option value="REGISTRATION">Kayıt Ücreti</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                        className="h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                        <option value="all">Tüm Durumlar</option>
                        <option value="CONFIRMED">Onaylandı</option>
                        <option value="PENDING">Bekliyor</option>
                        <option value="REJECTED">Reddedildi</option>
                        <option value="CANCELLED">İptal</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">İşlem Detayı</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Üye / STK</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tutar</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Durum</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tarih</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {payments.map(payment => (
                                <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">
                                                {typeLabels[payment.type] || payment.type}
                                            </p>
                                            <p className="text-xs text-slate-500 font-mono mt-1">
                                                #{payment.transactionRef || payment.id.slice(0, 8)}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            {payment.member ? (
                                                <div className="flex items-center gap-2 text-sm text-slate-900 dark:text-white">
                                                    <User className="w-3 h-3 text-slate-400" />
                                                    {payment.member.name} {payment.member.surname}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-slate-400 italic">Misafir</div>
                                            )}
                                            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                                                <Building2 className="w-3 h-3" />
                                                {payment.stk.name}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {Number(payment.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {payment.currency}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColors[payment.status]}`}>
                                            {statusLabels[payment.status] || payment.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {new Date(payment.createdAt).toLocaleDateString('tr-TR')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setViewPayment(payment)}
                                            className="h-8 px-2 text-xs"
                                        >
                                            Detay
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Dialog */}
            <Dialog open={!!viewPayment} onOpenChange={() => setViewPayment(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ödeme Detayı</DialogTitle>
                        <DialogDescription>
                            İşlem kayıt detayları
                        </DialogDescription>
                    </DialogHeader>
                    {viewPayment && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                                <div className="text-sm text-slate-500 mb-1">Toplam Tutar</div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {Number(viewPayment.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {viewPayment.currency}
                                </div>
                                <div className={`mt-2 inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColors[viewPayment.status]}`}>
                                    {statusLabels[viewPayment.status]}
                                </div>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-500">İşlem Tipi</span>
                                    <span className="font-medium">{typeLabels[viewPayment.type]}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-500">Ödeyen</span>
                                    <span className="font-medium">
                                        {viewPayment.member ? `${viewPayment.member.name} ${viewPayment.member.surname}` : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-500">Kurum (STK)</span>
                                    <span className="font-medium">{viewPayment.stk.name}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-500">Tarih</span>
                                    <span className="font-medium">{new Date(viewPayment.createdAt).toLocaleString('tr-TR')}</span>
                                </div>
                                {viewPayment.description && (
                                    <div className="py-2">
                                        <span className="text-slate-500 block mb-1">Açıklama</span>
                                        <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2 rounded text-xs">
                                            {viewPayment.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setViewPayment(null)}>Kapat</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
