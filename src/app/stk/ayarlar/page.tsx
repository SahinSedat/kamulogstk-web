'use client'

import { useState, useEffect } from 'react'
import {
    Settings, Bell, Lock, Palette, Mail, Globe, Save, X,
    Eye, EyeOff, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general')
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        // Genel Ayarlar
        stkName: '',
        stkEmail: '',
        stkPhone: '',
        taxNumber: '',
        website: '',
        address: '',
        city: '',
        district: '',
        managerName: '',
        managerPhone: '',
        
        // Bildirim Ayarları
        emailNotifications: true,
        smsNotifications: false,
        systemNotifications: true,
        
        // Güvenlik Ayarları
        twoFactorAuth: false,
        sessionTimeout: '30',
        
        // Görünüm Ayarları
        theme: 'auto',
        language: 'tr',
    })

    // Veritabanından ayarları yükle
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/stk/settings')
                const data = await res.json()
                
                if (data.success && data.settings) {
                    setFormData(prev => ({
                        ...prev,
                        ...data.settings
                    }))
                } else {
                    setError(data.error || 'Ayarlar yüklenemedi')
                }
            } catch (err) {
                console.error('Error fetching settings:', err)
                setError('Ayarlar yüklenirken hata oluştu')
            } finally {
                setIsLoading(false)
            }
        }

        fetchSettings()
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target
        const checked = (e.target as HTMLInputElement).checked
        
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handleSave = async () => {
        setIsSaving(true)
        setError(null)
        try {
            const res = await fetch('/api/stk/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await res.json()

            if (data.success) {
                alert('Ayarlar başarıyla kaydedildi!')
            } else {
                setError(data.error || 'Bir hata oluştu')
                alert(data.error || 'Ayarlar kaydedilemedi')
            }
        } catch (error) {
            console.error('Error saving settings:', error)
            setError('Ayarlar kaydedilirken hata oluştu')
            alert('Bir hata oluştu')
        } finally {
            setIsSaving(false)
        }
    }

    const tabs = [
        { id: 'general', label: 'Genel', icon: Settings },
        { id: 'notifications', label: 'Bildirimler', icon: Bell },
        { id: 'security', label: 'Güvenlik', icon: Lock },
        { id: 'appearance', label: 'Görünüm', icon: Palette },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Ayarlar</h1>
                    <p className="text-slate-500 mt-1">STK ayarlarınızı yönetin</p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-red-700 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Loading */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
            ) : (
                <>
                    {/* Tabs */}
                    <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${
                                activeTab === 'general'
                                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            <Settings className="w-4 h-4" />
                            Genel
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${
                                activeTab === 'notifications'
                                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            <Bell className="w-4 h-4" />
                            Bildirimler
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${
                                activeTab === 'security'
                                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            <Lock className="w-4 h-4" />
                            Güvenlik
                        </button>
                        <button
                            onClick={() => setActiveTab('appearance')}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${
                                activeTab === 'appearance'
                                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                        >
                            <Palette className="w-4 h-4" />
                            Görünüm
                        </button>
                    </div>

                    {/* Genel Ayarlar */}
                    {activeTab === 'general' && (
                        <Card className="dark:bg-slate-800 dark:border-slate-700">
                            <CardHeader>
                                <CardTitle className="dark:text-white">Genel Ayarlar</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            STK Adı
                                        </label>
                                        <input
                                            type="text"
                                            name="stkName"
                                            value={formData.stkName}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Vergi Numarası
                                        </label>
                                        <input
                                            type="text"
                                            name="taxNumber"
                                            value={formData.taxNumber}
                                            onChange={handleInputChange}
                                            disabled
                                            className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white opacity-50"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">Vergi numarası değiştirilemez</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            STK E-postası
                                        </label>
                                        <input
                                            type="email"
                                            name="stkEmail"
                                            value={formData.stkEmail}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Telefon Numarası
                                        </label>
                                        <input
                                            type="tel"
                                            name="stkPhone"
                                            value={formData.stkPhone}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Website
                                        </label>
                                        <input
                                            type="url"
                                            name="website"
                                            value={formData.website}
                                            onChange={handleInputChange}
                                            placeholder="https://example.com"
                                            className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="border-t dark:border-slate-700 pt-6">
                                    <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Adres Bilgileri</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                Adres
                                            </label>
                                            <input
                                                type="text"
                                                name="address"
                                                value={formData.address}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    Şehir
                                                </label>
                                                <input
                                                    type="text"
                                                    name="city"
                                                    value={formData.city}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    İlçe
                                                </label>
                                                <input
                                                    type="text"
                                                    name="district"
                                                    value={formData.district}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t dark:border-slate-700 pt-6">
                                    <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Yönetici Bilgileri</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                Yönetici Adı
                                            </label>
                                            <input
                                                type="text"
                                                name="managerName"
                                                value={formData.managerName}
                                                onChange={handleInputChange}
                                                disabled
                                                className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white opacity-50"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">Başkan bilgileri otomatik olarak yüklenir</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                Yönetici Telefonu
                                            </label>
                                            <input
                                                type="tel"
                                                name="managerPhone"
                                                value={formData.managerPhone}
                                                onChange={handleInputChange}
                                                disabled
                                                className="w-full px-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white opacity-50"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">Başkan bilgileri otomatik olarak yüklenir</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Bildirim Ayarları */}
                    {activeTab === 'notifications' && (
                        <Card className="dark:bg-slate-800 dark:border-slate-700">
                            <CardHeader>
                                <CardTitle className="dark:text-white">Bildirim Ayarları</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex flex-col justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors h-full">
                                        <div className="flex items-start gap-3 mb-4">
                                            <Mail className="w-5 h-5 text-slate-600 dark:text-slate-300 mt-1" />
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">E-posta Bildirimleri</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Tüm e-posta bildirimlerini alın</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <input
                                                type="checkbox"
                                                name="emailNotifications"
                                                checked={formData.emailNotifications}
                                                onChange={handleInputChange}
                                                className="w-5 h-5 rounded cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors h-full">
                                        <div className="flex items-start gap-3 mb-4">
                                            <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300 mt-1" />
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">SMS Bildirimleri</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Acil durumlarda SMS alın</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <input
                                                type="checkbox"
                                                name="smsNotifications"
                                                checked={formData.smsNotifications}
                                                onChange={handleInputChange}
                                                className="w-5 h-5 rounded cursor-pointer"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors h-full">
                                        <div className="flex items-start gap-3 mb-4">
                                            <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300 mt-1" />
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">Sistem Bildirimleri</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Uygulama içi notifications</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <input
                                                type="checkbox"
                                                name="systemNotifications"
                                                checked={formData.systemNotifications}
                                                onChange={handleInputChange}
                                                className="w-5 h-5 rounded cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Güvenlik Ayarları */}
                    {activeTab === 'security' && (
                        <Card className="dark:bg-slate-800 dark:border-slate-700">
                            <CardHeader>
                                <CardTitle className="dark:text-white">Güvenlik Ayarları</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">İki Faktörlü Kimlik Doğrulama</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Hesabınızı daha güvenli hale getirin</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        name="twoFactorAuth"
                                        checked={formData.twoFactorAuth}
                                        onChange={handleInputChange}
                                        className="w-5 h-5 rounded"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Oturum Zaman Aşımı (dakika)
                                    </label>
                                    <select
                                        name="sessionTimeout"
                                        value={formData.sessionTimeout}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    >
                                        <option value="15">15 dakika</option>
                                        <option value="30">30 dakika</option>
                                        <option value="60">1 saat</option>
                                        <option value="120">2 saat</option>
                                    </select>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Görünüm Ayarları */}
                    {activeTab === 'appearance' && (
                        <Card className="dark:bg-slate-800 dark:border-slate-700">
                            <CardHeader>
                                <CardTitle className="dark:text-white">Görünüm Ayarları</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Tema
                                    </label>
                                    <select
                                        name="theme"
                                        value={formData.theme}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    >
                                        <option value="auto">Otomatik</option>
                                        <option value="light">Açık</option>
                                        <option value="dark">Koyu</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Dil
                                    </label>
                                    <select
                                        name="language"
                                        value={formData.language}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    >
                                        <option value="tr">Türkçe</option>
                                        <option value="en">English</option>
                                        <option value="de">Deutsch</option>
                                    </select>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Save Button */}
                    <div className="flex justify-end gap-3">
                        <Button variant="outline">
                            <X className="w-4 h-4 mr-2" />
                            İptal
                        </Button>
                        <Button 
                            onClick={handleSave} 
                            disabled={isSaving || isLoading}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}
