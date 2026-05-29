"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Calendar,
    Plus,
    MapPin,
    Clock,
    Loader2,
    AlertCircle,
    CheckCircle,
    X,
    Search,
    FileText,
    Eye,
    EyeOff,
    Sparkles,
} from 'lucide-react'

// ==========================================
// TYPES
// ==========================================
interface Activity {
    id: string
    title: string
    content: string | null
    date: string | null
    location: string | null
    imageUrl: string | null
    isPublished: boolean
    createdAt: string
    branch: { id: string; name: string; city: string } | null
}

// ==========================================
// TOAST
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
            <button onClick={onClose} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
        </div>
    )
}

// ==========================================
// DATE HELPERS
// ==========================================
function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(dateStr: string | null): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

function isUpcoming(dateStr: string | null): boolean {
    if (!dateStr) return false
    return new Date(dateStr) > new Date()
}

// ==========================================
// ADD ACTIVITY MODAL
// ==========================================
function AddActivityModal({ open, onClose, onSuccess }: {
    open: boolean
    onClose: () => void
    onSuccess: (activity: Activity) => void
}) {
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        title: '',
        content: '',
        date: '',
        time: '',
        location: '',
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.title.trim()) return

        setLoading(true)
        try {
            // Tarih + saat birleştir
            let dateISO: string | null = null
            if (form.date) {
                const timeStr = form.time || '00:00'
                dateISO = new Date(`${form.date}T${timeStr}:00`).toISOString()
            }

            const res = await fetch('/api/stk/activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: form.title,
                    content: form.content || null,
                    date: dateISO,
                    location: form.location || null,
                }),
            })
            const data = await res.json()

            if (data.success) {
                onSuccess(data.activity)
                setForm({ title: '', content: '', date: '', time: '', location: '' })
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
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 pb-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-rose-600 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Yeni Faaliyet Ekle</h2>
                            <p className="text-xs text-slate-500">Etkinlik veya duyuru paylaşın</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Başlık */}
                    <div className="space-y-1.5">
                        <Label htmlFor="act-title" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Başlık <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="act-title"
                            placeholder="Örn: 1 Mayıs Emek ve Dayanışma Günü Kutlaması"
                            value={form.title}
                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                            className="h-11"
                            required
                        />
                    </div>

                    {/* Açıklama */}
                    <div className="space-y-1.5">
                        <Label htmlFor="act-content" className="text-sm font-medium text-slate-700 dark:text-slate-300">Açıklama</Label>
                        <textarea
                            id="act-content"
                            rows={3}
                            placeholder="Etkinlik detayları, program vb."
                            value={form.content}
                            onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                        />
                    </div>

                    {/* Tarih & Saat */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="act-date" className="text-sm font-medium text-slate-700 dark:text-slate-300">Tarih</Label>
                            <Input
                                id="act-date"
                                type="date"
                                value={form.date}
                                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="act-time" className="text-sm font-medium text-slate-700 dark:text-slate-300">Saat</Label>
                            <Input
                                id="act-time"
                                type="time"
                                value={form.time}
                                onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                                className="h-11"
                            />
                        </div>
                    </div>

                    {/* Konum */}
                    <div className="space-y-1.5">
                        <Label htmlFor="act-location" className="text-sm font-medium text-slate-700 dark:text-slate-300">Konum</Label>
                        <Input
                            id="act-location"
                            placeholder="Örn: Kızılay Meydanı, Ankara"
                            value={form.location}
                            onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                            className="h-11"
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-11" disabled={loading}>
                            İptal
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !form.title.trim()}
                            className="flex-1 h-11 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Oluşturuluyor...</>
                            ) : (
                                <><Plus className="w-4 h-4 mr-2" /> Faaliyet Oluştur</>
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
export default function ActivitiesPage() {
    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [search, setSearch] = useState('')

    const fetchActivities = useCallback(async () => {
        try {
            const res = await fetch('/api/stk/activities')
            const data = await res.json()
            if (data.success) {
                setActivities(data.activities)
            } else {
                setError(data.error || 'Faaliyetler yüklenemedi')
            }
        } catch {
            setError('Sunucu bağlantı hatası')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchActivities() }, [fetchActivities])

    const handleActivityAdded = (activity: Activity) => {
        setActivities(prev => [activity, ...prev])
        setToast({ message: `"${activity.title}" başarıyla oluşturuldu!`, type: 'success' })
    }

    const filtered = activities.filter(a =>
        !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.location?.toLowerCase().includes(search.toLowerCase()) ||
        a.content?.toLowerCase().includes(search.toLowerCase())
    )

    // Grupla: Yaklaşan → Geçmiş
    const upcoming = filtered.filter(a => isUpcoming(a.date))
    const past = filtered.filter(a => !isUpcoming(a.date))

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                    <p className="text-slate-500 text-sm">Faaliyetler yükleniyor...</p>
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
                <Button onClick={() => { setError(null); setLoading(true); fetchActivities() }}>Tekrar Dene</Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-7 h-7 text-orange-500" />
                        Faaliyetler
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {activities.length} faaliyet • {upcoming.length} yaklaşan etkinlik
                    </p>
                </div>
                <Button
                    onClick={() => setModalOpen(true)}
                    className="gap-2 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 shadow-lg shadow-orange-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Yeni Faaliyet Ekle
                </Button>
            </div>

            {/* Arama */}
            {activities.length > 0 && (
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Faaliyet ara (başlık, konum)..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 h-10"
                    />
                </div>
            )}

            {/* Boş Durum */}
            {filtered.length === 0 && (
                <Card className="border-dashed border-2 border-slate-200 dark:border-slate-700">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-orange-50 dark:bg-orange-500/10 rounded-2xl flex items-center justify-center mb-4">
                            <Calendar className="w-8 h-8 text-orange-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                            {search ? 'Sonuç Bulunamadı' : 'Henüz Faaliyet Yok'}
                        </h3>
                        <p className="text-slate-500 mb-6 max-w-sm">
                            {search
                                ? 'Arama kriterinize uygun faaliyet bulunamadı.'
                                : 'İlk faaliyetinizi ekleyerek üyelerinizi bilgilendirmeye başlayın.'}
                        </p>
                        {!search && (
                            <Button onClick={() => setModalOpen(true)} className="gap-2 bg-gradient-to-r from-orange-500 to-rose-600">
                                <Plus className="w-4 h-4" /> İlk Faaliyeti Ekle
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Yaklaşan Etkinlikler */}
            {upcoming.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> Yaklaşan Etkinlikler ({upcoming.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {upcoming.map(a => <ActivityCard key={a.id} activity={a} variant="upcoming" />)}
                    </div>
                </div>
            )}

            {/* Geçmiş / Tarihsiz */}
            {past.length > 0 && (
                <div className="space-y-3">
                    {upcoming.length > 0 && (
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Geçmiş & Diğer ({past.length})
                        </h2>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {past.map(a => <ActivityCard key={a.id} activity={a} variant="past" />)}
                    </div>
                </div>
            )}

            {/* Modal */}
            <AddActivityModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={handleActivityAdded} />

            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    )
}

// ==========================================
// ACTIVITY CARD
// ==========================================
function ActivityCard({ activity: a, variant }: { activity: Activity; variant: 'upcoming' | 'past' }) {
    const isUp = variant === 'upcoming'

    return (
        <Card className={`group hover:shadow-lg transition-all duration-300 border ${
            isUp
                ? 'border-orange-200 dark:border-orange-500/20 bg-gradient-to-br from-orange-50/50 to-rose-50/30 dark:from-orange-500/5 dark:to-rose-500/5'
                : 'border-slate-200 dark:border-slate-700'
        }`}>
            {/* Kapak Görseli */}
            {a.imageUrl && (
                <div className="h-36 overflow-hidden rounded-t-xl">
                    <img src={a.imageUrl} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
            )}

            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {a.title}
                    </CardTitle>
                    <Badge
                        variant={a.isPublished ? 'default' : 'secondary'}
                        className={`shrink-0 text-[10px] ${a.isPublished
                            ? isUp
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-100'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                            : ''
                        }`}
                    >
                        {a.isPublished ? (isUp ? 'Yaklaşan' : 'Yayında') : 'Taslak'}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-2.5 pt-0">
                {/* Açıklama */}
                {a.content && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{a.content}</p>
                )}

                {/* Tarih */}
                {a.date && (
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className={`w-3.5 h-3.5 shrink-0 ${isUp ? 'text-orange-500' : 'text-slate-400'}`} />
                        <span className={`font-medium ${isUp ? 'text-orange-700 dark:text-orange-400' : 'text-slate-600 dark:text-slate-300'}`}>
                            {formatDate(a.date)}
                        </span>
                        {formatTime(a.date) && (
                            <span className="text-slate-400">• {formatTime(a.date)}</span>
                        )}
                    </div>
                )}

                {/* Konum */}
                {a.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{a.location}</span>
                    </div>
                )}

                {/* Şube */}
                {a.branch && (
                    <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-normal">
                            {a.branch.name}
                        </Badge>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
