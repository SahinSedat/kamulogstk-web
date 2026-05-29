"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Building2,
    Plus,
    MapPin,
    Phone,
    Mail,
    Users,
    MessageSquare,
    Send,
    Smartphone,
    Bell,
    Loader2,
    AlertCircle,
    CheckCircle,
    X,
    Search,
    Hash,
} from 'lucide-react'

// ==========================================
// TYPES
// ==========================================
interface Branch {
    id: string
    name: string
    code: string
    adCode: string
    city: string
    district: string | null
    address: string | null
    phone: string | null
    email: string | null
    managerName: string | null
    isActive: boolean
    smsCredits: number
    whatsappCredits: number
    emailCredits: number
    pushCredits: number
    memberCount: number
    createdAt: string
}

interface STKInfo {
    id: string
    name: string
    adCode: string
    credits: {
        sms: number
        whatsapp: number
        email: number
        push: number
    }
}

// ==========================================
// TOAST COMPONENT
// ==========================================
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000)
        return () => clearTimeout(timer)
    }, [onClose])

    return (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300 ${
            type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
            {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium text-sm">{message}</span>
            <button onClick={onClose} className="ml-2 hover:opacity-70 transition-opacity">
                <X className="w-4 h-4" />
            </button>
        </div>
    )
}

// ==========================================
// CREDIT BADGE COMPONENT
// ==========================================
function CreditBadge({ icon: Icon, value, label, color }: { icon: React.ElementType; value: number; label: string; color: string }) {
    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${color}`}>
            <Icon className="w-3.5 h-3.5" />
            <span>{value.toLocaleString('tr-TR')}</span>
        </div>
    )
}

// ==========================================
// ADD BRANCH MODAL
// ==========================================
function AddBranchModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: (branch: Branch) => void }) {
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        name: '',
        city: '',
        district: '',
        address: '',
        phone: '',
        email: '',
        managerName: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name.trim() || !form.city.trim()) return

        setLoading(true)
        try {
            const res = await fetch('/api/stk/branches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()

            if (data.success) {
                onSuccess(data.branch)
                setForm({ name: '', city: '', district: '', address: '', phone: '', email: '', managerName: '' })
                onClose()
            } else {
                alert(data.error || 'Bir hata oluştu')
            }
        } catch {
            alert('Sunucu bağlantı hatası')
        } finally {
            setLoading(false)
        }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 pb-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Yeni Şube Ekle</h2>
                            <p className="text-xs text-slate-500">İlan kodu otomatik oluşturulur</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Şube Adı */}
                    <div className="space-y-1.5">
                        <Label htmlFor="branch-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Şube Adı <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="branch-name"
                            placeholder="Örn: Ankara 1 Nolu Şube"
                            value={form.name}
                            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                            className="h-11"
                            required
                        />
                    </div>

                    {/* İl / İlçe */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="branch-city" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                İl <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="branch-city"
                                placeholder="Örn: Ankara"
                                value={form.city}
                                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                                className="h-11"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="branch-district" className="text-sm font-medium text-slate-700 dark:text-slate-300">İlçe</Label>
                            <Input
                                id="branch-district"
                                placeholder="Örn: Çankaya"
                                value={form.district}
                                onChange={e => setForm(p => ({ ...p, district: e.target.value }))}
                                className="h-11"
                            />
                        </div>
                    </div>

                    {/* Adres */}
                    <div className="space-y-1.5">
                        <Label htmlFor="branch-address" className="text-sm font-medium text-slate-700 dark:text-slate-300">Adres</Label>
                        <Input
                            id="branch-address"
                            placeholder="Tam adres"
                            value={form.address}
                            onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                            className="h-11"
                        />
                    </div>

                    {/* Telefon / E-posta */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="branch-phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">Telefon</Label>
                            <Input
                                id="branch-phone"
                                placeholder="0312 123 45 67"
                                value={form.phone}
                                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="branch-email" className="text-sm font-medium text-slate-700 dark:text-slate-300">E-posta</Label>
                            <Input
                                id="branch-email"
                                type="email"
                                placeholder="sube@ornek.org"
                                value={form.email}
                                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                className="h-11"
                            />
                        </div>
                    </div>

                    {/* Şube Başkanı */}
                    <div className="space-y-1.5">
                        <Label htmlFor="branch-manager" className="text-sm font-medium text-slate-700 dark:text-slate-300">Şube Başkanı</Label>
                        <Input
                            id="branch-manager"
                            placeholder="Şube başkanının adı soyadı"
                            value={form.managerName}
                            onChange={e => setForm(p => ({ ...p, managerName: e.target.value }))}
                            className="h-11"
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-11"
                            disabled={loading}
                        >
                            İptal
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !form.name.trim() || !form.city.trim()}
                            className="flex-1 h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Oluşturuluyor...</>
                            ) : (
                                <><Plus className="w-4 h-4 mr-2" /> Şube Oluştur</>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ==========================================
// MAIN PAGE
// ==========================================
export default function BranchManagementPage() {
    const [branches, setBranches] = useState<Branch[]>([])
    const [stk, setStk] = useState<STKInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [search, setSearch] = useState('')

    const fetchBranches = useCallback(async () => {
        try {
            const res = await fetch('/api/stk/branches')
            const data = await res.json()

            if (data.success) {
                setBranches(data.branches)
                setStk(data.stk)
            } else {
                setError(data.error || 'Şubeler yüklenemedi')
            }
        } catch {
            setError('Sunucu bağlantı hatası')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchBranches()
    }, [fetchBranches])

    const handleBranchAdded = (branch: Branch) => {
        setBranches(prev => [branch, ...prev])
        setToast({ message: `${branch.name} başarıyla oluşturuldu!`, type: 'success' })
    }

    const filteredBranches = branches.filter(b =>
        !search || 
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.city.toLowerCase().includes(search.toLowerCase()) ||
        b.adCode?.toLowerCase().includes(search.toLowerCase())
    )

    // Loading
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    <p className="text-slate-500 text-sm">Şubeler yükleniyor...</p>
                </div>
            </div>
        )
    }

    // Error
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Hata Oluştu</h2>
                <p className="text-slate-500 mb-6">{error}</p>
                <Button onClick={() => { setError(null); setLoading(true); fetchBranches() }}>
                    Tekrar Dene
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-7 h-7 text-emerald-600" />
                        Şube Yönetimi
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {stk?.name} — {branches.length} şube
                    </p>
                </div>
                <Button
                    onClick={() => setModalOpen(true)}
                    className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Yeni Şube Ekle
                </Button>
            </div>

            {/* Genel Merkez Kredi Kartı */}
            {stk && (
                <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0 shadow-xl">
                    <CardContent className="p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                                    <Building2 className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Genel Merkez Kredileri</p>
                                    <p className="font-bold text-lg">{stk.name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                        <Hash className="w-3 h-3" /> {stk.adCode}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <CreditBadge icon={MessageSquare} value={stk.credits.sms} label="SMS" color="bg-blue-500/20 text-blue-400" />
                                <CreditBadge icon={Send} value={stk.credits.whatsapp} label="WhatsApp" color="bg-green-500/20 text-green-400" />
                                <CreditBadge icon={Mail} value={stk.credits.email} label="Email" color="bg-purple-500/20 text-purple-400" />
                                <CreditBadge icon={Bell} value={stk.credits.push} label="Push" color="bg-amber-500/20 text-amber-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Arama */}
            {branches.length > 0 && (
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Şube ara (ad, il, kod)..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 h-10"
                    />
                </div>
            )}

            {/* Şube Kartları */}
            {filteredBranches.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-200 dark:border-slate-700">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                            <Building2 className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            {search ? 'Sonuç Bulunamadı' : 'Henüz Şube Yok'}
                        </h3>
                        <p className="text-slate-500 mb-6 max-w-sm">
                            {search 
                                ? 'Arama kriterinize uygun şube bulunamadı.' 
                                : 'İlk şubenizi ekleyerek hiyerarşik yapınızı oluşturmaya başlayın.'}
                        </p>
                        {!search && (
                            <Button
                                onClick={() => setModalOpen(true)}
                                className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600"
                            >
                                <Plus className="w-4 h-4" /> İlk Şubeyi Ekle
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredBranches.map(branch => (
                        <Card key={branch.id} className="hover:shadow-lg transition-all duration-300 group border border-slate-200 dark:border-slate-700">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                                            <Building2 className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                                                {branch.name}
                                            </CardTitle>
                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                <Hash className="w-3 h-3" />
                                                {branch.adCode}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant={branch.isActive ? "default" : "secondary"} className={branch.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
                                        {branch.isActive ? 'Aktif' : 'Pasif'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {/* Konum & İletişim */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                        <span>{branch.city}{branch.district ? `, ${branch.district}` : ''}</span>
                                    </div>
                                    {branch.phone && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                            <span>{branch.phone}</span>
                                        </div>
                                    )}
                                    {branch.managerName && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                            <span>{branch.managerName}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Üye Sayısı */}
                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <Users className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {branch.memberCount} üye
                                    </span>
                                </div>

                                {/* Kredi Durumu */}
                                <div className="flex flex-wrap gap-1.5">
                                    <CreditBadge icon={MessageSquare} value={branch.smsCredits} label="SMS" color="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" />
                                    <CreditBadge icon={Send} value={branch.whatsappCredits} label="WA" color="bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400" />
                                    <CreditBadge icon={Mail} value={branch.emailCredits} label="Email" color="bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" />
                                    <CreditBadge icon={Bell} value={branch.pushCredits} label="Push" color="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modal */}
            <AddBranchModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={handleBranchAdded}
            />

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    )
}
