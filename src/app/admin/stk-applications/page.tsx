"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Building2,
    Search,
    Filter,
    Eye,
    Check,
    X,
    Download,
    Calendar,
    MapPin,
    Phone,
    Mail,
    Globe,
    Users,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Shield,
    UserCircle,
} from 'lucide-react'

// Types
interface STKApplication {
    id: string
    name: string
    type: string
    email: string
    phone: string
    city: string
    district?: string
    address?: string
    status: string
    createdAt: string
    registrationNumber?: string
    taxNumber?: string
    website?: string
    description?: string
    manager?: {
        id: string
        name: string
        email: string
        phone: string
        registrationPurpose?: string
    }
    stats?: {
        totalMembers: number
        activeMembers: number
    }
    boardMembers?: {
        id: string
        name: string
        position: string
        startDate: string
    }[]
    stksectors?: {
        sector: { name: string }
    }[]
    packageInfo?: {
        name: string
        price: number
        currency: string
    } | null
}

const statusConfig: Record<string, { label: string; variant: 'warning' | 'success' | 'destructive' | 'default' | 'outline' }> = {
    PENDING: { label: 'Beklemede', variant: 'warning' },
    APPROVED: { label: 'Onaylandı', variant: 'success' },
    REJECTED: { label: 'Reddedildi', variant: 'destructive' },
    ACTIVE: { label: 'Aktif', variant: 'success' },
    SUSPENDED: { label: 'Askıya Alındı', variant: 'destructive' },
    INACTIVE: { label: 'Pasif', variant: 'default' },
}

const typeLabels: Record<string, string> = {
    DERNEK: 'Dernek',
    VAKIF: 'Vakıf',
    SENDIKA: 'Sendika',
    MESLEK_ODA: 'Meslek Odası',
    KOOPERATIF: 'Kooperatif',
    DIGER: 'Diğer',
}

const positionLabels: Record<string, string> = {
    PRESIDENT: 'Başkan',
    VICE_PRESIDENT: 'Başkan Yardımcısı',
    SECRETARY: 'Genel Sekreter',
    TREASURER: 'Sayman',
    MEMBER: 'Üye',
    AUDITOR: 'Denetçi',
}

