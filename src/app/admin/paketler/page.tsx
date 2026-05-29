'use client'

import { useEffect, useState } from 'react'
import { Package, Plus, Edit2, Trash2, Check, X, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PackageData {
    id: string
    name: string
    description: string | null
    status: 'ACTIVE' | 'INACTIVE' | 'DEPRECATED'
    monthlyPrice: number
    yearlyPrice: number
    currency: string
    maxMembers: number | null
    maxBoardMembers: number | null
    features: string[] | null
    _count?: { stks: number }
}

export default function AdminPackagesPage() {
    const [packages, setPackages] = useState<PackageData[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        monthlyPrice: '',
        yearlyPrice: '',
        maxMembers: '',
        maxBoardMembers: '',
        status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'DEPRECATED',
        features: ''
    })

    useEffect(() => {
        fetchPackages()
    }, [])

    const fetchPackages = async () => {
        try {
            const res = await fetch('/api/admin/packages')
            const data = await res.json()
            if (data.packages) {
                setPackages(data.packages)
            }
        } catch (error) {
            console.error('Error fetching packages:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const payload = {
                name: formData.name,
                description: formData.description || null,
                monthlyPrice: parseFloat(formData.monthlyPrice),
                yearlyPrice: parseFloat(formData.yearlyPrice),
                maxMembers: formData.maxMembers ? parseInt(formData.maxMembers) : null,
                maxBoardMembers: formData.maxBoardMembers ? parseInt(formData.maxBoardMembers) : null,
                status: formData.status,
                features: formData.features ? formData.features.split('\n').filter(f => f.trim()) : []
            }

            const res = await fetch('/api/admin/packages', {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload)
            })

            if (res.ok) {
                fetchPackages()
                resetForm()
            }
        } catch (error) {
            console.error('Error saving package:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (pkg: PackageData) => {
        setFormData({
            name: pkg.name,
            description: pkg.description || '',
            monthlyPrice: pkg.monthlyPrice.toString(),
            yearlyPrice: pkg.yearlyPrice.toString(),
            maxMembers: pkg.maxMembers?.toString() || '',
            maxBoardMembers: pkg.maxBoardMembers?.toString() || '',
            status: pkg.status,
            features: (pkg.features || []).join('\n')
        })
        setEditingId(pkg.id)
        setShowAddModal(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Bu paketi silmek istediğinize emin misiniz?')) return

        try {
            const res = await fetch('/api/admin/packages', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })

            if (res.ok) {
                fetchPackages()
            }
        } catch (error) {
            console.error('Error deleting package:', error)
        }
    }

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            monthlyPrice: '',
            yearlyPrice: '',
            maxMembers: '',
            maxBoardMembers: '',
            status: 'ACTIVE',
            features: ''
        })
        setEditingId(null)
        setShowAddModal(false)
    }

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Paket Yönetimi</h1>
                    <p className="text-slate-500">Fiyatlandırma paketlerini yönetin</p>
                </div>
                <Button onClick={() => setShowAddModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Paket
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <Package className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{packages.length}</p>
                                <p className="text-sm text-slate-500">Toplam Paket</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Check className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {packages.filter(p => p.status === 'ACTIVE').length}
                                </p>
                                <p className="text-sm text-slate-500">Aktif Paket</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Package className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {packages.reduce((sum, p) => sum + (p._count?.stks || 0), 0)}
                                </p>
                                <p className="text-sm text-slate-500">Toplam Abone</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Packages Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Paketler</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Paket Adı</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Aylık Fiyat</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Yıllık Fiyat</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Maks Üye</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Abone</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Durum</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {packages.map((pkg) => (
                                    <tr key={pkg.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="py-4 px-4">
                                            <div>
                                                <p className="font-medium text-slate-900">{pkg.name}</p>
                                                {pkg.description && (
                                                    <p className="text-sm text-slate-500 truncate max-w-xs">{pkg.description}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-slate-700">{formatPrice(pkg.monthlyPrice)}</td>
                                        <td className="py-4 px-4 text-slate-700">{formatPrice(pkg.yearlyPrice)}</td>
                                        <td className="py-4 px-4 text-slate-700">{pkg.maxMembers || 'Sınırsız'}</td>
                                        <td className="py-4 px-4 text-slate-700">{pkg._count?.stks || 0}</td>
                                        <td className="py-4 px-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${pkg.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                                                pkg.status === 'INACTIVE' ? 'bg-slate-100 text-slate-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {pkg.status === 'ACTIVE' ? 'Aktif' :
                                                    pkg.status === 'INACTIVE' ? 'Pasif' : 'Kullanım Dışı'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(pkg)}
                                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4 text-slate-600" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(pkg.id)}
                                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {packages.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-slate-500">
                                            Henüz paket eklenmemiş
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200">
                            <h2 className="text-xl font-bold text-slate-900">
                                {editingId ? 'Paketi Düzenle' : 'Yeni Paket'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Paket Adı *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Açıklama
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    rows={2}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Aylık Fiyat (₺) *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.monthlyPrice}
                                        onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Yıllık Fiyat (₺) *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.yearlyPrice}
                                        onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Maks Üye Sayısı
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.maxMembers}
                                        onChange={(e) => setFormData({ ...formData, maxMembers: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Sınırsız için boş bırakın"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Maks YK Üyesi
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.maxBoardMembers}
                                        onChange={(e) => setFormData({ ...formData, maxBoardMembers: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Sınırsız için boş bırakın"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Durum
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as PackageData['status'] })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="ACTIVE">Aktif</option>
                                    <option value="INACTIVE">Pasif</option>
                                    <option value="DEPRECATED">Kullanım Dışı</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Özellikler (her satıra bir özellik)
                                </label>
                                <textarea
                                    value={formData.features}
                                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    rows={4}
                                    placeholder="Üye yönetimi&#10;Aidat takibi&#10;Gelişmiş raporlar"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={resetForm}
                                    className="flex-1"
                                >
                                    İptal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            {editingId ? 'Güncelle' : 'Kaydet'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
