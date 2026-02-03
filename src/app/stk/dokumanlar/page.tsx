'use client'

import React, { useState, useEffect } from 'react'
import {
    FolderOpen,
    Upload,
    FileText,
    Globe,
    Megaphone,
    Info,
    Eye,
    Download,
    Trash2,
    Send,
    Loader2,
    Plus,
    CheckCircle2,
    Clock
} from 'lucide-react'

interface Document {
    id: string
    title: string
    description: string | null
    type: 'ANNOUNCEMENT' | 'DOCUMENT' | 'INFORMATION'
    fileUrl: string
    fileName: string
    fileSize: number
    isPublished: boolean
    publishedAt: string | null
    createdAt: string
    createdBy: { name: string }
}

const typeConfig = {
    ANNOUNCEMENT: { label: 'Duyuru', icon: Megaphone, color: 'text-blue-600 bg-blue-50' },
    DOCUMENT: { label: 'Evrak', icon: FileText, color: 'text-purple-600 bg-purple-50' },
    INFORMATION: { label: 'Bilgilendirme', icon: Info, color: 'text-green-600 bg-green-50' }
}

export default function DokumanlarPage() {
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ total: 0, published: 0, draft: 0 })
    const [showModal, setShowModal] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
    const [viewMode, setViewMode] = useState<'upload' | 'view' | null>(null)

    // Upload form
    const [uploadForm, setUploadForm] = useState({
        title: '',
        description: '',
        type: 'ANNOUNCEMENT' as 'ANNOUNCEMENT' | 'DOCUMENT' | 'INFORMATION',
        file: null as File | null
    })

    const fetchDocuments = async () => {
        try {
            const res = await fetch('/api/stk/dokumanlar')
            const data = await res.json()
            if (data.success) {
                setDocuments(data.documents)
                setStats(data.stats)
            }
        } catch (error) {
            console.error('Fetch error:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDocuments()
    }, [])

    const openUploadModal = () => {
        setUploadForm({ title: '', description: '', type: 'ANNOUNCEMENT', file: null })
        setViewMode('upload')
        setShowModal(true)
    }

    const openViewModal = (doc: Document) => {
        setSelectedDoc(doc)
        setViewMode('view')
        setShowModal(true)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.type !== 'application/pdf') {
                alert('Sadece PDF dosyası yükleyebilirsiniz')
                return
            }
            if (file.size > 10 * 1024 * 1024) {
                alert('Dosya boyutu maksimum 10MB olabilir')
                return
            }
            setUploadForm({ ...uploadForm, file })
        }
    }

    const handleUpload = async () => {
        if (!uploadForm.file || !uploadForm.title) {
            alert('Dosya ve başlık zorunludur')
            return
        }

        setProcessing(true)
        try {
            const formData = new FormData()
            formData.append('file', uploadForm.file)
            formData.append('title', uploadForm.title)
            formData.append('description', uploadForm.description)
            formData.append('type', uploadForm.type)

            const res = await fetch('/api/stk/dokumanlar', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            if (data.success) {
                setShowModal(false)
                fetchDocuments()
            } else {
                alert(data.error || 'Yükleme başarısız')
            }
        } catch (error) {
            console.error('Upload error:', error)
            alert('Bir hata oluştu')
        } finally {
            setProcessing(false)
        }
    }

    const handlePublish = async (docId: string) => {
        if (!confirm('Dokümanı yayınlamak ve tüm üyelere bildirim göndermek istiyor musunuz?')) return

        setProcessing(true)
        try {
            const res = await fetch(`/api/stk/dokumanlar/${docId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'publish' })
            })
            const data = await res.json()
            if (data.success) {
                alert(`${data.notifiedCount} üyeye bildirim gönderildi`)
                setShowModal(false)
                fetchDocuments()
            } else {
                alert(data.error || 'Yayınlama başarısız')
            }
        } catch (error) {
            console.error('Publish error:', error)
            alert('Bir hata oluştu')
        } finally {
            setProcessing(false)
        }
    }

    const handleDelete = async (docId: string) => {
        if (!confirm('Bu dokümanı silmek istediğinize emin misiniz?')) return

        try {
            const res = await fetch(`/api/stk/dokumanlar/${docId}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                setShowModal(false)
                fetchDocuments()
            } else {
                alert(data.error || 'Silme başarısız')
            }
        } catch (error) {
            console.error('Delete error:', error)
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <FolderOpen className="w-8 h-8 text-purple-600" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Dokümanlar</h1>
                        <p className="text-gray-500">PDF dosyalarını yükleyin ve üyelerinize paylaşın</p>
                    </div>
                </div>
                <button
                    onClick={openUploadModal}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                    <Upload className="w-4 h-4" />
                    PDF Yükle
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-4">
                    <div className="text-sm text-gray-500">Toplam Doküman</div>
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                </div>
                <div className="bg-green-50 rounded-xl shadow-sm border border-green-200 p-4">
                    <div className="text-sm text-green-700">Yayınlanmış</div>
                    <div className="text-2xl font-bold text-green-800">{stats.published}</div>
                </div>
                <div className="bg-gray-50 rounded-xl shadow-sm border p-4">
                    <div className="text-sm text-gray-600">Taslak</div>
                    <div className="text-2xl font-bold text-gray-800">{stats.draft}</div>
                </div>
            </div>

            {/* Info */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
                <Globe className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-purple-800">
                    <strong>Mobil Bildirim:</strong> Yayınlanan dokümanlar otomatik olarak tüm aktif üyelerin mobil uygulamasına bildirim olarak gönderilir.
                </div>
            </div>

            {/* Documents List */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                        <p className="mt-2 text-gray-500">Yükleniyor...</p>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="p-8 text-center">
                        <FileText className="w-12 h-12 mx-auto text-gray-300" />
                        <p className="mt-2 text-gray-500">Henüz doküman yok</p>
                        <button
                            onClick={openUploadModal}
                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                            <Plus className="w-4 h-4" />
                            İlk Dokümanı Yükle
                        </button>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Doküman</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tür</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Boyut</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Durum</th>
                                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {documents.map((doc) => {
                                const typeInfo = typeConfig[doc.type]
                                const TypeIcon = typeInfo.icon

                                return (
                                    <tr key={doc.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{doc.title}</div>
                                            <div className="text-sm text-gray-500">
                                                {new Date(doc.createdAt).toLocaleDateString('tr-TR')} • {doc.createdBy.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                                                <TypeIcon className="w-3.5 h-3.5" />
                                                {typeInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {formatFileSize(doc.fileSize)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {doc.isPublished ? (
                                                <span className="inline-flex items-center gap-1.5 text-green-600 text-sm">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Yayında
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-gray-500 text-sm">
                                                    <Clock className="w-4 h-4" />
                                                    Taslak
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openViewModal(doc)}
                                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                                                    title="Görüntüle"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <a
                                                    href={doc.fileUrl}
                                                    target="_blank"
                                                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                                                    title="İndir"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                                {!doc.isPublished && (
                                                    <button
                                                        onClick={() => handlePublish(doc.id)}
                                                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg"
                                                        title="Yayınla"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(doc.id)}
                                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
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
                                {viewMode === 'upload' ? 'PDF Yükle' : 'Doküman Detayı'}
                            </h2>
                        </div>

                        <div className="p-6 space-y-4">
                            {viewMode === 'upload' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Başlık *</label>
                                        <input
                                            type="text"
                                            value={uploadForm.title}
                                            onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                                            placeholder="Doküman başlığı"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tür</label>
                                        <select
                                            value={uploadForm.type}
                                            onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value as 'ANNOUNCEMENT' | 'DOCUMENT' | 'INFORMATION' })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="ANNOUNCEMENT">Duyuru</option>
                                            <option value="DOCUMENT">Evrak</option>
                                            <option value="INFORMATION">Bilgilendirme</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                                        <textarea
                                            value={uploadForm.description}
                                            onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                                            placeholder="Kısa açıklama (opsiyonel)"
                                            rows={3}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">PDF Dosyası *</label>
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={handleFileChange}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                        />
                                        {uploadForm.file && (
                                            <p className="text-sm text-gray-500 mt-1">
                                                {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : selectedDoc && (
                                <>
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Tür:</span>
                                            <span className="font-medium">{typeConfig[selectedDoc.type]?.label}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Boyut:</span>
                                            <span className="font-medium">{formatFileSize(selectedDoc.fileSize)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Durum:</span>
                                            <span className="font-medium">{selectedDoc.isPublished ? 'Yayında' : 'Taslak'}</span>
                                        </div>
                                        {selectedDoc.publishedAt && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Yayın Tarihi:</span>
                                                <span className="font-medium">
                                                    {new Date(selectedDoc.publishedAt).toLocaleString('tr-TR')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {selectedDoc.description && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                                            <p className="text-gray-800">{selectedDoc.description}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="p-6 border-t flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                {viewMode === 'upload' ? 'İptal' : 'Kapat'}
                            </button>
                            {viewMode === 'upload' && (
                                <button
                                    onClick={handleUpload}
                                    disabled={processing || !uploadForm.file || !uploadForm.title}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <Upload className="w-4 h-4" />
                                    Yükle
                                </button>
                            )}
                            {viewMode === 'view' && selectedDoc && !selectedDoc.isPublished && (
                                <button
                                    onClick={() => handlePublish(selectedDoc.id)}
                                    disabled={processing}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <Send className="w-4 h-4" />
                                    Yayınla & Bildir
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
