"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    FileText, Search, Plus, Eye, Edit2, CheckCircle, AlertTriangle,
    Calendar, Hash, Download, Trash2, Users, Link2, Loader2, UserPlus, X
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

interface MemberOption {
    id: string
    name: string
    surname: string
    memberNumber: string | null
    status: string
}

const statusConfig = {
    DRAFT: { label: 'Taslak', variant: 'warning' as const, icon: Edit2 },
    FINALIZED: { label: 'Kesinleşti', variant: 'success' as const, icon: CheckCircle },
}

const DECISION_TEMPLATES = [
    { label: 'Üyelik Kabulü', subject: 'Üyelik Başvurusu Kabulü', content: 'Yönetim kurulu toplanarak, ekli listede bilgileri yer alan kişilerin üyelik başvurularını değerlendirmiş ve derneğimize üye olarak kabullerine oybirliğiyle karar vermiştir.', memberType: 'MEMBERSHIP_ACCEPT' },
    { label: 'Üyelik İstifası', subject: 'Üyelik İstifa Onayı', content: 'Yönetim kurulu toplanarak, dilekçe ile başvuruda bulunan üyelerin istifa taleplerini değerlendirmiş ve üyeliklerinin sonlandırılmasına karar vermiştir.', memberType: 'RESIGNATION_ACCEPT' },
    { label: 'İstifa Reddi', subject: 'İstifa Talebinin Reddi', content: 'Yönetim kurulu toplanarak, üyenin istifa talebini görüşmüş; tüzüğümüzün ilgili maddeleri ve dernek menfaatleri gereğince istifanın bu aşamada kabul edilmemesine karar vermiştir.', memberType: 'RESIGNATION_REJECT' },
    { label: 'Üyelik İhracı', subject: 'Üyelik İhracı - Disiplin Suçu', content: 'Dernek tüzüğüne ve disiplin yönetmeliğine aykırı hareketleri nedeniyle disiplin kuruluna sevk edilen üyenin durumu görüşülmüş, tüzüğün ilgili maddesi uyarınca üyelikten ihracına karar verilmiştir.', memberType: 'EXPULSION' },
    { label: 'Faaliyet Planı', subject: 'Yıllık Çalışma Raporu Onayı', content: 'Derneğimizin geçmiş yıl faaliyetlerini içeren çalışma raporu görüşülmüş ve yönetim kurulunca onaylanarak Genel Kurul\'a sunulmasına karar verilmiştir.', memberType: 'OTHER' },
    { label: 'Genel Kurul Kararı', subject: 'Olağan Genel Kurul Toplantısı', content: 'Yönetim kurulu, derneğimizin Olağan Genel Kurul toplantısının ... tarihinde, ... adresinde, aşağıdaki gündem maddeleriyle yapılmasına karar vermiştir.', memberType: 'OTHER' },
]

const memberTypeLabels: Record<string, string> = {
    MEMBERSHIP_ACCEPT: 'Üyelik Kabulü',
    RESIGNATION_ACCEPT: 'İstifa Kabulü',
    RESIGNATION_REJECT: 'İstifa Reddi',
    EXPULSION: 'İhraç',
    OTHER: 'Diğer'
}

const memberTypeOptions = [
    { value: 'MEMBERSHIP_ACCEPT', label: 'Üyelik Kabulü', desc: 'Başvurusu kabul edilen üye' },
    { value: 'RESIGNATION_ACCEPT', label: 'İstifa Kabulü', desc: 'İstifası kabul edilen üye' },
    { value: 'RESIGNATION_REJECT', label: 'İstifa Reddi', desc: 'İstifası reddedilen üye' },
    { value: 'EXPULSION', label: 'İhraç', desc: 'İhraç edilen üye' },
    { value: 'OTHER', label: 'Diğer', desc: 'Diğer ilişki türü' },
]

