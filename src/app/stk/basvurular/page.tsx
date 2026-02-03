'use client'

import React, { useState, useEffect } from 'react'
import {
    UserPlus,
    Search,
    Filter,
    Check,
    X,
    Eye,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2
} from 'lucide-react'

interface Member {
    id: string
    name: string
    surname: string
    email: string
    phone: string
    tcNumber: string
    memberNumber: string
}

interface Application {
    id: string
    applicationDate: string
    status: string
    boardDecisionNumber: string | null
    boardDecisionDate: string | null
    rejectionReason: string | null
    reviewNotes: string | null
    member: Member
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    APPLIED: { label: 'Beklemede', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    ACTIVE: { label: 'Onaylandı', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    REJECTED: { label: 'Reddedildi', color: 'bg-red-100 text-red-800', icon: XCircle },
}

export default function BasvurularPage() {
    const [applications, setApplications] = useState<Application[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedApp, setSelectedApp] = useState<Application | null>(null)
    const [showModal, setShowModal] = useState(false)
    const [actionType, setActionType] = useState<'approve' | 'reject' | 'view' | null>(null)
    const [processing, setProcessing] = useState(false)

    // Form state
    const [decisionNumber, setDecisionNumber] = useState('')
    const [decisionDate, setDecisionDate] = useState('')
    const [rejectionReason, setRejectionReason] = useState('')
    const [reviewNotes, setReviewNotes] = useState('')

    const fetchApplications = async () => {
        try {
            const params = new URLSearchParams()
            if (statusFilter !== 'all') params.append('status', statusFilter)

            const res = await fetch(`/api/stk/applications?${params}`)
            const data = await res.json()

            if (data.success) {
                setApplications(data.applications)
            }
        } catch (error) {
            console.error('Fetch error:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchApplications()
    }, [statusFilter])

    const openModal = (app: Application, type: 'approve' | 'reject' | 'view') => {
        setSelectedApp(app)
        setActionType(type)
        setShowModal(true)
        setDecisionNumber('')
        setDecisionDate('')
        setRejectionReason('')
        setReviewNotes('')
    }

    const handleAction = async () => {
        if (!selectedApp || !actionType) return

        if (actionType === 'view') {
            setShowModal(false)
            return
        }

        if (actionType === 'approve' && (!decisionNumber || !decisionDate)) {
            alert('Onay için YK karar numarası ve tarihi zorunludur')
            return
        }

        if (actionType === 'reject' && !rejectionReason) {
            alert('Red için gerekçe zorunludur')
            return
        }

        setProcessing(true)
        try {
            const res = await fetch(`/api/stk/applications/${selectedApp.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: actionType,
                    boardDecisionNumber: decisionNumber,
                    boardDecisionDate: decisionDate,
                    rejectionReason,
                    reviewNotes
                })
            })

            const data = await res.json()
            if (data.success) {
                setShowModal(false)
                fetchApplications()
            } else {
                alert(data.error || 'İşlem başarısız')
            }
        } catch (error) {
            console.error('Action error:', error)
            alert('Bir hata oluştu')
        } finally {
            setProcessing(false)
        }
    }

    const filteredApps = applications.filter(app => {
        const searchLower = searchTerm.toLowerCase()
        return (
            app.member.name.toLowerCase().includes(searchLower) ||
            app.member.surname.toLowerCase().includes(searchLower) ||
            app.member.email.toLowerCase().includes(searchLower) ||
            app.member.tcNumber.includes(searchTerm)
        )
    })

    const stats = {
        total: applications.length,
        pending: applications.filter(a => a.status === 'APPLIED').length,
        approved: applications.filter(a => a.status === 'ACTIVE').length,
        rejected: applications.filter(a => a.status === 'REJECTED').length,
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <UserPlus className="w-8 h-8 text-blue-600" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Üyelik Başvuruları</h1>
                        <p className="text-gray-500">Gelen başvuruları inceleyin ve yönetim kurulu kararı ile onaylayın</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-4">
                    <div className="text-sm text-gray-500">Toplam Başvuru</div>
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                </div>
                <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 p-4">
                    <div className="text-sm text-yellow-700">Beklemede</div>
                    <div className="text-2xl font-bold text-yellow-800">{stats.pending}</div>
                </div>
                <div className="bg-green-50 rounded-xl shadow-sm border border-green-200 p-4">
                    <div className="text-sm text-green-700">Onaylandı</div>
                    <div className="text-2xl font-bold text-green-800">{stats.approved}</div>
                </div>
                <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-4">
                    <div className="text-sm text-red-700">Reddedildi</div>
                    <div className="text-2xl font-bold text-red-800">{stats.rejected}</div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                    <strong>Önemli:</strong> Üyelik başvuruları yalnızca yönetim kurulu kararı ile onaylanabilir.
                    Onay sırasında karar numarası ve tarihi zorunludur.
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Ad, soyad, e-posta veya TC ile ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Tüm Durumlar</option>
                            <option value="APPLIED">Beklemede</option>
                            <option value="ACTIVE">Onaylandı</option>
                            <option value="REJECTED">Reddedildi</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                        <p className="mt-2 text-gray-500">Yükleniyor...</p>
                    </div>
                ) : filteredApps.length === 0 ? (
                    <div className="p-8 text-center">
                        <UserPlus className="w-12 h-12 mx-auto text-gray-300" />
                        <p className="mt-2 text-gray-500">Henüz başvuru bulunmuyor</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Başvuran</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">İletişim</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">TC Kimlik</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Başvuru Tarihi</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Durum</th>
                                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredApps.map((app) => {
                                const status = statusConfig[app.status] || statusConfig.APPLIED
                                const StatusIcon = status.icon

                                return (
                                    <tr key={app.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">
                                                {app.member.name} {app.member.surname}
                                            </div>
                                            <div className="text-sm text-gray-500">{app.member.memberNumber}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900">{app.member.email}</div>
                                            <div className="text-sm text-gray-500">{app.member.phone}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {app.member.tcNumber}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {new Date(app.applicationDate).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                <StatusIcon className="w-3.5 h-3.5" />
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openModal(app, 'view')}
                                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                                                    title="Detay"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {app.status === 'APPLIED' && (
                                                    <>
                                                        <button
                                                            onClick={() => openModal(app, 'approve')}
                                                            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg"
                                                            title="Onayla"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => openModal(app, 'reject')}
                                                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                                            title="Reddet"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {showModal && selectedApp && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-900">
                                {actionType === 'view' && 'Başvuru Detayı'}
                                {actionType === 'approve' && 'Başvuruyu Onayla'}
                                {actionType === 'reject' && 'Başvuruyu Reddet'}
                            </h2>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Member Info */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="font-medium text-gray-900 mb-2">Başvuran Bilgileri</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><span className="text-gray-500">Ad Soyad:</span></div>
                                    <div className="font-medium">{selectedApp.member.name} {selectedApp.member.surname}</div>
                                    <div><span className="text-gray-500">TC Kimlik:</span></div>
                                    <div className="font-medium">{selectedApp.member.tcNumber}</div>
                                    <div><span className="text-gray-500">E-posta:</span></div>
                                    <div className="font-medium">{selectedApp.member.email}</div>
                                    <div><span className="text-gray-500">Telefon:</span></div>
                                    <div className="font-medium">{selectedApp.member.phone}</div>
                                    <div><span className="text-gray-500">Başvuru Tarihi:</span></div>
                                    <div className="font-medium">{new Date(selectedApp.applicationDate).toLocaleDateString('tr-TR')}</div>
                                </div>
                            </div>

                            {actionType === 'approve' && (
                                <>
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                                        <strong>Uyarı:</strong> Üyelik onayı için yönetim kurulu kararı zorunludur.
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            YK Karar Numarası *
                                        </label>
                                        <input
                                            type="text"
                                            value={decisionNumber}
                                            onChange={(e) => setDecisionNumber(e.target.value)}
                                            placeholder="Örn: 2026/001"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            YK Karar Tarihi *
                                        </label>
                                        <input
                                            type="date"
                                            value={decisionDate}
                                            onChange={(e) => setDecisionDate(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </>
                            )}

                            {actionType === 'reject' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Red Gerekçesi *
                                    </label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Red gerekçesini yazın..."
                                        rows={3}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}

                            {(actionType === 'approve' || actionType === 'reject') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notlar (Opsiyonel)
                                    </label>
                                    <textarea
                                        value={reviewNotes}
                                        onChange={(e) => setReviewNotes(e.target.value)}
                                        placeholder="Ek notlar..."
                                        rows={2}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}

                            {actionType === 'view' && selectedApp.status !== 'APPLIED' && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h3 className="font-medium text-gray-900 mb-2">Değerlendirme Sonucu</h3>
                                    <div className="text-sm space-y-1">
                                        {selectedApp.boardDecisionNumber && (
                                            <p><span className="text-gray-500">Karar No:</span> {selectedApp.boardDecisionNumber}</p>
                                        )}
                                        {selectedApp.boardDecisionDate && (
                                            <p><span className="text-gray-500">Karar Tarihi:</span> {new Date(selectedApp.boardDecisionDate).toLocaleDateString('tr-TR')}</p>
                                        )}
                                        {selectedApp.rejectionReason && (
                                            <p><span className="text-gray-500">Red Gerekçesi:</span> {selectedApp.rejectionReason}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                {actionType === 'view' ? 'Kapat' : 'İptal'}
                            </button>
                            {actionType !== 'view' && (
                                <button
                                    onClick={handleAction}
                                    disabled={processing}
                                    className={`px-4 py-2 rounded-lg text-white flex items-center gap-2 ${actionType === 'approve'
                                            ? 'bg-green-600 hover:bg-green-700'
                                            : 'bg-red-600 hover:bg-red-700'
                                        } disabled:opacity-50`}
                                >
                                    {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {actionType === 'approve' ? 'Onayla' : 'Reddet'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
