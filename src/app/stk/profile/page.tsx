'use client'

import React, { useState } from 'react'
import {
    Building2, Users, FileText, Calendar,
    MapPin, Phone, Mail, Globe, Edit, Save, X,
    CheckCircle2, AlertCircle, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Mock STK data
const stkData = {
    name: 'Örnek Sivil Toplum Kuruluşu',
    type: 'Dernek',
    taxNumber: '1234567890',
    foundationYear: '2020',
    registrationNumber: 'DER-2020-12345',
    status: 'active',
    address: 'Atatürk Cad. No:123 Kadıköy',
    city: 'İstanbul',
    phone: '+90 216 000 00 00',
    email: 'info@ornekstk.org',
    website: 'https://www.ornekstk.org',
    description: 'Toplumsal fayda odaklı çalışmalar yapan sivil toplum kuruluşu.',
    memberCount: 1250,
    boardMemberCount: 7,
    foundedDate: '15 Mart 2020',
}

const packageInfo = {
    name: 'Profesyonel',
    expiryDate: '15 Mart 2027',
    maxMembers: 5000,
    features: ['Sınırsız üye', 'AI Analiz', 'Online tahsilat', 'Raporlama', 'API erişimi'],
}

export default function STKProfilePage() {
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState(stkData)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSave = () => {
        // API call would go here
        setIsEditing(false)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">STK Profili</h1>
                    <p className="text-slate-500">Kuruluş bilgilerinizi görüntüleyin ve düzenleyin</p>
                </div>
                <div>
                    {isEditing ? (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                                <X className="w-4 h-4 mr-2" />
                                İptal
                            </Button>
                            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                                <Save className="w-4 h-4 mr-2" />
                                Kaydet
                            </Button>
                        </div>
                    ) : (
                        <Button onClick={() => setIsEditing(true)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Düzenle
                        </Button>
                    )}
                </div>
            </div>

            {/* Status Card */}
            <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 border-0">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                                <Building2 className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{formData.name}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-white text-sm">
                                        {formData.type}
                                    </span>
                                    <span className="flex items-center gap-1 text-white/80 text-sm">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Aktif
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-6 text-center">
                            <div>
                                <div className="text-2xl font-bold text-white">{formData.memberCount}</div>
                                <div className="text-white/70 text-sm">Üye</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white">{formData.boardMemberCount}</div>
                                <div className="text-white/70 text-sm">YK Üyesi</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white">{formData.foundationYear}</div>
                                <div className="text-white/70 text-sm">Kuruluş</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Temel Bilgiler
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 mb-1">Kuruluş Adı</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                        />
                                    ) : (
                                        <p className="text-slate-900 dark:text-white">{formData.name}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 mb-1">Kuruluş Türü</label>
                                    {isEditing ? (
                                        <select
                                            name="type"
                                            value={formData.type}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                        >
                                            <option>Dernek</option>
                                            <option>Vakıf</option>
                                            <option>Sendika</option>
                                            <option>Kooperatif</option>
                                        </select>
                                    ) : (
                                        <p className="text-slate-900 dark:text-white">{formData.type}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 mb-1">Vergi Numarası</label>
                                    <p className="text-slate-900 dark:text-white">{formData.taxNumber}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 mb-1">Sicil Numarası</label>
                                    <p className="text-slate-900 dark:text-white">{formData.registrationNumber}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-500 mb-1">Açıklama</label>
                                {isEditing ? (
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                    />
                                ) : (
                                    <p className="text-slate-900 dark:text-white">{formData.description}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="w-5 h-5" />
                                İletişim Bilgileri
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <Phone className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <label className="block text-sm text-slate-500">Telefon</label>
                                        {isEditing ? (
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                            />
                                        ) : (
                                            <p className="text-slate-900 dark:text-white">{formData.phone}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <label className="block text-sm text-slate-500">E-posta</label>
                                        {isEditing ? (
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                            />
                                        ) : (
                                            <p className="text-slate-900 dark:text-white">{formData.email}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Globe className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <label className="block text-sm text-slate-500">Web Sitesi</label>
                                        {isEditing ? (
                                            <input
                                                type="url"
                                                name="website"
                                                value={formData.website}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                            />
                                        ) : (
                                            <a href={formData.website} className="text-emerald-600 hover:underline">{formData.website}</a>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <label className="block text-sm text-slate-500">Adres</label>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                name="address"
                                                value={formData.address}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                            />
                                        ) : (
                                            <p className="text-slate-900 dark:text-white">{formData.address}, {formData.city}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Abonelik Bilgileri
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">{packageInfo.name}</span>
                                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-full text-xs">
                                        Aktif
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                        <Clock className="w-4 h-4" />
                                        Bitiş: {packageInfo.expiryDate}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                        <Users className="w-4 h-4" />
                                        Maks. {packageInfo.maxMembers} üye
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-white mb-2">Özellikler</h4>
                                <ul className="space-y-2">
                                    {packageInfo.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Button className="w-full" variant="outline">
                                Paketi Yükselt
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                Hızlı İşlemler
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="outline" className="w-full justify-start">
                                <Users className="w-4 h-4 mr-2" />
                                Yönetim Kurulu
                            </Button>
                            <Button variant="outline" className="w-full justify-start">
                                <FileText className="w-4 h-4 mr-2" />
                                Belgeler
                            </Button>
                            <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                Hesabı Dondur
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
