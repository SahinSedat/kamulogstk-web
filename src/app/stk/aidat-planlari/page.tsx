'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Wallet, Plus, Edit2, Trash2, Star, Calendar,
    CircleDollarSign, Clock, CheckCircle, XCircle
} from 'lucide-react'

interface DuesPlan {
    id: string
    name: string
    description: string | null
    amount: string
    currency: string
    period: 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'YEARLY' | 'CUSTOM'
    customPeriodDays: number | null
    isActive: boolean
    isDefault: boolean
    validFrom: string
    validUntil: string | null
    createdAt: string
}

const PERIOD_LABELS: Record<string, string> = {
    MONTHLY: 'Aylık',
    QUARTERLY: '3 Aylık',
    BIANNUAL: '6 Aylık',
    YEARLY: 'Yıllık',
    CUSTOM: 'Özel'
}

const PERIOD_COLORS: Record<string, string> = {
    MONTHLY: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    QUARTERLY: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    BIANNUAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    YEARLY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    CUSTOM: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
}

export default function AidatPlanlariPage() {
    const [plans, setPlans] = useState<DuesPlan[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingPlan, setEditingPlan] = useState<DuesPlan | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        amount: '',
        period: 'MONTHLY' as string,
        customPeriodDays: '',
        isDefault: false,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: ''
    })

    useEffect(() => {
        fetchPlans()
    }, [])

    const fetchPlans = async () => {
        try {
            const res = await fetch('/api/stk/dues-plans')
            const data = await res.json()
            if (data.plans) {
                setPlans(data.plans)
            }
        } catch (error) {
            console.error('Error fetching plans:', error)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            amount: '',
            period: 'MONTHLY',
            customPeriodDays: '',
            isDefault: false,
            validFrom: new Date().toISOString().split('T')[0],
            validUntil: ''
        })
        setEditingPlan(null)
    }

    const openCreateModal = () => {
        resetForm()
        setShowModal(true)
    }

    const openEditModal = (plan: DuesPlan) => {
        setEditingPlan(plan)
        setFormData({
            name: plan.name,
            description: plan.description || '',
            amount: plan.amount,
            period: plan.period,
            customPeriodDays: plan.customPeriodDays?.toString() || '',
            isDefault: plan.isDefault,
            validFrom: new Date(plan.validFrom).toISOString().split('T')[0],
            validUntil: plan.validUntil ? new Date(plan.validUntil).toISOString().split('T')[0] : ''
        })
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const url = '/api/stk/dues-plans'
        const method = editingPlan ? 'PUT' : 'POST'
        const body = editingPlan
            ? { id: editingPlan.id, ...formData }
            : formData

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (res.ok) {
                setShowModal(false)
                resetForm()
                fetchPlans()
            } else {
                const data = await res.json()
                alert(data.error || 'İşlem başarısız')
            }
        } catch (error) {
            console.error('Error saving plan:', error)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Bu aidat planını silmek istediğinizden emin misiniz?')) return

        try {
            const res = await fetch('/api/stk/dues-plans', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })

            if (res.ok) {
                fetchPlans()
            } else {
                const data = await res.json()
                alert(data.error || 'Silme işlemi başarısız')
            }
        } catch (error) {
            console.error('Error deleting plan:', error)
        }
    }

    const toggleActive = async (plan: DuesPlan) => {
        try {
            const res = await fetch('/api/stk/dues-plans', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: plan.id, isActive: !plan.isActive })
            })

            if (res.ok) {
                fetchPlans()
            }
        } catch (error) {
            console.error('Error toggling plan:', error)
        }
    }

    const activePlans = plans.filter(p => p.isActive)
    const defaultPlan = plans.find(p => p.isDefault)

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
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Aidat Planları</h1>
                    <p className="text-slate-500 mt-1">Üye aidat planlarını yönetin</p>
                </div>
                <Button onClick={openCreateModal} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Plan
                </Button>
            </div>

            {/* Özet Kartlar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                                <CircleDollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {activePlans.reduce((acc, plan) => acc + parseFloat(plan.amount), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Toplam Tutar (Aktif)</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{plans.length}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Toplam Plan</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{activePlans.length}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Aktif Plan</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                                <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                                    {defaultPlan ? defaultPlan.name : '—'}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Varsayılan Plan</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Plan Listesi */}
            <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardContent className="p-6">
                    {plans.length === 0 ? (
                        <div className="text-center py-12">
                            <Wallet className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-500 dark:text-slate-400 mb-4">Henüz aidat planı oluşturulmamış</p>
                            <Button onClick={openCreateModal} className="bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="w-4 h-4 mr-2" />
                                İlk Planı Oluştur
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`border dark:border-slate-700 rounded-lg p-4 transition-colors ${plan.isActive
                                        ? 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                        : 'opacity-60 bg-slate-50 dark:bg-slate-800/50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                                    {plan.name}
                                                </h3>
                                                {plan.isDefault && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                        <Star className="w-3 h-3" />
                                                        Varsayılan
                                                    </span>
                                                )}
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PERIOD_COLORS[plan.period]}`}>
                                                    {PERIOD_LABELS[plan.period]}
                                                    {plan.period === 'CUSTOM' && plan.customPeriodDays && ` (${plan.customPeriodDays} gün)`}
                                                </span>
                                                {plan.isActive ? (
                                                    <Badge variant="success">Aktif</Badge>
                                                ) : (
                                                    <Badge variant="default">Pasif</Badge>
                                                )}
                                            </div>
                                            {plan.description && (
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    {plan.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <CircleDollarSign className="w-4 h-4" />
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        {parseFloat(plan.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                    </span>
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(plan.validFrom).toLocaleDateString('tr-TR')}
                                                    {plan.validUntil && ` - ${new Date(plan.validUntil).toLocaleDateString('tr-TR')}`}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 ml-4">
                                            <button
                                                onClick={() => toggleActive(plan)}
                                                className={`p-2 rounded-lg transition-colors ${plan.isActive
                                                    ? 'hover:bg-orange-50 dark:hover:bg-orange-900/30'
                                                    : 'hover:bg-green-50 dark:hover:bg-green-900/30'
                                                    }`}
                                                title={plan.isActive ? 'Pasife Al' : 'Aktife Al'}
                                            >
                                                {plan.isActive ? (
                                                    <XCircle className="w-4 h-4 text-orange-500" />
                                                ) : (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => openEditModal(plan)}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(plan.id)}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {editingPlan ? 'Planı Düzenle' : 'Yeni Aidat Planı'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Plan Adı *
                                </label>
                                <Input
                                    placeholder="Örn: Standart Üyelik Aidatı"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Açıklama
                                </label>
                                <Input
                                    placeholder="Plan hakkında kısa bilgi"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Tutar (₺) *
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="150.00"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Ödeme Periyodu *
                                    </label>
                                    <select
                                        value={formData.period}
                                        onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                                        className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                        required
                                    >
                                        <option value="MONTHLY">Aylık</option>
                                        <option value="QUARTERLY">3 Aylık</option>
                                        <option value="BIANNUAL">6 Aylık</option>
                                        <option value="YEARLY">Yıllık</option>
                                        <option value="CUSTOM">Özel</option>
                                    </select>
                                </div>
                            </div>
                            {formData.period === 'CUSTOM' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Özel Periyot (Gün) *
                                    </label>
                                    <Input
                                        type="number"
                                        min="1"
                                        placeholder="45"
                                        value={formData.customPeriodDays}
                                        onChange={(e) => setFormData({ ...formData, customPeriodDays: e.target.value })}
                                        required
                                    />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Geçerlilik Başlangıcı
                                    </label>
                                    <Input
                                        type="date"
                                        value={formData.validFrom}
                                        onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Geçerlilik Bitişi
                                    </label>
                                    <Input
                                        type="date"
                                        value={formData.validUntil}
                                        onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isDefault"
                                    checked={formData.isDefault}
                                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <label htmlFor="isDefault" className="text-sm text-slate-700 dark:text-slate-300">
                                    Varsayılan plan olarak belirle
                                </label>
                            </div>

                            <div className="flex justify-end pt-4">
                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => { setShowModal(false); resetForm() }}
                                        className="dark:border-slate-600 dark:text-slate-300"
                                    >
                                        İptal
                                    </Button>
                                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                                        {editingPlan ? 'Güncelle' : 'Oluştur'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
