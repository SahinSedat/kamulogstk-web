'use client'

import React, { useState, useEffect } from 'react'
import {
    MessageSquare,
    Send,
    Plus,
    Clock,
    CheckCircle2,
    XCircle,
    FileText,
    Smartphone,
    Mail,
    Users,
    Loader2,
    Eye,
    Trash2
} from 'lucide-react'

interface Campaign {
    id: string
    title: string
    messageType: 'SMS' | 'PUSH' | 'EMAIL'
    subject: string | null
    content: string
    targetAudience: string
    status: string
    recipientCount: number
    deliveredCount: number
    sentAt: string | null
    createdAt: string
    createdBy: { name: string }
    _count: { recipients: number }
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    DRAFT: { label: 'Taslak', color: 'bg-gray-100 text-gray-800', icon: FileText },
    SCHEDULED: { label: 'Zamanlanmış', color: 'bg-blue-100 text-blue-800', icon: Clock },
    SENDING: { label: 'Gönderiliyor', color: 'bg-yellow-100 text-yellow-800', icon: Loader2 },
    SENT: { label: 'Gönderildi', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    FAILED: { label: 'Başarısız', color: 'bg-red-100 text-red-800', icon: XCircle },
}

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    SMS: { label: 'SMS', icon: Smartphone, color: 'text-blue-600' },
    PUSH: { label: 'Push', icon: MessageSquare, color: 'text-purple-600' },
    EMAIL: { label: 'E-posta', icon: Mail, color: 'text-green-600' },
}

const audienceLabels: Record<string, string> = {
    ALL_ACTIVE: 'Tüm Aktif Üyeler',
    DUES_PAID: 'Aidatı Ödenmiş',
    DUES_UNPAID: 'Aidatı Ödenmemiş',
    CUSTOM: 'Özel Seçim',
}

