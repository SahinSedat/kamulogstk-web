"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Users, Search, Plus, Eye, Edit2, Mail, Phone, MapPin, UserMinus } from 'lucide-react'

interface Member {
    id: string
    memberNumber: string
    name: string
    surname: string
    email: string
    phone: string
    city: string
    status: 'ACTIVE' | 'PENDING' | 'RESIGNATION_REQ' | 'RESIGNED'
}

const mockMembers: Member[] = [
    { id: '1', memberNumber: 'UYE-001', name: 'Ahmet', surname: 'Yılmaz', email: 'ahmet@email.com', phone: '0532 123 4567', city: 'İstanbul', status: 'ACTIVE' },
    { id: '2', memberNumber: 'UYE-002', name: 'Fatma', surname: 'Demir', email: 'fatma@email.com', phone: '0533 234 5678', city: 'Ankara', status: 'ACTIVE' },
    { id: '3', memberNumber: 'UYE-003', name: 'Mehmet', surname: 'Kaya', email: 'mehmet@email.com', phone: '0534 345 6789', city: 'İzmir', status: 'RESIGNATION_REQ' },
    { id: '4', memberNumber: 'UYE-004', name: 'Ayşe', surname: 'Çelik', email: 'ayse@email.com', phone: '0535 456 7890', city: 'Bursa', status: 'PENDING' },
]

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'default' }> = {
    ACTIVE: { label: 'Aktif', variant: 'success' },
    PENDING: { label: 'Beklemede', variant: 'warning' },
    RESIGNATION_REQ: { label: 'İstifa Talebi', variant: 'warning' },
    RESIGNED: { label: 'İstifa Etti', variant: 'destructive' },
}

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>(mockMembers)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedMember, setSelectedMember] = useState<Member | null>(null)
    const [showResignDialog, setShowResignDialog] = useState(false)

    const filteredMembers = members.filter((m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleResignApprove = () => {
        if (selectedMember) {
            setMembers((prev) => prev.map((m) => m.id === selectedMember.id ? { ...m, status: 'RESIGNED' as const } : m))
            setShowResignDialog(false)
            setSelectedMember(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Üyeler</h1>
                    <p className="text-slate-500 mt-1">Tüm üyeleri yönetin</p>
                </div>
                <Button className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600">
                    <Plus className="w-4 h-4" />
                    Yeni Üye
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Toplam', count: members.length, color: 'blue' },
                    { label: 'Aktif', count: members.filter((m) => m.status === 'ACTIVE').length, color: 'emerald' },
                    { label: 'Beklemede', count: members.filter((m) => m.status === 'PENDING').length, color: 'amber' },
                    { label: 'İstifa Talebi', count: members.filter((m) => m.status === 'RESIGNATION_REQ').length, color: 'orange' },
                ].map((stat) => (
                    <Card key={stat.label}>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className={`w-12 h-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                                <Users className={`w-6 h-6 text-${stat.color}-600`} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">{stat.label}</p>
                                <p className="text-2xl font-bold">{stat.count}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input placeholder="İsim veya e-posta ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Üye Listesi ({filteredMembers.length})</CardTitle></CardHeader>
                <CardContent>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-4 px-4">Üye</th>
                                <th className="text-left py-4 px-4">İletişim</th>
                                <th className="text-left py-4 px-4">Şehir</th>
                                <th className="text-left py-4 px-4">Durum</th>
                                <th className="text-right py-4 px-4">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMembers.map((member) => (
                                <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-medium">
                                                {member.name[0]}{member.surname[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium">{member.name} {member.surname}</p>
                                                <p className="text-sm text-slate-500">{member.memberNumber}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="text-sm space-y-1">
                                            <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{member.email}</div>
                                            <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{member.phone}</div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4"><div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{member.city}</div></td>
                                    <td className="py-4 px-4"><Badge variant={statusConfig[member.status].variant}>{statusConfig[member.status].label}</Badge></td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button size="sm" variant="ghost" onClick={() => setSelectedMember(member)}><Eye className="w-4 h-4" /></Button>
                                            <Button size="sm" variant="ghost"><Edit2 className="w-4 h-4" /></Button>
                                            {member.status === 'RESIGNATION_REQ' && (
                                                <Button size="sm" variant="destructive" onClick={() => { setSelectedMember(member); setShowResignDialog(true) }}>
                                                    <UserMinus className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            <Dialog open={showResignDialog} onOpenChange={setShowResignDialog}>
                <DialogContent>
                    <DialogHeader><DialogTitle>İstifa Talebini Onayla</DialogTitle></DialogHeader>
                    <p className="text-slate-500">{selectedMember?.name} {selectedMember?.surname} üyesinin istifasını onaylıyor musunuz?</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowResignDialog(false)}>İptal</Button>
                        <Button variant="destructive" onClick={handleResignApprove}>Onayla</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
