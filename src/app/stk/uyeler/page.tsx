'use client'

import React, { useState, useEffect } from 'react'

export default function STKMembersPage() {
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active')
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [memberToDelete, setMemberToDelete] = useState<any>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const fetchMembers = async (showDeleted = false) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (showDeleted) params.set('showDeleted', 'true')
            if (searchTerm) params.set('search', searchTerm)
            const res = await fetch(`/api/stk/members?${params}`)
            const data = await res.json()
            if (data.success) setMembers(data.members || [])
        } catch (err) { console.error('Members fetch error:', err) }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchMembers(activeTab === 'deleted') }, [activeTab])

    const handleSearch = () => fetchMembers(activeTab === 'deleted')

    const handleSoftDelete = async () => {
        if (!memberToDelete) return
        setDeleteLoading(true)
        try {
            const res = await fetch(`/api/stk/members/${memberToDelete.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) { setShowDeleteDialog(false); setMemberToDelete(null); fetchMembers(activeTab === 'deleted') }
            else alert(data.error || 'Silme başarısız')
        } catch { alert('Hata oluştu') }
        finally { setDeleteLoading(false) }
    }

    const handleRestore = async (memberId: string) => {
        if (!confirm('Bu üyeyi geri aktif etmek istediğinize emin misiniz?')) return
        try {
            const res = await fetch(`/api/stk/members/${memberId}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'restore' })
            })
            const data = await res.json()
            if (data.success) fetchMembers(activeTab === 'deleted')
        } catch { console.error('Restore error') }
    }

    const filteredMembers = members.filter(m => {
        if (!searchTerm) return true
        const fullName = `${m.name} ${m.surname}`.toLowerCase()
        return fullName.includes(searchTerm.toLowerCase())
    })

    const statusLabels: Record<string, string> = {
        ACTIVE: 'Aktif', PASSIVE: 'Pasif', SUSPENDED: 'Askıda', DELETED: 'Silindi',
    }
    const statusColors: Record<string, string> = {
        ACTIVE: 'bg-emerald-100 text-emerald-700',
        PASSIVE: 'bg-amber-100 text-amber-700',
        SUSPENDED: 'bg-red-100 text-red-700',
        DELETED: 'bg-red-100 text-red-700',
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Üyeler</h1>
                    <p className="text-slate-500">STK üyelerinizi yönetin</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
                <button onClick={() => setActiveTab('active')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-white dark:bg-slate-700 text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    👥 Aktif Üyeler
                </button>
                <button onClick={() => setActiveTab('deleted')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'deleted' ? 'bg-white dark:bg-slate-700 text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    🗄️ Silinen Üyeler
                </button>
            </div>

            {activeTab === 'deleted' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                        <p className="font-medium text-amber-800">Silinen Üyeler Arşivi</p>
                        <p className="text-sm text-amber-600 mt-1">Silinen üyelerin tüm verileri AuditLog tablosunda saklanmaktadır. Geri aktif edebilirsiniz.</p>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                        <input type="text" placeholder="Üye adı ile ara..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
                    </div>
                    <button onClick={handleSearch} className="px-4 py-2 border rounded-lg hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700 transition">Filtrele</button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="p-4 border-b dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {activeTab === 'deleted' ? '🗄️ Silinen Üyeler' : '👥 Üye Listesi'}
                    </h2>
                </div>
                <div className="p-4">
                    {loading ? (<p className="text-center py-8 text-slate-500">Yükleniyor...</p>
                    ) : filteredMembers.length === 0 ? (<p className="text-center py-8 text-slate-500">{activeTab === 'deleted' ? 'Silinen üye bulunmuyor.' : 'Üye bulunamadı.'}</p>
                    ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead><tr className="border-b dark:border-slate-700">
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Ad Soyad</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Telefon</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Durum</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Kayıt</th>
                                <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">İşlem</th>
                            </tr></thead>
                            <tbody>
                                {filteredMembers.map((member) => {
                                    const isDeleted = member.status === 'DELETED'
                                    return (
                                        <tr key={member.id} className={`border-b last:border-0 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isDeleted ? 'opacity-60' : ''}`}>
                                            <td className="py-3 px-4"><span className={`font-medium ${isDeleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>{member.name} {member.surname}</span></td>
                                            <td className="py-3 px-4 text-slate-600">{member.phone || '—'}</td>
                                            <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[member.status] || 'bg-slate-100 text-slate-700'}`}>{statusLabels[member.status] || member.status}</span></td>
                                            <td className="py-3 px-4 text-slate-600 text-sm">{member.createdAt ? new Date(member.createdAt).toLocaleDateString('tr-TR') : '—'}</td>
                                            <td className="py-3 px-4 text-right">
                                                {isDeleted ? (
                                                    <button onClick={() => handleRestore(member.id)} className="px-3 py-1.5 text-sm rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition" title="Geri Aktif Et">↩️ Geri Al</button>
                                                ) : (
                                                    <button onClick={() => { setMemberToDelete(member); setShowDeleteDialog(true) }} className="px-3 py-1.5 text-sm rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition" title="Sil">🗑️ Sil</button>
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
                        <span className="text-sm text-slate-500">Toplam {filteredMembers.length} üye</span>
                    </div>
                </div>
            </div>

            {/* Delete Dialog */}
            {showDeleteDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteDialog(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">⚠️ Üye Silme Onayı</h3>
                        <div className="mt-4 space-y-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="font-medium text-red-800">{memberToDelete?.name} {memberToDelete?.surname}</p>
                                <p className="text-sm text-red-600 mt-1">{memberToDelete?.phone}</p>
                            </div>
                            <p className="text-slate-600 text-sm">Bu üye silinecek ancak tüm verileri AuditLog tablosunda saklanacaktır. Daha sonra geri aktif edebilirsiniz.</p>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                                ⚠️ Silinen üyeler aktif listeden kaldırılır ancak <strong>kalıcı olarak silinmez</strong>.
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => { setShowDeleteDialog(false); setMemberToDelete(null) }} className="px-4 py-2 border rounded-lg hover:bg-slate-50 dark:border-slate-700">İptal</button>
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
