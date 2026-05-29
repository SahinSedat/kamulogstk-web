'use client'

import React, { useState, useEffect } from 'react'

const statusColors: Record<string, string> = {
    CONFIRMED: 'bg-emerald-100 text-emerald-700', PENDING: 'bg-amber-100 text-amber-700',
    REJECTED: 'bg-red-100 text-red-700', CANCELLED: 'bg-slate-100 text-slate-700',
    REFUNDED: 'bg-blue-100 text-blue-700', DELETED: 'bg-red-100 text-red-700',
}
const statusLabels: Record<string, string> = {
    CONFIRMED: 'Onaylandı', PENDING: 'Beklemede', REJECTED: 'Reddedildi',
    CANCELLED: 'İptal', REFUNDED: 'İade', DELETED: 'Silindi',
}
const typeLabels: Record<string, string> = { DUES: 'Aidat', DONATION: 'Bağış', REGISTRATION: 'Kayıt', OTHER: 'Diğer' }

export default function STKPaymentsPage() {
    const [payments, setPayments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active')
    const [summary, setSummary] = useState<any>({})
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [paymentToDelete, setPaymentToDelete] = useState<any>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const fetchPayments = async (showDeleted = false) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (showDeleted) params.set('showDeleted', 'true')
            if (searchTerm) params.set('search', searchTerm)
            if (statusFilter !== 'all' && !showDeleted) params.set('status', statusFilter)
            const res = await fetch(`/api/stk/payments?${params}`)
            const data = await res.json()
            if (data.success) { setPayments(data.payments || []); setSummary(data.summary || {}) }
        } catch (err) { console.error('Payments fetch error:', err) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchPayments(activeTab === 'deleted') }, [activeTab])
    const handleSearch = () => fetchPayments(activeTab === 'deleted')

    const handleSoftDelete = async () => {
        if (!paymentToDelete) return
        setDeleteLoading(true)
        try {
            const res = await fetch(`/api/stk/payments/${paymentToDelete.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) { setShowDeleteDialog(false); setPaymentToDelete(null); fetchPayments(activeTab === 'deleted') }
            else alert(data.error || 'Silme başarısız')
        } catch { alert('Hata oluştu') }
        finally { setDeleteLoading(false) }
    }

    const handleRestore = async (paymentId: string) => {
        if (!confirm('Bu ödemeyi geri aktif etmek istediğinize emin misiniz?')) return
        try {
            const res = await fetch(`/api/stk/payments/${paymentId}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'restore' })
            })
            const data = await res.json()
            if (data.success) fetchPayments(activeTab === 'deleted')
        } catch { console.error('Restore error') }
    }

    const filteredPayments = payments.filter(p => {
        if (!searchTerm) return true
        const memberName = p.member ? `${p.member.name} ${p.member.surname}` : ''
        return memberName.toLowerCase().includes(searchTerm.toLowerCase())
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ödemeler</h1>
                    <p className="text-slate-500">Aidat ve bağış ödemelerini takip edin</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
                <button onClick={() => setActiveTab('active')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-white dark:bg-slate-700 text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    💳 Aktif Ödemeler
                </button>
                <button onClick={() => setActiveTab('deleted')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'deleted' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    🗄️ Silinen Ödemeler
                </button>
            </div>

            {/* Stats */}
            {activeTab === 'active' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-4">
                        <div className="text-2xl font-bold mt-2">₺{(summary.totalConfirmed || 0).toLocaleString('tr-TR')}</div>
                        <div className="text-sm text-slate-500">Onaylanan Toplam</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-4">
                        <div className="text-2xl font-bold mt-2">{summary.confirmedCount || 0}</div>
                        <div className="text-sm text-slate-500">Onaylı İşlem</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-4">
                        <div className="text-2xl font-bold mt-2">{summary.pendingCount || 0}</div>
                        <div className="text-sm text-slate-500">Bekleyen</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-4">
                        <div className="text-2xl font-bold mt-2">{summary.deletedCount || 0}</div>
                        <div className="text-sm text-slate-500">Silinen</div>
                    </div>
                </div>
            )}

            {activeTab === 'deleted' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                        <p className="font-medium text-amber-800">Silinen Ödemeler Arşivi</p>
                        <p className="text-sm text-amber-600 mt-1">Silinen ödemeler kasadan ve hesaplamalardan düşürülmüştür. Tüm verileri log olarak saklanmaktadır.</p>
                    </div>
                </div>
            )}

            {/* Filter */}
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                        <input type="text" placeholder="Üye adı ile ara..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
                    </div>
                    {activeTab === 'active' && (
                        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setTimeout(() => fetchPayments(false), 100) }}
                            className="px-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700">
                            <option value="all">Tüm Durumlar</option>
                            <option value="CONFIRMED">Onaylandı</option>
                            <option value="PENDING">Beklemede</option>
                            <option value="REJECTED">Reddedildi</option>
                        </select>
                    )}
                    <button onClick={handleSearch} className="px-4 py-2 border rounded-lg hover:bg-slate-50 dark:border-slate-700 transition">Filtrele</button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="p-4 border-b dark:border-slate-700">
                    <h2 className="text-lg font-semibold">{activeTab === 'deleted' ? '🗄️ Silinen Ödemeler' : '💳 Ödeme Geçmişi'}</h2>
                </div>
                <div className="p-4">
                    {loading ? (<p className="text-center py-8 text-slate-500">Yükleniyor...</p>
                    ) : filteredPayments.length === 0 ? (<p className="text-center py-8 text-slate-500">{activeTab === 'deleted' ? 'Silinen ödeme bulunmuyor.' : 'Ödeme bulunamadı.'}</p>
                    ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="border-b dark:border-slate-700">
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Üye</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Tür</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Tutar</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Tarih</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Durum</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">İşlem</th>
                            </tr></thead>
                            <tbody>
                                {filteredPayments.map((payment) => {
                                    const isDeleted = payment.status === 'DELETED'
                                    const memberName = payment.member ? `${payment.member.name} ${payment.member.surname}` : 'Bilinmiyor'
                                    return (
                                        <tr key={payment.id} className={`border-b last:border-0 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isDeleted ? 'opacity-60' : ''}`}>
                                            <td className="py-3 px-4"><span className={`font-medium ${isDeleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>{memberName}</span></td>
                                            <td className="py-3 px-4 text-slate-600">{typeLabels[payment.type] || payment.type}</td>
                                            <td className="py-3 px-4"><span className={`font-semibold ${isDeleted ? 'line-through text-slate-400' : ''}`}>₺{(payment.amount || 0).toLocaleString('tr-TR')}</span></td>
                                            <td className="py-3 px-4 text-slate-600 text-sm">{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('tr-TR') : payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('tr-TR') : '—'}</td>
                                            <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[payment.status] || ''}`}>{statusLabels[payment.status] || payment.status}</span></td>
                                            <td className="py-3 px-4 text-right">
                                                {isDeleted ? (
                                                    <button onClick={() => handleRestore(payment.id)} className="px-3 py-1.5 text-sm rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition">↩️ Geri Al</button>
                                                ) : (
                                                    <button onClick={() => { setPaymentToDelete(payment); setShowDeleteDialog(true) }} className="px-3 py-1.5 text-sm rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition">🗑️ Sil</button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    )}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-slate-700">
                        <span className="text-sm text-slate-500">Toplam {filteredPayments.length} kayıt</span>
                    </div>
                </div>
            </div>

            {/* Delete Dialog */}
            {showDeleteDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteDialog(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">⚠️ Ödeme Silme Onayı</h3>
                        <div className="mt-4 space-y-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="font-medium text-red-800">{paymentToDelete?.member ? `${paymentToDelete.member.name} ${paymentToDelete.member.surname}` : 'Bilinmiyor'}</p>
                                <p className="text-sm text-red-600 mt-1">₺{(paymentToDelete?.amount || 0).toLocaleString('tr-TR')} • {typeLabels[paymentToDelete?.type] || paymentToDelete?.type}</p>
                            </div>
                            <p className="text-slate-600 text-sm">Bu ödeme kasadan düşürülecek, ancak tüm verileri log olarak saklanacaktır.</p>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">⚠️ Silinen ödemeler toplam gelir hesaplamasına <strong>dahil edilmeyecektir</strong>.</div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => { setShowDeleteDialog(false); setPaymentToDelete(null) }} className="px-4 py-2 border rounded-lg hover:bg-slate-50 dark:border-slate-700">İptal</button>
                            <button onClick={handleSoftDelete} disabled={deleteLoading} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition">
                                {deleteLoading ? 'Siliniyor...' : 'Evet, Sil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