export default function MesajlarPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ total: 0, draft: 0, sent: 0, pending: 0 })
    const [showModal, setShowModal] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
    const [viewMode, setViewMode] = useState<'create' | 'view' | null>(null)

    // Form state
    const [newCampaign, setNewCampaign] = useState({
        title: '',
        messageType: 'PUSH' as 'SMS' | 'PUSH' | 'EMAIL',
        subject: '',
        content: '',
        targetAudience: 'ALL_ACTIVE'
    })

    const fetchCampaigns = async () => {
        try {
            const res = await fetch('/api/stk/messages')
            const data = await res.json()
            if (data.success) {
                setCampaigns(data.campaigns)
                setStats(data.stats)
            }
        } catch (error) {
            console.error('Fetch error:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCampaigns()
    }, [])

    const openCreateModal = () => {
        setNewCampaign({
            title: '',
            messageType: 'PUSH',
            subject: '',
            content: '',
            targetAudience: 'ALL_ACTIVE'
        })
        setViewMode('create')
        setShowModal(true)
    }

    const openViewModal = (campaign: Campaign) => {
        setSelectedCampaign(campaign)
        setViewMode('view')
        setShowModal(true)
    }

    const handleCreate = async () => {
        if (!newCampaign.title || !newCampaign.content) {
            alert('Başlık ve içerik zorunludur')
            return
        }

        setProcessing(true)
        try {
            const res = await fetch('/api/stk/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newCampaign)
            })
            const data = await res.json()
            if (data.success) {
                setShowModal(false)
                fetchCampaigns()
            } else {
                alert(data.error || 'Mesaj oluşturulamadı')
            }
        } catch (error) {
            console.error('Create error:', error)
            alert('Bir hata oluştu')
        } finally {
            setProcessing(false)
        }
    }

    const handleSend = async (campaignId: string) => {
        if (!confirm('Mesajı göndermek istediğinize emin misiniz?')) return

        setProcessing(true)
        try {
            const res = await fetch(`/api/stk/messages/${campaignId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send' })
            })
            const data = await res.json()
            if (data.success) {
                setShowModal(false)
                fetchCampaigns()
            } else {
                alert(data.error || 'Mesaj gönderilemedi')
            }
        } catch (error) {
            console.error('Send error:', error)
            alert('Bir hata oluştu')
        } finally {
            setProcessing(false)
        }
    }

    const handleDelete = async (campaignId: string) => {
        if (!confirm('Bu taslağı silmek istediğinize emin misiniz?')) return

        try {
            const res = await fetch(`/api/stk/messages/${campaignId}`, {
                method: 'DELETE'
            })
            const data = await res.json()
            if (data.success) {
                fetchCampaigns()
            } else {
                alert(data.error || 'Silinemedi')
            }
        } catch (error) {
            console.error('Delete error:', error)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <MessageSquare className="w-8 h-8 text-purple-600" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Mesaj & Bildirim</h1>
                        <p className="text-gray-500">Üyelerinize toplu mesaj ve bildirim gönderin</p>
                    </div>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                    <Plus className="w-4 h-4" />
                    Yeni Mesaj
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-4">
                    <div className="text-sm text-gray-500">Toplam Kampanya</div>
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                </div>
                <div className="bg-gray-50 rounded-xl shadow-sm border p-4">
                    <div className="text-sm text-gray-600">Taslak</div>
                    <div className="text-2xl font-bold text-gray-800">{stats.draft}</div>
                </div>
                <div className="bg-green-50 rounded-xl shadow-sm border border-green-200 p-4">
                    <div className="text-sm text-green-700">Gönderildi</div>
                    <div className="text-2xl font-bold text-green-800">{stats.sent}</div>
                </div>
                <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-200 p-4">
                    <div className="text-sm text-blue-700">Zamanlanmış</div>
                    <div className="text-2xl font-bold text-blue-800">{stats.pending}</div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-purple-800">
                    <strong>Bilgi:</strong> Push bildirimleri üyelerinizin mobil uygulamalarına anında iletilir.
                    SMS gönderimi için API entegrasyonu gereklidir.
                </div>
            </div>

            {/* Campaigns List */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                        <p className="mt-2 text-gray-500">Yükleniyor...</p>
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className="p-8 text-center">
                        <MessageSquare className="w-12 h-12 mx-auto text-gray-300" />
                        <p className="mt-2 text-gray-500">Henüz mesaj kampanyası yok</p>
                        <button
                            onClick={openCreateModal}
                            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                            İlk Mesajı Oluştur
                        </button>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Kampanya</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tür</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Hedef</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Alıcı</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Durum</th>
                                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {campaigns.map((campaign) => {
                                const status = statusConfig[campaign.status] || statusConfig.DRAFT
                                const StatusIcon = status.icon
                                const type = typeConfig[campaign.messageType]
                                const TypeIcon = type.icon

                                return (
                                    <tr key={campaign.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{campaign.title}</div>
                                            <div className="text-sm text-gray-500">
                                                {new Date(campaign.createdAt).toLocaleDateString('tr-TR')}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className={`flex items-center gap-1.5 ${type.color}`}>
                                                <TypeIcon className="w-4 h-4" />
                                                <span className="text-sm font-medium">{type.label}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {audienceLabels[campaign.targetAudience]}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                <Users className="w-4 h-4" />
                                                {campaign.recipientCount}
                                            </div>
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
                                                    onClick={() => openViewModal(campaign)}
                                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                                                    title="Görüntüle"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {campaign.status === 'DRAFT' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleSend(campaign.id)}
                                                            className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg"
                                                            title="Gönder"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(campaign.id)}
                                                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                                            title="Sil"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
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
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-900">
                                {viewMode === 'create' ? 'Yeni Mesaj Oluştur' : 'Mesaj Detayı'}
                            </h2>
                        </div>

                        <div className="p-6 space-y-4">
                            {viewMode === 'create' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Kampanya Adı *
                                        </label>
                                        <input
                                            type="text"
                                            value={newCampaign.title}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                                            placeholder="Örn: Ocak Ayı Duyurusu"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Mesaj Türü *
                                        </label>
                                        <select
                                            value={newCampaign.messageType}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, messageType: e.target.value as 'SMS' | 'PUSH' | 'EMAIL' })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="PUSH">Push Bildirim</option>
                                            <option value="SMS">SMS (API gerekli)</option>
                                            <option value="EMAIL">E-posta (API gerekli)</option>
                                        </select>
                                    </div>
                                    {(newCampaign.messageType === 'PUSH' || newCampaign.messageType === 'EMAIL') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Başlık
                                            </label>
                                            <input
                                                type="text"
                                                value={newCampaign.subject}
                                                onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                                                placeholder="Bildirim başlığı"
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Hedef Kitle
                                        </label>
                                        <select
                                            value={newCampaign.targetAudience}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, targetAudience: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="ALL_ACTIVE">Tüm Aktif Üyeler</option>
                                            <option value="DUES_PAID">Aidatı Ödenmiş</option>
                                            <option value="DUES_UNPAID">Aidatı Ödenmemiş</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Mesaj İçeriği *
                                        </label>
                                        <textarea
                                            value={newCampaign.content}
                                            onChange={(e) => setNewCampaign({ ...newCampaign, content: e.target.value })}
                                            placeholder="Mesaj içeriğini yazın..."
                                            rows={4}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                        />
                                        {newCampaign.messageType === 'SMS' && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {newCampaign.content.length}/160 karakter
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : selectedCampaign && (
                                <>
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Tür:</span>
                                            <span className="font-medium">{typeConfig[selectedCampaign.messageType]?.label}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Hedef:</span>
                                            <span className="font-medium">{audienceLabels[selectedCampaign.targetAudience]}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Alıcı Sayısı:</span>
                                            <span className="font-medium">{selectedCampaign.recipientCount}</span>
                                        </div>
                                        {selectedCampaign.sentAt && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Gönderim:</span>
                                                <span className="font-medium">
                                                    {new Date(selectedCampaign.sentAt).toLocaleString('tr-TR')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {selectedCampaign.subject && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                                            <p className="text-gray-900">{selectedCampaign.subject}</p>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">İçerik</label>
                                        <div className="bg-gray-50 rounded-lg p-3 text-gray-800">
                                            {selectedCampaign.content}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="p-6 border-t flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                {viewMode === 'create' ? 'İptal' : 'Kapat'}
                            </button>
                            {viewMode === 'create' && (
                                <button
                                    onClick={handleCreate}
                                    disabled={processing}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Taslak Olarak Kaydet
                                </button>
                            )}
                            {viewMode === 'view' && selectedCampaign?.status === 'DRAFT' && (
                                <button
                                    onClick={() => handleSend(selectedCampaign.id)}
                                    disabled={processing}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <Send className="w-4 h-4" />
                                    Şimdi Gönder
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
