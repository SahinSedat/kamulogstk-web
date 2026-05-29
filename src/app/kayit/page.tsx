"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Navbar, Footer } from '@/components/landing'
import {
    Building2, Mail, Lock, User, Phone,
    MapPin, FileText, Eye, EyeOff, Loader2, CheckCircle2, ArrowRight
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { TURKEY_CITIES } from '@/lib/constants/cities'

// STK Adımları
const steps = [
    { id: 1, title: 'Kuruluş Bilgileri' },
    { id: 2, title: 'İletişim Bilgileri' },
    { id: 3, title: 'Hesap Bilgileri' },
]

type AccountType = 'individual' | 'corporate' | null

export default function RegisterPage() {
    const router = useRouter()
    const [accountType, setAccountType] = useState<AccountType>(null)
    const [currentStep, setCurrentStep] = useState(1)
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [showMobileAppDialog, setShowMobileAppDialog] = useState(false)
    const [sectors, setSectors] = useState<{ id: string, name: string, stkCount?: number }[]>([])

    // Fetch sectors on mount
    useEffect(() => {
        const fetchSectors = async () => {
            try {
                const res = await fetch('/api/public/sectors')
                const data = await res.json()
                if (data.success) {
                    setSectors(data.sectors)
                }
            } catch (error) {
                console.error('Sektörler yüklenirken hata:', error)
            }
        }
        fetchSectors()
    }, [])

    // Form States
    const [formData, setFormData] = useState({
        // Common
        email: '',
        password: '',
        confirmPassword: '',
        name: '', // Individual Name & Corporate Contact Name
        surname: '', // Individual Surname
        phone: '',
        preferredCity: '', // Bireysel için tercih edilen şehir
        interests: [] as string[], // Bireysel için ilgi alanları

        // Corporate Specific
        stkName: '',
        stkType: '',
        taxNumber: '',
        registrationNumber: '', // Kütük No / DERBİS No
        foundationYear: '',
        address: '',
        city: '',
        district: '', // İlçe
        website: '',

        // Detailed Profile (Individual)
        occupation: '',
        education: '',
        gender: '',
        birthDate: '',
        registrationPurpose: '', // Both

        // STK Relations
        isStkOfficial: false,
        stkOfficialRole: '',
        isStkMember: false,
        memberStkName: '',

        // Agreements
        acceptTerms: false,
        acceptKvkk: false,
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target
        let val: any = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value

        // Sayısal alanlar için kısıtlama
        if (name === 'taxNumber' || name === 'foundationYear') {
            val = value.replace(/[^0-9]/g, '')
        }

        // Kütük No için kuruluş türüne göre kısıtlama
        if (name === 'registrationNumber') {
            if (formData.stkType === 'dernek') {
                val = value.replace(/[^0-9-]/g, '') // Sayı ve tire
            } else {
                val = value.replace(/[^0-9]/g, '') // Sadece sayı
            }
        }

        setFormData(prev => ({
            ...prev,
            [name]: val
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (accountType === 'corporate' && currentStep < 3) {
            setCurrentStep(prev => prev + 1)
            return
        }

        // Şifre kontrolü
        if (formData.password !== formData.confirmPassword) {
            alert('Şifreler eşleşmiyor!')
            return
        }

        // Faaliyet alanı kontrolü
        if (!formData.interests || formData.interests.length === 0) {
            alert(accountType === 'corporate' ? 'Lütfen bir ana faaliyet alanı seçiniz!' : 'Lütfen en az bir ilgi alanı seçiniz!')
            return
        }

        setLoading(true)

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountType,
                    ...formData
                }),
            })

            const data = await response.json()

            if (data.success) {
                alert('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz.')
                router.push('/giris?registered=true')
            } else {
                alert(data.error || 'Kayıt başarısız')
            }
        } catch (error) {
            alert('Bir hata oluştu. Lütfen tekrar deneyin.')
        } finally {
            setLoading(false)
        }
    }

    // Hesap Türü Seçimi Ekranı
    const renderAccountSelection = () => (
        <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
                <h1 className="text-3xl font-bold text-white mb-4">Hesap Türünü Seçin</h1>
                <p className="text-slate-400">Size uygun olan hesap türü ile devam edin.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Bireysel Hesap Kartı */}
                <div
                    onClick={() => setShowMobileAppDialog(true)}
                    className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 rounded-2xl p-8 cursor-pointer transition-all duration-300"
                >
                    <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <User className="w-7 h-7 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Bireysel Üyelik</h3>
                    <p className="text-slate-400 text-sm mb-6">
                        Sivil toplum kuruluşlarına üye olmak, bağış yapmak veya gönüllü olmak isteyen vatandaşlar için.
                    </p>
                    <div className="flex items-center text-blue-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                        Seç ve Devam Et <ArrowRight className="w-4 h-4 ml-2" />
                    </div>
                </div>

                {/* Kurumsal Hesap Kartı */}
                <div
                    onClick={() => setAccountType('corporate')}
                    className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 rounded-2xl p-8 cursor-pointer transition-all duration-300"
                >
                    <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Building2 className="w-7 h-7 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Kurumsal Başvuru</h3>
                    <p className="text-slate-400 text-sm mb-6">
                        Dernek, vakıf ve diğer sivil toplum kuruluşlarını yönetmek isteyen yetkililer için.
                    </p>
                    <div className="flex items-center text-emerald-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                        Seç ve Devam Et <ArrowRight className="w-4 h-4 ml-2" />
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center">
                <p className="text-slate-400">
                    Zaten hesabınız var mı?{' '}
                    <Link href="/giris" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                        Giriş Yapın
                    </Link>
                </p>
            </div>
        </div>
    )

    // Bireysel Kayıt Formu
    const renderIndividualForm = () => (
        <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
                <button
                    onClick={() => setAccountType(null)}
                    className="text-slate-500 hover:text-white mb-4 text-sm flex items-center justify-center gap-1 mx-auto transition-colors"
                >
                    ← Tür Seçimine Dön
                </button>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm mb-4">
                    <User className="w-4 h-4" />
                    <span>Bireysel Üyelik</span>
                </div>
                <h1 className="text-2xl font-bold text-white">Kayıt Olun</h1>
            </div>

            <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-300">Ad</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-300">Soyad</label>
                            <input
                                type="text"
                                name="surname"
                                value={formData.surname}
                                onChange={handleChange}
                                className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-300">E-posta</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-300">Telefon</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="05XX XXX XX XX"
                            className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-300">Cinsiyet</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                            >
                                <option value="" className="bg-slate-900">Seçiniz</option>
                                <option value="Kadin" className="bg-slate-900">Kadın</option>
                                <option value="Erkek" className="bg-slate-900">Erkek</option>
                                <option value="BelirtmekIstemiyorum" className="bg-slate-900">Belirtmek İstemiyorum</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-300">Doğum Tarihi</label>
                            <input
                                type="date"
                                name="birthDate"
                                value={formData.birthDate}
                                onChange={handleChange}
                                className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                            />
                        </div>
                    </div>




                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-300">Şehir</label>
                        <select
                            name="preferredCity"
                            value={formData.preferredCity}
                            onChange={handleChange}
                            className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                            required
                        >
                            <option value="" className="bg-slate-900">Seçiniz</option>
                            {TURKEY_CITIES.map(city => (
                                <option key={city} value={city} className="bg-slate-900">{city}</option>
                            ))}
                        </select>
                    </div>



                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-300">İlgi Alanlarınız *</label>
                        {sectors.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 p-3 bg-white/5 border border-white/10 rounded-lg max-h-40 overflow-y-auto">
                                {sectors.filter(s => (s.stkCount || 0) > 0).map(s => (
                                    <label key={s.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                                        <input
                                            type="checkbox"
                                            checked={formData.interests.includes(s.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setFormData(prev => ({ ...prev, interests: [...prev.interests, s.id] }))
                                                } else {
                                                    setFormData(prev => ({ ...prev, interests: prev.interests.filter(i => i !== s.id) }))
                                                }
                                            }}
                                            className="rounded border-white/20 bg-white/5"
                                        />
                                        {s.name}
                                        {s.stkCount !== undefined && s.stkCount > 0 && (
                                            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">
                                                {s.stkCount}
                                            </span>
                                        )}
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 italic p-3 bg-white/5 border border-white/10 rounded-lg">Henüz ilgi alanı tanımlanmamış.</p>
                        )}
                        <p className="text-xs text-slate-500">STK önerilerini kişiselleştirmek için seçin</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-300">Şifre</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-slate-300">Şifre Tekrar</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                            required
                        />
                    </div>

                    <div className="pt-2">
                        <div className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                id="acceptKvkkIndividual"
                                name="acceptKvkk"
                                checked={formData.acceptKvkk}
                                onChange={handleChange}
                                className="mt-1 rounded border-white/20 bg-white/5 cursor-pointer"
                                required
                            />
                            <label htmlFor="acceptKvkkIndividual" className="text-xs text-slate-400 cursor-pointer">
                                <a
                                    href="/kullanim-sartlari"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-blue-400 hover:underline"
                                >
                                    Kullanım Şartları
                                </a> ve <a
                                    href="/kvkk"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-blue-400 hover:underline"
                                >
                                    KVKK Metni
                                </a>&apos;ni okudum, onaylıyorum.
                            </label>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kayıt Ol'}
                    </Button>
                </form >
            </div >
        </div >
    )

    // Mevcut (STK) Formu - Adım Render Fonksiyonu
    const renderCorporateStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
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
                                <option value="meslek_oda" className="bg-slate-900">Meslek Odası</option>
                                <option value="kooperatif" className="bg-slate-900">Kooperatif</option>
                                <option value="diger" className="bg-slate-900">Diğer</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                {formData.stkType === 'vakif' ? 'Vakıf Adı' :
                                    formData.stkType === 'sendika' ? 'Sendika Adı' :
                                        formData.stkType === 'meslek_oda' ? 'Oda Adı' :
                                            formData.stkType === 'kooperatif' ? 'Kooperatif Adı' :
                                                formData.stkType === 'diger' ? 'Kuruluş Adı' : 'Dernek Adı'} *
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    name="stkName"
                                    value={formData.stkName}
                                    onChange={handleChange}
                                    placeholder={
                                        formData.stkType === 'vakif' ? 'Vakıf tam adı' :
                                            formData.stkType === 'sendika' ? 'Sendika tam adı' :
                                                formData.stkType === 'meslek_oda' ? 'Oda tam adı' :
                                                    'Kuruluş tam adı'
                                    }
                                    className="w-full h-12 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                {formData.stkType === 'vakif' ? 'Kütük No (Vakıflar GM)' :
                                    formData.stkType === 'sendika' ? 'Dosya Numarası' :
                                        formData.stkType === 'meslek_oda' ? 'Oda Sicil No' :
                                            formData.stkType === 'kooperatif' ? 'Sicil Numarası' :
                                                formData.stkType === 'diger' ? 'Resmi Kayıt No' : 'Kütük No (DERBİS)'} *
                            </label>
                            <input
                                type="text"
                                name="registrationNumber"
                                value={formData.registrationNumber}
                                onChange={handleChange}
                                inputMode={formData.stkType === 'dernek' ? 'text' : 'numeric'}
                                placeholder={
                                    formData.stkType === 'dernek' ? '34-123-456' :
                                        formData.stkType === 'vakif' ? 'Vakıf sicil no' :
                                            formData.stkType === 'meslek_oda' ? 'Oda sicil no' :
                                                formData.stkType === 'kooperatif' ? 'Ticaret sicil no' :
                                                    'Resmi kayıt numarası'
                                }
                                className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                {formData.stkType === 'dernek' ? 'Dernekler için 7 haneli kütük numarası' :
                                    formData.stkType === 'vakif' ? 'Vakıflar Genel Müdürlüğü sicil numarası' :
                                        formData.stkType === 'meslek_oda' ? 'Bağlı bulunan birlik/oda sicil numarası' :
                                            'Resmi kuruluş belgesindeki kayıt numarası'}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Vergi No</label>
                                <input
                                    type="text"
                                    name="taxNumber"
                                    value={formData.taxNumber}
                                    onChange={handleChange}
                                    inputMode="numeric"
                                    maxLength={10}
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
                                    maxLength={4}
                                    inputMode="numeric"
                                    className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                />
                            </div>
                        </div>


                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-slate-300">Ana Faaliyet Alanı (Bir Adet Seçiniz) *</label>
                            {sectors.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-white/5 border border-white/10 rounded-lg max-h-60 overflow-y-auto custom-scrollbar">
                                    {sectors.map(s => (
                                        <label key={s.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors group">
                                            <input
                                                type="radio"
                                                name="primaryInterest"
                                                checked={formData.interests.includes(s.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setFormData(prev => ({ ...prev, interests: [s.id] }))
                                                    }
                                                }}
                                                className="w-4 h-4 border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50"
                                            />
                                            <span className="group-hover:translate-x-0.5 transition-transform">{s.name}</span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-slate-500 italic p-3 bg-white/5 border border-white/10 rounded-lg">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Yükleniyor...
                                </div>
                            )}
                            <p className="text-xs text-slate-500 mt-1">
                                STK'nızın resmi tüzüğünde belirtilen ana faaliyet alanını seçiniz.
                            </p>
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
                                    onChange={handleChange}
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
                                    {TURKEY_CITIES.map(city => (
                                        <option key={city} value={city} className="bg-slate-900">{city}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">İlçe *</label>
                                <input
                                    type="text"
                                    name="district"
                                    value={formData.district}
                                    onChange={handleChange}
                                    placeholder="İlçe giriniz"
                                    className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    required
                                />
                            </div>
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

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Web Sitesi</label>
                            <input
                                type="text"
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                placeholder="www.ornek.org"
                                pattern="^[a-zA-Z0-9\-\.\/:]*$"
                                title="Lütfen sadece İngilizce karakterler kullanın (Türkçe karakter içermemeli)"
                                className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                            <p className="text-xs text-slate-500 mt-1">Türkçe karakter (ö,ç,ş,ı,ğ,ü) kullanmayınız.</p>
                        </div>
                    </div>
                )

            case 3:
                return (
                    <div className="space-y-4">

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
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="acceptTermsCorporate"
                                    name="acceptTerms"
                                    checked={formData.acceptTerms}
                                    onChange={handleChange}
                                    className="mt-1 rounded border-white/20 bg-white/5 cursor-pointer"
                                    required
                                />
                                <label htmlFor="acceptTermsCorporate" className="text-sm text-slate-300 cursor-pointer">
                                    <a
                                        href="/kullanim-sartlari"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-emerald-400 hover:underline"
                                    >
                                        Kullanım Şartları
                                    </a>&apos;nı okudum ve kabul ediyorum. *
                                </label>
                            </div>
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="acceptKvkkCorporate"
                                    name="acceptKvkk"
                                    checked={formData.acceptKvkk}
                                    onChange={handleChange}
                                    className="mt-1 rounded border-white/20 bg-white/5 cursor-pointer"
                                    required
                                />
                                <label htmlFor="acceptKvkkCorporate" className="text-sm text-slate-300 cursor-pointer">
                                    <a
                                        href="/kvkk"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-emerald-400 hover:underline"
                                    >
                                        KVKK Aydınlatma Metni
                                    </a>&apos;ni okudum ve onaylıyorum. *
                                </label>
                            </div>
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    // Kurumsal Kayıt Formu (Wrapper)
    const renderCorporateForm = () => (
        <div className="max-w-2xl mx-auto px-4">
            <div className="text-center mb-8">
                <button
                    onClick={() => setAccountType(null)}
                    className="text-slate-500 hover:text-white mb-4 text-sm flex items-center justify-center gap-1 mx-auto transition-colors"
                >
                    ← Tür Seçimine Dön
                </button>
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
                                }`}></div>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Form */}
            <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                <form onSubmit={handleSubmit}>
                    {renderCorporateStep()}

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
            </div>
        </div>

    )

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col">
            <Navbar />

            <main className="flex-grow pt-32 pb-20">
                {!accountType ? renderAccountSelection() : (
                    accountType === 'individual' ? renderIndividualForm() : renderCorporateForm()
                )}
            </main>

            <Footer />

            <Dialog open={showMobileAppDialog} onOpenChange={setShowMobileAppDialog}>
                <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-400" />
                            </div>
                            Bireysel Üyelik
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-6 text-center">
                        <p className="text-slate-300 mb-6">
                            Bireysel üyelik ve bağış işlemleri artık sadece mobil uygulamamız üzerinden yapılmaktadır.
                        </p>
                        <div className="bg-white p-4 rounded-xl w-48 h-48 mx-auto mb-4 flex items-center justify-center">
                            {/* Placeholder for QR Code - using a mock visual */}
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300">
                                <span className="text-slate-400 text-xs">QR Code</span>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 mb-6">
                            Uygulamayı indirmek için QR kodu taratın veya aşağıdaki butona tıklayın.
                        </p>
                        <Button
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                            onClick={() => router.push('/vatandas')}
                        >
                            Uygulama İndirme Sayfası
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
