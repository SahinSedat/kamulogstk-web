"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
    UserMinus, Clock, CheckCircle, XCircle, FileText,
    Calendar, AlertTriangle, Link2
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
    RESIGNATION_REQ: { label: 'Beklemede', variant: 'warning' as const, icon: Clock },
    RESIGNED: { label: 'Onaylandı', variant: 'success' as const, icon: CheckCircle },
}

export default function ResignationsPage() {
    const [resignations, setResignations] = useState<Resignation[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<'RESIGNATION_REQ' | 'RESIGNED'>('RESIGNATION_REQ')
    const [stats, setStats] = useState({ pending: 0, resigned: 0 })
    const [showDetailDialog, setShowDetailDialog] = useState(false)
    const [selectedMember, setSelectedMember] = useState<Resignation | null>(null)
    const [showDecisionDialog, setShowDecisionDialog] = useState(false)

    useEffect(() => {
        fetchResignations()
    }, [statusFilter])

    const fetchResignations = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/stk/resignations?status=${statusFilter}`)
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
                    <p className="text-slate-500 mt-1">Üye istifa taleplerini yönetin</p>
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
                <Card
                    className={`cursor-pointer transition-all ${statusFilter === 'RESIGNATION_REQ' ? 'ring-2 ring-amber-500' : ''}`}
                    onClick={() => setStatusFilter('RESIGNATION_REQ')}
                >
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Bekleyen Talepler</p>
                            <p className="text-2xl font-bold">{stats.pending}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card
                    className={`cursor-pointer transition-all ${statusFilter === 'RESIGNED' ? 'ring-2 ring-emerald-500' : ''}`}
                    onClick={() => setStatusFilter('RESIGNED')}
                >
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Onaylanan İstifalar</p>
                            <p className="text-2xl font-bold">{stats.resigned}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Liste */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        {statusFilter === 'RESIGNATION_REQ' ? 'Bekleyen İstifa Talepleri' : 'Onaylanan İstifalar'} ({resignations.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">Yükleniyor...</div>
                    ) : resignations.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <UserMinus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>
                                {statusFilter === 'RESIGNATION_REQ'
                                    ? 'Bekleyen istifa talebi bulunmuyor'
                                    : 'Onaylanan istifa bulunmuyor'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {resignations.map(member => {
                                const StatusIcon = statusConfig[member.status].icon
                                const hasDecision = member.relatedDecisions.length > 0
                                return (
                                    <div
                                        key={member.id}
                                        className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                        onClick={() => handleViewDetail(member)}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl flex items-center justify-center text-white font-medium">
                                                    {member.name[0]}{member.surname[0]}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-semibold">{member.name} {member.surname}</span>
                                                        <Badge variant={statusConfig[member.status].variant}>
                                                            <StatusIcon className="w-3 h-3 mr-1" />
                                                            {statusConfig[member.status].label}
                                                        </Badge>
                                                        {hasDecision && (
                                                            <Badge variant="default" className="gap-1">
                                                                <Link2 className="w-3 h-3" />
                                                                Karar Var
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                                        <span>{member.memberNumber || 'No: -'}</span>
                                                        <span>{member.email}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right text-sm text-slate-500">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(member.updatedAt).toLocaleDateString('tr-TR')}
                                                </div>
                                            </div>
                                        </div>
                                        {member.leaveReason && (
                                            <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-400">
                                                <strong>Sebep:</strong> {member.leaveReason}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
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
                            <div className="space-y-4">
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
                        <Button onClick={() => window.location.href = '/stk/decisions'}>
                            Kararlar Sayfasına Git
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
