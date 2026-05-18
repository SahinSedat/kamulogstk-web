'use client'

import React, { useState } from 'react'
import { CreditCard, Search, Filter, Download, CheckCircle2, XCircle, Clock, TrendingUp, Calendar, Eye, Trash2, RotateCcw, AlertTriangle, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

const statusColors: Record<string, string> = {
    CONFIRMED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    CANCELLED: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    REFUNDED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    DELETED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}
const statusLabels: Record<string, string> = {
    CONFIRMED: 'Onaylandı', PENDING: 'Beklemede', REJECTED: 'Reddedildi',
    CANCELLED: 'İptal', REFUNDED: 'İade', DELETED: 'Silindi',
}
const typeLabels: Record<string, string> = {
    DUES: 'Aidat', DONATION: 'Bağış', REGISTRATION: 'Kayıt', OTHER: 'Diğer',
}

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
            if (data.success) {
                setPayments(data.payments || [])
                setSummary(data.summary || {})
            }
        } catch (err) { console.error('Payments fetch error:', err) }
        finally { setLoading(false) }
    }

    React.useEffect(() => { fetchPayments(activeTab === 'deleted') }, [activeTab])

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
            else alert(data.error || 'Geri aktif etme başarısız')
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
                <div className="flex gap-2">
                    <Button variant="outline"><Download className="w-4 h-4 mr-2" />Dışa Aktar</Button>
                </div>
            </div>

            {/* Sekmeler */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
                <button onClick={() => setActiveTab('active')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-white dark:bg-slate-700 text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <CreditCard className="w-4 h-4" /> Aktif Ödemeler
                </button>
                <button onClick={() => setActiveTab('deleted')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'deleted' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Archive className="w-4 h-4" /> Silinen Ödemeler
                </button>
            </div>

            {/* İstatistikler */}
            {activeTab === 'active' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card><CardContent className="p-4">
                        <div className="flex items-center justify-between"><div className="p-2 rounded-lg bg-emerald-100"><TrendingUp className="w-5 h-5 text-emerald-600" /></div></div>
                        <div className="mt-3"><div className="text-2xl font-bold">₺{(summary.totalConfirmed || 0).toLocaleString('tr-TR')}</div><div className="text-sm text-slate-500">Onaylanan Toplam</div></div>
                    </CardContent></Card>
                    <Card><CardContent className="p-4">
                        <div className="flex items-center justify-between"><div className="p-2 rounded-lg bg-blue-100"><CheckCircle2 className="w-5 h-5 text-blue-600" /></div></div>
                        <div className="mt-3"><div className="text-2xl font-bold">{summary.confirmedCount || 0}</div><div className="text-sm text-slate-500">Onaylı İşlem</div></div>
                    </CardContent></Card>
                    <Card><CardContent className="p-4">
                        <div className="flex items-center justify-between"><div className="p-2 rounded-lg bg-amber-100"><Clock className="w-5 h-5 text-amber-600" /></div></div>
                        <div className="mt-3"><div className="text-2xl font-bold">{summary.pendingCount || 0}</div><div className="text-sm text-slate-500">Bekleyen</div></div>
                    </CardContent></Card>
                    <Card><CardContent className="p-4">
                        <div className="flex items-center justify-between"><div className="p-2 rounded-lg bg-red-100"><XCircle className="w-5 h-5 text-red-600" /></div></div>
                        <div className="mt-3"><div className="text-2xl font-bold">{summary.deletedCount || 0}</div><div className="text-sm text-slate-500">Silinen</div></div>
                    </CardContent></Card>
                </div>
            )}

            {activeTab === 'deleted' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium text-amber-800">Silinen Ödemeler Arşivi</p>
                        <p className="text-sm text-amber-600 mt-1">Silinen ödemeler kasadan ve hesaplamalardan düşürülmüştür. Tüm verileri log olarak saklanmaktadır.</p>
                    </div>
                </div>
            )}

            {/* Filtre */}
            <Card><CardContent className="p-4"><div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Üye adı ile ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                </div>
                {activeTab === 'active' && (
                    <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setTimeout(() => fetchPayments(false), 100) }}
                        className="px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700">
                        <option value="all">Tüm Durumlar</option>
                        <option value="CONFIRMED">Onaylandı</option>
                        <option value="PENDING">Beklemede</option>
                        <option value="REJECTED">Reddedildi</option>
                    </select>
                )}
                <Button variant="outline" onClick={handleSearch}><Filter className="w-4 h-4 mr-2" />Filtrele</Button>
            </div></CardContent></Card>

            {/* Tablo */}
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2">
                    {activeTab === 'deleted' ? <Archive className="w-5 h-5 text-red-500" /> : <CreditCard className="w-5 h-5" />}
                    {activeTab === 'deleted' ? 'Silinen Ödemeler' : 'Ödeme Geçmişi'}
                </CardTitle></CardHeader>
                <CardContent>
                    {loading ? (<div className="text-center py-8 text-slate-500">Yükleniyor...</div>
                    ) : filteredPayments.length === 0 ? (<div className="text-center py-8 text-slate-500">{activeTab === 'deleted' ? 'Silinen ödeme bulunmuyor.' : 'Ödeme bulunamadı.'}</div>
                    ) : (
                    <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b dark:border-slate-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Üye</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Tür</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Tutar</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Tarih</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Durum</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">İşlem</th>
                    </tr></thead><tbody>
                        {filteredPayments.map((payment) => {
                            const isDeleted = payment.status === 'DELETED'
                            const memberName = payment.member ? `${payment.member.name} ${payment.member.surname}` : 'Bilinmiyor'
                            return (
                                <tr key={payment.id} className={`border-b last:border-0 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isDeleted ? 'opacity-60' : ''}`}>
                                    <td className="py-3 px-4"><span className={`font-medium ${isDeleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>{memberName}</span></td>
                                    <td className="py-3 px-4 text-slate-600">{typeLabels[payment.type] || payment.type}</td>
                                    <td className="py-3 px-4"><span className={`font-semibold ${isDeleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>₺{(payment.amount || 0).toLocaleString('tr-TR')}</span></td>
                                    <td className="py-3 px-4 text-slate-600"><div className="flex items-center gap-1"><Calendar className="w-4 h-4" />{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('tr-TR') : payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('tr-TR') : '—'}</div></td>
                                    <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[payment.status] || ''}`}>{statusLabels[payment.status] || payment.status}</span></td>
                                    <td className="py-3 px-4 text-right"><div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                                        {isDeleted ? (
                                            <Button size="sm" variant="ghost" className="text-emerald-600 hover:bg-emerald-50" onClick={() => handleRestore(payment.id)} title="Geri Aktif Et"><RotateCcw className="w-4 h-4" /></Button>
                                        ) : (
                                            <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => { setPaymentToDelete(payment); setShowDeleteDialog(true) }} title="Sil"><Trash2 className="w-4 h-4" /></Button>
                                        )}
                                    </div></td>
                                </tr>
                            )
                        })}
                    </tbody></table></div>
                    )}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-slate-700">
                        <span className="text-sm text-slate-500">Toplam {filteredPayments.length} kayıt</span>
                    </div>
                </CardContent>
            </Card>

            {/* Silme Dialogu */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5" /> Ödeme Silme Onayı</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="font-medium text-red-800">{paymentToDelete?.member ? `${paymentToDelete.member.name} ${paymentToDelete.member.surname}` : 'Bilinmiyor'}</p>
                            <p className="text-sm text-red-600 mt-1">₺{(paymentToDelete?.amount || 0).toLocaleString('tr-TR')} • {typeLabels[paymentToDelete?.type] || paymentToDelete?.type}</p>
                        </div>
                        <p className="text-slate-600 text-sm">Bu ödeme kasadan ve hesaplamalardan düşürülecek, ancak tüm verileri log olarak saklanacaktır.</p>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">⚠️ Silinen ödemeler toplam gelir hesaplamasına <strong>dahil edilmeyecektir</strong>.</div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setPaymentToDelete(null) }}>İptal</Button>
                        <Button variant="destructive" onClick={handleSoftDelete} disabled={deleteLoading}>{deleteLoading ? 'Siliniyor...' : 'Evet, Sil'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
