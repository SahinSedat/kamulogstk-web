"use client"

import React, { useState, useEffect } from 'react'
import { Search, Users, Edit2, Trash2, X, Check, Loader2, ChevronLeft, ChevronRight, Filter, Building2, UserCircle, Calendar, CreditCard, Clock, MapPin, Phone, Mail, Briefcase, GraduationCap, Shield, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface User {
    id: string
    name: string
    email: string
    phone: string | null
    role: string
    status: string
    address: string | null
    city: string | null
    district: string | null
    occupation: string | null
    workplace: string | null
    education: string | null
    preferredCity: string | null
    createdAt: string
    gender: string | null
    birthDate: string | null
    registrationPurpose: string | null
    isStkOfficial: boolean
    stkOfficialRole: string | null
    isStkMember: boolean
    memberStkName: string | null
    boardPosition: string | null
    emailVerified: string | null
    lastLoginAt: string | null
    stk: { id: string; name: string } | null
    interests: { sector: { name: string } }[]
    memberships: {
        stkName: string
        status: string
        joinDate: string | null
        leaveDate: string | null
    }[]
    stats: {
        totalDonations: number
        yearsInSystem: string
        membershipCount: number
        isDonor: boolean
    }
}

const roleLabels: Record<string, string> = {
    ADMIN: 'Sistem Yöneticisi',
    STK_MANAGER: 'STK Yöneticisi',
    CITIZEN: 'Bireysel Üye',
    MEMBER: 'STK Üyesi'
}

const roleColors: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    STK_MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    CITIZEN: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    MEMBER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
}

const statusLabels: Record<string, string> = {
    ACTIVE: 'Aktif',
    INACTIVE: 'Pasif',
    PENDING: 'Beklemede',
    SUSPENDED: 'Askıya Alındı'
}

