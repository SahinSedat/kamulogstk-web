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
    Package,
    Plus,
    Edit2,
    Trash2,
    Users,
    DollarSign,
    Check,
    Star,
    Crown,
    Zap,
} from 'lucide-react'

interface PackagePlan {
    id: string
    name: string
    description: string
    monthlyPrice: number
    yearlyPrice: number
    maxMembers: number | null
    maxBoardMembers: number
    features: string[]
    isActive: boolean
    stkCount: number
}

const mockPackages: PackagePlan[] = [
    {
        id: '1',
        name: 'Başlangıç',
        description: 'Küçük STK\'lar için ideal başlangıç paketi',
        monthlyPrice: 299,
        yearlyPrice: 2990,
        maxMembers: 100,
        maxBoardMembers: 5,
        features: ['100 üye limiti', 'Temel raporlama', 'E-posta desteği'],
        isActive: true,
        stkCount: 45,
    },
    {
        id: '2',
        name: 'Profesyonel',
        description: 'Orta ölçekli STK\'lar için gelişmiş özellikler',
        monthlyPrice: 599,
        yearlyPrice: 5990,
        maxMembers: 500,
        maxBoardMembers: 10,
        features: ['500 üye limiti', 'Gelişmiş raporlama', 'Öncelikli destek', 'API erişimi'],
        isActive: true,
        stkCount: 67,
    },
    {
        id: '3',
        name: 'Kurumsal',
        description: 'Büyük STK\'lar için tam özellikli paket',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        maxMembers: null,
        maxBoardMembers: 25,
        features: ['Sınırsız üye', 'Özel raporlar', '7/24 destek', 'API erişimi', 'Özel entegrasyonlar'],
        isActive: true,
        stkCount: 23,
    },
]

const iconMap: Record<string, React.ElementType> = {
    'Başlangıç': Zap,
    'Profesyonel': Star,
    'Kurumsal': Crown,
}

const colorMap: Record<string, string> = {
    'Başlangıç': 'from-blue-500 to-blue-600',
    'Profesyonel': 'from-purple-500 to-purple-600',
    'Kurumsal': 'from-amber-500 to-orange-500',
}

