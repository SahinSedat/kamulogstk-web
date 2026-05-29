"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Search, Building2, Eye, Shield, MapPin, Users, FileText, History, BarChart3, Loader2, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Trash2, Target, Smartphone, MessageSquare, Mail, Bell, Send, Package, CreditCard, Plus, Sparkles, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface STK {
    id: string
    name: string
    type: string
    status: string
    registrationNumber: string | null
    taxNumber: string | null
    email: string
    phone: string
    website: string | null
    city: string
    district: string | null
    address: string
    createdAt: string
    manager: {
        id: string
        name: string
        email: string
        phone: string | null
        registrationPurpose?: string | null
    }
    stats: {
        totalMembers: number
        activeMembers: number
    }
    managerHistory: {
        date: string
        description: string | null
        changedBy: string
    }[]
    packageInfo: {
        name: string
        price: string
        currency: string
    } | null
    fileStatus: {
        uploaded: boolean
        approved: boolean
    }
    foundedAt: string | null
    stksectors: {
        sector: {
            id: string
            name: string
        }
    }[]
    boardMembers: {
        id: string
        name: string
        position: string
        startDate: string
    }[]
}

const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    ACTIVE: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    SUSPENDED: 'bg-orange-100 text-orange-700',
    INACTIVE: 'bg-slate-100 text-slate-700'
}

