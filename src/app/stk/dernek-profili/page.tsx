"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Building2, Users, FileText, Upload, Calendar, MapPin,
    Phone, Mail, Globe, Hash, Save, Check, AlertCircle
} from 'lucide-react'

interface BoardMember {
    id: string
    name: string
    position: string
    email: string | null
    phone: string | null
    isActive: boolean
}

interface STKProfile {
    id: string
    name: string
    type: string
    status: string
    registrationNumber: string | null
    taxNumber: string | null
    email: string
    phone: string
    website: string | null
    address: string
    city: string
    district: string | null
    postalCode: string | null
    foundedAt: string | null
    description: string | null
    statuteFile: string | null
    statuteUploadedAt: string | null
    boardMembers: BoardMember[]
    _count: {
        members: number
        boardDecisions: number
    }
}

const positionLabels: Record<string, string> = {
    PRESIDENT: 'Başkan',
    VICE_PRESIDENT: 'Başkan Yardımcısı',
    SECRETARY: 'Genel Sekreter',
    TREASURER: 'Sayman',
    MEMBER: 'Üye',
    AUDITOR: 'Denetçi'
}

export default function AssociationPage() {
    const [stk, setStk] = useState<STKProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [formData, setFormData] = useState({
        name: '',
        registrationNumber: '',
        taxNumber: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        city: '',
        district: '',
        postalCode: '',
        foundedAt: '',
        description: ''
    })

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/stk/association')
            const data = await res.json()
            if (data.stk) {
                setStk(data.stk)
                setFormData({
                    name: data.stk.name || '',
                    registrationNumber: data.stk.registrationNumber || '',
                    taxNumber: data.stk.taxNumber || '',
                    email: data.stk.email || '',
                    phone: data.stk.phone || '',
                    website: data.stk.website || '',
                    address: data.stk.address || '',
                    city: data.stk.city || '',
                    district: data.stk.district || '',
                    postalCode: data.stk.postalCode || '',
                    foundedAt: data.stk.foundedAt ? data.stk.foundedAt.split('T')[0] : '',
                    description: data.stk.description || ''
                })
            }
        } catch (error) {
            console.error('Fetch error:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/stk/association', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            if (res.ok) {
                const data = await res.json()
                setStk(prev => prev ? { ...prev, ...data.stk } : null)
                setEditMode(false)
                setSuccess(true)
                setTimeout(() => setSuccess(false), 3000)
            }
        } catch (error) {
            console.error('Save error:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleStatuteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.type !== 'application/pdf') {
            alert('Sadece PDF dosyaları kabul edilir')
            return
        }

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch('/api/stk/association/statute', {
                method: 'POST',
                body: formData
            })

            if (res.ok) {
                const data = await res.json()
                setStk(prev => prev ? {
                    ...prev,
                    statuteFile: data.statuteFile,
                    statuteUploadedAt: data.statuteUploadedAt
                } : null)
            }
        } catch (error) {
            console.error('Upload error:', error)
        } finally {
            setUploading(false)
        }
    }

    if (loading) {
        return <div className="text-center py-8">Yükleniyor...</div>
    }

    if (!stk) {
        return <div className="text-center py-8">Dernek bilgisi bulunamadı</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dernek Profili</h1>
                    <p className="text-slate-500 mt-1">Kurumsal bilgilerinizi yönetin</p>
                </div>
                {success && (
                    <Badge variant="success" className="gap-1">
                        <Check className="w-4 h-4" />
                        Kaydedildi
                    </Badge>
                )}
            </div>

            {/* Özet Kartlar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Kuruluş</p>
                            <p className="font-semibold">
                                {stk.foundedAt
                                    ? new Date(stk.foundedAt).toLocaleDateString('tr-TR')
                                    : 'Belirtilmemiş'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Aktif Üye</p>
                            <p className="text-2xl font-bold">{stk._count.members}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                            <FileText className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">YK Kararları</p>
                            <p className="text-2xl font-bold">{stk._count.boardDecisions}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tüzük */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Tüzük Belgesi
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleStatuteUpload}
                    />
                    {stk.statuteFile ? (
                        <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="font-medium">Tüzük Yüklendi</p>
                                    <p className="text-sm text-slate-500">
                                        {stk.statuteUploadedAt && new Date(stk.statuteUploadedAt).toLocaleDateString('tr-TR')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => window.open(stk.statuteFile!, '_blank')}>
                                    Görüntüle
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                >
                                    {uploading ? 'Yükleniyor...' : 'Güncelle'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                            <p className="text-slate-600 dark:text-slate-400 mb-2">
                                Tüzük dosyanızı buraya sürükleyin veya tıklayın
                            </p>
                            <p className="text-sm text-slate-500">Sadece PDF (maks. 10MB)</p>
                            {uploading && <p className="text-blue-600 mt-2">Yükleniyor...</p>}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Profil Bilgileri */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Kurumsal Bilgiler</CardTitle>
                        {!editMode ? (
                            <Button variant="outline" onClick={() => setEditMode(true)}>
                                Düzenle
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setEditMode(false)}>İptal</Button>
                                <Button onClick={handleSave} disabled={saving} className="gap-1">
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-medium text-slate-500 mb-1 block">Dernek Adı</label>
                            {editMode ? (
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            ) : (
                                <p className="font-medium flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-slate-400" />
                                    {stk.name}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-500 mb-1 block">Dernek Kodu / Tescil No</label>
                            {editMode ? (
                                <Input
                                    value={formData.registrationNumber}
                                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                                    placeholder="34-123-456"
                                />
                            ) : (
                                <p className="font-medium flex items-center gap-2">
                                    <Hash className="w-4 h-4 text-slate-400" />
                                    {stk.registrationNumber || '-'}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-500 mb-1 block">Kuruluş Tarihi</label>
                            {editMode ? (
                                <Input
                                    type="date"
                                    value={formData.foundedAt}
                                    onChange={(e) => setFormData({ ...formData, foundedAt: e.target.value })}
                                />
                            ) : (
                                <p className="font-medium flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    {stk.foundedAt ? new Date(stk.foundedAt).toLocaleDateString('tr-TR') : '-'}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-500 mb-1 block">Vergi No</label>
                            {editMode ? (
                                <Input
                                    value={formData.taxNumber}
                                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                                />
                            ) : (
                                <p className="font-medium">{stk.taxNumber || '-'}</p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-500 mb-1 block">E-posta</label>
                            {editMode ? (
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            ) : (
                                <p className="font-medium flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    {stk.email}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-500 mb-1 block">Telefon</label>
                            {editMode ? (
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            ) : (
                                <p className="font-medium flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    {stk.phone}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-500 mb-1 block">Web Sitesi</label>
                            {editMode ? (
                                <Input
                                    value={formData.website}
                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                    placeholder="https://..."
                                />
                            ) : (
                                <p className="font-medium flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-slate-400" />
                                    {stk.website || '-'}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-500 mb-1 block">Şehir</label>
                            {editMode ? (
                                <Input
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                />
                            ) : (
                                <p className="font-medium flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    {stk.city}
                                </p>
                            )}
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium text-slate-500 mb-1 block">Adres</label>
                            {editMode ? (
                                <Input
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            ) : (
                                <p className="font-medium">{stk.address}</p>
                            )}
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium text-slate-500 mb-1 block">Açıklama</label>
                            {editMode ? (
                                <textarea
                                    className="w-full min-h-[100px] p-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            ) : (
                                <p className="text-slate-600 dark:text-slate-400">{stk.description || '-'}</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Yönetim Kurulu */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Yönetim Kurulu ({stk.boardMembers.length})
                        </CardTitle>
                        <Button variant="outline" onClick={() => window.location.href = '/stk/board'}>
                            Detaylı Yönet
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {stk.boardMembers.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Henüz yönetim kurulu üyesi eklenmemiş</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stk.boardMembers.map(member => (
                                <div key={member.id} className="p-4 border border-slate-200 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-medium">
                                            {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </div>
                                        <div>
                                            <p className="font-medium">{member.name}</p>
                                            <Badge variant="default" className="text-xs">
                                                {positionLabels[member.position] || member.position}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