export default function PackagesPage() {
    const [packages, setPackages] = useState<PackagePlan[]>(mockPackages)
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [editingPackage, setEditingPackage] = useState<PackagePlan | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        monthlyPrice: '',
        yearlyPrice: '',
        maxMembers: '',
        maxBoardMembers: '',
        features: '',
    })

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            monthlyPrice: '',
            yearlyPrice: '',
            maxMembers: '',
            maxBoardMembers: '',
            features: '',
        })
    }

    const openEditDialog = (pkg: PackagePlan) => {
        setEditingPackage(pkg)
        setFormData({
            name: pkg.name,
            description: pkg.description,
            monthlyPrice: pkg.monthlyPrice.toString(),
            yearlyPrice: pkg.yearlyPrice.toString(),
            maxMembers: pkg.maxMembers?.toString() || '',
            maxBoardMembers: pkg.maxBoardMembers.toString(),
            features: pkg.features.join('\n'),
        })
        setShowAddDialog(true)
    }

    const handleSave = () => {
        const newPackage: PackagePlan = {
            id: editingPackage?.id || Date.now().toString(),
            name: formData.name,
            description: formData.description,
            monthlyPrice: parseFloat(formData.monthlyPrice),
            yearlyPrice: parseFloat(formData.yearlyPrice),
            maxMembers: formData.maxMembers ? parseInt(formData.maxMembers) : null,
            maxBoardMembers: parseInt(formData.maxBoardMembers),
            features: formData.features.split('\n').filter(Boolean),
            isActive: true,
            stkCount: editingPackage?.stkCount || 0,
        }

        if (editingPackage) {
            setPackages(prev => prev.map(p => p.id === editingPackage.id ? newPackage : p))
        } else {
            setPackages(prev => [...prev, newPackage])
        }

        setShowAddDialog(false)
        setEditingPackage(null)
        resetForm()
    }

    const handleDelete = () => {
        if (deleteConfirmId) {
            setPackages(prev => prev.filter(p => p.id !== deleteConfirmId))
            setDeleteConfirmId(null)
        }
    }

    const toggleStatus = (id: string) => {
        setPackages(prev =>
            prev.map(p => (p.id === id ? { ...p, isActive: !p.isActive } : p))
        )
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Paket Planları</h1>
                    <p className="text-slate-500 mt-1">STK abonelik paketlerini yönetin</p>
                </div>
                <Button
                    onClick={() => {
                        resetForm()
                        setEditingPackage(null)
                        setShowAddDialog(true)
                    }}
                    className="gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Yeni Paket
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Toplam Paket</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{packages.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Toplam Abone STK</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {packages.reduce((acc, p) => acc + p.stkCount, 0)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Tahmini Aylık Gelir</p>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    ₺{packages.reduce((acc, p) => acc + p.monthlyPrice * p.stkCount, 0).toLocaleString('tr-TR')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Package Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => {
                    const Icon = iconMap[pkg.name] || Package
                    const gradient = colorMap[pkg.name] || 'from-slate-500 to-slate-600'

                    return (
                        <Card key={pkg.id} className={`relative overflow-hidden ${!pkg.isActive ? 'opacity-60' : ''}`}>
                            {/* Top gradient bar */}
                            <div className={`h-2 bg-gradient-to-r ${gradient}`} />

                            <CardHeader className="pb-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{pkg.name}</CardTitle>
                                            <p className="text-sm text-slate-500">{pkg.stkCount} STK kullanıyor</p>
                                        </div>
                                    </div>
                                    <Badge variant={pkg.isActive ? 'success' : 'default'}>
                                        {pkg.isActive ? 'Aktif' : 'Pasif'}
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <p className="text-sm text-slate-600 dark:text-slate-400">{pkg.description}</p>

                                {/* Pricing */}
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-slate-900 dark:text-white">
                                        ₺{pkg.monthlyPrice.toLocaleString('tr-TR')}
                                    </span>
                                    <span className="text-slate-500">/ay</span>
                                </div>
                                <p className="text-sm text-slate-500">
                                    veya ₺{pkg.yearlyPrice.toLocaleString('tr-TR')}/yıl (2 ay bedava)
                                </p>

                                {/* Features */}
                                <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    {pkg.features.map((feature, index) => (
                                        <div key={index} className="flex items-center gap-2 text-sm">
                                            <Check className="w-4 h-4 text-emerald-500" />
                                            <span className="text-slate-600 dark:text-slate-400">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Limits */}
                                <div className="flex items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Users className="w-4 h-4" />
                                        {pkg.maxMembers ? `${pkg.maxMembers} üye` : 'Sınırsız'}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => openEditDialog(pkg)}
                                    >
                                        <Edit2 className="w-4 h-4 mr-2" />
                                        Düzenle
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleStatus(pkg.id)}
                                    >
                                        {pkg.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeleteConfirmId(pkg.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingPackage ? 'Paketi Düzenle' : 'Yeni Paket Oluştur'}</DialogTitle>
                        <DialogDescription>
                            STK\'ların kullanacağı abonelik paketini tanımlayın
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input
                            label="Paket Adı"
                            placeholder="ör: Profesyonel"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <Input
                            label="Açıklama"
                            placeholder="Paket açıklaması..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Aylık Fiyat (₺)"
                                type="number"
                                placeholder="599"
                                value={formData.monthlyPrice}
                                onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                            />
                            <Input
                                label="Yıllık Fiyat (₺)"
                                type="number"
                                placeholder="5990"
                                value={formData.yearlyPrice}
                                onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Max Üye (boş = sınırsız)"
                                type="number"
                                placeholder="500"
                                value={formData.maxMembers}
                                onChange={(e) => setFormData({ ...formData, maxMembers: e.target.value })}
                            />
                            <Input
                                label="Max YK Üyesi"
                                type="number"
                                placeholder="10"
                                value={formData.maxBoardMembers}
                                onChange={(e) => setFormData({ ...formData, maxBoardMembers: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Özellikler (her satıra bir özellik)
                            </label>
                            <textarea
                                className="w-full h-24 px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:bg-slate-900 dark:border-slate-700"
                                placeholder="500 üye limiti&#10;Gelişmiş raporlama&#10;API erişimi"
                                value={formData.features}
                                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                            İptal
                        </Button>
                        <Button onClick={handleSave}>
                            {editingPackage ? 'Güncelle' : 'Oluştur'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Paketi Sil</DialogTitle>
                        <DialogDescription>
                            Bu paketi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                            {packages.find(p => p.id === deleteConfirmId)?.stkCount! > 0 && (
                                <span className="block mt-2 text-amber-600">
                                    ⚠️ Bu paketi kullanan {packages.find(p => p.id === deleteConfirmId)?.stkCount} STK var!
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                            İptal
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