export default function STKApplicationsPage() {
    const [applications, setApplications] = useState<STKApplication[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [selectedApp, setSelectedApp] = useState<STKApplication | null>(null)
    const [showApproveDialog, setShowApproveDialog] = useState(false)
    const [showRejectDialog, setShowRejectDialog] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    // Fetch applications
    const fetchApplications = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (searchQuery) params.set('search', searchQuery)
            if (typeFilter !== 'all') params.set('type', typeFilter)
            params.set('page', page.toString())

            const res = await fetch(`/api/admin/stks?${params.toString()}`)
            const data = await res.json()

            if (data.success) {
                // statusFilter'ı frontend'de uygula (API city destekliyor ama status filter'ı yok)
                let filtered = data.stks
                if (statusFilter !== 'all') {
                    filtered = filtered.filter((s: STKApplication) => s.status === statusFilter)
                }
                setApplications(filtered)
                setTotalPages(data.pagination.totalPages)
                setTotal(data.pagination.total)
            }
        } catch (error) {
            console.error('Başvurular yüklenirken hata:', error)
        } finally {
            setLoading(false)
        }
    }, [searchQuery, typeFilter, statusFilter, page])

    useEffect(() => {
        fetchApplications()
    }, [fetchApplications])

    // Handle approve
    const handleApprove = async () => {
        if (!selectedApp) return
        setActionLoading(true)
        try {
            const res = await fetch('/api/admin/stks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: selectedApp.id, status: 'APPROVED' })
            })
            const data = await res.json()
            if (data.success) {
                setShowApproveDialog(false)
                setSelectedApp(null)
                fetchApplications()
            }
        } catch (error) {
            console.error('Onaylama hatası:', error)
        } finally {
            setActionLoading(false)
        }
    }

    // Handle reject
    const handleReject = async () => {
        if (!selectedApp || !rejectReason) return
        setActionLoading(true)
        try {
            const res = await fetch('/api/admin/stks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: selectedApp.id, status: 'REJECTED' })
            })
            const data = await res.json()
            if (data.success) {
                setShowRejectDialog(false)
                setSelectedApp(null)
                setRejectReason('')
                fetchApplications()
            }
        } catch (error) {
            console.error('Reddetme hatası:', error)
        } finally {
            setActionLoading(false)
        }
    }

    // Stats
    const stats = {
        total: total,
        pending: applications.filter(a => a.status === 'PENDING').length,
        approved: applications.filter(a => a.status === 'APPROVED' || a.status === 'ACTIVE').length,
        rejected: applications.filter(a => a.status === 'REJECTED').length,
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">STK Başvuruları</h1>
                    <p className="text-slate-500 mt-1">Gelen STK başvurularını yönetin</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                                <p className="text-xs text-slate-500">Toplam Başvuru</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                                <Loader2 className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                                <p className="text-xs text-slate-500">Beklemede</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                                <Check className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
                                <p className="text-xs text-slate-500">Onaylanan</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                                <X className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                                <p className="text-xs text-slate-500">Reddedilen</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                placeholder="STK adı, tescil no veya vergi no ara..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                                className="pl-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                            <SelectTrigger className="w-[180px]">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Durum Filtresi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tüm Durumlar</SelectItem>
                                <SelectItem value="PENDING">Beklemede</SelectItem>
                                <SelectItem value="APPROVED">Onaylandı</SelectItem>
                                <SelectItem value="ACTIVE">Aktif</SelectItem>
                                <SelectItem value="REJECTED">Reddedildi</SelectItem>
                                <SelectItem value="SUSPENDED">Askıya Alındı</SelectItem>
                                <SelectItem value="INACTIVE">Pasif</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
                            <SelectTrigger className="w-[180px]">
                                <Building2 className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Tür Filtresi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tüm Türler</SelectItem>
                                <SelectItem value="DERNEK">Dernek</SelectItem>
                                <SelectItem value="VAKIF">Vakıf</SelectItem>
                                <SelectItem value="SENDIKA">Sendika</SelectItem>
                                <SelectItem value="MESLEK_ODA">Meslek Odası</SelectItem>
                                <SelectItem value="KOOPERATIF">Kooperatif</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Applications Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Başvuru Listesi ({applications.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <span className="ml-3 text-slate-500">Yükleniyor...</span>
                        </div>
                    ) : applications.length === 0 ? (
                        <div className="text-center py-12">
                            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">Başvuru bulunamadı</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">STK</th>
                                        <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Tür</th>
                                        <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Yönetici</th>
                                        <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Şehir</th>
                                        <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Üye Sayısı</th>
                                        <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Tarih</th>
                                        <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">Durum</th>
                                        <th className="text-right py-4 px-4 font-semibold text-slate-600 dark:text-slate-300 text-sm">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {applications.map((app) => (
                                        <tr
                                            key={app.id}
                                            className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                        >
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                                                        <Building2 className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-white">{app.name}</p>
                                                        <p className="text-xs text-slate-500">{app.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <Badge variant="outline">{typeLabels[app.type] || app.type}</Badge>
                                            </td>
                                            <td className="py-4 px-4">
                                                {app.manager ? (
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{app.manager.name}</p>
                                                        <p className="text-xs text-slate-500">{app.manager.email}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm">
                                                    <MapPin className="w-3 h-3" />
                                                    {app.city}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm">
                                                    <Users className="w-3 h-3" />
                                                    {app.stats?.activeMembers || 0}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(app.createdAt).toLocaleDateString('tr-TR')}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <Badge variant={statusConfig[app.status]?.variant || 'default'}>
                                                    {statusConfig[app.status]?.label || app.status}
                                                </Badge>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setSelectedApp(app)}
                                                        title="Detay"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    {app.status === 'PENDING' && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                onClick={() => {
                                                                    setSelectedApp(app)
                                                                    setShowApproveDialog(true)
                                                                }}
                                                                title="Onayla"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => {
                                                                    setSelectedApp(app)
                                                                    setShowRejectDialog(true)
                                                                }}
                                                                title="Reddet"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-sm text-slate-500">
                                Sayfa {page} / {totalPages} (Toplam {total} kayıt)
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                                    <Button
                                        key={p}
                                        variant="outline"
                                        size="sm"
                                        className={page === p ? 'bg-blue-600 text-white border-blue-600' : ''}
                                        onClick={() => setPage(p)}
                                    >
                                        {p}
                                    </Button>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={!!selectedApp && !showApproveDialog && !showRejectDialog} onOpenChange={() => setSelectedApp(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <span>{selectedApp?.name}</span>
                                <div className="mt-1">
                                    <Badge variant={statusConfig[selectedApp?.status || 'PENDING']?.variant || 'default'}>
                                        {statusConfig[selectedApp?.status || 'PENDING']?.label}
                                    </Badge>
                                </div>
                            </div>
                        </DialogTitle>
                        <DialogDescription>STK başvuru detayları</DialogDescription>
                    </DialogHeader>
                    {selectedApp && (
                        <div className="space-y-6 py-4">
                            {/* Temel Bilgiler */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                    <Building2 className="w-4 h-4" /> Kurum Bilgileri
                                </h4>
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Tür</label>
                                        <p className="text-sm text-slate-900 dark:text-white mt-0.5">{typeLabels[selectedApp.type] || selectedApp.type}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Tescil No</label>
                                        <p className="text-sm text-slate-900 dark:text-white mt-0.5">{selectedApp.registrationNumber || '-'}</p>
                                    </div>
                                    {selectedApp.taxNumber && (
                                        <div>
                                            <label className="text-xs font-medium text-slate-500">Vergi No</label>
                                            <p className="text-sm text-slate-900 dark:text-white mt-0.5">{selectedApp.taxNumber}</p>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-xs font-medium text-slate-500">Başvuru Tarihi</label>
                                        <p className="text-sm text-slate-900 dark:text-white mt-0.5">{new Date(selectedApp.createdAt).toLocaleDateString('tr-TR')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* İletişim */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                    <Mail className="w-4 h-4" /> İletişim Bilgileri
                                </h4>
                                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-900 dark:text-white">{selectedApp.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-900 dark:text-white">{selectedApp.phone}</span>
                                    </div>
                                    {selectedApp.website && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Globe className="w-4 h-4 text-slate-400" />
                                            <span className="text-slate-900 dark:text-white">{selectedApp.website}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-sm">
                                        <MapPin className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-900 dark:text-white">
                                            {selectedApp.city}{selectedApp.district ? ` / ${selectedApp.district}` : ''}
                                        </span>
                                    </div>
                                    {selectedApp.address && (
                                        <p className="text-xs text-slate-500 pl-6">{selectedApp.address}</p>
                                    )}
                                </div>
                            </div>

                            {/* Yönetici */}
                            {selectedApp.manager && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                        <UserCircle className="w-4 h-4" /> Yönetici Bilgileri
                                    </h4>
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                                <span className="text-sm font-bold text-blue-600">
                                                    {selectedApp.manager.name?.charAt(0) || '?'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedApp.manager.name}</p>
                                                <p className="text-xs text-slate-500">{selectedApp.manager.email}</p>
                                            </div>
                                        </div>
                                        {selectedApp.manager.phone && (
                                            <div className="flex items-center gap-2 text-sm pl-11">
                                                <Phone className="w-3 h-3 text-slate-400" />
                                                <span className="text-slate-600">{selectedApp.manager.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Yönetim Kurulu */}
                            {selectedApp.boardMembers && selectedApp.boardMembers.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> Yönetim Kurulu ({selectedApp.boardMembers.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedApp.boardMembers.map(bm => (
                                            <div key={bm.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                                                        <span className="text-xs font-bold text-indigo-600">{bm.name?.charAt(0)}</span>
                                                    </div>
                                                    <span className="text-sm text-slate-900 dark:text-white">{bm.name}</span>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    {positionLabels[bm.position] || bm.position}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Açıklama */}
                            {selectedApp.description && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Açıklama</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                                        {selectedApp.description}
                                    </p>
                                </div>
                            )}

                            {/* İstatistikler */}
                            {selectedApp.stats && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                                        <p className="text-lg font-bold text-blue-600">{selectedApp.stats.totalMembers}</p>
                                        <p className="text-xs text-slate-500">Toplam Üye</p>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                                        <p className="text-lg font-bold text-emerald-600">{selectedApp.stats.activeMembers}</p>
                                        <p className="text-xs text-slate-500">Aktif Üye</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        {selectedApp?.status === 'PENDING' && (
                            <>
                                <Button
                                    variant="destructive"
                                    onClick={() => setShowRejectDialog(true)}
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Reddet
                                </Button>
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => setShowApproveDialog(true)}
                                >
                                    <Check className="w-4 h-4 mr-2" />
                                    Onayla
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Approve Dialog */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Başvuruyu Onayla</DialogTitle>
                        <DialogDescription>
                            <strong>{selectedApp?.name}</strong> başvurusunu onaylamak istediğinize emin misiniz?
                            Bu işlem sonucunda STK sisteme aktif olarak eklenecektir.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={actionLoading}>
                            İptal
                        </Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApprove} disabled={actionLoading}>
                            {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                            Onayla
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Başvuruyu Reddet</DialogTitle>
                        <DialogDescription>
                            <strong>{selectedApp?.name}</strong> başvurusunu reddetmek için bir gerekçe girin.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Reddetme nedeninizi yazın..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={actionLoading}>
                            İptal
                        </Button>
                        <Button variant="destructive" onClick={handleReject} disabled={!rejectReason || actionLoading}>
                            {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                            Reddet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
