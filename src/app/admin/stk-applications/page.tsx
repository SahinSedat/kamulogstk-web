"use client"

import React, { useState } from 'react'
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
    FileText,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'

// Types
interface STKApplication {
    id: string
    name: string
    type: string
    email: string
    phone: string
    city: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    createdAt: string
    registrationNumber?: string
    website?: string
    description?: string
    documents?: string[]
}

// Mock data
const mockApplications: STKApplication[] = [
    {
        id: '1',
        name: 'Türkiye Eğitim Vakfı',
        type: 'VAKIF',
        email: 'info@tev.org.tr',
        phone: '0212 555 1234',
        city: 'İstanbul',
        status: 'PENDING',
        createdAt: '2024-01-10T10:30:00',
        registrationNumber: 'VKF-2024-001',
        website: 'https://tev.org.tr',
        description: 'Eğitim alanında faaliyet gösteren vakıf',
    },
    {
        id: '2',
        name: 'İstanbul Yazılımcılar Derneği',
        type: 'DERNEK',
        email: 'iletisim@yazilimcilar.org',
        phone: '0216 444 5678',
        city: 'İstanbul',
        status: 'PENDING',
        createdAt: '2024-01-09T14:20:00',
        registrationNumber: 'DRN-2024-015',
    },
    {
        id: '3',
        name: 'Metal İş Sendikası',
        type: 'SENDIKA',
        email: 'info@metalis.org',
        phone: '0312 333 9999',
        city: 'Ankara',
        status: 'PENDING',
        createdAt: '2024-01-08T09:15:00',
    },
    {
        id: '4',
        name: 'Ankara Esnaf Kooperatifi',
        type: 'KOOPERATIF',
        email: 'bilgi@ankaraesnaf.coop',
        phone: '0312 222 8888',
        city: 'Ankara',
        status: 'APPROVED',
        createdAt: '2024-01-05T11:00:00',
    },
    {
        id: '5',
        name: 'Reddedilen Örnek STK',
        type: 'DERNEK',
        email: 'test@example.com',
        phone: '0555 111 2222',
        city: 'İzmir',
        status: 'REJECTED',
        createdAt: '2024-01-03T16:45:00',
    },
]

const statusConfig: Record<STKApplication['status'], { label: string; variant: 'warning' | 'success' | 'destructive' }> = {
    PENDING: { label: 'Beklemede', variant: 'warning' },
    APPROVED: { label: 'Onaylandı', variant: 'success' },
    REJECTED: { label: 'Reddedildi', variant: 'destructive' },
}

const typeLabels: Record<string, string> = {
    DERNEK: 'Dernek',
    VAKIF: 'Vakıf',
    SENDIKA: 'Sendika',
    MESLEK_ODA: 'Meslek Odası',
    KOOPERATIF: 'Kooperatif',
    DIGER: 'Diğer',
}

