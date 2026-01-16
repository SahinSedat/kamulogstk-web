'use client'

import React, { useState } from 'react'
import {
    Users, Search, Filter, Plus, Edit, Trash2,
    CheckCircle2, XCircle, Clock, Shield, Building2,
    ChevronLeft, ChevronRight, MoreHorizontal, Eye, Ban
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Mock users data
const users = [
    { id: 1, name: 'Sedat Şahin', email: 'sdat.sahin@gmail.com', role: 'ADMIN', status: 'active', stk: null, createdAt: '2026-01-01' },
    { id: 2, name: 'Ahmet Yılmaz', email: 'ahmet@ornekstk.org', role: 'STK_MANAGER', status: 'active', stk: 'Örnek Dernek', createdAt: '2026-01-05' },
    { id: 3, name: 'Fatma Demir', email: 'fatma@yardimvakfi.org', role: 'STK_MANAGER', status: 'active', stk: 'Yardım Vakfı', createdAt: '2026-01-08' },
    { id: 4, name: 'Mehmet Kaya', email: 'mehmet@egitimder.org', role: 'STK_MANAGER', status: 'pending', stk: 'Eğitim Derneği', createdAt: '2026-01-10' },
    { id: 5, name: 'Ayşe Şahin', email: 'ayse@ornekstk.org', role: 'STK_MEMBER', status: 'active', stk: 'Örnek Dernek', createdAt: '2026-01-12' },
    { id: 6, name: 'Ali Öztürk', email: 'ali@saglikvakfi.org', role: 'STK_MANAGER', status: 'suspended', stk: 'Sağlık Vakfı', createdAt: '2026-01-14' },
]

const stats = [
    { label: 'Toplam Kullanıcı', value: '1.250', icon: Users, color: 'emerald' },
    { label: 'Aktif', value: '1.180', icon: CheckCircle2, color: 'blue' },
    { label: 'Beklemede', value: '45', icon: Clock, color: 'amber' },
    { label: 'Askıda', value: '25', icon: Ban, color: 'red' },
]

const roleColors = {
    ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    STK_MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    STK_MEMBER: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
}

const roleLabels = {
    ADMIN: 'Admin',
    STK_MANAGER: 'STK Yöneticisi',
    STK_MEMBER: 'STK Üyesi',
}

const statusColors = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const statusLabels = {
    active: 'Aktif',
    pending: 'Beklemede',
    suspended: 'Askıda',
}

export default function AdminUsersPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesRole = roleFilter === 'all' || user.role === roleFilter
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter
        return matchesSearch && matchesRole && matchesStatus
    })

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kullanıcı Yönetimi</h1>
                    <p className="text-slate-500">Tüm kullanıcıları görüntüleyin ve yönetin</p>
                </div>
                <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Kullanıcı Ekle
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Card key={stat.label}>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}>
                                    <stat.icon className={`w-5 h-5 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                                    <div className="text-sm text-slate-500">{stat.label}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="İsim veya e-posta ile ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                            >
                                <option value="all">Tüm Roller</option>
                                <option value="ADMIN">Admin</option>
                                <option value="STK_MANAGER">STK Yöneticisi</option>
                                <option value="STK_MEMBER">STK Üyesi</option>
                            </select>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                            >
                                <option value="all">Tüm Durumlar</option>
                                <option value="active">Aktif</option>
                                <option value="pending">Beklemede</option>
                                <option value="suspended">Askıda</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Kullanıcılar
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b dark:border-slate-700">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Kullanıcı</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Rol</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">STK</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Durum</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Kayıt Tarihi</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b last:border-0 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-medium">
                                                    {user.name.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900 dark:text-white">{user.name}</div>
                                                    <div className="text-sm text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role as keyof typeof roleColors]}`}>
                                                {roleLabels[user.role as keyof typeof roleLabels]}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            {user.stk ? (
                                                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                                    <Building2 className="w-4 h-4" />
                                                    {user.stk}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[user.status as keyof typeof statusColors]}`}>
                                                {statusLabels[user.status as keyof typeof statusLabels]}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                            {user.createdAt}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm">
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm">
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-red-600">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-slate-700">
                        <span className="text-sm text-slate-500">Toplam {users.length} kullanıcı</span>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-sm">1</span>
                            <Button variant="outline" size="sm">
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