export default function AdminSTKManagementPage() {
    const [stks, setStks] = useState<STK[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')
    const [cityFilter, setCityFilter] = useState('all') // Şimdilik all, şehir listesi lazım olabilir
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    const [viewSTK, setViewSTK] = useState<STK | null>(null)

    // Satış & Kota state
    const [stkCredits, setStkCredits] = useState<{ smsCredits: number; whatsappCredits: number; emailCredits: number; pushCredits: number } | null>(null)
    const [creditForm, setCreditForm] = useState({ sms: '', whatsapp: '', email: '', push: '' })
    const [creditLoading, setCreditLoading] = useState(false)
    const [creditSaving, setCreditSaving] = useState(false)
    const [creditMessage, setCreditMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    // Paket state
    const [allPackages, setAllPackages] = useState<{ id: string; name: string; monthlyPrice: any; yearlyPrice: any; status: string }[]>([])
    const [currentPackage, setCurrentPackage] = useState<{ id: string; name: string } | null>(null)
    const [packageSaving, setPackageSaving] = useState(false)

    // Kampanya state
    const [stkCampaigns, setStkCampaigns] = useState<any[]>([])
    const [campaignLoading, setCampaignLoading] = useState(false)
    const [campaignSending, setCampaignSending] = useState(false)
    const [campaignForm, setCampaignForm] = useState({ title: '', content: '', channel: 'SMS', recipientCount: '' })
    const [campaignMessage, setCampaignMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    const CHANNELS = [
        { value: 'SMS', label: 'SMS', icon: Smartphone, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
        { value: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
        { value: 'EMAIL', label: 'E-posta', icon: Mail, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' },
        { value: 'PUSH', label: 'Push', icon: Bell, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    ]

    // STK detay modalı açıldığında kredi/paket/kampanya verilerini yükle
    const fetchStkDetails = useCallback(async (stkId: string) => {
        setCreditLoading(true)
        setCampaignLoading(true)
        setCreditMessage(null)
        setCampaignMessage(null)

        try {
            // Kredileri getir
            const creditsRes = await fetch(`/api/admin/stks/credits?stkId=${stkId}`)
            const creditsData = await creditsRes.json()
            if (creditsData.success) {
                setStkCredits(creditsData.credits)
                setCurrentPackage(creditsData.package || null)
            }

            // Paketleri getir
            const pkgRes = await fetch('/api/admin/packages')
            const pkgData = await pkgRes.json()
            if (pkgData.packages) {
                setAllPackages(pkgData.packages.filter((p: any) => p.status === 'ACTIVE'))
            }

            // Kampanyaları getir
            const campRes = await fetch(`/api/admin/stks/campaigns?stkId=${stkId}`)
            const campData = await campRes.json()
            if (campData.success) {
                setStkCampaigns(campData.campaigns || [])
            }
        } catch (error) {
            console.error('STK detay yüklenirken hata:', error)
        } finally {
            setCreditLoading(false)
            setCampaignLoading(false)
        }
    }, [])

    // Kredi ekleme
    const handleAddCredits = async (stkId: string) => {
        const sms = parseInt(creditForm.sms) || 0
        const whatsapp = parseInt(creditForm.whatsapp) || 0
        const email = parseInt(creditForm.email) || 0
        const push = parseInt(creditForm.push) || 0

        if (sms === 0 && whatsapp === 0 && email === 0 && push === 0) {
            setCreditMessage({ text: 'En az bir kredi alanı doldurulmalı', type: 'error' })
            return
        }

        setCreditSaving(true)
        setCreditMessage(null)
        try {
            const res = await fetch('/api/admin/stks/credits', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stkId,
                    smsCredits: sms || undefined,
                    whatsappCredits: whatsapp || undefined,
                    emailCredits: email || undefined,
                    pushCredits: push || undefined,
                    mode: 'increment'
                })
            })
            const data = await res.json()
            if (data.success) {
                setStkCredits(data.credits)
                setCreditForm({ sms: '', whatsapp: '', email: '', push: '' })
                setCreditMessage({ text: 'Krediler başarıyla eklendi!', type: 'success' })
            } else {
                setCreditMessage({ text: data.error || 'Kredi eklenemedi', type: 'error' })
            }
        } catch {
            setCreditMessage({ text: 'Sunucu bağlantı hatası', type: 'error' })
        } finally {
            setCreditSaving(false)
        }
    }

    // Paket atama
    const handleAssignPackage = async (stkId: string, packageId: string | null) => {
        setPackageSaving(true)
        try {
            const res = await fetch('/api/admin/stks/packages', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stkId, packageId })
            })
            const data = await res.json()
            if (data.success) {
                setCurrentPackage(data.package || null)
                setCreditMessage({ text: `Paket başarıyla ${packageId ? 'atandı' : 'kaldırıldı'}!`, type: 'success' })
                fetchSTKs()
            } else {
                setCreditMessage({ text: data.error || 'Paket atanamadı', type: 'error' })
            }
        } catch {
            setCreditMessage({ text: 'Sunucu bağlantı hatası', type: 'error' })
        } finally {
            setPackageSaving(false)
        }
    }

    // Admin kampanya oluşturma
    const handleCreateCampaign = async (e: React.FormEvent, stkId: string) => {
        e.preventDefault()
        const count = parseInt(campaignForm.recipientCount)
        if (!campaignForm.title.trim() || !campaignForm.content.trim() || !count || count < 1) return

        setCampaignSending(true)
        setCampaignMessage(null)
        try {
            const res = await fetch('/api/admin/stks/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stkId,
                    title: campaignForm.title,
                    content: campaignForm.content,
                    channel: campaignForm.channel,
                    recipientCount: count,
                })
            })
            const data = await res.json()
            if (data.success) {
                setCampaignMessage({ text: data.message || 'Kampanya oluşturuldu!', type: 'success' })
                setCampaignForm({ title: '', content: '', channel: 'SMS', recipientCount: '' })
                // Kampanya listesini yenile
                const campRes = await fetch(`/api/admin/stks/campaigns?stkId=${stkId}`)
                const campData = await campRes.json()
                if (campData.success) setStkCampaigns(campData.campaigns || [])
            } else {
                setCampaignMessage({ text: data.error || 'Kampanya oluşturulamadı', type: 'error' })
            }
        } catch {
            setCampaignMessage({ text: 'Sunucu bağlantı hatası', type: 'error' })
        } finally {
            setCampaignSending(false)
        }
    }

    const fetchSTKs = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (search) params.append('search', search)
            if (typeFilter !== 'all') params.append('type', typeFilter)
            params.append('page', page.toString())

            const res = await fetch(`/api/admin/stks?${params.toString()}`)
            const data = await res.json()

            if (data.success) {
                setStks(data.stks)
                setTotalPages(data.pagination.totalPages)
                setTotal(data.pagination.total)
            }
        } catch (error) {
            console.error('STK listesi yüklenirken hata:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const res = await fetch('/api/admin/stks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            })
            const data = await res.json()
            if (data.success) {
                fetchSTKs() // Listeyi yenile
            } else {
                alert(data.error || 'Güncelleme hatası')
            }
        } catch (error) {
            console.error('Durum güncelleme hatası:', error)
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`${name} isimli STK'yı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
            return
        }

        try {
            const res = await fetch(`/api/admin/stks?id=${id}`, {
                method: 'DELETE'
            })
            const data = await res.json()
            if (data.success) {
                fetchSTKs()
            } else {
                alert(data.error || 'Silme hatası')
            }
        } catch (error) {
            console.error('Silme hatası:', error)
        }
    }

    useEffect(() => {
        const timeout = setTimeout(fetchSTKs, 300)
        return () => clearTimeout(timeout)
    }, [search, typeFilter, page])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Building2 className="w-7 h-7 text-blue-600" />
                        STK Yönetimi
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Sistemdeki tüm Sivil Toplum Kuruluşlarını yönetin ({total} STK)
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        placeholder="STK adı, vergi no, kütük no ara..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        className="pl-10"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={typeFilter}
                        onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
                        className="h-10 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                        <option value="all">Tüm Türler</option>
                        <option value="DERNEK">Dernek</option>
                        <option value="VAKIF">Vakıf</option>
                        <option value="SENDIKA">Sendika</option>
                        <option value="MESLEK_ODA">Meslek Odası</option>
                        <option value="KOOPERATIF">Kooperatif</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : stks.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        Kayıtlı STK bulunamadı
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Kuruluş Adı</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Tür</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Durum</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Kütük No</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Vergi No</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Kuruluş Tarihi</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Kayıt Tarihi</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Ana Faaliyet</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">E-posta</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Telefon</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Web Sitesi</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">İl</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">İlçe</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Adres</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Başkan</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Başkan Yrd.</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Genel Sekreter</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Sayman</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Üye Sayısı</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky right-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-l">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {stks.map(stk => {
                                    const president = stk.boardMembers?.find(m => m.position === 'PRESIDENT')
                                    const vicePresident = stk.boardMembers?.find(m => m.position === 'VICE_PRESIDENT')
                                    const secretary = stk.boardMembers?.find(m => m.position === 'SECRETARY')
                                    const treasurer = stk.boardMembers?.find(m => m.position === 'TREASURER')

                                    return (
                                        <tr key={stk.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <p className="font-medium text-slate-900 dark:text-white">{stk.name}</p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">{stk.type}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <select
                                                    value={stk.status === 'APPROVED' ? 'ACTIVE' : stk.status}
                                                    onChange={(e) => handleStatusUpdate(stk.id, e.target.value)}
                                                    className={`px-2 py-1 rounded text-xs font-medium border-none cursor-pointer focus:ring-2 focus:ring-blue-500 transition-colors ${stk.status === 'APPROVED' || stk.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                        stk.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                            stk.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                                'bg-slate-100 text-slate-700'
                                                        }`}
                                                >
                                                    <option value="PENDING">Beklemede</option>
                                                    <option value="ACTIVE">Onaylandı</option>
                                                    <option value="REJECTED">Reddedildi</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">{stk.registrationNumber || '-'}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">{stk.taxNumber || '-'}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                                    {stk.foundedAt ? (
                                                        new Date(stk.foundedAt).getUTCMonth() === 0 && new Date(stk.foundedAt).getUTCDate() === 1
                                                            ? new Date(stk.foundedAt).getUTCFullYear()
                                                            : new Date(stk.foundedAt).toLocaleDateString('tr-TR')
                                                    ) : '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                                    {new Date(stk.createdAt).toLocaleString('tr-TR', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1 max-w-[150px]" title={stk.stksectors?.[0]?.sector?.name || '-'}>
                                                    {stk.stksectors?.[0]?.sector?.name || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                                                    {stk.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">{stk.phone}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {stk.website ? (
                                                    <a href={stk.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                                        {stk.website}
                                                    </a>
                                                ) : <span className="text-sm text-slate-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">{stk.city}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">{stk.district || '-'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1 max-w-[200px]" title={stk.address}>
                                                    {stk.address}
                                                </span>
                                            </td>
                                            {/* Yönetim Kurulu */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {president ? (
                                                    <div className="text-xs">
                                                        <div className="font-medium text-slate-900 dark:text-white">{president.name}</div>
                                                        <div className="text-slate-500">{new Date(president.startDate).toLocaleDateString('tr-TR')}</div>
                                                    </div>
                                                ) : <span className="text-xs text-slate-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {vicePresident ? (
                                                    <div className="text-xs">
                                                        <div className="font-medium text-slate-900 dark:text-white">{vicePresident.name}</div>
                                                        <div className="text-slate-500">{new Date(vicePresident.startDate).toLocaleDateString('tr-TR')}</div>
                                                    </div>
                                                ) : <span className="text-xs text-slate-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {secretary ? (
                                                    <div className="text-xs">
                                                        <div className="font-medium text-slate-900 dark:text-white">{secretary.name}</div>
                                                        <div className="text-slate-500">{new Date(secretary.startDate).toLocaleDateString('tr-TR')}</div>
                                                    </div>
                                                ) : <span className="text-xs text-slate-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {treasurer ? (
                                                    <div className="text-xs">
                                                        <div className="font-medium text-slate-900 dark:text-white">{treasurer.name}</div>
                                                        <div className="text-slate-500">{new Date(treasurer.startDate).toLocaleDateString('tr-TR')}</div>
                                                    </div>
                                                ) : <span className="text-xs text-slate-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm">
                                                    <span className="font-medium">{stk.stats.totalMembers}</span>
                                                    <span className="text-xs text-slate-500 ml-1">({stk.stats.activeMembers} Aktif)</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 sticky right-0 bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 shadow-l">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => setViewSTK(stk)}
                                                        className="h-8 px-2 text-xs"
                                                    >
                                                        <Eye className="w-3 h-3 mr-1" />
                                                        Detay
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDelete(stk.id, stk.name)}
                                                        className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-3 h-3 mr-1" />
                                                        Sil
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {
                    totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="text-sm text-slate-500">Sayfa {page} / {totalPages}</div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )
                }
            </div >

            {/* Detay Modal */}
            < Dialog open={!!viewSTK} onOpenChange={() => setViewSTK(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-blue-600" />
                            {viewSTK?.name}
                        </DialogTitle>
                        <DialogDescription>
                            {viewSTK?.city} / {viewSTK?.district} - {viewSTK?.type}
                        </DialogDescription>
                    </DialogHeader>

                    {viewSTK && (
                        <Tabs defaultValue="profile" className="w-full">
                            <TabsList className="grid w-full grid-cols-5">
                                <TabsTrigger value="profile">Kurum Profili</TabsTrigger>
                                <TabsTrigger value="management">Yönetim</TabsTrigger>
                                <TabsTrigger value="sales" onClick={() => fetchStkDetails(viewSTK.id)}>Satış & Kota</TabsTrigger>
                                <TabsTrigger value="campaigns" onClick={() => fetchStkDetails(viewSTK.id)}>Kampanyalar</TabsTrigger>
                                <TabsTrigger value="stats">İstatistikler</TabsTrigger>
                            </TabsList>
                            <TabsContent value="profile" className="space-y-4 py-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-blue-500" /> Resmi Bilgiler
                                        </h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-slate-500">Kütük No</span>
                                                <span className="font-medium">{viewSTK.registrationNumber || '-'}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-slate-500">Vergi No</span>
                                                <span className="font-medium">{viewSTK.taxNumber || '-'}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-slate-500">Kuruluş Tarihi</span>
                                                <span className="font-medium">
                                                    {viewSTK.foundedAt ? (
                                                        new Date(viewSTK.foundedAt).getUTCMonth() === 0 && new Date(viewSTK.foundedAt).getUTCDate() === 1
                                                            ? new Date(viewSTK.foundedAt).getUTCFullYear()
                                                            : new Date(viewSTK.foundedAt).toLocaleDateString('tr-TR')
                                                    ) : '-'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-slate-500">Kayıt Tarihi</span>
                                                <span className="font-medium">
                                                    {new Date(viewSTK.createdAt).toLocaleString('tr-TR', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Durum</span>
                                                <span className={`px-2 py-0.5 rounded text-xs ${statusColors[viewSTK.status]}`}>{viewSTK.status}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-red-500" /> İletişim
                                        </h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-slate-500">E-posta</span>
                                                <span className="font-medium">{viewSTK.email}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-slate-500">Telefon</span>
                                                <span className="font-medium">{viewSTK.phone}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-2">
                                                <span className="text-slate-500">Web</span>
                                                <a href={viewSTK.website || '#'} target="_blank" className="font-medium text-blue-600 truncate max-w-[150px]">{viewSTK.website || '-'}</a>
                                            </div>
                                            <div className="flex flex-col border-b pb-2 pt-1">
                                                <span className="text-slate-500 text-xs">Adres</span>
                                                <span className="font-medium">{viewSTK.address}</span>
                                            </div>
                                            <div className="flex flex-col pt-2">
                                                <span className="text-slate-500 text-xs flex items-center gap-1">
                                                    <Target className="w-3 h-3" /> Ana Faaliyet
                                                </span>
                                                <span className="text-slate-700 dark:text-slate-300 italic mt-1 leading-relaxed">
                                                    {viewSTK.stksectors?.[0]?.sector?.name || 'Belirtilmemiş'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="management" className="space-y-4 py-4">
                                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                                    <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                                        <Shield className="w-4 h-4" /> Mevcut Yönetici
                                    </h3>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-blue-600 font-bold text-xl shadow-sm">
                                            {viewSTK.manager.name ? viewSTK.manager.name.charAt(0) : '?'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white">{viewSTK.manager.name || 'Atanmamış'}</div>
                                            <div className="text-sm text-slate-600 dark:text-slate-400">{viewSTK.manager.email}</div>
                                            <div className="text-xs text-slate-500">{viewSTK.manager.phone}</div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                                        <History className="w-4 h-4 text-slate-500" /> Yönetim Geçmişi
                                    </h3>
                                    {viewSTK.managerHistory.length > 0 ? (
                                        <div className="border rounded-xl overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-800">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-slate-500">Tarih</th>
                                                        <th className="px-4 py-2 text-left text-slate-500">İşlem</th>
                                                        <th className="px-4 py-2 text-left text-slate-500">Yapan</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {viewSTK.managerHistory.map((log, i) => (
                                                        <tr key={i}>
                                                            <td className="px-4 py-2 text-slate-500">
                                                                {new Date(log.date).toLocaleDateString('tr-TR')}
                                                            </td>
                                                            <td className="px-4 py-2">{log.description}</td>
                                                            <td className="px-4 py-2 text-slate-500">{log.changedBy}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-slate-500 italic p-4 text-center border rounded-xl border-dashed">
                                            Yönetici değişiklik kaydı bulunamadı.
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                            {/* ============ SATIŞ & KOTA SEKMESİ ============ */}
                            <TabsContent value="sales" className="space-y-5 py-4">
                                {creditLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                    </div>
                                ) : (
                                    <>
                                        {/* Bildirim */}
                                        {creditMessage && (
                                            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                                                creditMessage.type === 'success'
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                                            }`}>
                                                {creditMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                                {creditMessage.text}
                                            </div>
                                        )}

                                        {/* Mevcut Krediler */}
                                        <div>
                                            <h3 className="font-semibold mb-3 flex items-center gap-2 text-slate-900 dark:text-white">
                                                <CreditCard className="w-4 h-4 text-blue-500" /> Mevcut Kredi Bakiyeleri
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {CHANNELS.map(ch => {
                                                    const creditKey = `${ch.value.toLowerCase()}Credits` as keyof typeof stkCredits
                                                    const val = stkCredits ? (stkCredits as any)[ch.value === 'WHATSAPP' ? 'whatsappCredits' : `${ch.value.toLowerCase()}Credits`] || 0 : 0
                                                    const Icon = ch.icon
                                                    return (
                                                        <div key={ch.value} className={`p-4 rounded-xl ${ch.bg} border border-slate-200/50 dark:border-slate-700/50`}>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Icon className={`w-4 h-4 ${ch.color}`} />
                                                                <span className="text-xs font-medium text-slate-500">{ch.label}</span>
                                                            </div>
                                                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                                                {val.toLocaleString('tr-TR')}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Kredi Ekleme Formu */}
                                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <h3 className="font-semibold mb-3 flex items-center gap-2 text-slate-900 dark:text-white">
                                                <Plus className="w-4 h-4 text-emerald-500" /> Kredi Ekle
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                                <div>
                                                    <label className="text-xs text-slate-500 mb-1 block">SMS Kredisi</label>
                                                    <Input
                                                        type="number" min="0" placeholder="0"
                                                        value={creditForm.sms}
                                                        onChange={e => setCreditForm(p => ({ ...p, sms: e.target.value }))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-500 mb-1 block">WhatsApp Kredisi</label>
                                                    <Input
                                                        type="number" min="0" placeholder="0"
                                                        value={creditForm.whatsapp}
                                                        onChange={e => setCreditForm(p => ({ ...p, whatsapp: e.target.value }))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-500 mb-1 block">E-posta Kredisi</label>
                                                    <Input
                                                        type="number" min="0" placeholder="0"
                                                        value={creditForm.email}
                                                        onChange={e => setCreditForm(p => ({ ...p, email: e.target.value }))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-500 mb-1 block">Push Kredisi</label>
                                                    <Input
                                                        type="number" min="0" placeholder="0"
                                                        value={creditForm.push}
                                                        onChange={e => setCreditForm(p => ({ ...p, push: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => handleAddCredits(viewSTK.id)}
                                                disabled={creditSaving}
                                                className="w-full"
                                                variant="success"
                                            >
                                                {creditSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                                Kredileri Ekle
                                            </Button>
                                        </div>

                                        {/* Paket Yönetimi */}
                                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <h3 className="font-semibold mb-3 flex items-center gap-2 text-slate-900 dark:text-white">
                                                <Package className="w-4 h-4 text-purple-500" /> Paket Yönetimi
                                            </h3>
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <label className="text-xs text-slate-500 mb-1 block">Mevcut Paket</label>
                                                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                                                        {currentPackage ? currentPackage.name : <span className="text-slate-400 italic">Paket atanmamış</span>}
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs text-slate-500 mb-1 block">Paket Değiştir</label>
                                                    <select
                                                        value={currentPackage?.id || ''}
                                                        onChange={e => handleAssignPackage(viewSTK.id, e.target.value || null)}
                                                        disabled={packageSaving}
                                                        className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                                                    >
                                                        <option value="">Paket Yok (Ücretsiz)</option>
                                                        {allPackages.map(pkg => (
                                                            <option key={pkg.id} value={pkg.id}>
                                                                {pkg.name} — ₺{Number(pkg.monthlyPrice).toLocaleString('tr-TR')}/ay
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            {/* ============ KAMPANYALAR SEKMESİ ============ */}
                            <TabsContent value="campaigns" className="space-y-5 py-4">
                                {campaignLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                    </div>
                                ) : (
                                    <>
                                        {/* Bildirim */}
                                        {campaignMessage && (
                                            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                                                campaignMessage.type === 'success'
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                                            }`}>
                                                {campaignMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                                {campaignMessage.text}
                                            </div>
                                        )}

                                        {/* Yeni Kampanya Formu */}
                                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <h3 className="font-semibold mb-3 flex items-center gap-2 text-slate-900 dark:text-white">
                                                <Sparkles className="w-4 h-4 text-amber-500" /> STK Adına Kampanya Oluştur
                                            </h3>
                                            <p className="text-xs text-slate-500 mb-4">Admin kampanyaları STK'nın kredisinden düşülmez. STK yönetim panelinde de görüntülenir.</p>
                                            <form onSubmit={e => handleCreateCampaign(e, viewSTK.id)} className="space-y-4">
                                                {/* Kanal */}
                                                <div className="flex gap-2">
                                                    {CHANNELS.map(ch => {
                                                        const Icon = ch.icon
                                                        return (
                                                            <button
                                                                key={ch.value}
                                                                type="button"
                                                                onClick={() => setCampaignForm(p => ({ ...p, channel: ch.value }))}
                                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                                                                    campaignForm.channel === ch.value
                                                                        ? `${ch.bg} ${ch.color} border-current`
                                                                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                                                                }`}
                                                            >
                                                                <Icon className="w-3.5 h-3.5" />
                                                                {ch.label}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                                {/* Başlık + Alıcı */}
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="col-span-2">
                                                        <Input
                                                            placeholder="Kampanya Başlığı"
                                                            value={campaignForm.title}
                                                            onChange={e => setCampaignForm(p => ({ ...p, title: e.target.value }))}
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <Input
                                                            type="number" min="1" placeholder="Alıcı sayısı"
                                                            value={campaignForm.recipientCount}
                                                            onChange={e => setCampaignForm(p => ({ ...p, recipientCount: e.target.value }))}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                {/* İçerik */}
                                                <textarea
                                                    rows={3}
                                                    placeholder="Mesaj içeriği..."
                                                    value={campaignForm.content}
                                                    onChange={e => setCampaignForm(p => ({ ...p, content: e.target.value }))}
                                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                                    required
                                                />
                                                <Button type="submit" disabled={campaignSending} className="w-full" variant="success">
                                                    {campaignSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                                    Kampanya Oluştur
                                                </Button>
                                            </form>
                                        </div>

                                        {/* Kampanya Geçmişi */}
                                        <div>
                                            <h3 className="font-semibold mb-3 flex items-center gap-2 text-slate-900 dark:text-white">
                                                <History className="w-4 h-4 text-slate-500" /> Kampanya Geçmişi ({stkCampaigns.length})
                                            </h3>
                                            {stkCampaigns.length === 0 ? (
                                                <div className="text-center py-8 text-sm text-slate-500 italic border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                                    Henüz kampanya gönderilmemiş
                                                </div>
                                            ) : (
                                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                                    {stkCampaigns.map((c: any) => {
                                                        const ch = CHANNELS.find(x => x.value === c.channel) || CHANNELS[0]
                                                        const Icon = ch.icon
                                                        const isAdmin = c.createdBy?.role === 'ADMIN'
                                                        return (
                                                            <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                                                <div className={`w-9 h-9 rounded-lg ${ch.bg} flex items-center justify-center`}>
                                                                    <Icon className={`w-4 h-4 ${ch.color}`} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium text-sm text-slate-900 dark:text-white truncate">{c.title}</span>
                                                                        {isAdmin && (
                                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                                                Admin
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-slate-500 truncate">{c.content}</p>
                                                                </div>
                                                                <div className="text-right text-xs text-slate-500 shrink-0">
                                                                    <div>{c.recipientCount} alıcı</div>
                                                                    <div>{new Date(c.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            <TabsContent value="stats" className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                                        <div className="text-slate-500 text-sm mb-1">Toplam Üye</div>
                                        <div className="text-3xl font-bold text-slate-900 dark:text-white">
                                            {viewSTK.stats.totalMembers}
                                        </div>
                                    </div>
                                    <div className="p-6 rounded-xl bg-green-50 dark:bg-green-900/20 text-center">
                                        <div className="text-green-600 text-sm mb-1">Aktif Üye</div>
                                        <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                                            {viewSTK.stats.activeMembers}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-4 h-4 text-purple-500" /> Diğer İstatistikler
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex justify-between p-2 bg-slate-50 rounded">
                                            <span>Bağış Toplamı</span>
                                            <span className="font-medium">- ₺</span>
                                        </div>
                                        <div className="flex justify-between p-2 bg-slate-50 rounded">
                                            <span>Aidat Geliri</span>
                                            <span className="font-medium">- ₺</span>
                                        </div>
                                        {/* Gelecekte eklenecek */}
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}

                    <DialogFooter>
                        <Button onClick={() => setViewSTK(null)}>Kapat</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </div >
    )
}
