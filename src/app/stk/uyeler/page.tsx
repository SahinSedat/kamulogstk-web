"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Users, Search, Eye, Mail, Phone, MapPin, Trash2, RotateCcw, AlertTriangle, Archive } from 'lucide-react'

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' }> = {
    ACTIVE: { label: 'Aktif', variant: 'success' },
    PENDING: { label: 'Beklemede', variant: 'warning' },
    APPLIED: { label: 'Başvuru', variant: 'warning' },
    RESIGNATION_REQ: { label: 'İstifa Talebi', variant: 'warning' },
    RESIGNED: { label: 'Ayrıldı', variant: 'destructive' },
    EXPELLED: { label: 'İhraç Edildi', variant: 'destructive' },
    REJECTED: { label: 'Reddedildi', variant: 'destructive' },
    DELETED: { label: 'Silindi', variant: 'destructive' },
    INACTIVE: { label: 'Pasif', variant: 'default' },
    DECEASED: { label: 'Vefat', variant: 'default' },
}

export default function MembersPage() {
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [memberToDelete, setMemberToDelete] = useState<any | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active')
    const [selectedMember, setSelectedMember] = useState<any | null>(null)
    const [showResignDialog, setShowResignDialog] = useState(false)
    const [decisionNumber, setDecisionNumber] = useState('')
    const [decisionDate, setDecisionDate] = useState(new Date().toISOString().split('T')[0])

    const fetchMembers = async (showDeleted = false) => {
        setLoading(true)
        try {
            const url = showDeleted ? '/api/stk/members?showDeleted=true' : '/api/stk/members'
            const res = await fetch(url)
            const data = await res.json()
            if (data.success) setMembers(data.members)
        } catch (error) { console.error('Fetch error:', error) }
        finally { setLoading(false) }
    }

    React.useEffect(() => { fetchMembers(activeTab === 'deleted') }, [activeTab])

    const filteredMembers = members.filter((m) =>
        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.surname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleSoftDelete = async () => {
        if (!memberToDelete) return
        setDeleteLoading(true)
        try {
            const res = await fetch(`/api/stk/members/${memberToDelete.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) { setShowDeleteDialog(false); setMemberToDelete(null); fetchMembers(activeTab === 'deleted') }
            else alert(data.error || 'Silme başarısız')
        } catch { alert('Silme sırasında hata oluştu') }
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
            else alert(data.error || 'Geri aktif etme başarısız')
        } catch { console.error('Restore error') }
    }

    const handleResignApprove = async () => {
        if (!selectedMember) return
        setLoading(true)
        try {
            const res = await fetch('/api/stk/resignations', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId: selectedMember.id, action: 'approve', decisionNumber, decisionDate })
            })
            if (res.ok) { fetchMembers(activeTab === 'deleted'); setShowResignDialog(false); setSelectedMember(null) }
        } catch { console.error('Resign error') }
        finally { setLoading(false) }
    }

    const stats = {
        total: members.length,
        active: members.filter(m => m.status === 'ACTIVE').length,
        pending: members.filter(m => ['APPLIED', 'PENDING'].includes(m.status)).length,
        resignation: members.filter(m => m.status === 'RESIGNATION_REQ').length,
        left: members.filter(m => ['RESIGNED', 'EXPELLED', 'REJECTED'].includes(m.status)).length
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Üyeler</h1>
                    <p className="text-slate-500 mt-1">Tüm üyeleri yönetin</p>
                </div>
            </div>

            {/* Aktif / Silinenler Sekmeleri */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
                <button onClick={() => setActiveTab('active')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Users className="w-4 h-4" /> Aktif Üyeler
                </button>
                <button onClick={() => setActiveTab('deleted')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'deleted' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Archive className="w-4 h-4" /> Silinenler / Pasifler
                </button>
            </div>

            {activeTab === 'active' && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {[
                        { label: 'Toplam', count: stats.total, color: 'blue' },
                        { label: 'Aktif', count: stats.active, color: 'emerald' },
                        { label: 'Başvuru/Bekleyen', count: stats.pending, color: 'amber' },
                        { label: 'İstifa Talebi', count: stats.resignation, color: 'orange' },
                        { label: 'Ayrılan', count: stats.left, color: 'red' },
                    ].map((stat) => (
                        <Card key={stat.label}><CardContent className="p-4 flex items-center gap-4">
                            <div className={`w-12 h-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                                <Users className={`w-6 h-6 text-${stat.color}-600`} />
                            </div>
                            <div><p className="text-sm text-slate-500">{stat.label}</p><p className="text-2xl font-bold">{stat.count}</p></div>
                        </CardContent></Card>
                    ))}
                </div>
            )}

            {activeTab === 'deleted' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium text-amber-800 dark:text-amber-300">Silinen Üyeler Arşivi</p>
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">Bu listede soft-delete ile silinen üyeler yer almaktadır. Tüm verileri log olarak saklanmaktadır. İsterseniz geri aktif edebilirsiniz.</p>
                    </div>
                </div>
            )}

            <Card><CardContent className="p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input placeholder="İsim veya e-posta ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
            </CardContent></Card>

            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2">
                    {activeTab === 'deleted' ? <Archive className="w-5 h-5 text-red-500" /> : <Users className="w-5 h-5 text-emerald-500" />}
                    {activeTab === 'deleted' ? 'Silinen Üyeler' : 'Üye Listesi'} ({filteredMembers.length})
                </CardTitle></CardHeader>
                <CardContent>
                    {loading ? (<div className="text-center py-8 text-slate-500">Yükleniyor...</div>
                    ) : filteredMembers.length === 0 ? (<div className="text-center py-8 text-slate-500">{activeTab === 'deleted' ? 'Silinen üye bulunmuyor.' : 'Üye bulunamadı.'}</div>
                    ) : (
                        <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-200">
                            <th className="text-left py-4 px-4">Üye</th><th className="text-left py-4 px-4">İletişim</th>
                            <th className="text-left py-4 px-4">Şehir</th><th className="text-left py-4 px-4">Durum</th>
                            <th className="text-right py-4 px-4">İşlemler</th>
                        </tr></thead><tbody>
                            {filteredMembers.map((member) => {
                                const isDeleted = member.status === 'DELETED'
                                const isInactive = ['RESIGNED', 'EXPELLED', 'REJECTED', 'DELETED'].includes(member.status)
                                return (
                                    <tr key={member.id} className={`border-b border-slate-100 hover:bg-slate-50 ${isInactive ? 'opacity-60 bg-slate-50/50' : ''}`}>
                                        <td className="py-4 px-4"><div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 ${isDeleted ? 'bg-red-400' : isInactive ? 'bg-slate-400' : 'bg-emerald-500'} rounded-xl flex items-center justify-center text-white font-medium`}>
                                                {member.name?.[0]}{member.surname?.[0]}
                                            </div>
                                            <div>
                                                <p className={`font-medium ${isDeleted ? 'line-through text-slate-400' : ''}`}>{member.name} {member.surname}</p>
                                                <p className="text-sm text-slate-500">{member.memberNumber || '—'}</p>
                                            </div>
                                        </div></td>
                                        <td className="py-4 px-4"><div className="text-sm space-y-1">
                                            <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{member.email}</div>
                                            <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{member.phone}</div>
                                        </div></td>
                                        <td className="py-4 px-4"><div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{member.city || '—'}</div></td>
                                        <td className="py-4 px-4">
                                            <Badge variant={statusConfig[member.status]?.variant || 'default'}>{statusConfig[member.status]?.label || member.status}</Badge>
                                        </td>
                                        <td className="py-4 px-4"><div className="flex items-center justify-end gap-1">
                                            <Button size="sm" variant="ghost" onClick={() => setSelectedMember(member)}><Eye className="w-4 h-4" /></Button>
                                            {isDeleted ? (
                                                <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleRestore(member.id)} title="Geri Aktif Et">
                                                    <RotateCcw className="w-4 h-4" />
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { setMemberToDelete(member); setShowDeleteDialog(true) }} title="Sil">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div></td>
                                    </tr>
                                )
                            })}
                        </tbody></table></div>
                    )}
                </CardContent>
            </Card>

            {/* Silme Onay Dialogu */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5" /> Üye Silme Onayı</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4">
                            <p className="font-medium text-red-800">{memberToDelete?.name} {memberToDelete?.surname}</p>
                            <p className="text-sm text-red-600 mt-1">{memberToDelete?.email} • {memberToDelete?.phone}</p>
                        </div>
                        <p className="text-slate-600 text-sm">Bu üye <strong>soft-delete</strong> ile silinecektir. Tüm verileri log olarak saklanacak ve &quot;Silinenler&quot; sekmesinden görüntülenebilecektir.</p>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">⚠️ Üye aktif listeden kaldırılacak, ancak veriler <strong>asla silinmeyecektir</strong>.</div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setMemberToDelete(null) }}>İptal</Button>
                        <Button variant="destructive" onClick={handleSoftDelete} disabled={deleteLoading}>{deleteLoading ? 'Siliniyor...' : 'Evet, Sil'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* İstifa Dialogu */}
            <Dialog open={showResignDialog} onOpenChange={setShowResignDialog}>
                <DialogContent><DialogHeader><DialogTitle>İstifa Talebini Onayla</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-slate-500">{selectedMember?.name} {selectedMember?.surname} üyesinin istifasını onaylıyor musunuz?</p>
                        <div className="grid gap-4">
                            <div className="space-y-2"><label className="text-sm font-medium">Karar No</label><Input placeholder="Karar numarası" value={decisionNumber} onChange={(e) => setDecisionNumber(e.target.value)} /></div>
                            <div className="space-y-2"><label className="text-sm font-medium">Karar Tarihi</label><Input type="date" value={decisionDate} onChange={(e) => setDecisionDate(e.target.value)} /></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowResignDialog(false)}>İptal</Button>
                        <Button variant="destructive" onClick={handleResignApprove}>Onayla</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
