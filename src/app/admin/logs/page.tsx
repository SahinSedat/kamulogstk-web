"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    ScrollText,
    Search,
    Filter,
    Download,
    Calendar,
    User,
    Building2,
    CreditCard,
    Shield,
    ChevronLeft,
    ChevronRight,
    Eye,
} from 'lucide-react'

interface AuditLog {
    id: string
    action: string
    entityType: string
    entityId: string
    userName: string
    userEmail: string
    description: string
    ipAddress: string
    createdAt: string
}

const actionLabels: Record<string, string> = {
    USER_LOGIN: 'Kullanıcı Girişi',
    USER_LOGOUT: 'Kullanıcı Çıkışı',
    STK_CREATE: 'STK Oluşturma',
    STK_APPROVE: 'STK Onay',
    STK_REJECT: 'STK Red',
    MEMBER_CREATE: 'Üye Oluşturma',
    MEMBER_APPROVE: 'Üye Onay',
    MEMBER_REJECT: 'Üye Red',
    PAYMENT_CONFIRM: 'Ödeme Onay',
    PAYMENT_REJECT: 'Ödeme Red',
    SETTINGS_UPDATE: 'Ayar Güncelleme',
}

const actionColors: Record<string, 'primary' | 'success' | 'warning' | 'destructive' | 'info'> = {
    USER_LOGIN: 'info',
    USER_LOGOUT: 'info',
    STK_CREATE: 'primary',
    STK_APPROVE: 'success',
    STK_REJECT: 'destructive',
    MEMBER_CREATE: 'primary',
    MEMBER_APPROVE: 'success',
    MEMBER_REJECT: 'destructive',
    PAYMENT_CONFIRM: 'success',
    PAYMENT_REJECT: 'destructive',
    SETTINGS_UPDATE: 'warning',
}

const entityIcons: Record<string, React.ElementType> = {
    User: User,
    STK: Building2,
    Member: User,
    Payment: CreditCard,
    Settings: Shield,
}

const mockLogs: AuditLog[] = [
    {
        id: '1',
        action: 'STK_APPROVE',
        entityType: 'STK',
        entityId: 'stk_123',
        userName: 'Admin Kullanıcı',
        userEmail: 'admin@kamulogstk.com',
        description: 'Türkiye Eğitim Vakfı STK başvurusu onaylandı',
        ipAddress: '192.168.1.100',
        createdAt: '2024-01-13T10:30:00',
    },
    {
        id: '2',
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: 'user_456',
        userName: 'Admin Kullanıcı',
        userEmail: 'admin@kamulogstk.com',
        description: 'Admin Kullanıcı sisteme giriş yaptı',
        ipAddress: '192.168.1.100',
        createdAt: '2024-01-13T10:00:00',
    },
    {
        id: '3',
        action: 'MEMBER_APPROVE',
        entityType: 'Member',
        entityId: 'member_789',
        userName: 'STK Yöneticisi',
        userEmail: 'yonetici@dernek.org',
        description: 'Ahmet Yılmaz üyelik başvurusu YK kararı ile onaylandı',
        ipAddress: '192.168.1.150',
        createdAt: '2024-01-13T09:45:00',
    },
    {
        id: '4',
        action: 'PAYMENT_CONFIRM',
        entityType: 'Payment',
        entityId: 'payment_012',
        userName: 'STK Yöneticisi',
        userEmail: 'yonetici@vakif.org',
        description: '₺500 tutarında aidat ödemesi onaylandı',
        ipAddress: '192.168.1.200',
        createdAt: '2024-01-13T09:30:00',
    },
    {
        id: '5',
        action: 'STK_REJECT',
        entityType: 'STK',
        entityId: 'stk_999',
        userName: 'Admin Kullanıcı',
        userEmail: 'admin@kamulogstk.com',
        description: 'Örnek Dernek başvurusu eksik belgeler nedeniyle reddedildi',
        ipAddress: '192.168.1.100',
        createdAt: '2024-01-12T16:00:00',
    },
]

export default function LogsPage() {
    const [logs] = useState<AuditLog[]>(mockLogs)
    const [searchQuery, setSearchQuery] = useState('')
    const [actionFilter, setActionFilter] = useState<string>('all')
    const [entityFilter, setEntityFilter] = useState<string>('all')

    const filteredLogs = logs.filter((log) => {
        const matchesSearch =
            log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.userEmail.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesAction = actionFilter === 'all' || log.action === actionFilter
        const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter

        return matchesSearch && matchesAction && matchesEntity
    })

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Sistem Logları</h1>
                    <p className="text-slate-500 mt-1">Tüm sistem aktivitelerini görüntüleyin</p>
                </div>
                <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Dışa Aktar
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Bugün', count: 156, icon: Calendar },
                    { label: 'Bu Hafta', count: 892, icon: ScrollText },
                    { label: 'Bu Ay', count: 3421, icon: ScrollText },
                    { label: 'Toplam', count: 15678, icon: ScrollText },
                ].map((stat) => (
                    <Card key={stat.label}>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                <stat.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">{stat.label}</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">
                                    {stat.count.toLocaleString('tr-TR')}
                                </p>
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
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                placeholder="Açıklama, kullanıcı adı veya e-posta ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="w-[200px]">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="İşlem Türü" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tüm İşlemler</SelectItem>
                                <SelectItem value="USER_LOGIN">Kullanıcı Girişi</SelectItem>
                                <SelectItem value="STK_APPROVE">STK Onay</SelectItem>
                                <SelectItem value="STK_REJECT">STK Red</SelectItem>
                                <SelectItem value="MEMBER_APPROVE">Üye Onay</SelectItem>
                                <SelectItem value="PAYMENT_CONFIRM">Ödeme Onay</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={entityFilter} onValueChange={setEntityFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Varlık Türü" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tüm Varlıklar</SelectItem>
                                <SelectItem value="User">Kullanıcı</SelectItem>
                                <SelectItem value="STK">STK</SelectItem>
                                <SelectItem value="Member">Üye</SelectItem>
                                <SelectItem value="Payment">Ödeme</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Log Kayıtları ({filteredLogs.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {filteredLogs.map((log) => {
                            const Icon = entityIcons[log.entityType] || ScrollText
                            const variant = actionColors[log.action] || 'default'

                            return (
                                <div
                                    key={log.id}
                                    className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm">
                                        <Icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant={variant}>
                                                {actionLabels[log.action] || log.action}
                                            </Badge>
                                            <span className="text-xs text-slate-500">
                                                {new Date(log.createdAt).toLocaleString('tr-TR')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-900 dark:text-white font-medium truncate">
                                            {log.description}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {log.userName}
                                            </span>
                                            <span>{log.userEmail}</span>
                                            <span>IP: {log.ipAddress}</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                </div>
                            )
                        })}
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-slate-500">
                            Sayfa 1 / 10
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="bg-blue-600 text-white border-blue-600">
                                1
                            </Button>
                            <Button variant="outline" size="sm">2</Button>
                            <Button variant="outline" size="sm">3</Button>
                            <span className="text-slate-400">...</span>
                            <Button variant="outline" size="sm">10</Button>
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
