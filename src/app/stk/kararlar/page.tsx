"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    FileText, Search, Plus, Eye, Edit2, CheckCircle, AlertTriangle,
    Calendar, Hash, Download, Trash2, Users, Link2
} from 'lucide-react'

interface RelatedMember {
    id: string
    type: 'MEMBERSHIP_ACCEPT' | 'RESIGNATION_ACCEPT' | 'EXPULSION' | 'OTHER'
    member: {
        id: string
        name: string
        surname: string
        memberNumber: string | null
    }
}

interface Decision {
    id: string
    decisionNumber: string
    decisionDate: string
    subject: string
    content: string | null
    description: string | null
    status: 'DRAFT' | 'FINALIZED'
    relatedMembers: RelatedMember[]
    createdAt: string
}

const statusConfig = {
    DRAFT: { label: 'Taslak', variant: 'warning' as const, icon: Edit2 },
    FINALIZED: { label: 'Kesinleşti', variant: 'success' as const, icon: CheckCircle },
}

const memberTypeLabels = {
    MEMBERSHIP_ACCEPT: 'Üyelik Kabulü',
    RESIGNATION_ACCEPT: 'İstifa Kabulü',
    EXPULSION: 'İhraç',
    OTHER: 'Diğer'
}

export default function DecisionsPage() {
    const [decisions, setDecisions] = useState<Decision[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'FINALIZED'>('ALL')
    const [showNewDialog, setShowNewDialog] = useState(false)
    const [showDetailDialog, setShowDetailDialog] = useState(false)
    const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null)
    const [formData, setFormData] = useState({
        decisionNumber: '',
        decisionDate: new Date().toISOString().split('T')[0],
        subject: '',
        content: '',
        description: ''
    })
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchDecisions()
    }, [statusFilter])

    const fetchDecisions = async () => {
        try {
            const params = new URLSearchParams()
            if (statusFilter !== 'ALL') params.set('status', statusFilter)
            const res = await fetch(`/api/stk/decisions?${params}`)
            const data = await res.json()
            if (data.decisions) {
                setDecisions(data.decisions)
            }
        } catch (error) {
            console.error('Fetch error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        setSubmitting(true)
        try {
            const res = await fetch('/api/stk/decisions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            if (res.ok) {
                setShowNewDialog(false)
                setFormData({
                    decisionNumber: '',
                    decisionDate: new Date().toISOString().split('T')[0],
                    subject: '',
                    content: '',
                    description: ''
                })
                fetchDecisions()
            }
        } catch (error) {
            console.error('Create error:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleFinalize = async (id: string) => {
        try {
            const res = await fetch(`/api/stk/decisions/${id}/finalize`, { method: 'POST' })
            if (res.ok) {
                fetchDecisions()
                setShowDetailDialog(false)
            }
        } catch (error) {
            console.error('Finalize error:', error)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Bu kararı silmek istediğinize emin misiniz?')) return
        try {
            const res = await fetch(`/api/stk/decisions/${id}`, { method: 'DELETE' })
            if (res.ok) {
                fetchDecisions()
                setShowDetailDialog(false)
            }
        } catch (error) {
            console.error('Delete error:', error)
        }
    }

    const filteredDecisions = decisions.filter(d =>
        d.decisionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.subject.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const stats = {
        total: decisions.length,
        draft: decisions.filter(d => d.status === 'DRAFT').length,
        finalized: decisions.filter(d => d.status === 'FINALIZED').length
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Karar Kayıtları</h1>
                    <p className="text-slate-500 mt-1">Yönetim kurulu kararlarını dijital olarak kaydedin</p>
                </div>
                <Button
                    className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
                    onClick={() => setShowNewDialog(true)}
                >
                    <Plus className="w-4 h-4" />
                    Yeni Karar
                </Button>
            </div>

            {/* Uyarı Kartı */}
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Önemli:</strong> Bu kayıtlar resmi karar defterinin yerine geçmez.
                        Dijital kayıt ve arşivleme amaçlıdır. Islak imza fiziksel defterde tutulmalıdır.
                    </p>
                </CardContent>
            </Card>

            {/* İstatistik Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Toplam Karar</p>
                            <p className="text-2xl font-bold">{stats.total}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                            <Edit2 className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Taslak</p>
                            <p className="text-2xl font-bold">{stats.draft}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Kesinleşmiş</p>
                            <p className="text-2xl font-bold">{stats.finalized}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Arama ve Filtre */}
            <Card>
                <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                            placeholder="Karar numarası veya konu ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex gap-2">
                        {(['ALL', 'DRAFT', 'FINALIZED'] as const).map(status => (
                            <Button
                                key={status}
                                variant={statusFilter === status ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStatusFilter(status)}
                            >
                                {status === 'ALL' ? 'Tümü' : status === 'DRAFT' ? 'Taslak' : 'Kesinleşmiş'}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Karar Listesi */}
            <Card>
                <CardHeader>
                    <CardTitle>Kararlar ({filteredDecisions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">Yükleniyor...</div>
                    ) : filteredDecisions.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Henüz karar kaydı bulunmuyor</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredDecisions.map(decision => {
                                const StatusIcon = statusConfig[decision.status].icon
                                return (
                                    <div
                                        key={decision.id}
                                        className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                        onClick={() => { setSelectedDecision(decision); setShowDetailDialog(true) }}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white">
                                                    <FileText className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-semibold text-lg">{decision.decisionNumber}</span>
                                                        <Badge variant={statusConfig[decision.status].variant}>
                                                            <StatusIcon className="w-3 h-3 mr-1" />
                                                            {statusConfig[decision.status].label}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-slate-700 dark:text-slate-300">{decision.subject}</p>
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-4 h-4" />
                                                            {new Date(decision.decisionDate).toLocaleDateString('tr-TR')}
                                                        </span>
                                                        {decision.relatedMembers.length > 0 && (
                                                            <span className="flex items-center gap-1">
                                                                <Users className="w-4 h-4" />
                                                                {decision.relatedMembers.length} üye
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button size="sm" variant="ghost">
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Yeni Karar Dialog */}
            <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5" />
                            Yeni Karar Oluştur
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Karar Numarası *</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="2026/001"
                                        value={formData.decisionNumber}
                                        onChange={(e) => setFormData({ ...formData, decisionNumber: e.target.value })}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Karar Tarihi *</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        type="date"
                                        value={formData.decisionDate}
                                        onChange={(e) => setFormData({ ...formData, decisionDate: e.target.value })}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Karar Konusu *</label>
                            <Input
                                placeholder="Üyelik başvurusunun kabulü hk."
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Karar Metni</label>
                            <textarea
                                className="w-full min-h-[150px] p-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Karar metnini buraya yazın..."
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Açıklama</label>
                            <Input
                                placeholder="Ek açıklamalar..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewDialog(false)}>İptal</Button>
                        <Button
                            onClick={handleCreate}
                            disabled={submitting || !formData.decisionNumber || !formData.subject}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600"
                        >
                            {submitting ? 'Kaydediliyor...' : 'Taslak Olarak Kaydet'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Karar Detay Dialog */}
            <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
                <DialogContent className="max-w-3xl">
                    {selectedDecision && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <FileText className="w-5 h-5" />
                                        Karar: {selectedDecision.decisionNumber}
                                    </span>
                                    <Badge variant={statusConfig[selectedDecision.status].variant}>
                                        {statusConfig[selectedDecision.status].label}
                                    </Badge>
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                    <div>
                                        <p className="text-sm text-slate-500">Karar Tarihi</p>
                                        <p className="font-medium">{new Date(selectedDecision.decisionDate).toLocaleDateString('tr-TR')}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Oluşturulma</p>
                                        <p className="font-medium">{new Date(selectedDecision.createdAt).toLocaleDateString('tr-TR')}</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-2">Konu</h4>
                                    <p className="text-slate-700 dark:text-slate-300">{selectedDecision.subject}</p>
                                </div>
                                {selectedDecision.content && (
                                    <div>
                                        <h4 className="font-medium mb-2">Karar Metni</h4>
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                            {selectedDecision.content}
                                        </div>
                                    </div>
                                )}
                                {selectedDecision.relatedMembers.length > 0 && (
                                    <div>
                                        <h4 className="font-medium mb-2 flex items-center gap-2">
                                            <Link2 className="w-4 h-4" />
                                            İlişkili Üyeler
                                        </h4>
                                        <div className="space-y-2">
                                            {selectedDecision.relatedMembers.map(rm => (
                                                <div key={rm.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                    <span>{rm.member.name} {rm.member.surname}</span>
                                                    <Badge variant="default">{memberTypeLabels[rm.type]}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <DialogFooter className="flex-col sm:flex-row gap-2">
                                {selectedDecision.status === 'DRAFT' && (
                                    <>
                                        <Button
                                            variant="destructive"
                                            onClick={() => handleDelete(selectedDecision.id)}
                                            className="gap-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Sil
                                        </Button>
                                        <Button
                                            onClick={() => handleFinalize(selectedDecision.id)}
                                            className="gap-1 bg-gradient-to-r from-emerald-600 to-teal-600"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Kesinleştir
                                        </Button>
                                    </>
                                )}
                                <Button variant="outline" className="gap-1">
                                    <Download className="w-4 h-4" />
                                    PDF İndir
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
