'use client'

import React, { useState, useEffect } from 'react'
import {
    UserPlus, Search, Filter, Eye, Clock, CheckCircle2, XCircle,
    AlertCircle, Loader2, Download, PenTool, FileText, X, Check
} from 'lucide-react'

// ==========================================
// TYPES
// ==========================================
interface Member {
    id: string; name: string; surname: string; email: string;
    phone: string; tcKimlik: string; memberNumber: string;
}

interface Application {
    id: string; applicationDate: string; status: string;
    boardDecisionNumber: string | null; boardDecisionDate: string | null;
    rejectionReason: string | null; reviewNotes: string | null;
    member: Member; isHistory?: boolean;
}

interface LegacyApp {
    id: string; name: string; tcKimlik: string; phone: string;
    email: string; status: string; createdAt: string;
    consentGiven: boolean | null; signatureType: string | null;
    signatureUrl: string | null; documentUrl: string | null;
    membershipStatus: string | null; approvedAt: string | null;
}

type UnifiedApp = {
    id: string; name: string; surname: string; email: string;
    phone: string; tcKimlik: string; status: string; date: string;
    source: 'NEW' | 'LEGACY';
    boardDecisionNumber?: string | null; boardDecisionDate?: string | null;
    rejectionReason?: string | null; reviewNotes?: string | null;
    memberNumber?: string;
    consentGiven?: boolean | null; signatureType?: string | null;
    signatureUrl?: string | null; documentUrl?: string | null;
    membershipStatus?: string | null; approvedAt?: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    APPLIED: { label: 'Başvuru Yapıldı', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    PENDING: { label: 'Beklemede', color: 'bg-blue-100 text-blue-800', icon: Clock },
    ACTIVE: { label: 'Kabul Edildi', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    APPROVED: { label: 'Onaylandı', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    REJECTED: { label: 'Reddedildi', color: 'bg-red-100 text-red-800', icon: XCircle },
    RESIGNED: { label: 'İstifa', color: 'bg-gray-100 text-gray-800', icon: XCircle },
    RESIGN_PENDING: { label: 'İstifa Bekliyor', color: 'bg-purple-100 text-purple-800', icon: Clock },
}

// ==========================================
// DETAIL MODAL (İmza + Belgeler)
// ==========================================
function DetailModal({ app, onClose, onAction }: {
    app: UnifiedApp; onClose: () => void;
    onAction: (id: string, status: string, source: string) => void;
}) {
    const [processing, setProcessing] = useState(false)

    const handleAction = async (status: string) => {
        setProcessing(true)
        await onAction(app.id, status, app.source)
        setProcessing(false)
    }

    const getImgSrc = (url: string) => {
        if (url.startsWith('data:') || url.startsWith('/') || url.startsWith('http')) return url
        return `data:image/png;base64,${url}`
    }

    const isPending = app.status === 'PENDING' || app.status === 'APPLIED'

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Başvuru Detayı</h2>
                            <p className="text-xs text-gray-500">{app.source === 'LEGACY' ? 'Mobil Uygulama Başvurusu' : 'Yeni Panel Başvurusu'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Kişi Bilgileri */}
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                        <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-3">👤 Başvuran Bilgileri</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><p className="text-xs text-gray-400">Ad Soyad</p><p className="font-semibold text-gray-900 dark:text-white">{app.name} {app.surname}</p></div>
                            <div><p className="text-xs text-gray-400">TC Kimlik</p><p className="font-semibold text-gray-900 dark:text-white">{app.tcKimlik}</p></div>
                            <div><p className="text-xs text-gray-400">E-posta</p><p className="font-semibold text-gray-900 dark:text-white">{app.email}</p></div>
                            <div><p className="text-xs text-gray-400">Telefon</p><p className="font-semibold text-gray-900 dark:text-white">{app.phone}</p></div>
                            <div><p className="text-xs text-gray-400">Başvuru Tarihi</p><p className="font-semibold text-gray-900 dark:text-white">{new Date(app.date).toLocaleDateString('tr-TR')}</p></div>
                            <div><p className="text-xs text-gray-400">Kaynak</p><p className="font-semibold text-gray-900 dark:text-white">{app.source === 'LEGACY' ? '📱 Mobil Uygulama' : '🌐 Web Panel'}</p></div>
                        </div>
                    </div>

                    {/* Onam Durumu (sadece legacy) */}
                    {app.source === 'LEGACY' && (
                        <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-4">
                            <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">⚖️ Onam & Sözleşme</h3>
                            <div className="flex items-center gap-2">
                                {app.consentGiven ? (
                                    <><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-sm text-green-700 font-medium">Onam verildi ✅</span></>
                                ) : (
                                    <><XCircle className="w-4 h-4 text-red-500" /><span className="text-sm text-red-600 font-medium">Onam verilmedi</span></>
                                )}
                            </div>
                        </div>
                    )}

                    {/* İmza (sadece legacy) */}
                    {app.source === 'LEGACY' && (
                        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4">
                            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">✍️ İmza</h3>
                            {app.signatureType ? (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <PenTool className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                            {app.signatureType === 'DRAWN' ? 'Ekrana Çizilmiş İmza' : 'Yüklenen Belge (Tarama)'}
                                        </span>
                                    </div>
                                    {app.signatureUrl && (
                                        <div className="mt-3">
                                            <div className="border-2 border-blue-200 rounded-xl overflow-hidden bg-white p-2">
                                                <img src={getImgSrc(app.signatureUrl)} alt="İmza" className="max-h-48 mx-auto object-contain" />
                                            </div>
                                            <a href={getImgSrc(app.signatureUrl)} download={`imza_${app.name.replace(/\s+/g, '_')}.png`}
                                                className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                                                <Download className="w-4 h-4" /> İmzayı İndir
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 mt-1">İmza bilgisi bulunmuyor</p>
                            )}
                        </div>
                    )}

                    {/* Yüklenen Belge (sadece legacy) */}
                    {app.source === 'LEGACY' && app.documentUrl && (
                        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4">
                            <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">📂 Yüklenen Belge</h3>
                            <div className="border-2 border-amber-200 rounded-xl overflow-hidden bg-white p-2">
                                <img src={getImgSrc(app.documentUrl)} alt="Belge" className="max-h-60 mx-auto object-contain" />
                            </div>
                            <a href={getImgSrc(app.documentUrl)} download={`belge_${app.name.replace(/\s+/g, '_')}.png`} target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition">
                                <Download className="w-4 h-4" /> Belgeyi İndir
                            </a>
                        </div>
                    )}

                    {/* Üyelik Durumu */}
                    {app.membershipStatus && (
                        <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-4">
                            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">🎫 Üyelik Durumu</h3>
                            <p className="text-sm font-semibold">{
                                app.membershipStatus === 'ACTIVE' ? <span className="text-green-600">✅ Aktif</span> :
                                app.membershipStatus === 'SUSPENDED' ? <span className="text-amber-600">⏸️ Askıda</span> :
                                <span className="text-gray-500">⏳ Beklemede</span>
                            }</p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-5 border-t border-gray-100 dark:border-slate-700 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Kapat</button>
                    {isPending && (
                        <>
                            <button onClick={() => handleAction('REJECTED')} disabled={processing}
                                className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                                {processing && <Loader2 className="w-4 h-4 animate-spin" />} <XCircle className="w-4 h-4" /> Reddet
                            </button>
                            <button onClick={() => handleAction('APPROVED')} disabled={processing}
                                className="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                                {processing && <Loader2 className="w-4 h-4 animate-spin" />} <Check className="w-4 h-4" /> Onayla
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

// ==========================================
// MAIN PAGE
// ==========================================
export default function BasvurularPage() {
    const [unified, setUnified] = useState<UnifiedApp[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [sourceFilter, setSourceFilter] = useState('all')
    const [selectedApp, setSelectedApp] = useState<UnifiedApp | null>(null)
    const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [newRes, legacyRes] = await Promise.all([
                fetch('/api/stk/applications'),
                fetch('/api/stk/stk-applications'),
            ])
            const [newData, legacyData] = await Promise.all([newRes.json(), legacyRes.json()])

            const items: UnifiedApp[] = []

            // Yeni panel başvuruları
            if (newData.success && newData.applications) {
                for (const a of newData.applications) {
                    items.push({
                        id: a.id, name: a.member?.name || '', surname: a.member?.surname || '',
                        email: a.member?.email || '', phone: a.member?.phone || '',
                        tcKimlik: a.member?.tcKimlik || '', status: a.status,
                        date: a.applicationDate || a.createdAt, source: 'NEW',
                        boardDecisionNumber: a.boardDecisionNumber, boardDecisionDate: a.boardDecisionDate,
                        rejectionReason: a.rejectionReason, reviewNotes: a.reviewNotes,
                        memberNumber: a.member?.memberNumber,
                    })
                }
            }

            // Admin panel başvuruları (legacy)
            if (legacyData.success && legacyData.applications) {
                for (const a of legacyData.applications) {
                    items.push({
                        id: a.id, name: a.name, surname: '',
                        email: a.email, phone: a.phone,
                        tcKimlik: a.tcKimlik, status: a.status,
                        date: a.createdAt, source: 'LEGACY',
                        consentGiven: a.consentGiven, signatureType: a.signatureType,
                        signatureUrl: a.signatureUrl, documentUrl: a.documentUrl,
                        membershipStatus: a.membershipStatus, approvedAt: a.approvedAt,
                    })
                }
            }

            // Sırala (en yeni en üstte)
            items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            setUnified(items)

            // İstatistikler
            setStats({
                total: items.length,
                pending: items.filter(a => a.status === 'PENDING' || a.status === 'APPLIED').length,
                approved: items.filter(a => a.status === 'APPROVED' || a.status === 'ACTIVE').length,
                rejected: items.filter(a => a.status === 'REJECTED').length,
            })
        } catch (err) {
            console.error('Fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAll() }, [])

    const handleAction = async (id: string, status: string, source: string) => {
        try {
            if (source === 'LEGACY') {
                const res = await fetch('/api/stk/stk-applications', {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ applicationId: id, status }),
                })
                const data = await res.json()
                if (!data.success) { alert(data.error || 'Hata'); return }
            } else {
                const res = await fetch(`/api/stk/applications/${id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: status === 'APPROVED' ? 'approve' : 'reject', boardDecisionNumber: 'PANEL-' + Date.now(), boardDecisionDate: new Date().toISOString().split('T')[0] }),
                })
                const data = await res.json()
                if (!data.success) { alert(data.error || 'Hata'); return }
            }
            setSelectedApp(null)
            fetchAll()
        } catch { alert('Sunucu hatası') }
    }

    const filtered = unified.filter(a => {
        const s = searchTerm.toLowerCase()
        const matchSearch = !s || a.name.toLowerCase().includes(s) || a.surname.toLowerCase().includes(s) || a.email.toLowerCase().includes(s) || a.tcKimlik.includes(searchTerm)
        const matchStatus = statusFilter === 'all' || a.status === statusFilter
        const matchSource = sourceFilter === 'all' || a.source === sourceFilter
        return matchSearch && matchStatus && matchSource
    })

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <UserPlus className="w-8 h-8 text-blue-600" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Üyelik Başvuruları</h1>
                    <p className="text-gray-500 dark:text-gray-400">Mobil uygulama ve web paneli başvurularını inceleyin</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 p-4">
                    <div className="text-sm text-gray-500">Toplam</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-500/10 rounded-xl shadow-sm border border-yellow-200 dark:border-yellow-500/20 p-4">
                    <div className="text-sm text-yellow-700 dark:text-yellow-400">Beklemede</div>
                    <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">{stats.pending}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-500/10 rounded-xl shadow-sm border border-green-200 dark:border-green-500/20 p-4">
                    <div className="text-sm text-green-700 dark:text-green-400">Onaylandı</div>
                    <div className="text-2xl font-bold text-green-800 dark:text-green-300">{stats.approved}</div>
                </div>
                <div className="bg-red-50 dark:bg-red-500/10 rounded-xl shadow-sm border border-red-200 dark:border-red-500/20 p-4">
                    <div className="text-sm text-red-700 dark:text-red-400">Reddedildi</div>
                    <div className="text-2xl font-bold text-red-800 dark:text-red-300">{stats.rejected}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" placeholder="Ad, e-posta veya TC ile ara..." value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="border dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                        <option value="all">Tüm Durumlar</option>
                        <option value="APPLIED">Başvuru Yapıldı</option>
                        <option value="PENDING">Beklemede</option>
                        <option value="APPROVED">Onaylandı</option>
                        <option value="REJECTED">Reddedildi</option>
                    </select>
                    <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
                        className="border dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                        <option value="all">Tüm Kaynaklar</option>
                        <option value="LEGACY">📱 Mobil Uygulama</option>
                        <option value="NEW">🌐 Web Panel</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                        <p className="mt-2 text-gray-500">Yükleniyor...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center">
                        <UserPlus className="w-12 h-12 mx-auto text-gray-300" />
                        <p className="mt-2 text-gray-500">Başvuru bulunamadı</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-slate-700/50 border-b dark:border-slate-600">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Başvuran</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">İletişim</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">TC</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tarih</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Kaynak</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Durum</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-700">
                                {filtered.map(app => {
                                    const st = statusConfig[app.status] || statusConfig.APPLIED
                                    const StIcon = st.icon
                                    return (
                                        <tr key={`${app.source}-${app.id}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900 dark:text-white">{app.name} {app.surname}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-gray-900 dark:text-gray-200">{app.email}</div>
                                                <div className="text-sm text-gray-500">{app.phone}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{app.tcKimlik}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(app.date).toLocaleDateString('tr-TR')}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${app.source === 'LEGACY' ? 'bg-indigo-100 text-indigo-700' : 'bg-cyan-100 text-cyan-700'}`}>
                                                    {app.source === 'LEGACY' ? '📱 Mobil' : '🌐 Web'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>
                                                    <StIcon className="w-3.5 h-3.5" />{st.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => setSelectedApp(app)} title="Detay / Belgeler"
                                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {app.source === 'LEGACY' && app.signatureUrl && (
                                                        <button onClick={() => setSelectedApp(app)} title="İmza Görüntüle"
                                                            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition">
                                                            <PenTool className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedApp && <DetailModal app={selectedApp} onClose={() => setSelectedApp(null)} onAction={handleAction} />}
        </div>
    )
}
