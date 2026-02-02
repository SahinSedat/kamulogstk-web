'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Navbar, Footer } from '@/components/landing'
import {
    Building2, Mail, Lock, User, Phone,
    MapPin, FileText, Eye, EyeOff, Loader2, CheckCircle2
} from 'lucide-react'

const steps = [
    { id: 1, title: 'Kuruluş Bilgileri' },
    { id: 2, title: 'İletişim Bilgileri' },
    { id: 3, title: 'Hesap Bilgileri' },
]

export default function RegisterPage() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(1)
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        // Step 1
        stkName: '',
        stkType: '',
        taxNumber: '',
        foundationYear: '',
        // Step 2
        address: '',
        city: '',
        phone: '',
        website: '',
        // Step 3
        contactName: '',
        email: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false,
        acceptKvkk: false,
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (currentStep < 3) {
            setCurrentStep(prev => prev + 1)
            return
        }

        setLoading(true)
        // Simulated API call
        setTimeout(() => {
            setLoading(false)
            router.push('/auth/giris?registered=true')
        }, 2000)
    }

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">STK Adı *</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    name="stkName"
                                    value={formData.stkName}
                                    onChange={handleChange}
                                    placeholder="Kuruluş adınız"
                                    className="w-full h-12 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Kuruluş Türü *</label>
                            <select
                                name="stkType"
                                value={formData.stkType}
                                onChange={handleChange}
                                className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                required
                            >
                                <option value="" className="bg-slate-900">Seçiniz</option>
                                <option value="dernek" className="bg-slate-900">Dernek</option>
                                <option value="vakif" className="bg-slate-900">Vakıf</option>
                                <option value="sendika" className="bg-slate-900">Sendika</option>
                                <option value="kooperatif" className="bg-slate-900">Kooperatif</option>
                                <option value="diger" className="bg-slate-900">Diğer</option>
                            </select>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Vergi No</label>
                                <input
                                    type="text"
                                    name="taxNumber"
                                    value={formData.taxNumber}
                                    onChange={handleChange}
                                    placeholder="Vergi numarası"
                                    className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Kuruluş Yılı</label>
                                <input
                                    type="text"
                                    name="foundationYear"
                                    value={formData.foundationYear}
                                    onChange={handleChange}
                                    placeholder="Örn: 2020"
                                    className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                />
                            </div>
                        </div>
                    </div>
                )

            case 2:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Adres *</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="Açık adres"
                                    rows={3}
                                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">İl *</label>
                                <select
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    required
                                >
                                    <option value="" className="bg-slate-900">Seçiniz</option>
                                    <option value="istanbul" className="bg-slate-900">İstanbul</option>
                                    <option value="ankara" className="bg-slate-900">Ankara</option>
                                    <option value="izmir" className="bg-slate-900">İzmir</option>
                                    <option value="other" className="bg-slate-900">Diğer</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Telefon *</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="0532 000 00 00"
                                        className="w-full h-12 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Web Sitesi</label>
                            <input
                                type="url"
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                placeholder="https://www.ornek.org"
                                className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                        </div>
                    </div>
                )

            case 3:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Yetkili Ad Soyad *</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    name="contactName"
                                    value={formData.contactName}
                                    onChange={handleChange}
                                    placeholder="Ad Soyad"
                                    className="w-full h-12 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">E-posta *</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="ornek@email.com"
                                    className="w-full h-12 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Şifre *</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full h-12 pl-10 pr-12 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Şifre Tekrar *</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full h-12 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="acceptTerms"
                                    checked={formData.acceptTerms}
                                    onChange={handleChange}
                                    className="mt-1 rounded border-white/20 bg-white/5"
                                    required
                                />
                                <span className="text-sm text-slate-300">
                                    <Link href="/terms" className="text-emerald-400 hover:underline">Kullanım Şartları</Link>&apos;nı
                                    okudum ve kabul ediyorum. *
                                </span>
                            </label>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="acceptKvkk"
                                    checked={formData.acceptKvkk}
                                    onChange={handleChange}
                                    className="mt-1 rounded border-white/20 bg-white/5"
                                    required
                                />
                                <span className="text-sm text-slate-300">
                                    <Link href="/kvkk" className="text-emerald-400 hover:underline">KVKK Aydınlatma Metni</Link>&apos;ni
                                    okudum ve onaylıyorum. *
                                </span>
                            </label>
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <Navbar />

            <main className="pt-24 pb-20">
                <section className="px-4 py-16">
                    <div className="max-w-2xl mx-auto">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-6">
                                <FileText className="w-4 h-4" />
                                <span>STK Başvurusu</span>
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2">Platformumuza Katılın</h1>
                            <p className="text-slate-400">STK&apos;nız için hesap oluşturun ve dijital dönüşümü başlatın.</p>
                        </div>

                        {/* Steps */}
                        <div className="flex items-center justify-center mb-8">
                            {steps.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <div className="flex items-center">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${currentStep > step.id
                                                ? 'bg-emerald-500 text-white'
                                                : currentStep === step.id
                                                    ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500'
                                                    : 'bg-white/5 text-slate-500 border border-white/10'
                                            }`}>
                                            {currentStep > step.id ? <CheckCircle2 className="w-5 h-5" /> : step.id}
                                        </div>
                                        <span className={`ml-2 text-sm hidden sm:block ${currentStep >= step.id ? 'text-white' : 'text-slate-500'
                                            }`}>
                                            {step.title}
                                        </span>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div className={`w-12 h-0.5 mx-2 ${currentStep > step.id ? 'bg-emerald-500' : 'bg-white/10'
                                            }`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Form */}
                        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                            <form onSubmit={handleSubmit}>
                                {renderStep()}

                                <div className="flex gap-4 mt-8">
                                    {currentStep > 1 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="flex-1 h-12 border-white/20 text-white hover:bg-white/10"
                                            onClick={() => setCurrentStep(prev => prev - 1)}
                                        >
                                            Geri
                                        </Button>
                                    )}
                                    <Button
                                        type="submit"
                                        className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Gönderiliyor...
                                            </>
                                        ) : currentStep === 3 ? (
                                            'Başvuruyu Gönder'
                                        ) : (
                                            'Devam Et'
                                        )}
                                    </Button>
                                </div>
                            </form>

                            <div className="mt-6 text-center">
                                <p className="text-slate-400 text-sm">
                                    Zaten hesabınız var mı?{' '}
                                    <Link href="/auth/giris" className="text-emerald-400 hover:underline">
                                        Giriş Yapın
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    )
}
