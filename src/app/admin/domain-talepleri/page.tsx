'use client'

import React, { useState, useEffect } from 'react'
import {
    Globe,
    Phone,
    Mail,
    Building2,
    MapPin,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    RefreshCw,
    User,
    MessageSquare
} from 'lucide-react'

interface DomainRequest {
    id: string
    domain: string
    wantsWebsite: boolean
    notes: string | null
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'
    adminNotes: string | null
    processedAt: string | null
    createdAt: string
    stk: {
        id: string
        name: string
        email: string
        phone: string
        city: string
        manager: {
            name: string
            email: string
            phone: string | null
        }
    }
}

const statusConfig = {
    PENDING: { label: 'Beklemede', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    PROCESSING: { label: 'İşlemde', color: 'bg-blue-100 text-blue-800', icon: Loader2 },
    COMPLETED: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    CANCELLED: { label: 'İptal', color: 'bg-red-100 text-red-800', icon: XCircle }
}

export default function AdminDomainTalepleriPage() {
    const [requests, setRequests] = useState<DomainRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, completed: 0, cancelled: 0 })
    const [selectedRequest, setSelectedRequest] = useState<DomainRequest | null>(null)
    const [updating, setUpdating] = useState(false)
    const [adminNotes, setAdminNotes] = useState('')
    const [filter, setFilter] = useState<string>('ALL')

    const fetchRequests = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/domain-talepleri')
            const data = await res.json()
            if (data.success) {
                setRequests(data.requests)
                setStats(data.stats)
            }
        } catch (error) {
            console.error('Fetch error:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [])

    const updateStatus = async (requestId: string, status: string) => {
        setUpdating(true)
        try {
            const res = await fetch('/api/admin/domain-talepleri', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, status, adminNotes })
            })
            const data = await res.json()
            if (data.success) {
                setSelectedRequest(null)
                setAdminNotes('')
                fetchRequests()
            } else {
                alert(data.error || 'Güncelleme başarısız')
            }
        } catch (error) {
            console.error('Update error:', error)
            alert('Bir hata oluştu')
        } finally {
            setUpdating(false)
        }
    }

    const filteredRequests = filter === 'ALL'
        ? requests
        : requests.filter(r => r.status === filter)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Globe className="w-8 h-8 text-blue-600" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Domain Talepleri</h1>
                        <p className="text-gray-500">STK'lardan gelen domain ve web sitesi talepleri</p>
                    </div>
                </div>
                <button
                    onClick={fetchRequests}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Yenile
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div
                    onClick={() => setFilter('ALL')}
                    className={`cursor-pointer p-4 rounded-xl border ${filter === 'ALL' ? 'bg-gray-100 border-gray-400' : 'bg-white'}`}
                >
                    <div className="text-sm text-gray-500">Toplam</div>
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                </div>
                <div
                    onClick={() => setFilter('PENDING')}
                    className={`cursor-pointer p-4 rounded-xl border ${filter === 'PENDING' ? 'bg-yellow-100 border-yellow-400' : 'bg-yellow-50'}`}
                >
                    <div className="text-sm text-yellow-700">Beklemede</div>
                    <div className="text-2xl font-bold text-yellow-800">{stats.pending}</div>
                </div>
                <div
                    onClick={() => setFilter('PROCESSING')}
                    className={`cursor-pointer p-4 rounded-xl border ${filter === 'PROCESSING' ? 'bg-blue-100 border-blue-400' : 'bg-blue-50'}`}
                >
                    <div className="text-sm text-blue-700">İşlemde</div>
                    <div className="text-2xl font-bold text-blue-800">{stats.processing}</div>
                </div>
                <div
                    onClick={() => setFilter('COMPLETED')}
                    className={`cursor-pointer p-4 rounded-xl border ${filter === 'COMPLETED' ? 'bg-green-100 border-green-400' : 'bg-green-50'}`}
                >
                    <div className="text-sm text-green-700">Tamamlandı</div>
                    <div className="text-2xl font-bold text-green-800">{stats.completed}</div>
                </div>
                <div
                    onClick={() => setFilter('CANCELLED')}
                    className={`cursor-pointer p-4 rounded-xl border ${filter === 'CANCELLED' ? 'bg-red-100 border-red-400' : 'bg-red-50'}`}
                >
                    <div className="text-sm text-red-700">İptal</div>
                    <div className="text-2xl font-bold text-red-800">{stats.cancelled}</div>
                </div>
            </div>

            {/* Requests List */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="p-8 text-center">
                        <Globe className="w-12 h-12 mx-auto text-gray-300" />
                        <p className="mt-2 text-gray-500">Henüz domain talebi yok</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {filteredRequests.map((req) => {
                            const status = statusConfig[req.status]
                            const StatusIcon = status.icon

                            return (
                                <div
                                    key={req.id}
                                    className="p-4 hover:bg-gray-50 cursor-pointer"
                                    onClick={() => {
                                        setSelectedRequest(req)
                                        setAdminNotes(req.adminNotes || '')
                                    }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Globe className="w-5 h-5 text-blue-600" />
                                                <span className="font-bold text-lg text-gray-900">{req.domain}</span>
                                                {req.wantsWebsite && (
                                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                                        + Web Sitesi
                                                    </span>
                                                )}
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                    {status.label}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-gray-400" />
                                                    <span className="font-medium">{req.stk.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-gray-400" />
                                                    <span>{req.stk.city}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    <span>{req.stk.manager.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-gray-400" />
                                                    <a href={`tel:${req.stk.manager.phone || req.stk.phone}`} className="text-blue-600 hover:underline">
                                                        {req.stk.manager.phone || req.stk.phone}
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="mt-2 text-xs text-gray-500">
                                                Talep: {new Date(req.createdAt).toLocaleDateString('tr-TR', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-900">Talep Detayı</h2>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Domain Info */}
                            <div className="bg-blue-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Globe className="w-5 h-5 text-blue-600" />
                                    <span className="font-bold text-blue-900">{selectedRequest.domain}</span>
                                </div>
                                <div className="text-sm text-blue-700">
                                    Web Sitesi: {selectedRequest.wantsWebsite ? 'Evet' : 'Hayır'}
                                </div>
                                {selectedRequest.notes && (
                                    <div className="mt-2 text-sm text-blue-800">
                                        <strong>STK Notu:</strong> {selectedRequest.notes}
                                    </div>
                                )}
                            </div>

                            {/* STK Info */}
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                <h4 className="font-semibold text-gray-900 mb-3">STK Bilgileri</h4>
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-gray-500" />
                                    <span className="font-medium">{selectedRequest.stk.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-gray-500" />
                                    <span>{selectedRequest.stk.city}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-500" />
                                    <a href={`mailto:${selectedRequest.stk.email}`} className="text-blue-600 hover:underline">
                                        {selectedRequest.stk.email}
                                    </a>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-500" />
                                    <a href={`tel:${selectedRequest.stk.phone}`} className="text-blue-600 hover:underline">
                                        {selectedRequest.stk.phone}
                                    </a>
                                </div>
                            </div>

                            {/* Manager Info */}
                            <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                                <h4 className="font-semibold text-purple-900 mb-3">Yetkili Bilgileri</h4>
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-purple-500" />
                                    <span className="font-medium">{selectedRequest.stk.manager.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-purple-500" />
                                    <a href={`mailto:${selectedRequest.stk.manager.email}`} className="text-purple-600 hover:underline">
                                        {selectedRequest.stk.manager.email}
                                    </a>
                                </div>
                                {selectedRequest.stk.manager.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-purple-500" />
                                        <a href={`tel:${selectedRequest.stk.manager.phone}`} className="text-purple-600 hover:underline">
                                            {selectedRequest.stk.manager.phone}
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Admin Notes */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                    <MessageSquare className="w-4 h-4" />
                                    Admin Notu
                                </label>
                                <textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="İç not ekleyin (STK görmez)"
                                    rows={3}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Status Change */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => updateStatus(selectedRequest.id, 'PENDING')}
                                    disabled={updating || selectedRequest.status === 'PENDING'}
                                    className="flex-1 px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 disabled:opacity-50"
                                >
                                    Beklemede
                                </button>
                                <button
                                    onClick={() => updateStatus(selectedRequest.id, 'PROCESSING')}
                                    disabled={updating || selectedRequest.status === 'PROCESSING'}
                                    className="flex-1 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 disabled:opacity-50"
                                >
                                    İşlemde
                                </button>
                                <button
                                    onClick={() => updateStatus(selectedRequest.id, 'COMPLETED')}
                                    disabled={updating || selectedRequest.status === 'COMPLETED'}
                                    className="flex-1 px-3 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 disabled:opacity-50"
                                >
                                    Tamamlandı
                                </button>
                                <button
                                    onClick={() => updateStatus(selectedRequest.id, 'CANCELLED')}
                                    disabled={updating || selectedRequest.status === 'CANCELLED'}
                                    className="flex-1 px-3 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 disabled:opacity-50"
                                >
                                    İptal
                                </button>
                            </div>
                        </div>

                        <div className="p-6 border-t flex justify-end">
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