const statusColors: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    INACTIVE: 'bg-slate-100 text-slate-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    SUSPENDED: 'bg-red-100 text-red-700'
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [membershipStatusFilter, setMembershipStatusFilter] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    // Edit dialog
    const [editUser, setEditUser] = useState<User | null>(null)
    const [editForm, setEditForm] = useState<any>({})
    const [saving, setSaving] = useState(false)

    // Delete dialog
    const [deleteUser, setDeleteUser] = useState<User | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    // Detail dialog
    const [viewUser, setViewUser] = useState<User | null>(null)

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (search) params.append('search', search)
            if (roleFilter !== 'all') params.append('role', roleFilter)
            if (membershipStatusFilter) params.append('membershipStatus', membershipStatusFilter)
            params.append('page', page.toString())

            const res = await fetch(`/api/admin/users?${params.toString()}`)
            const data = await res.json()

            if (data.success) {
                setUsers(data.users)
                setTotalPages(data.pagination.totalPages)
                setTotal(data.pagination.total)
            }
        } catch (error) {
            console.error('Kullanıcılar yüklenirken hata:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timeout = setTimeout(fetchUsers, 300)
        return () => clearTimeout(timeout)
    }, [search, roleFilter, membershipStatusFilter, page])

    const handleEdit = (user: User) => {
        setEditUser(user)
        setEditForm({
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            role: user.role,
            status: user.status || 'PENDING',
            city: user.city || '',
            district: user.district || '',
            address: user.address || '',
            occupation: user.occupation || '',
            workplace: user.workplace || '',
            education: user.education || '',
            preferredCity: user.preferredCity || ''
        })
    }

    const handleSave = async () => {
        if (!editUser) return
        setSaving(true)
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editUser.id, ...editForm })
            })
            const data = await res.json()
            if (data.success) {
                setEditUser(null)
                fetchUsers()
            }
        } catch (error) {
            console.error('Güncelleme hatası:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleMembershipAction = async (memberId: string, status: string, reviewNotes?: string) => {
        try {
            const res = await fetch('/api/admin/memberships', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId, status, reviewNotes })
            })
            const data = await res.json()
            if (data.success) {
                fetchUsers()
            } else {
                alert(data.error || 'İşlem başarısız')
            }
        } catch (error) {
            console.error('İşlem hatası:', error)
            alert('Bir hata oluştu')
        }
    }

    const handleDelete = async () => {
        if (!deleteUser) return
        setDeleting(true)
        setDeleteError(null)
        try {
            const res = await fetch(`/api/admin/users?id=${deleteUser.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (data.success) {
                setDeleteUser(null)
                fetchUsers()
            } else {
                setDeleteError(data.error || 'Silme işlemi başarısız oldu')
            }
        } catch (error) {
            console.error('Silme hatası:', error)
            setDeleteError('Bir hata oluştu')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Users className="w-7 h-7 text-blue-600" />
                        Tüm Üyeler
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Sistemdeki tüm kullanıcıları yönetin ({total} kullanıcı)
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Tabs defaultValue="all" className="w-full mb-6" onValueChange={(val) => {
                if (val === 'all') {
                    setRoleFilter('all')
                    // Reset membership status filter by refetching with default params
                    // We need to update fetchUsers to use state or args properly
                    // Let's rely on state. We'll introduce a new state `membershipStatusFilter`
                } else if (val === 'pending') {
                    // This tab implies filtering by membershipStatus=APPLIED
                }
            }}>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <TabsList>
                        <TabsTrigger value="active" onClick={() => { setRoleFilter('all'); setMembershipStatusFilter(null); setPage(1) }}>Tüm Kullanıcılar</TabsTrigger>
                        <TabsTrigger value="pending" onClick={() => { setRoleFilter('all'); setMembershipStatusFilter('APPLIED'); setPage(1) }}>Bekleyen Başvurular</TabsTrigger>
                        <TabsTrigger value="resignation" onClick={() => { setRoleFilter('all'); setMembershipStatusFilter('RESIGNATION_REQ'); setPage(1) }}>İstifa Talepleri</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                            placeholder="İsim, e-posta veya telefon ara..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                            className="pl-10"
                        />
                    </div>
                </div>
            </Tabs>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        Kullanıcı bulunamadı
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Ad Soyad</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">E-posta</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Telefon</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Rol</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Cinsiyet</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Doğum Tarihi</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Meslek</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">İş Yeri</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Eğitim</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">İl</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">İlçe</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Adres</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">STK Yetkilisi</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">STK Üyesi</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">Kayıt Tarihi</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky right-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-l">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                <Mail className="w-3 h-3" /> {user.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.phone ? (
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                    <Phone className="w-3 h-3" /> {user.phone}
                                                </div>
                                            ) : <span className="text-slate-400">-</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="space-y-1">
                                                {user.isStkOfficial ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                            STK Yöneticisi
                                                        </span>
                                                        {user.boardPosition && (
                                                            <span className="text-[10px] text-slate-500 pl-1">
                                                                {user.boardPosition}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : user.isStkMember ? (
                                                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                        STK Üyesi
                                                    </span>
                                                ) : (
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${roleColors[user.role]}`}>
                                                        {roleLabels[user.role] || user.role}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-slate-600 dark:text-slate-400">{user.gender || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-slate-600 dark:text-slate-400">
                                                {user.birthDate ? new Date(user.birthDate).toLocaleDateString('tr-TR') : '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-slate-600 dark:text-slate-400">{user.occupation || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-slate-600 dark:text-slate-400">{user.workplace || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-slate-600 dark:text-slate-400">{user.education || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-slate-600 dark:text-slate-400">{user.city || user.preferredCity || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-slate-600 dark:text-slate-400">{user.district || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-600 dark:text-slate-400 text-xs line-clamp-2 max-w-[150px]" title={user.address || ''}>
                                                {user.address || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.isStkOfficial ? (
                                                <div className="flex flex-col">
                                                    <span className="text-emerald-600 font-medium text-xs">Evet</span>
                                                    {user.memberStkName && (
                                                        <span className="text-[10px] text-slate-500 mt-0.5">
                                                            ({user.memberStkName})
                                                        </span>
                                                    )}
                                                </div>
                                            ) : <span className="text-slate-400 text-xs">Hayır</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {(user.isStkMember || user.isStkOfficial) ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-emerald-600 font-medium text-xs">Evet</span>
                                                    {user.memberStkName && (
                                                        <span className="text-[10px] text-slate-500 mt-0.5">
                                                            ({user.memberStkName})
                                                        </span>
                                                    )}
                                                </div>
                                            ) : <span className="text-slate-400 text-xs">Hayır</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-slate-500 text-xs">
                                                {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 sticky right-0 bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 shadow-l">
                                            <div className="flex items-center justify-end gap-2">
                                                {membershipStatusFilter === 'APPLIED' && (
                                                    // Find the specific applied membership
                                                    (() => {
                                                        const appliedMember = user.memberships.find(m => m.status === 'APPLIED')
                                                        if (appliedMember) return (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2 text-xs"
                                                                    onClick={() => handleMembershipAction((appliedMember as any).id, 'ACTIVE')}
                                                                >
                                                                    Onayla
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    className="h-8 px-2 text-xs"
                                                                    onClick={() => {
                                                                        const reason = prompt('Red sebebini giriniz:')
                                                                        if (reason !== null) {
                                                                            handleMembershipAction((appliedMember as any).id, 'REJECTED', reason)
                                                                        }
                                                                    }}
                                                                >
                                                                    Reddet
                                                                </Button>
                                                            </>
                                                        )
                                                        return null
                                                    })()
                                                )}

                                                {membershipStatusFilter === 'RESIGNATION_REQ' && (
                                                    // Find the resignation request
                                                    (() => {
                                                        const resignedMember = user.memberships.find(m => m.status === 'RESIGNATION_REQ')
                                                        if (resignedMember) return (
                                                            <Button
                                                                size="sm"
                                                                className="bg-red-600 hover:bg-red-700 text-white h-8 px-2 text-xs"
                                                                onClick={() => {
                                                                    if (confirm('İstifa talebini onaylıyor musunuz?')) {
                                                                        handleMembershipAction((resignedMember as any).id, 'RESIGNED')
                                                                    }
                                                                }}
                                                            >
                                                                İstifayı Onayla
                                                            </Button>
                                                        )
                                                        return null
                                                    })()
                                                )}

                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => setViewUser(user)}
                                                    className="h-8 px-2 text-xs"
                                                >
                                                    Detay
                                                </Button>
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 transition-colors"
                                                    title="Düzenle"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => { setDeleteUser(user); setDeleteError(null); }}
                                                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-sm text-slate-500">
                            Sayfa {page} / {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Kullanıcıyı Düzenle</DialogTitle>
                        <DialogDescription>
                            {editUser?.name} kullanıcısının bilgilerini güncelleyin.
                        </DialogDescription>
                    </DialogHeader>

                    {editUser && (
                        <Tabs defaultValue="account" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="account">Hesap Bilgileri</TabsTrigger>
                                <TabsTrigger value="profile">Profil Detayları</TabsTrigger>
                            </TabsList>
                            <TabsContent value="account" className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-sm font-medium">Ad Soyad</label>
                                        <Input
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">E-posta</label>
                                        <Input
                                            type="email"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Telefon</label>
                                        <Input
                                            value={editForm.phone}
                                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Rol</label>
                                        <select
                                            value={editForm.role}
                                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                            className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
                                        >
                                            <option value="ADMIN">Sistem Yöneticisi</option>
                                            <option value="STK_MANAGER">STK Yöneticisi</option>
                                            <option value="CITIZEN">Bireysel Üye</option>
                                            <option value="MEMBER">STK Üyesi</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Durum</label>
                                        <select
                                            value={editForm.status}
                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                            className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-transparent text-sm"
                                        >
                                            <option value="ACTIVE">Aktif</option>
                                            <option value="INACTIVE">Pasif</option>
                                            <option value="PENDING">Beklemede</option>
                                            <option value="SUSPENDED">Askıya Alınmış</option>
                                        </select>
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="profile" className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Şehir</label>
                                        <Input
                                            value={editForm.city}
                                            onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                            placeholder="Örn: İstanbul"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">İlçe</label>
                                        <Input
                                            value={editForm.district}
                                            onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                                            placeholder="Örn: Kadıköy"
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-sm font-medium">Tam Adres</label>
                                        <Input
                                            value={editForm.address}
                                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Meslek</label>
                                        <Input
                                            value={editForm.occupation}
                                            onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">İş Yeri</label>
                                        <Input
                                            value={editForm.workplace}
                                            onChange={(e) => setEditForm({ ...editForm, workplace: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-sm font-medium">Eğitim Durumu</label>
                                        <Input
                                            value={editForm.education}
                                            onChange={(e) => setEditForm({ ...editForm, education: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditUser(null)}>İptal</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                            Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={!!deleteUser} onOpenChange={() => { setDeleteUser(null); setDeleteError(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Kullanıcıyı Sil
                        </DialogTitle>
                        <DialogDescription>
                            <strong>{deleteUser?.name}</strong> isimli kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                        </DialogDescription>
                    </DialogHeader>

                    {deleteError && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Silme Başarısız</AlertTitle>
                            <AlertDescription>{deleteError}</AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setDeleteUser(null); setDeleteError(null); }}>İptal</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            Sil
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog open={!!viewUser} onOpenChange={() => setViewUser(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Kullanıcı Detayları</DialogTitle>
                        <DialogDescription>
                            Kullanıcı hakkında detaylı bilgi
                        </DialogDescription>
                    </DialogHeader>
                    {viewUser && (
                        <div className="space-y-6">
                            {/* Üst Bilgi Kartı */}
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <UserCircle className="w-8 h-8" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{viewUser.name}</h3>
                                    <div className="text-sm text-slate-500 space-y-1 mt-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">E-posta:</span> {viewUser.email}
                                        </div>
                                        {viewUser.phone && (
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">Telefon:</span> {viewUser.phone}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">Rol:</span>
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[viewUser.role]}`}>
                                                {roleLabels[viewUser.role] || viewUser.role}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right text-sm text-slate-500">
                                    <div>Kayıt: {new Date(viewUser.createdAt).toLocaleDateString('tr-TR')}</div>
                                </div>
                            </div>

                            {/* Kişisel & STK Detayları */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                                    <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                        <UserCircle className="w-4 h-4 text-slate-500" /> Kişisel Bilgiler
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Cinsiyet:</span>
                                            <span className="font-medium">{viewUser.gender || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Doğum Tarihi:</span>
                                            <span className="font-medium">
                                                {viewUser.birthDate ? new Date(viewUser.birthDate).toLocaleDateString('tr-TR') : '-'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Eğitim:</span>
                                            <span className="font-medium">{viewUser.education || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Meslek:</span>
                                            <span className="font-medium">{viewUser.occupation || '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                                    <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-slate-500" /> STK İlişkileri (Beyan)
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">STK Yetkilisi mi?:</span>
                                            <span className={viewUser.isStkOfficial ? "text-emerald-600 font-medium" : "text-slate-500"}>
                                                {viewUser.isStkOfficial ? 'Evet' : 'Hayır'}
                                            </span>
                                        </div>
                                        {viewUser.isStkOfficial && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Görevi:</span>
                                                <span className="font-medium">{viewUser.stkOfficialRole}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">STK Üyesi mi?:</span>
                                            <span className={viewUser.isStkMember ? "text-emerald-600 font-medium" : "text-slate-500"}>
                                                {viewUser.isStkMember ? 'Evet' : 'Hayır'}
                                            </span>
                                        </div>
                                        {viewUser.isStkMember && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Üye Olduğu STK:</span>
                                                <span className="font-medium">{viewUser.memberStkName}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>


                            {/* İstatistikler */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Sistem Süresi
                                    </div>
                                    <div className="text-lg font-semibold text-slate-900 dark:text-white">
                                        {viewUser.stats.yearsInSystem} Yıl
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                        <Building2 className="w-3 h-3" /> Üyelikler
                                    </div>
                                    <div className="text-lg font-semibold text-slate-900 dark:text-white">
                                        {viewUser.stats.membershipCount} STK
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                                        <CreditCard className="w-3 h-3" /> Toplam Bağış
                                    </div>
                                    <div className="text-lg font-semibold text-slate-900 dark:text-white">
                                        {viewUser.stats.totalDonations.toLocaleString('tr-TR')} ₺
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                    <div className="text-xs text-slate-500 mb-1">Durum</div>
                                    <div className={`text-lg font-semibold ${statusColors[viewUser.status as any] || 'text-slate-600'}`}>
                                        {statusLabels[viewUser.status as any] || viewUser.status}
                                    </div>
                                </div>
                            </div>

                            {/* Sekmeler / Bölümler */}
                            <div className="space-y-4">
                                {/* İlgi Alanları */}
                                {viewUser.interests.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium mb-2 text-slate-900 dark:text-white">İlgi Alanları</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {viewUser.interests.map((i, idx) => (
                                                <span key={idx} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs text-slate-600 dark:text-slate-300">
                                                    {i.sector.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Üyelik Detayları */}
                                {viewUser.memberships.length > 0 ? (
                                    <div>
                                        <h4 className="text-sm font-medium mb-2 text-slate-900 dark:text-white">STK Üyelikleri</h4>
                                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 dark:bg-slate-800">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-slate-500">STK</th>
                                                        <th className="px-4 py-2 text-left text-slate-500">Durum</th>
                                                        <th className="px-4 py-2 text-left text-slate-500">Katılım</th>
                                                        <th className="px-4 py-2 text-left text-slate-500">Ayrılış</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {viewUser.memberships.map((m, i) => (
                                                        <tr key={i}>
                                                            <td className="px-4 py-2 font-medium">{m.stkName}</td>
                                                            <td className="px-4 py-2">
                                                                <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                                                                    {m.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2 text-slate-500">
                                                                {m.joinDate ? new Date(m.joinDate).toLocaleDateString('tr-TR') : '-'}
                                                            </td>
                                                            <td className="px-4 py-2 text-slate-500">
                                                                {m.leaveDate ? new Date(m.leaveDate).toLocaleDateString('tr-TR') : '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-500 italic">
                                        Herhangi bir STK üyeliği bulunmuyor.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setViewUser(null)}>Kapat</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
