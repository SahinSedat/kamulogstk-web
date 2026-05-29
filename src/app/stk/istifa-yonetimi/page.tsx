"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    UserMinus, Clock, CheckCircle, XCircle, FileText,
    Calendar, AlertTriangle, Link2, Loader2
} from 'lucide-react'

interface RelatedDecision {
    decision: {
        id: string
        decisionNumber: string
        decisionDate: string
        subject: string
        status: 'DRAFT' | 'FINALIZED'
    }
}

interface Resignation {
    id: string
    name: string
    surname: string
    memberNumber: string | null
    email: string
    phone: string
    status: 'RESIGNATION_REQ' | 'RESIGNED'
    leaveReason: string | null
    leaveDate: string | null
    joinDate: string | null
    updatedAt: string
    relatedDecisions: RelatedDecision[]
}

const statusConfig = {
    RESIGNATION_REQ: { label: 'Beklemede', variant: 'warning' as const, icon: Clock, color: 'amber' },
    RESIGNED: { label: 'Onaylandı', variant: 'success' as const, icon: CheckCircle, color: 'emerald' },
}

export default function ResignationsPage() {
    const [resignations, setResignations] = useState<Resignation[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ pending: 0, resigned: 0 })
    const [showDetailDialog, setShowDetailDialog] = useState(false)
    const [selectedMember, setSelectedMember] = useState<Resignation | null>(null)
    const [showDecisionDialog, setShowDecisionDialog] = useState(false)

    useEffect(() => {
        fetchResignations()
    }, [])

    const fetchResignations = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/stk/resignations')
            const data = await res.json()
            if (data.resignations) {
                setResignations(data.resignations)
                setStats(data.stats)
            }
        } catch (error) {
            console.error('Fetch error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleViewDetail = (member: Resignation) => {
        setSelectedMember(member)
        setShowDetailDialog(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">İstifa Yönetimi</h1>
                    <p className="text-slate-500 mt-1">Üye istifa talepleri ve işlem geçmişi</p>
                </div>
            </div>

            {/* Uyarı */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Not:</strong> İstifa taleplerini onaylamak için ilgili YK kararı ile ilişkilendirmeniz gerekmektedir.
                        Kararlar bölümünden karar oluşturup üye ile ilişkilendirebilirsiniz.
                    </p>
                </CardContent>
            </Card>

            {/* İstatistikler */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/10 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Bekleyen Talepler</p>
                            <p className="text-2xl font-bold">{stats.pending}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Onaylanan İstifalar</p>
                            <p className="text-2xl font-bold">{stats.resigned}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Log Listesi */}
            <Card>
                <CardHeader>
                    <CardTitle>İstifa Kayıtları ({resignations.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Yükleniyor...
                        </div>
                    ) : resignations.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <UserMinus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Henüz istifa kaydı bulunmuyor</p>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Timeline çizgisi */}
                            <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />

                            <div className="space-y-4">
                                {resignations.map(member => {
                                    const config = statusConfig[member.status]
                                    const StatusIcon = config.icon
                                    const hasDecision = member.relatedDecisions.length > 0
                                    const isActive = member.status === 'RESIGNATION_REQ'

                                    return (
                                        <div
                                            key={member.id}
                                            className={`relative pl-14 pr-4 py-4 rounded-xl border transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isActive
                                                ? 'border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5'
                                                : 'border-slate-200 dark:border-slate-700'
                                                }`}
                                            onClick={() => handleViewDetail(member)}
                                        >
                                            {/* Timeline noktası */}
                                            <div className={`absolute left-3.5 top-5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900 ${isActive ? 'bg-amber-500' : 'bg-emerald-500'
                                                }`}>
                                                <StatusIcon className="w-3 h-3 text-white" />
                                            </div>

                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className="font-semibold text-slate-900 dark:text-white">
                                                            {member.name} {member.surname}
                                                        </span>
                                                        <Badge variant={config.variant}>
                                                            {config.label}
                                                        </Badge>
                                                        {hasDecision && (
                                                            <Badge variant="default" className="gap-1">
                                                                <Link2 className="w-3 h-3" />
                                                                Karar Var
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm text-slate-500 mb-1">
                                                        <span>{member.memberNumber || 'No: -'}</span>
                                                        <span>·</span>
                                                        <span>{member.email}</span>
                                                    </div>
                                                    {member.leaveReason && (
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 italic">
                                                            &quot;{member.leaveReason}&quot;
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right text-xs text-slate-500 shrink-0">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(member.updatedAt).toLocaleDateString('tr-TR')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Detay Dialog */}
            <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
                <DialogContent className="max-w-2xl">
                    {selectedMember && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <UserMinus className="w-5 h-5" />
                                    İstifa Detayı
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                                        {selectedMember.name[0]}{selectedMember.surname[0]}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold">{selectedMember.name} {selectedMember.surname}</h3>
                                        <p className="text-slate-500">{selectedMember.memberNumber || 'Üye No: -'}</p>
                                        <Badge variant={statusConfig[selectedMember.status].variant} className="mt-1">
                                            {statusConfig[selectedMember.status].label}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-slate-500">E-posta</p>
                                        <p className="font-medium">{selectedMember.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Telefon</p>
                                        <p className="font-medium">{selectedMember.phone}</p>
                                    </div>
                                    {selectedMember.joinDate && (
                                        <div>
                                            <p className="text-sm text-slate-500">Üyelik Tarihi</p>
                                            <p className="font-medium">{new Date(selectedMember.joinDate).toLocaleDateString('tr-TR')}</p>
                                        </div>
                                    )}
                                    {selectedMember.leaveDate && (
                                        <div>
                                            <p className="text-sm text-slate-500">Ayrılış Tarihi</p>
                                            <p className="font-medium">{new Date(selectedMember.leaveDate).toLocaleDateString('tr-TR')}</p>
                                        </div>
                                    )}
                                </div>

                                {selectedMember.leaveReason && (
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">İstifa Sebebi</p>
                                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                            {selectedMember.leaveReason}
                                        </div>
                                    </div>
                                )}

                                {/* İlişkili Kararlar */}
                                {selectedMember.relatedDecisions.length > 0 && (
                                    <div>
                                        <p className="text-sm text-slate-500 mb-2 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            İlişkili YK Kararları
                                        </p>
                                        <div className="space-y-2">
                                            {selectedMember.relatedDecisions.map(rd => (
                                                <div
                                                    key={rd.decision.id}
                                                    className="p-3 border border-slate-200 rounded-lg flex items-center justify-between"
                                                >
                                                    <div>
                                                        <span className="font-medium">{rd.decision.decisionNumber}</span>
                                                        <span className="text-slate-500 ml-2">{rd.decision.subject}</span>
                                                    </div>
                                                    <Badge variant={rd.decision.status === 'FINALIZED' ? 'success' : 'warning'}>
                                                        {rd.decision.status === 'FINALIZED' ? 'Kesin' : 'Taslak'}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                {selectedMember.status === 'RESIGNATION_REQ' && selectedMember.relatedDecisions.length === 0 && (
                                    <Button
                                        onClick={() => { setShowDecisionDialog(true); setShowDetailDialog(false) }}
                                        className="gap-1"
                                    >
                                        <Link2 className="w-4 h-4" />
                                        Karar ile İlişkilendir
                                    </Button>
                                )}
                                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Kapat</Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Karar İlişkilendirme Dialog */}
            <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Karar ile İlişkilendir</DialogTitle>
                    </DialogHeader>
                    <p className="text-slate-500">
                        İstifa talebini onaylamak için önce <strong>Kararlar</strong> bölümünden
                        bir YK kararı oluşturun, ardından kararın detay ekranından bu üyeyi
                        &quot;İstifa Kabulü&quot; olarak ilişkilendirin.
                    </p>
                    <DialogFooter>
                        <Button onClick={() => window.location.href = '/stk/kararlar'}>
                            Kararlar Sayfasına Git
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
