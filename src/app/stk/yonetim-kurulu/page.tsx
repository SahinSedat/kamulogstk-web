'use client'

import React, { useState } from 'react'
import {
    Users, Plus, Edit, Trash2, Phone, Mail,
    Calendar, Award, CheckCircle2, Clock, User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Mock board members data
const boardMembers = [
    {
        id: 1,
        name: 'Ahmet Yılmaz',
        position: 'Başkan',
        email: 'ahmet@ornekstk.org',
        phone: '+90 532 000 00 01',
        startDate: '2024-01-15',
        endDate: '2026-01-15',
        status: 'active',
        avatar: null,
    },
    {
        id: 2,
        name: 'Fatma Demir',
        position: 'Başkan Yardımcısı',
        email: 'fatma@ornekstk.org',
        phone: '+90 532 000 00 02',
        startDate: '2024-01-15',
        endDate: '2026-01-15',
        status: 'active',
        avatar: null,
    },
    {
        id: 3,
        name: 'Mehmet Kaya',
        position: 'Genel Sekreter',
        email: 'mehmet@ornekstk.org',
        phone: '+90 532 000 00 03',
        startDate: '2024-01-15',
        endDate: '2026-01-15',
        status: 'active',
        avatar: null,
    },
    {
        id: 4,
        name: 'Ayşe Şahin',
        position: 'Sayman',
        email: 'ayse@ornekstk.org',
        phone: '+90 532 000 00 04',
        startDate: '2024-01-15',
        endDate: '2026-01-15',
        status: 'active',
        avatar: null,
    },
    {
        id: 5,
        name: 'Ali Öztürk',
        position: 'Üye',
        email: 'ali@ornekstk.org',
        phone: '+90 532 000 00 05',
        startDate: '2024-01-15',
        endDate: '2026-01-15',
        status: 'active',
        avatar: null,
    },
]

const positionColors: Record<string, string> = {
    'Başkan': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Başkan Yardımcısı': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Genel Sekreter': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Sayman': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Üye': 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
}

export default function STKBoardPage() {
    const [selectedMember, setSelectedMember] = useState<typeof boardMembers[0] | null>(null)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Yönetim Kurulu</h1>
                    <p className="text-slate-500">Yönetim kurulu üyelerini görüntüleyin ve yönetin</p>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Üye Ekle
                </Button>
            </div>

            {/* Term Info */}
            <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 border-0">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
                        <div>
                            <h2 className="text-lg font-semibold">Mevcut Dönem</h2>
                            <p className="text-white/70">2024-2026 Dönemi Yönetim Kurulu</p>
                        </div>
                        <div className="flex gap-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold">{boardMembers.length}</div>
                                <div className="text-white/70 text-sm">Üye</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold">348</div>
                                <div className="text-white/70 text-sm">Gün Kaldı</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Board Members Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {boardMembers.map((member) => (
                    <Card key={member.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedMember(member)}>
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                    {member.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900 dark:text-white">{member.name}</h3>
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${positionColors[member.position] || positionColors['Üye']}`}>
                                        {member.position}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                    <Mail className="w-4 h-4" />
                                    <span className="truncate">{member.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                    <Phone className="w-4 h-4" />
                                    <span>{member.phone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                    <Calendar className="w-4 h-4" />
                                    <span>Görev: {member.startDate} - {member.endDate}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4 pt-4 border-t dark:border-slate-700">
                                <Button variant="outline" size="sm" className="flex-1">
                                    <Edit className="w-4 h-4 mr-1" />
                                    Düzenle
                                </Button>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Add New Member Card */}
            <Card className="border-dashed border-2 hover:border-emerald-500 transition-colors cursor-pointer">
                <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto flex items-center justify-center mb-4">
                        <Plus className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Yeni Üye Ekle</h3>
                    <p className="text-slate-500 text-sm">Yönetim kuruluna yeni bir üye eklemek için tıklayın</p>
                </CardContent>
            </Card>

            {/* Past Terms */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Geçmiş Dönemler
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[
                            { term: '2022-2024', members: 5, status: 'Tamamlandı' },
                            { term: '2020-2022', members: 7, status: 'Tamamlandı' },
                        ].map((term) => (
                            <div key={term.term} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Award className="w-5 h-5 text-slate-400" />
                                    <div>
                                        <span className="font-medium text-slate-900 dark:text-white">{term.term} Dönemi</span>
                                        <span className="text-slate-500 text-sm ml-2">({term.members} üye)</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">
                                    Görüntüle
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