export default function STKApplicationsPage() {
    const [applications, setApplications] = useState<STKApplication[]>(mockApplications)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [selectedApp, setSelectedApp] = useState<STKApplication | null>(null)
    const [showApproveDialog, setShowApproveDialog] = useState(false)
    const [showRejectDialog, setShowRejectDialog] = useState(false)
    const [rejectReason, setRejectReason] = useState('')

    // Filter applications
    const filteredApplications = applications.filter((app) => {
        const matchesSearch =
            app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.city.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = statusFilter === 'all' || app.status === statusFilter
        const matchesType = typeFilter === 'all' || app.type === typeFilter

        return matchesSearch && matchesStatus && matchesType
    })

    // Handle approve
    const handleApprove = () => {
        if (selectedApp) {
            setApplications((prev) =>
                prev.map((app) =>
                    app.id === selectedApp.id ? { ...app, status: 'APPROVED' as const } : app
                )
            )
            setShowApproveDialog(false)
            setSelectedApp(null)
        }
    }

    // Handle reject
    const handleReject = () => {
        if (selectedApp && rejectReason) {
            setApplications((prev) =>
                prev.map((app) =>
                    app.id === selectedApp.id ? { ...app, status: 'REJECTED' as const } : app
                )
            )
            setShowRejectDialog(false)
            setSelectedApp(null)
            setRejectReason('')
        }
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">STK Başvuruları</h1>
                    <p className="text-slate-500 mt-1">Gelen STK başvurularını yönetin</p>
                </div>
                <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Dışa Aktar
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                placeholder="STK adı, e-posta veya şehir ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Durum Filtresi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tüm Durumlar</SelectItem>
                                <SelectItem value="PENDING">Beklemede</SelectItem>
                                <SelectItem value="APPROVED">Onaylandı</SelectItem>
                                <SelectItem value="REJECTED">Reddedildi</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
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
                    <CardTitle>Başvuru Listesi ({filteredApplications.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-300">STK</th>
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-300">Tür</th>
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-300">Şehir</th>
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-300">Tarih</th>
                                    <th className="text-left py-4 px-4 font-semibold text-slate-600 dark:text-slate-300">Durum</th>
                                    <th className="text-right py-4 px-4 font-semibold text-slate-600 dark:text-slate-300">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredApplications.map((app) => (
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
                                                    <p className="text-sm text-slate-500">{app.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <Badge variant="outline">{typeLabels[app.type]}</Badge>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                <MapPin className="w-4 h-4" />
                                                {app.city}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(app.createdAt).toLocaleDateString('tr-TR')}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <Badge variant={statusConfig[app.status].variant}>
                                                {statusConfig[app.status].label}
                                            </Badge>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setSelectedApp(app)}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                {app.status === 'PENDING' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="success"
                                                            onClick={() => {
                                                                setSelectedApp(app)
                                                                setShowApproveDialog(true)
                                                            }}
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

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-slate-500">
                            Toplam {filteredApplications.length} başvuru gösteriliyor
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="bg-blue-600 text-white border-blue-600">
                                1
                            </Button>
                            <Button variant="outline" size="sm">
                                2
                            </Button>
                            <Button variant="outline" size="sm">
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <Dialog open={!!selectedApp && !showApproveDialog && !showRejectDialog} onOpenChange={() => setSelectedApp(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            {selectedApp?.name}
                        </DialogTitle>
                        <DialogDescription>STK başvuru detayları</DialogDescription>
                    </DialogHeader>
                    {selectedApp && (
                        <div className="grid grid-cols-2 gap-6 py-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-500">Tür</label>
                                    <p className="text-slate-900 dark:text-white mt-1">{typeLabels[selectedApp.type]}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-500">Kayıt No</label>
                                    <p className="text-slate-900 dark:text-white mt-1">{selectedApp.registrationNumber || '-'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <span>{selectedApp.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <span>{selectedApp.phone}</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    <span>{selectedApp.city}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-slate-400" />
                                    <span>{selectedApp.website || '-'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <span>Başvuru: {new Date(selectedApp.createdAt).toLocaleDateString('tr-TR')}</span>
                                </div>
                                <div>
                                    <Badge variant={statusConfig[selectedApp.status].variant}>
                                        {statusConfig[selectedApp.status].label}
                                    </Badge>
                                </div>
                            </div>
                            {selectedApp.description && (
                                <div className="col-span-2">
                                    <label className="text-sm font-medium text-slate-500">Açıklama</label>
                                    <p className="text-slate-900 dark:text-white mt-1">{selectedApp.description}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        {selectedApp?.status === 'PENDING' && (
                            <>
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        setShowRejectDialog(true)
                                    }}
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Reddet
                                </Button>
                                <Button
                                    variant="success"
                                    onClick={() => {
                                        setShowApproveDialog(true)
                                    }}
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
                        <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                            İptal
                        </Button>
                        <Button variant="success" onClick={handleApprove}>
                            <Check className="w-4 h-4 mr-2" />
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
                            label="Ret Gerekçesi"
                            placeholder="Reddetme nedeninizi yazın..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            İptal
                        </Button>
                        <Button variant="destructive" onClick={handleReject} disabled={!rejectReason}>
                            <X className="w-4 h-4 mr-2" />
                            Reddet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