export default function DecisionsPage() {
    const [decisions, setDecisions] = useState<Decision[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'FINALIZED'>('ALL')
    const [stats, setStats] = useState({ total: 0, draft: 0, finalized: 0 })
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

    // Üye ilişkilendirme
    const [showLinkDialog, setShowLinkDialog] = useState(false)
    const [members, setMembers] = useState<MemberOption[]>([])
    const [membersLoading, setMembersLoading] = useState(false)
    const [linkType, setLinkType] = useState('MEMBERSHIP_ACCEPT')
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
    const [linkSubmitting, setLinkSubmitting] = useState(false)
    const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
    const [includeActive, setIncludeActive] = useState(false)
    const [selectedTemplateMemberType, setSelectedTemplateMemberType] = useState<string | null>(null)

    // Karar numarası kontrolü
    useEffect(() => {
        if (!showNewDialog || !formData.decisionNumber) {
            setDuplicateWarning(null)
            return
        }

        const checkDuplicate = async () => {
            try {
                const res = await fetch(`/api/stk/decisions/check?number=${encodeURIComponent(formData.decisionNumber)}`)
                const data = await res.json()
                if (data.exists) {
                    setDuplicateWarning('Bu karar numarası zaten kullanımda')
                } else {
                    setDuplicateWarning(null)
                }
            } catch (error) {
                console.error('Check error:', error)
            }
        }

        const timer = setTimeout(checkDuplicate, 500)
        return () => clearTimeout(timer)
    }, [formData.decisionNumber, showNewDialog])

    useEffect(() => {
        fetchDecisions()
    }, [statusFilter])

    const fetchDecisions = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (statusFilter !== 'ALL') params.set('status', statusFilter)
            const res = await fetch(`/api/stk/decisions?${params}`)
            const data = await res.json()
            if (res.ok) {
                setDecisions(data.decisions)
                setStats(data.stats)
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
                const data = await res.json()
                setShowNewDialog(false)
                setFormData({
                    decisionNumber: '',
                    decisionDate: new Date().toISOString().split('T')[0],
                    subject: '',
                    content: '',
                    description: ''
                })
                await fetchDecisions()
                // Yeni oluşturulan kararı otomatik aç, üye eklenmesi için
                if (data.decision) {
                    const created = { ...data.decision, relatedMembers: [] }
                    setSelectedDecision(created)
                    setShowDetailDialog(true)
                }
            }
        } catch (error) {
            console.error('Create error:', error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleFinalize = async (id: string) => {
        if (!confirm('Bu kararı kesinleştirmek istediğinize emin misiniz? Kesinleştirme sonrası ilişkili üyelerin durumları güncellenecektir.')) return
        try {
            const res = await fetch(`/api/stk/decisions/${id}/finalize`, { method: 'POST' })
            const data = await res.json()
            if (res.ok) {
                fetchDecisions()
                setShowDetailDialog(false)
            } else {
                alert(data.error || 'Kesinleştirme sırasında bir hata oluştu')
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

    // Üye ilişkilendirme - türe göre filtreleme
    const getStatusForType = (type: string, includeActive: boolean): string => {
        switch (type) {
            case 'MEMBERSHIP_ACCEPT': return includeActive ? 'APPLIED,PENDING,ACTIVE' : 'APPLIED,PENDING'
            case 'RESIGNATION_ACCEPT':
            case 'RESIGNATION_REJECT':
                return 'RESIGNATION_REQ'
            case 'EXPULSION': return 'ACTIVE'
            case 'OTHER': return 'ACTIVE,INACTIVE,PENDING,APPLIED,RESIGNATION_REQ'
            default: return 'all'
        }
    }

    const fetchMembers = async (type: string, includeActive: boolean) => {
        setMembersLoading(true)
        try {
            const statusParam = getStatusForType(type, includeActive)
            console.log('Frontend Fetching members with status:', statusParam)
            const res = await fetch(`/api/stk/members?status=${statusParam}`)
            const data = await res.json()
            console.log('Frontend Members response:', data)
            if (data.members) {
                setMembers(data.members)
            } else {
                setMembers([])
            }
        } catch (error) {
            console.error('Members fetch error:', error)
        } finally {
            setMembersLoading(false)
        }
    }

    const handleOpenLinkDialog = () => {
        const defaultType = selectedTemplateMemberType || 'MEMBERSHIP_ACCEPT'
        setLinkType(defaultType)
        setSelectedMemberIds([])
        setIncludeActive(false)
        fetchMembers(defaultType, false)
        setShowLinkDialog(true)
    }

    const handleLinkTypeChange = (type: string) => {
        setLinkType(type)
        setSelectedMemberIds([])
        fetchMembers(type, includeActive)
    }

    const handleIncludeActiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked
        setIncludeActive(checked)
        fetchMembers(linkType, checked)
    }

    const toggleMemberSelection = (id: string) => {
        setSelectedMemberIds(prev =>
            prev.includes(id)
                ? prev.filter(mid => mid !== id)
                : [...prev, id]
        )
    }

    const handleLinkMember = async () => {
        if (!selectedDecision || selectedMemberIds.length === 0) return
        setLinkSubmitting(true)
        try {
            const res = await fetch(`/api/stk/decisions/${selectedDecision.id}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberIds: selectedMemberIds, type: linkType })
            })
            const data = await res.json()
            if (res.ok) {
                setShowLinkDialog(false)
                fetchDecisions()
                // Güncellenen kararı tekrar çek
                const detailRes = await fetch(`/api/stk/decisions/${selectedDecision.id}`)
                const detailData = await detailRes.json()
                if (detailData.decision) {
                    setSelectedDecision(detailData.decision)
                }
            } else {
                alert(data.error || 'Bir hata oluştu')
            }
        } catch (error) {
            console.error('Link error:', error)
        } finally {
            setLinkSubmitting(false)
        }
    }

    const handleRemoveMember = async (decisionMemberId: string) => {
        if (!selectedDecision) return
        if (!confirm('Bu üye ilişkisini kaldırmak istediğinize emin misiniz?')) return
        try {
            const res = await fetch(`/api/stk/decisions/${selectedDecision.id}/members`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decisionMemberId })
            })
            if (res.ok) {
                fetchDecisions()
                const detailRes = await fetch(`/api/stk/decisions/${selectedDecision.id}`)
                const detailData = await detailRes.json()
                if (detailData.decision) {
                    setSelectedDecision(detailData.decision)
                }
            }
        } catch (error) {
            console.error('Unlink error:', error)
        }
    }

    const handleSeedDrafts = async () => {
        if (!confirm('Örnek taslak kararlar oluşturulsun mu?')) return
        setLoading(true)
        try {
            const res = await fetch('/api/stk/decisions/seed', { method: 'POST' })
            const data = await res.json()
            if (res.ok) {
                alert(`${data.count} adet taslak karar oluşturuldu.`)
                fetchDecisions()
            } else {
                alert(data.error || 'Taslaklar oluşturulamadı')
            }
        } catch (error) {
            console.error('Seed error:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredDecisions = decisions.filter(d =>
        d.decisionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.subject.toLowerCase().includes(searchQuery.toLowerCase())
    )



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
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Toplam Karar</p>
                            <p className="text-2xl font-bold">{stats.total}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card
                    className="cursor-pointer hover:bg-slate-50 transition-colors border-amber-200 shadow-sm"
                    onClick={() => {
                        if (stats.draft === 0) {
                            handleSeedDrafts()
                        } else {
                            setStatusFilter('DRAFT')
                        }
                    }}
                >
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/10 rounded-xl flex items-center justify-center">
                            <Edit2 className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Taslak</p>
                            <p className="text-2xl font-bold">{stats.draft}</p>
                            {stats.draft === 0 && (
                                <p className="text-xs text-blue-600 font-medium mt-1 hover:underline">Örnek Oluştur</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center">
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
                    <CardTitle>
                        {statusFilter === 'DRAFT' ? 'Taslaklar' : 'Kararlar'} ({filteredDecisions.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8 text-slate-500 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Yükleniyor...
                        </div>
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
                                        className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
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
                                        className={`pl-9 ${duplicateWarning ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                                    />
                                </div>
                                {duplicateWarning && (
                                    <p className="text-xs text-red-500 mt-1">{duplicateWarning}</p>
                                )}
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
                        {/* Şablon Seçimi */}
                        <div>
                            <label className="text-sm font-medium mb-1 block text-slate-500">Hazır Şablonlar (İsteğe Bağlı)</label>
                            <select
                                className="flex h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 border-slate-300 focus:border-blue-500 focus:ring-blue-500/30 dark:border-slate-700 dark:focus:border-blue-500"
                                onChange={(e) => {
                                    const template = DECISION_TEMPLATES.find(t => t.label === e.target.value)
                                    if (template) {
                                        setFormData(prev => ({
                                            ...prev,
                                            subject: template.subject,
                                            content: template.content
                                        }))
                                        setSelectedTemplateMemberType(template.memberType)
                                    }
                                }}
                                defaultValue=""
                            >
                                <option value="" disabled>Bir şablon seçin...</option>
                                {DECISION_TEMPLATES.map(t => (
                                    <option key={t.label} value={t.label}>{t.label}</option>
                                ))}
                            </select>
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
                                className="w-full min-h-[150px] p-3 border border-slate-200 dark:border-slate-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-transparent"
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
                            disabled={submitting || !formData.decisionNumber || !formData.subject || !!duplicateWarning}
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
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
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

                                {/* İlişkili Üyeler */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium flex items-center gap-2">
                                            <Link2 className="w-4 h-4" />
                                            İlişkili Üyeler ({selectedDecision.relatedMembers.length})
                                        </h4>
                                        {selectedDecision.status === 'DRAFT' && (
                                            <Button size="sm" variant="outline" className="gap-1" onClick={handleOpenLinkDialog}>
                                                <UserPlus className="w-4 h-4" />
                                                Üye Ekle
                                            </Button>
                                        )}
                                    </div>
                                    {selectedDecision.relatedMembers.length > 0 ? (
                                        <div className="space-y-2">
                                            {selectedDecision.relatedMembers.map(rm => (
                                                <div key={rm.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                                                            {rm.member.name[0]}{rm.member.surname[0]}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">{rm.member.name} {rm.member.surname}</span>
                                                            {rm.member.memberNumber && (
                                                                <span className="text-slate-500 text-sm ml-2">#{rm.member.memberNumber}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="default">{memberTypeLabels[rm.type]}</Badge>
                                                        {selectedDecision.status === 'DRAFT' && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                                                                onClick={(e) => { e.stopPropagation(); handleRemoveMember(rm.id) }}
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 rounded-lg p-4">
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Üye ilişkilendirmesi zorunludur</p>
                                                    <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">Bu kararı kesinleştirmek için en az bir üye eklemelisiniz.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
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
                                            disabled={selectedDecision.relatedMembers.length === 0}
                                            className="gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title={selectedDecision.relatedMembers.length === 0 ? 'Kesinleştirmek için en az bir üye ekleyin' : ''}
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Kesinleştir
                                        </Button>
                                    </>
                                )}
                                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Kapat</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Üye İlişkilendirme Dialog */}
            <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5" />
                            Üye İlişkilendir
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Karar Türü</label>
                            <div className="grid grid-cols-2 gap-2">
                                {memberTypeOptions.map(opt => {
                                    const isDisabled = selectedTemplateMemberType !== null && opt.value !== selectedTemplateMemberType
                                    return (
                                        <button
                                            key={opt.value}
                                            disabled={isDisabled}
                                            className={`p-3 rounded-lg border text-left transition-all ${linkType === opt.value
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                                                : isDisabled
                                                    ? 'border-slate-100 dark:border-slate-800 opacity-40 cursor-not-allowed'
                                                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                }`}
                                            onClick={() => handleLinkTypeChange(opt.value)}
                                        >
                                            <p className="font-medium text-sm">{opt.label}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {linkType === 'MEMBERSHIP_ACCEPT' && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="includeActive"
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    checked={includeActive}
                                    onChange={handleIncludeActiveChange}
                                />
                                <label htmlFor="includeActive" className="text-sm text-slate-700 select-none cursor-pointer">
                                    Zaten üye olanları da göster (Geriye dönük karar için)
                                </label>
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium mb-2 block">Üye Seç</label>
                            {membersLoading ? (
                                <div className="flex items-center gap-2 py-4 text-slate-500">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Üyeler yükleniyor...
                                </div>
                            ) : (
                                <div className="max-h-[200px] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                                    {members.length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center py-4">
                                            {linkType === 'MEMBERSHIP_ACCEPT' ? 'Bekleyen üyelik başvurusu bulunamadı' :
                                                linkType === 'RESIGNATION_ACCEPT' ? 'İstifa talebi bulunamadı' :
                                                    linkType === 'EXPULSION' ? 'Aktif üye bulunamadı' :
                                                        'Üye bulunamadı'}
                                        </p>
                                    ) : (
                                        members.map(m => (
                                            <button
                                                key={m.id}
                                                className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${selectedMemberIds.includes(m.id)
                                                    ? 'bg-blue-50 dark:bg-blue-500/10'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                                    }`}
                                                onClick={() => toggleMemberSelection(m.id)}
                                            >
                                                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-rose-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                                                    {m.name[0]}{m.surname[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{m.name} {m.surname}</p>
                                                    <p className="text-xs text-slate-500">{m.memberNumber || 'No: -'} · {{
                                                        APPLIED: 'Başvuruda',
                                                        PENDING: 'Beklemede',
                                                        ACTIVE: 'Aktif',
                                                        RESIGNATION_REQ: 'İstifa Talebi',
                                                        RESIGNED: 'İstifa Etmiş',
                                                        EXPELLED: 'İhraç Edilmiş',
                                                        INACTIVE: 'Pasif'
                                                    }[m.status] || m.status}</p>
                                                </div>
                                                {selectedMemberIds.includes(m.id) && (
                                                    <CheckCircle className="w-4 h-4 text-blue-500 ml-auto" />
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowLinkDialog(false)}>İptal</Button>
                        <Button
                            onClick={handleLinkMember}
                            disabled={linkSubmitting || selectedMemberIds.length === 0}
                            className="gap-1"
                        >
                            {linkSubmitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> İlişkilendiriliyor...</>
                            ) : (
                                <><Link2 className="w-4 h-4" /> İlişkilendir</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
