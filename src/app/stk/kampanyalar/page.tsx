"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Send,
    MessageSquare,
    Mail,
    Bell,
    Smartphone,
    Loader2,
    AlertCircle,
    CheckCircle,
    X,
    Sparkles,
    CreditCard,
    TrendingDown,
    Users,
    Clock,
    Zap,
    Hash,
} from 'lucide-react'

// ==========================================
// TYPES
// ==========================================
interface Credits {
    smsCredits: number
    whatsappCredits: number
    emailCredits: number
    pushCredits: number
}

interface Campaign {
    id: string
    title: string
    channel: string | null
    content: string
    status: string
    recipientCount: number
    deliveredCount: number
    failedCount: number
    smsCost: number
    createdAt: string
    sentAt: string | null
    createdBy: { name: string; role?: string }
}

const CHANNELS = [
    { value: 'SMS', label: 'SMS', icon: Smartphone, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
    { value: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare, color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
    { value: 'EMAIL', label: 'E-posta', icon: Mail, color: 'from-violet-500 to-purple-500', bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-500/20' },
    { value: 'PUSH', label: 'Push Bildirim', icon: Bell, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
]

// ==========================================
// TOAST
// ==========================================
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000)
        return () => clearTimeout(timer)
    }, [onClose])

    return (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300 max-w-md ${
            type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
        }`}>
            {type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="font-medium text-sm">{message}</span>
            <button onClick={onClose} className="ml-2 hover:opacity-70 shrink-0"><X className="w-4 h-4" /></button>
        </div>
    )
}

// ==========================================
// CREDIT CARD
// ==========================================
function CreditWalletCard({ channel, credits, animating }: {
    channel: typeof CHANNELS[number]
    credits: number
    animating: boolean
}) {
    const Icon = channel.icon

    return (
        <Card className={`relative overflow-hidden border ${channel.border} transition-all duration-500 hover:shadow-lg group ${animating ? 'ring-2 ring-emerald-400 ring-offset-2 scale-[1.02]' : ''}`}>
            {/* Gradient accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${channel.color}`} />

            <CardContent className="pt-6 pb-5 px-5">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{channel.label} Kredisi</p>
                        <p className={`text-3xl font-bold tracking-tight transition-all duration-500 ${animating ? 'text-emerald-600 scale-110' : 'text-slate-900 dark:text-white'}`}>
                            {credits.toLocaleString('tr-TR')}
                        </p>
                        <p className="text-xs text-slate-400">kullanılabilir</p>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl ${channel.bg} flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                        <Icon className={`w-6 h-6 ${channel.text}`} />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

// ==========================================
// CAMPAIGN HISTORY ITEM
// ==========================================
function CampaignItem({ campaign }: { campaign: Campaign }) {
    const ch = CHANNELS.find(c => c.value === campaign.channel) || CHANNELS[0]
    const Icon = ch.icon

    return (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
            <div className={`w-10 h-10 rounded-xl ${ch.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${ch.text}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900 dark:text-white truncate flex items-center gap-2">
                    {campaign.title}
                    {campaign.createdBy?.role === 'ADMIN' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 shrink-0">
                            Admin
                        </span>
                    )}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{campaign.content}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Users className="w-3 h-3" />
                        <span>{campaign.recipientCount} alıcı</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(campaign.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${ch.bg} ${ch.text} border-0`}>
                    {ch.label}
                </Badge>
            </div>
        </div>
    )
}

// ==========================================
// MAIN PAGE
// ==========================================
export default function CampaignsPage() {
    const [credits, setCredits] = useState<Credits>({ smsCredits: 0, whatsappCredits: 0, emailCredits: 0, pushCredits: 0 })
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [sending, setSending] = useState(false)
    const [animatingCredit, setAnimatingCredit] = useState<string | null>(null)

    // Form state
    const [form, setForm] = useState({
        title: '',
        content: '',
        channel: 'SMS',
        recipientCount: '',
    })

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch('/api/stk/campaigns')
            const data = await res.json()
            if (data.success) {
                setCredits(data.credits)
                setCampaigns(data.campaigns || [])
            } else {
                setError(data.error || 'Veriler yüklenemedi')
            }
        } catch {
            setError('Sunucu bağlantı hatası')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const getCredit = (channel: string): number => {
        switch (channel) {
            case 'SMS': return credits.smsCredits
            case 'WHATSAPP': return credits.whatsappCredits
            case 'EMAIL': return credits.emailCredits
            case 'PUSH': return credits.pushCredits
            default: return 0
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const count = parseInt(form.recipientCount)
        if (!form.title.trim() || !form.content.trim() || !count || count < 1) return

        setSending(true)
        try {
            const res = await fetch('/api/stk/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: form.title,
                    content: form.content,
                    channel: form.channel,
                    recipientCount: count,
                }),
            })
            const data = await res.json()

            if (data.success) {
                // Güncel kredileri güncelle
                if (data.credits) {
                    setCredits(data.credits)
                }
                // Kampanya listesine ekle
                if (data.campaign) {
                    setCampaigns(prev => [{
                        ...data.campaign,
                        content: form.content,
                        status: 'SENT',
                        deliveredCount: 0,
                        failedCount: 0,
                        smsCost: count,
                        sentAt: new Date().toISOString(),
                        createdBy: { name: 'Ben' },
                    }, ...prev])
                }
                // Animasyon
                setAnimatingCredit(form.channel)
                setTimeout(() => setAnimatingCredit(null), 1500)

                setToast({ message: data.message || 'Kampanya başarıyla gönderildi!', type: 'success' })
                setForm({ title: '', content: '', channel: form.channel, recipientCount: '' })
            } else {
                setToast({ message: data.error || 'Kampanya gönderilemedi', type: 'error' })
            }
        } catch {
            setToast({ message: 'Sunucu bağlantı hatası', type: 'error' })
        } finally {
            setSending(false)
        }
    }

    const selectedChannel = CHANNELS.find(c => c.value === form.channel) || CHANNELS[0]
    const recipientNum = parseInt(form.recipientCount) || 0
    const currentCredit = getCredit(form.channel)
    const isInsufficientBalance = recipientNum > currentCredit && recipientNum > 0

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-slate-500 text-sm">Kampanya verileri yükleniyor...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Hata</h2>
                <p className="text-slate-500 mb-6">{error}</p>
                <Button onClick={() => { setError(null); setLoading(true); fetchData() }}>Tekrar Dene</Button>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* ==========================================
                HEADER
            ========================================== */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Send className="w-5 h-5 text-white" />
                        </div>
                        İletişim & Kampanyalar
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1.5 ml-[52px]">
                        Üyelerinize SMS, WhatsApp, E-posta ve Push bildirimler gönderin
                    </p>
                </div>
                <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs font-medium">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    {campaigns.length} kampanya gönderildi
                </Badge>
            </div>

            {/* ==========================================
                KREDİ CÜZDANI
            ========================================== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {CHANNELS.map(ch => (
                    <CreditWalletCard
                        key={ch.value}
                        channel={ch}
                        credits={getCredit(ch.value)}
                        animating={animatingCredit === ch.value}
                    />
                ))}
            </div>

            {/* ==========================================
                İKİ KOLON: FORM + GEÇMİŞ
            ========================================== */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

                {/* SOL: YENİ MESAJ FORMU */}
                <Card className="xl:col-span-2 border-slate-200/70 dark:border-slate-700/50 shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 bg-gradient-to-br ${selectedChannel.color} rounded-xl flex items-center justify-center shadow-md`}>
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Yeni Mesaj Gönder</CardTitle>
                                <p className="text-xs text-slate-500 mt-0.5">Üyelerinize toplu mesaj gönderin</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Kanal Seçimi */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Gönderim Kanalı <span className="text-red-500">*</span>
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {CHANNELS.map(ch => {
                                        const Icon = ch.icon
                                        const isSelected = form.channel === ch.value
                                        return (
                                            <button
                                                key={ch.value}
                                                type="button"
                                                onClick={() => setForm(p => ({ ...p, channel: ch.value }))}
                                                className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 text-sm font-medium ${
                                                    isSelected
                                                        ? `${ch.border} ${ch.bg} ${ch.text} border-opacity-100 shadow-sm`
                                                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                                }`}
                                            >
                                                <Icon className="w-4 h-4" />
                                                <span>{ch.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Başlık */}
                            <div className="space-y-1.5">
                                <Label htmlFor="camp-title" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Kampanya Başlığı <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="camp-title"
                                    placeholder="Örn: Mayıs Ayı Aidat Hatırlatması"
                                    value={form.title}
                                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                    className="h-11"
                                    required
                                />
                            </div>

                            {/* İçerik */}
                            <div className="space-y-1.5">
                                <Label htmlFor="camp-content" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Mesaj İçeriği <span className="text-red-500">*</span>
                                </Label>
                                <textarea
                                    id="camp-content"
                                    rows={4}
                                    placeholder="Mesajınızı buraya yazın..."
                                    value={form.content}
                                    onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                                    required
                                />
                                {form.content && (
                                    <p className="text-[11px] text-slate-400 text-right">{form.content.length} karakter</p>
                                )}
                            </div>

                            {/* Alıcı Sayısı */}
                            <div className="space-y-1.5">
                                <Label htmlFor="camp-recipients" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Alıcı Sayısı <span className="text-red-500">*</span>
                                </Label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        id="camp-recipients"
                                        type="number"
                                        min="1"
                                        placeholder="Kaç kişiye gönderilecek?"
                                        value={form.recipientCount}
                                        onChange={e => setForm(p => ({ ...p, recipientCount: e.target.value }))}
                                        className="h-11 pl-10"
                                        required
                                    />
                                </div>

                                {/* Bakiye Uyarısı */}
                                {isInsufficientBalance && (
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        <p className="text-xs text-red-600 dark:text-red-400">
                                            <strong>Bakiye yetersiz!</strong> {selectedChannel.label} krediniz: {currentCredit.toLocaleString('tr-TR')}, gerekli: {recipientNum.toLocaleString('tr-TR')}
                                        </p>
                                    </div>
                                )}

                                {/* Maliyet Bilgisi */}
                                {recipientNum > 0 && !isInsufficientBalance && (
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                                        <TrendingDown className="w-4 h-4 text-blue-500 shrink-0" />
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                            Bu kampanya <strong>{recipientNum}</strong> {selectedChannel.label} kredisi kullanacak. Kalan: <strong>{(currentCredit - recipientNum).toLocaleString('tr-TR')}</strong>
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Gönder Butonu */}
                            <Button
                                type="submit"
                                disabled={sending || !form.title.trim() || !form.content.trim() || recipientNum < 1 || isInsufficientBalance}
                                className={`w-full h-12 text-sm font-semibold bg-gradient-to-r ${selectedChannel.color} hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:shadow-none`}
                            >
                                {sending ? (
                                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Gönderiliyor...</>
                                ) : (
                                    <><Send className="w-4 h-4 mr-2" /> {recipientNum > 0 ? `${recipientNum} Kişiye ${selectedChannel.label} Gönder` : 'Mesaj Gönder'}</>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* SAĞ: GEÇMİŞ KAMPANYALAR */}
                <Card className="xl:col-span-3 border-slate-200/70 dark:border-slate-700/50 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Gönderim Geçmişi</CardTitle>
                                    <p className="text-xs text-slate-500 mt-0.5">Son {campaigns.length} kampanya</p>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {campaigns.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                                    <Send className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                </div>
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Henüz Kampanya Yok</h3>
                                <p className="text-sm text-slate-500 max-w-xs">
                                    Sol taraftaki formu kullanarak ilk kampanyanızı gönderin
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                                {campaigns.map(c => (
                                    <CampaignItem key={c.id} campaign={c} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    )
}
