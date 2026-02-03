'use client'

import React, { useState, useEffect } from 'react'
import {
    Globe,
    Search,
    Plus,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    AlertCircle,
    ExternalLink
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
}

const statusConfig = {
    PENDING: { label: 'Beklemede', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    PROCESSING: { label: 'İşlemde', color: 'bg-blue-100 text-blue-800', icon: Loader2 },
    COMPLETED: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    CANCELLED: { label: 'İptal', color: 'bg-red-100 text-red-800', icon: XCircle }
}

export default function DomainTalebiPage() {
    const [requests, setRequests] = useState<DomainRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [noPackage, setNoPackage] = useState(false)

    // Form
    const [form, setForm] = useState({
        domain: '',
        wantsWebsite: true,
        notes: ''
    })

    // Domain sorgulama
    const [domainCheck, setDomainCheck] = useState<{
        checking: boolean
        available: boolean | null
        domain: string
    }>({ checking: false, available: null, domain: '' })

    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/stk/domain-talebi')
            const data = await res.json()
            if (data.success) {
                setRequests(data.requests)
            } else if (data.code === 'NO_PACKAGE') {
                setNoPackage(true)
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

    const checkDomain = async () => {
        if (!form.domain) return

        setDomainCheck({ checking: true, available: null, domain: form.domain })

        // Simülasyon - gerçek API entegrasyonu daha sonra eklenebilir
        setTimeout(() => {
            // Rastgele sonuç (gerçek implementasyonda API çağrısı yapılacak)
            const isAvailable = Math.random() > 0.3
            setDomainCheck({ checking: false, available: isAvailable, domain: form.domain })
        }, 1000)
    }

    const handleSubmit = async () => {
        if (!form.domain) {
            setError('Domain alanı zorunludur')
            return
        }

        setProcessing(true)
        setError(null)

        try {
            const res = await fetch('/api/stk/domain-talebi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            const data = await res.json()
            if (data.success) {
                setShowModal(false)
                setForm({ domain: '', wantsWebsite: true, notes: '' })
                fetchRequests()
            } else {
                setError(data.error || 'Talep oluşturulamadı')
            }
        } catch (error) {
            console.error('Submit error:', error)
            setError('Bir hata oluştu')
        } finally {
            setProcessing(false)
        }
    }

    const hasPendingRequest = requests.some(r => r.status === 'PENDING' || r.status === 'PROCESSING')

    if (noPackage) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Üyelik Gerekli</h2>
                    <p className="text-gray-600 mb-4">
                        Domain ve web sitesi talebi oluşturabilmek için aktif bir üyelik paketiniz olması gerekmektedir.
                    </p>
                    <a
                        href="/fiyatlandirma"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                        Paketleri İncele
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Globe className="w-8 h-8 text-blue-600" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Domain & Web Sitesi</h1>
                        <p className="text-gray-500">Derneğiniz için domain ve web sitesi talep edin</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    disabled={hasPendingRequest}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus className="w-4 h-4" />
                    Yeni Talep
                </button>
            </div>

            {hasPendingRequest && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                        <strong>Bekleyen Talep:</strong> Zaten işlemde olan bir talebiniz bulunmaktadır.
                        Yeni talep oluşturabilmek için mevcut talebin tamamlanmasını bekleyin.
                    </div>
                </div>
            )}

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Nasıl Çalışır?</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>İstediğiniz domain adını girin ve müsaitliğini sorgulayın</li>
                    <li>Web sitesi isteyip istemediğinizi belirtin</li>
                    <li>Talebiniz admin ekibimize iletilir</li>
                    <li>İşlem tamamlandığında size bildirilir</li>
                </ol>
            </div>

            {/* Requests List */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Talepleriniz</h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="p-8 text-center">
                        <Globe className="w-12 h-12 mx-auto text-gray-300" />
                        <p className="mt-2 text-gray-500">Henüz domain talebi yok</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {requests.map((req) => {
                            const status = statusConfig[req.status]
                            const StatusIcon = status.icon

                            return (
                                <div key={req.id} className="p-4 hover:bg-gray-50">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <Globe className="w-5 h-5 text-gray-400" />
                                            <span className="font-semibold text-gray-900">{req.domain}</span>
                                            {req.wantsWebsite && (
                                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                                    + Web Sitesi
                                                </span>
                                            )}
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                            <StatusIcon className="w-3.5 h-3.5" />
                                            {status.label}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Talep: {new Date(req.createdAt).toLocaleDateString('tr-TR')}
                                        {req.processedAt && ` • İşlem: ${new Date(req.processedAt).toLocaleDateString('tr-TR')}`}
                                    </div>
                                    {req.adminNotes && (
                                        <div className="mt-2 text-sm bg-gray-50 p-2 rounded text-gray-700">
                                            <strong>Admin Notu:</strong> {req.adminNotes}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-900">Domain Talep Et</h2>
                        </div>

                        <div className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Domain *</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={form.domain}
                                        onChange={(e) => setForm({ ...form, domain: e.target.value.toLowerCase() })}
                                        placeholder="ornekdernek.org.tr"
                                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={checkDomain}
                                        disabled={!form.domain || domainCheck.checking}
                                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                                    >
                                        {domainCheck.checking ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Search className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                {domainCheck.domain === form.domain && domainCheck.available !== null && (
                                    <p className={`text-sm mt-1 ${domainCheck.available ? 'text-green-600' : 'text-red-600'}`}>
                                        {domainCheck.available ? '✓ Bu domain müsait görünüyor' : '✗ Bu domain dolu olabilir'}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={form.wantsWebsite}
                                        onChange={(e) => setForm({ ...form, wantsWebsite: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <span className="text-sm text-gray-700">Web sitesi de istiyorum</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notunuz</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    placeholder="Ek bilgi veya istekleriniz (opsiyonel)"
                                    rows={3}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={processing || !form.domain}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                                Talep Gönder
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
