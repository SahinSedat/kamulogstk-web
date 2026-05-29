'use client'

import React, { useState, useEffect } from 'react'
import {
    Users, Plus, Edit, Trash2, Phone, Mail,
    Calendar, Award, CheckCircle2, Clock, Shield,
    PenTool, Loader2, X, Save, Search, UserCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface BoardMember {
    id: string
    name: string
    email: string | null
    phone: string | null
    tcKimlik: string | null
    position: string
    startDate: string
    endDate: string | null
    isActive: boolean
    hasSignature: boolean
    createdAt: string
}

const positionLabels: Record<string, string> = {
    PRESIDENT: 'Başkan',
    VICE_PRESIDENT: 'Başkan Yardımcısı',
    SECRETARY: 'Genel Sekreter',
    TREASURER: 'Sayman',
    MEMBER: 'Üye',
    AUDITOR: 'Denetçi',
}

const positionOptions = [
    { value: 'PRESIDENT', label: 'Başkan' },
    { value: 'VICE_PRESIDENT', label: 'Başkan Yardımcısı' },
    { value: 'SECRETARY', label: 'Genel Sekreter' },
    { value: 'TREASURER', label: 'Sayman' },
    { value: 'MEMBER', label: 'Üye' },
    { value: 'AUDITOR', label: 'Denetçi' },
]

const positionColors: Record<string, string> = {
    PRESIDENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    VICE_PRESIDENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    SECRETARY: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    TREASURER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    MEMBER: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    AUDITOR: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

const positionGradients: Record<string, string> = {
    PRESIDENT: 'from-amber-400 to-orange-500',
    VICE_PRESIDENT: 'from-blue-400 to-indigo-500',
    SECRETARY: 'from-purple-400 to-fuchsia-500',
    TREASURER: 'from-emerald-400 to-teal-500',
    MEMBER: 'from-slate-400 to-slate-500',
    AUDITOR: 'from-rose-400 to-pink-500',
}

interface MemberOption {
    id: string
    name: string
    surname: string
    email: string
    phone: string
    tcKimlik: string
    memberNumber: string
}

const emptyForm = {
    name: '',
    email: '',
    phone: '',
    tcKimlik: '',
    position: 'MEMBER',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    hasSignature: false,
}

export default function STKBoardPage() {
    const [boardMembers, setBoardMembers] = useState<BoardMember[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ total: 0, active: 0, withSignature: 0 })
    const [showFormDialog, setShowFormDialog] = useState(false)
    const [editingMember, setEditingMember] = useState<BoardMember | null>(null)
    const [formData, setFormData] = useState(emptyForm)
    const [submitting, setSubmitting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

    // Member search states
    const [memberSearch, setMemberSearch] = useState('')
    const [memberResults, setMemberResults] = useState<MemberOption[]>([])
    const [memberSearching, setMemberSearching] = useState(false)
    const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null)
    const [showMemberDropdown, setShowMemberDropdown] = useState(false)
    const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        fetchBoardMembers()
    }, [])

    const fetchBoardMembers = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/stk/board-members')
            const data = await res.json()
            if (data.success) {
                setBoardMembers(data.boardMembers)
                setStats(data.stats)
            }
        } catch (error) {
            console.error('Fetch error:', error)
        } finally {
            setLoading(false)
        }
    }

    const searchMembers = async (query: string) => {
        if (query.length < 2) {
            setMemberResults([])
            setShowMemberDropdown(false)
            return
        }
        setMemberSearching(true)
        try {
            const res = await fetch(`/api/stk/members?search=${encodeURIComponent(query)}&status=ACTIVE`)
            const data = await res.json()
            if (data.success) {
                // Zaten YK'da olan üyeleri filtrele
                const existingNames = new Set(boardMembers.filter(bm => bm.isActive).map(bm => bm.name.toLowerCase()))
                const filtered = data.members.filter((m: MemberOption) =>
                    !existingNames.has(`${m.name} ${m.surname}`.toLowerCase())
                )
                setMemberResults(filtered)
                setShowMemberDropdown(true)
            }
        } catch (error) {
            console.error('Member search error:', error)
        } finally {
            setMemberSearching(false)
        }
    }

    const handleMemberSearchChange = (value: string) => {
        setMemberSearch(value)
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
        searchTimeoutRef.current = setTimeout(() => searchMembers(value), 300)
    }

    const selectMember = (member: MemberOption) => {
        setSelectedMember(member)
        setMemberSearch('')
        setShowMemberDropdown(false)
        setFormData({
            ...formData,
            name: `${member.name} ${member.surname}`,
            email: member.email || '',
            phone: member.phone || '',
            tcKimlik: member.tcKimlik || '',
        })
    }

    const clearSelectedMember = () => {
        setSelectedMember(null)
        setFormData({ ...formData, name: '', email: '', phone: '', tcKimlik: '' })
    }

    const openNewDialog = () => {
        setEditingMember(null)
        setFormData(emptyForm)
        setSelectedMember(null)
        setMemberSearch('')
        setMemberResults([])
        setShowMemberDropdown(false)
        setShowFormDialog(true)
    }

    const openEditDialog = (member: BoardMember) => {
        setEditingMember(member)
        setFormData({
            name: member.name,
            email: member.email || '',
            phone: member.phone || '',
            tcKimlik: member.tcKimlik || '',
            position: member.position,
            startDate: new Date(member.startDate).toISOString().split('T')[0],
            endDate: member.endDate ? new Date(member.endDate).toISOString().split('T')[0] : '',
            hasSignature: member.hasSignature,
        })
        setShowFormDialog(true)
    }

    const handleSubmit = async () => {
        if (!formData.name || !formData.position || !formData.startDate) {
            alert('Ad, görev ve başlangıç tarihi zorunludur')
            return
        }

        setSubmitting(true)
        try {
            const url = editingMember
                ? `/api/stk/board-members/${editingMember.id}`
                : '/api/stk/board-members'
            const method = editingMember ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await res.json()
            if (data.success) {
                setShowFormDialog(false)
                fetchBoardMembers()
            } else {
                alert(data.error || 'İşlem başarısız')
            }
        } catch (error) {
            console.error('Submit error:', error)
            alert('Bir hata oluştu')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/stk/board-members/${id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                setShowDeleteConfirm(null)
                fetchBoardMembers()
            } else {
                alert(data.error || 'Silme başarısız')
            }
        } catch (error) {
            console.error('Delete error:', error)
        }
    }

    const handleToggleActive = async (member: BoardMember) => {
        try {
            const payload: any = { isActive: !member.isActive }
            // Pasif yapılırken bitiş tarihi yoksa bugünü ata
            if (member.isActive && !member.endDate) {
                payload.endDate = new Date().toISOString().split('T')[0]
            }
            const res = await fetch(`/api/stk/board-members/${member.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const data = await res.json()
            if (data.success) {
                fetchBoardMembers()
            }
        } catch (error) {
            console.error('Toggle error:', error)
        }
    }

    const activeMembers = boardMembers.filter(m => m.isActive)
    const inactiveMembers = boardMembers.filter(m => !m.isActive)

    // Görev süresi hesapla
    const calcDaysRemaining = () => {
        if (activeMembers.length === 0) return null
        const latestEnd = activeMembers
            .filter(m => m.endDate)
            .map(m => new Date(m.endDate!).getTime())
            .sort((a, b) => b - a)[0]
        if (!latestEnd) return null
        const diff = Math.ceil((latestEnd - Date.now()) / (1000 * 60 * 60 * 24))
        return diff > 0 ? diff : 0
    }

    const daysRemaining = calcDaysRemaining()

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Yönetim Kurulu</h1>
                    <p className="text-slate-500">Yönetim kurulu üyelerini görüntüleyin ve yönetin</p>
                </div>
                <Button onClick={openNewDialog} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Üye Ekle
                </Button>
            </div>

            {/* Term Info */}
            <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 border-0">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
                        <div>
                            <h2 className="text-lg font-semibold">Mevcut Dönem</h2>
                            <p className="text-white/70">Aktif yönetim kurulu bilgileri</p>
                        </div>
                        <div className="flex gap-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold">{stats.active}</div>
                                <div className="text-white/70 text-sm">Aktif Üye</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold">{stats.withSignature}</div>
                                <div className="text-white/70 text-sm">İmza Yetkili</div>
                            </div>
                            {daysRemaining !== null && (
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{daysRemaining}</div>
                                    <div className="text-white/70 text-sm">Gün Kaldı</div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Yükleniyor...
                </div>
            ) : (
                <>
                    {/* Active Board Members Grid */}
                    {activeMembers.length > 0 && (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeMembers.map((member) => (
                                <Card key={member.id} className="hover:shadow-lg transition-shadow group">
                                    <CardContent className="p-6">
                                        <div className="flex items-start gap-4">
                                            <div className={`w-14 h-14 bg-gradient-to-br ${positionGradients[member.position] || 'from-slate-400 to-slate-500'} rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                                                {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-slate-900 dark:text-white truncate">{member.name}</h3>
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${positionColors[member.position] || positionColors.MEMBER}`}>
                                                    {positionLabels[member.position] || member.position}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {member.hasSignature && (
                                                    <span title="İmza Yetkisi Var"><PenTool className="w-4 h-4 text-blue-500" /></span>
                                                )}
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            </div>
                                        </div>

                                        <div className="mt-4 space-y-2">
                                            {member.email && (
                                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                    <Mail className="w-4 h-4 flex-shrink-0" />
                                                    <span className="truncate">{member.email}</span>
                                                </div>
                                            )}
                                            {member.phone && (
                                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                    <Phone className="w-4 h-4 flex-shrink-0" />
                                                    <span>{member.phone}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                <Calendar className="w-4 h-4 flex-shrink-0" />
                                                <span>
                                                    {new Date(member.startDate).toLocaleDateString('tr-TR')}
                                                    {member.endDate ? ` - ${new Date(member.endDate).toLocaleDateString('tr-TR')}` : ' - Devam'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-4 pt-4 border-t dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(member)}>
                                                <Edit className="w-4 h-4 mr-1" />
                                                Düzenle
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700"
                                                onClick={() => handleToggleActive(member)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {activeMembers.length === 0 && (
                        <Card className="border-dashed border-2">
                            <CardContent className="p-12 text-center">
                                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Henüz YK üyesi eklenmemiş</h3>
                                <p className="text-slate-500 text-sm mb-4">Yönetim kuruluna üye eklemek için yukarıdaki butonu kullanın</p>
                                <Button onClick={openNewDialog} className="bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    İlk Üyeyi Ekle
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Add New Member Card */}
                    {activeMembers.length > 0 && (
                        <Card
                            className="border-dashed border-2 hover:border-emerald-500 transition-colors cursor-pointer"
                            onClick={openNewDialog}
                        >
                            <CardContent className="p-8 text-center">
                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto flex items-center justify-center mb-3">
                                    <Plus className="w-6 h-6 text-slate-400" />
                                </div>
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Yeni Üye Ekle</h3>
                                <p className="text-slate-500 text-sm">Yönetim kuruluna yeni bir üye eklemek için tıklayın</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Geçmiş Dönem Yöneticileri */}
                    {inactiveMembers.length > 0 && (
                        <Card className="bg-slate-50/50 dark:bg-slate-900/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                    <Shield className="w-5 h-5" />
                                    Geçmiş Dönem Yöneticileri
                                    <Badge variant="default" className="ml-auto">{inactiveMembers.length} kişi</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {inactiveMembers.map((member) => {
                                        const start = new Date(member.startDate).toLocaleDateString('tr-TR')
                                        const end = member.endDate ? new Date(member.endDate).toLocaleDateString('tr-TR') : 'Belirtilmemiş'
                                        return (
                                            <div key={member.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 bg-gradient-to-br ${positionGradients[member.position] || 'from-slate-400 to-slate-500'} rounded-full flex items-center justify-center text-white font-bold text-sm opacity-60`}>
                                                        {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-slate-900 dark:text-white">{member.name}</span>
                                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${positionColors[member.position] || positionColors.MEMBER}`}>
                                                                {positionLabels[member.position] || member.position}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                            <span className="text-xs text-slate-500">{start} — {end}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {editingMember ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            {editingMember ? 'Üye Düzenle' : 'Yeni YK Üyesi'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {/* Üye Seçimi / Ad Soyad */}
                        <div>
                            <label className="text-sm font-medium mb-1 block">Üye Seçimi *</label>
                            {editingMember ? (
                                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                    <UserCheck className="w-5 h-5 text-emerald-500" />
                                    <span className="font-medium">{formData.name}</span>
                                </div>
                            ) : selectedMember ? (
                                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <UserCheck className="w-5 h-5 text-emerald-500" />
                                        <div>
                                            <span className="font-medium text-sm">{selectedMember.name} {selectedMember.surname}</span>
                                            {selectedMember.memberNumber && (
                                                <span className="text-xs text-slate-500 ml-2">({selectedMember.memberNumber})</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={clearSelectedMember}
                                        className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded text-slate-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            placeholder="Üye adı veya soyadı yazın..."
                                            value={memberSearch}
                                            onChange={(e) => handleMemberSearchChange(e.target.value)}
                                            onFocus={() => { if (memberResults.length > 0) setShowMemberDropdown(true) }}
                                            className="pl-10"
                                            autoComplete="off"
                                        />
                                        {memberSearching && (
                                            <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                                        )}
                                    </div>
                                    {showMemberDropdown && memberResults.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {memberResults.map((m) => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => selectMember(m)}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors"
                                                >
                                                    <div>
                                                        <span className="font-medium text-sm">{m.name} {m.surname}</span>
                                                        <span className="text-xs text-slate-500 ml-2">{m.email}</span>
                                                    </div>
                                                    <span className="text-xs text-slate-400">{m.memberNumber}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {showMemberDropdown && memberSearch.length >= 2 && memberResults.length === 0 && !memberSearching && (
                                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 text-center text-sm text-slate-500">
                                            Sonuç bulunamadı
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Görev *</label>
                            <select
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent"
                                value={formData.position}
                                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                            >
                                {positionOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">E-posta</label>
                                <Input
                                    type="email"
                                    placeholder="ornek@email.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    disabled={!!selectedMember || !!editingMember}
                                    className={selectedMember || editingMember ? 'bg-slate-50 opacity-60' : ''}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Telefon</label>
                                <Input
                                    placeholder="+90 5XX XXX XXXX"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    disabled={!!selectedMember || !!editingMember}
                                    className={selectedMember || editingMember ? 'bg-slate-50 opacity-60' : ''}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">TC Kimlik No</label>
                            <Input
                                placeholder="XXXXXXXXXXX"
                                maxLength={11}
                                value={formData.tcKimlik}
                                onChange={(e) => setFormData({ ...formData, tcKimlik: e.target.value })}
                                disabled={!!selectedMember || !!editingMember}
                                className={selectedMember || editingMember ? 'bg-slate-50 opacity-60' : ''}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Görev Başlangıcı *</label>
                                <Input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    disabled={!!editingMember}
                                    className={editingMember ? 'bg-slate-50 opacity-60' : ''}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Görev Bitişi</label>
                                <Input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    disabled={!!editingMember}
                                    className={editingMember ? 'bg-slate-50 opacity-60' : ''}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <input
                                type="checkbox"
                                id="hasSignature"
                                checked={formData.hasSignature}
                                onChange={(e) => setFormData({ ...formData, hasSignature: e.target.checked })}
                                className="w-4 h-4 rounded"
                            />
                            <label htmlFor="hasSignature" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                                <PenTool className="w-4 h-4 text-blue-500" />
                                İmza Yetkisi Var
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowFormDialog(false)}>İptal</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || !formData.name || !formData.startDate}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Kaydediliyor...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    {editingMember ? 'Güncelle' : 'Ekle'}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="w-5 h-5" />
                            Üyeyi Sil
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-slate-600 dark:text-slate-400">
                        Bu YK üyesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>İptal</Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
                        >
                            Evet, Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
