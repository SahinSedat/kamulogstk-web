'use client'

import { useEffect, useState } from 'react'
import {
    Users, Calendar, MapPin, Plus, Edit2, Trash2,
    CheckCircle, Clock, XCircle, FileText, UserCheck
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Assembly {
    id: string
    assemblyType: 'OLAGAN' | 'OLAGANUSTU'
    assemblyNumber: number
    assemblyDate: string
    location: string
    quorumRequired: number
    attendeeCount: number | null
    proxyCount: number | null
    status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    minutesContent: string | null
    _count: {
        attendees: number
        proxies: number
    }
}

interface FormData {
    assemblyType: 'OLAGAN' | 'OLAGANUSTU'
    assemblyNumber: string
    assemblyDate: string
    location: string
    quorumRequired: string
    agendaItems: { title: string; description: string }[]
}

export default function GenelKurulPage() {
    const [assemblies, setAssemblies] = useState<Assembly[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingAssembly, setEditingAssembly] = useState<Assembly | null>(null)
    const [formData, setFormData] = useState<FormData>({
        assemblyType: 'OLAGAN',
        assemblyNumber: '',
        assemblyDate: '',
        location: '',
        quorumRequired: '',
        agendaItems: [{ title: '', description: '' }]
    })

    useEffect(() => {
        fetchAssemblies()
    }, [])

    const fetchAssemblies = async () => {
        try {
            const res = await fetch('/api/stk/genel-kurul')
            const data = await res.json()
            if (data.assemblies) {
                setAssemblies(data.assemblies)
            }
        } catch (error) {
            console.error('Error fetching assemblies:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const url = '/api/stk/genel-kurul'
            const method = editingAssembly ? 'PUT' : 'POST'
            const body = editingAssembly
                ? { id: editingAssembly.id, ...formData }
                : formData

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...body,
                    agendaItems: formData.agendaItems.filter(item => item.title.trim())
                })
            })

            if (res.ok) {
                setShowModal(false)
                setEditingAssembly(null)
                resetForm()
                fetchAssemblies()
            } else {
                const data = await res.json()
                alert(data.error || 'Bir hata oluştu')
            }
        } catch (error) {
            console.error('Error saving assembly:', error)
            alert('Genel kurul kaydedilemedi')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Bu genel kurulu silmek istediğinizden emin misiniz?')) return

        try {
            const res = await fetch('/api/stk/genel-kurul', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })

            if (res.ok) {
                fetchAssemblies()
            } else {
                const data = await res.json()
                alert(data.error || 'Silme işlemi başarısız')
            }
        } catch (error) {
            console.error('Error deleting assembly:', error)
        }
    }

    const handleEdit = (assembly: Assembly) => {
        setEditingAssembly(assembly)
        setFormData({
            assemblyType: assembly.assemblyType,
            assemblyNumber: assembly.assemblyNumber.toString(),
            assemblyDate: assembly.assemblyDate.split('T')[0],
            location: assembly.location,
            quorumRequired: assembly.quorumRequired.toString(),
            agendaItems: [{ title: '', description: '' }]
        })
        setShowModal(true)
    }

    const resetForm = () => {
        setFormData({
            assemblyType: 'OLAGAN',
            assemblyNumber: '',
            assemblyDate: '',
            location: '',
            quorumRequired: '',
            agendaItems: [{ title: '', description: '' }]
        })
    }

    const addAgendaItem = () => {
        setFormData(prev => ({
            ...prev,
            agendaItems: [...prev.agendaItems, { title: '', description: '' }]
        }))
    }

    const removeAgendaItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            agendaItems: prev.agendaItems.filter((_, i) => i !== index)
        }))
    }

    const updateAgendaItem = (index: number, field: 'title' | 'description', value: string) => {
        setFormData(prev => ({
            ...prev,
            agendaItems: prev.agendaItems.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        }))
    }

    const getStatusBadge = (status: Assembly['status']) => {
        const styles = {
            PLANNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }
        const labels = {
            PLANNED: 'Planlandı',
            IN_PROGRESS: 'Devam Ediyor',
            COMPLETED: 'Tamamlandı',
            CANCELLED: 'İptal Edildi'
        }
        const icons = {
            PLANNED: Clock,
            IN_PROGRESS: Users,
            COMPLETED: CheckCircle,
            CANCELLED: XCircle
        }
        const Icon = icons[status]
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
                <Icon className="w-3 h-3" />
                {labels[status]}
            </span>
        )
    }

    // İstatistikler
    const stats = {
        total: assemblies.length,
        completed: assemblies.filter(a => a.status === 'COMPLETED').length,
        planned: assemblies.filter(a => a.status === 'PLANNED').length
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Genel Kurul Yönetimi</h1>
                    <p className="text-slate-600 dark:text-slate-400">Olağan ve olağanüstü genel kurulları yönetin</p>
                </div>
                <Button
                    onClick={() => { resetForm(); setEditingAssembly(null); setShowModal(true) }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Genel Kurul
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Toplam Genel Kurul</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.completed}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Tamamlanan</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.planned}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Planlanan</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Assembly List */}
            <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader>
                    <CardTitle className="dark:text-white">Genel Kurullar</CardTitle>
                </CardHeader>
                <CardContent>
                    {assemblies.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Henüz genel kurul kaydı bulunmuyor</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {assemblies.map((assembly) => (
                                <div
                                    key={assembly.id}
                                    className="border dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                                    {assembly.assemblyNumber}. {assembly.assemblyType === 'OLAGAN' ? 'Olağan' : 'Olağanüstü'} Genel Kurul
                                                </h3>
                                                {getStatusBadge(assembly.status)}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(assembly.assemblyDate).toLocaleDateString('tr-TR')}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {assembly.location}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <UserCheck className="w-4 h-4" />
                                                    {assembly._count.attendees} katılımcı
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <FileText className="w-4 h-4" />
                                                    {assembly._count.proxies} vekalet
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-500">
                                                Toplantı yeter sayısı: {assembly.quorumRequired}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.location.href = `/stk/genel-kurul/${assembly.id}`}
                                                className="dark:border-slate-600 dark:text-slate-300"
                                            >
                                                Detay
                                            </Button>
                                            <button
                                                onClick={() => handleEdit(assembly)}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                            </button>
                                            {assembly.status !== 'COMPLETED' && (
                                                <button
                                                    onClick={() => handleDelete(assembly.id)}
                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingAssembly ? 'Genel Kurulu Düzenle' : 'Yeni Genel Kurul'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Genel Kurul Türü
                                    </label>
                                    <select
                                        value={formData.assemblyType}
                                        onChange={(e) => setFormData(prev => ({ ...prev, assemblyType: e.target.value as 'OLAGAN' | 'OLAGANUSTU' }))}
                                        className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                        required
                                    >
                                        <option value="OLAGAN">Olağan</option>
                                        <option value="OLAGANUSTU">Olağanüstü</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Genel Kurul No
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.assemblyNumber}
                                        onChange={(e) => setFormData(prev => ({ ...prev, assemblyNumber: e.target.value }))}
                                        className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                        placeholder="1"
                                        required
                                        disabled={!!editingAssembly}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Tarih
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.assemblyDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, assemblyDate: e.target.value }))}
                                        className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Toplantı Yeter Sayısı
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.quorumRequired}
                                        onChange={(e) => setFormData(prev => ({ ...prev, quorumRequired: e.target.value }))}
                                        className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                        placeholder="50"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Toplantı Yeri
                                </label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                    placeholder="Dernek Merkezi, Ankara"
                                    required
                                />
                            </div>

                            {/* Gündem Maddeleri */}
                            {!editingAssembly && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Gündem Maddeleri
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addAgendaItem}
                                            className="text-sm text-emerald-600 hover:text-emerald-700"
                                        >
                                            + Madde Ekle
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {formData.agendaItems.map((item, index) => (
                                            <div key={index} className="flex gap-2">
                                                <span className="text-sm text-slate-500 mt-2">{index + 1}.</span>
                                                <div className="flex-1">
                                                    <input
                                                        type="text"
                                                        value={item.title}
                                                        onChange={(e) => updateAgendaItem(index, 'title', e.target.value)}
                                                        className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                                                        placeholder="Gündem maddesi başlığı"
                                                    />
                                                </div>
                                                {formData.agendaItems.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAgendaItem(index)}
                                                        className="text-red-500 hover:text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => { setShowModal(false); setEditingAssembly(null) }}
                                    className="dark:border-slate-600 dark:text-slate-300"
                                >
                                    İptal
                                </Button>
                                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                                    {editingAssembly ? 'Güncelle' : 'Oluştur'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
