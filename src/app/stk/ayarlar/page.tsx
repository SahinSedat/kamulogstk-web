'use client'

import React, { useState } from 'react'
import {
    Settings, Bell, Lock, CreditCard, Globe,
    Moon, Sun, Save, CheckCircle2, Mail, Smartphone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function STKSettingsPage() {
    const [notifications, setNotifications] = useState({
        email: true,
        sms: false,
        newMember: true,
        payment: true,
        reminder: true,
    })

    const [saved, setSaved] = useState(false)

    const handleSave = () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ayarlar</h1>
                    <p className="text-slate-500">Platform ayarlarınızı özelleştirin</p>
                </div>
                <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                    {saved ? (
                        <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Kaydedildi
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Kaydet
                        </>
                    )}
                </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Settings */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Notifications */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="w-5 h-5" />
                                Bildirim Ayarları
                            </CardTitle>
                            <CardDescription>Hangi bildirimleri almak istediğinizi seçin</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-slate-400" />
                                    <div>
                                        <div className="font-medium text-slate-900 dark:text-white">E-posta Bildirimleri</div>
                                        <div className="text-sm text-slate-500">Önemli güncellemeleri e-posta ile alın</div>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notifications.email}
                                        onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Smartphone className="w-5 h-5 text-slate-400" />
                                    <div>
                                        <div className="font-medium text-slate-900 dark:text-white">SMS Bildirimleri</div>
                                        <div className="text-sm text-slate-500">Acil durumları SMS ile alın</div>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notifications.sms}
                                        onChange={(e) => setNotifications({ ...notifications, sms: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>

                            <div className="border-t dark:border-slate-700 pt-4">
                                <h4 className="font-medium text-slate-900 dark:text-white mb-4">Bildirim Türleri</h4>
                                <div className="space-y-3">
                                    {[
                                        { key: 'newMember', label: 'Yeni üye başvuruları' },
                                        { key: 'payment', label: 'Ödeme bildirimleri' },
                                        { key: 'reminder', label: 'Aidat hatırlatmaları' },
                                    ].map((item) => (
                                        <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={notifications[item.key as keyof typeof notifications]}
                                                onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                                                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                                            />
                                            <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="w-5 h-5" />
                                Güvenlik
                            </CardTitle>
                            <CardDescription>Hesap güvenlik ayarlarınızı yönetin</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <div>
                                    <div className="font-medium text-slate-900 dark:text-white">Şifre Değiştir</div>
                                    <div className="text-sm text-slate-500">Son değişiklik: 30 gün önce</div>
                                </div>
                                <Button variant="outline">Değiştir</Button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <div>
                                    <div className="font-medium text-slate-900 dark:text-white">İki Faktörlü Doğrulama</div>
                                    <div className="text-sm text-slate-500">Ek güvenlik katmanı ekleyin</div>
                                </div>
                                <Button variant="outline">Etkinleştir</Button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <div>
                                    <div className="font-medium text-slate-900 dark:text-white">Oturum Geçmişi</div>
                                    <div className="text-sm text-slate-500">Aktif oturumları görüntüleyin</div>
                                </div>
                                <Button variant="outline">Görüntüle</Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Ödeme Ayarları
                            </CardTitle>
                            <CardDescription>Fatura ve ödeme bilgilerinizi yönetin</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-xs font-bold">
                                        VISA
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-900 dark:text-white">•••• •••• •••• 4242</div>
                                        <div className="text-sm text-slate-500">Son kullanma: 12/28</div>
                                    </div>
                                </div>
                                <Button variant="outline">Güncelle</Button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <div>
                                    <div className="font-medium text-slate-900 dark:text-white">Fatura Adresi</div>
                                    <div className="text-sm text-slate-500">İstanbul, Türkiye</div>
                                </div>
                                <Button variant="outline">Düzenle</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Appearance */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sun className="w-5 h-5" />
                                Görünüm
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <button className="p-4 bg-white border-2 border-emerald-500 rounded-lg text-center">
                                    <Sun className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                                    <span className="text-sm font-medium">Açık</span>
                                </button>
                                <button className="p-4 bg-slate-800 border-2 border-transparent rounded-lg text-center">
                                    <Moon className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                                    <span className="text-sm font-medium text-white">Koyu</span>
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Language */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="w-5 h-5" />
                                Dil
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <select className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700">
                                <option value="tr">🇹🇷 Türkçe</option>
                                <option value="en">🇬🇧 English</option>
                            </select>
                        </CardContent>
                    </Card>

                    {/* Danger Zone */}
                    <Card className="border-red-200 dark:border-red-900">
                        <CardHeader>
                            <CardTitle className="text-red-600">Tehlikeli Bölge</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                                Hesabı Dondur
                            </Button>
                            <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                                Hesabı Sil
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
