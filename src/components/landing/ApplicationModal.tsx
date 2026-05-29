'use client'

import React from 'react'
import {
    Building2, User, Phone, Mail, FileText,
    Send, CheckCircle, Loader2, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'

const stkTypes = [
    { value: 'DERNEK', label: 'Dernek', emoji: '🏛️' },
    { value: 'VAKIF', label: 'Vakıf', emoji: '🏗️' },
    { value: 'SENDIKA', label: 'Sendika', emoji: '⚖️' },
    { value: 'MESLEK_ODA', label: 'Meslek Odası', emoji: '🎓' },
    { value: 'KOOPERATIF', label: 'Kooperatif', emoji: '🤝' },
    { value: 'DIGER', label: 'Diğer', emoji: '📋' },
]

interface ApplicationModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export default function ApplicationModal({ open, onOpenChange }: ApplicationModalProps) {
    const [formData, setFormData] = React.useState({
        stkName: '',
        stkType: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        description: '',
    })
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [isSuccess, setIsSuccess] = React.useState(false)
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
    const [showToast, setShowToast] = React.useState(false)

    const resetForm = () => {
        setFormData({ stkName: '', stkType: '', contactName: '', contactPhone: '', contactEmail: '', description: '' })
        setErrorMessage(null)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
        if (errorMessage) setErrorMessage(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setErrorMessage(null)

        try {
            const res = await fetch('/api/public/stk-apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                const msg = data.errors?.join(', ') || 'Bir hata oluştu. Lütfen tekrar deneyiniz.'
                setErrorMessage(msg)
                setIsSubmitting(false)
                return
            }

            // Başarılı!
            setIsSubmitting(false)
            setIsSuccess(true)

            setTimeout(() => {
                setIsSuccess(false)
                resetForm()
                onOpenChange(false)
                // Toast göster
                setShowToast(true)
                setTimeout(() => setShowToast(false), 5000)
            }, 2000)

        } catch {
            setErrorMessage('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edip tekrar deneyiniz.')
            setIsSubmitting(false)
        }
    }

    const isFormValid = formData.stkName && formData.stkType && formData.contactName && formData.contactPhone && formData.contactEmail

    return (
        <>
            <Dialog open={open} onOpenChange={(val) => { if (!isSubmitting) { onOpenChange(val); if (!val) resetForm() } }}>
                <DialogContent className="sm:max-w-[560px] max-h-[90vh] bg-slate-950/95 backdrop-blur-2xl border border-white/10 text-white p-0 overflow-hidden flex flex-col">
                    {/* Header gradient bar */}
                    <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shrink-0" />

                    {/* Scrollable content area */}
                    <div className="px-6 pt-4 pb-6 overflow-y-auto flex-1 custom-scrollbar">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shrink-0">
                                    <Building2 className="w-5 h-5 text-white" />
                                </div>
                                STK Başvuru Formu
                            </DialogTitle>
                            <DialogDescription className="text-slate-400 mt-2">
                                Kuruluşunuzu platformumuza kaydedin. Başvurunuz incelendikten sonra sizinle iletişime geçeceğiz.
                            </DialogDescription>
                        </DialogHeader>

                        {isSuccess ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center animate-bounce">
                                    <CheckCircle className="w-10 h-10 text-emerald-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-white">Başvurunuz Alındı!</h3>
                                <p className="text-slate-400 text-center max-w-sm">
                                    Ekibimiz başvurunuzu inceleyecek ve en kısa sürede size dönüş yapacaktır.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                                {/* Hata mesajı */}
                                {errorMessage && (
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}

                                {/* STK Adı */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-emerald-400" />
                                        STK / Kuruluş Adı <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        name="stkName"
                                        value={formData.stkName}
                                        onChange={handleChange}
                                        placeholder="Örn: Türkiye Kamu Çalışanları Derneği"
                                        className="w-full h-11 px-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                                        required
                                    />
                                </div>

                                {/* STK Türü */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-emerald-400" />
                                        STK Türü <span className="text-red-400">*</span>
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {stkTypes.map(type => (
                                            <button
                                                key={type.value}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, stkType: type.value }))}
                                                className={`p-3 rounded-lg border text-sm font-medium transition-all text-center ${
                                                    formData.stkType === type.value
                                                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20'
                                                }`}
                                            >
                                                <span className="text-lg block mb-1">{type.emoji}</span>
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Yetkili Kişi */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                        <User className="w-4 h-4 text-emerald-400" />
                                        Yetkili Ad Soyad <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        name="contactName"
                                        value={formData.contactName}
                                        onChange={handleChange}
                                        placeholder="Ad Soyad"
                                        className="w-full h-11 px-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                                        required
                                    />
                                </div>

                                {/* Telefon & Email */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-emerald-400" />
                                            Telefon <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            name="contactPhone"
                                            value={formData.contactPhone}
                                            onChange={handleChange}
                                            placeholder="0532 000 0000"
                                            className="w-full h-11 px-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-emerald-400" />
                                            E-posta <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            name="contactEmail"
                                            type="email"
                                            value={formData.contactEmail}
                                            onChange={handleChange}
                                            placeholder="info@dernek.org"
                                            className="w-full h-11 px-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Açıklama */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-300">
                                        Kısa Açıklama <span className="text-slate-500">(opsiyonel)</span>
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={2}
                                        placeholder="Kuruluşunuz hakkında kısa bilgi..."
                                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all resize-none"
                                    />
                                </div>

                                {/* Submit */}
                                <Button
                                    type="submit"
                                    disabled={!isFormValid || isSubmitting}
                                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Gönderiliyor...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5 mr-2" />
                                            Başvuruyu Gönder
                                        </>
                                    )}
                                </Button>

                                <p className="text-xs text-slate-500 text-center pb-1">
                                    Başvurunuz en geç 24 saat içinde incelenerek sonuçlandırılacaktır.
                                </p>
                            </form>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Success Toast Notification */}
            {showToast && (
                <div className="fixed bottom-6 right-6 z-[100] animate-slide-up">
                    <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-emerald-950/95 backdrop-blur-xl border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 max-w-md">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-emerald-300">Başvurunuz Başarıyla Alındı!</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Yöneticilerimiz başvurunuzu inceleyecek ve sizinle iletişime geçecektir.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowToast(false)}
                            className="text-slate-500 hover:text-white transition-colors shrink-0"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Inline Styles for animations */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.25);
                }
                @keyframes slide-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.4s ease-out;
                }
            `}</style>
        </>
    )
}
