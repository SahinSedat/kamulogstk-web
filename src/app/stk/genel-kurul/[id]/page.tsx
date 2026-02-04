'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
    Users, Calendar, MapPin, ArrowLeft, UserPlus,
    CheckCircle, Clock, FileText, UserCheck, Trash2, Check
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Assembly {
    id: string
    assemblyType: 'OLAGAN' | 'OLAGANUSTU'
    assemblyNumber: number
    assemblyDate: string
    location: string
    quorumRequired: number
    attendeeCount: number | null
    proxyCount: number | null
    status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    minutesContent: string | null
    agendaItems: AgendaItem[]
}

interface AgendaItem {
    id: string
    orderNumber: number
    title: string
    description: string | null
    decision: string | null
}

interface Attendee {
    id: string
    memberId: string
    attendType: 'IN_PERSON' | 'BY_PROXY'
    signature: boolean
    checkinTime: string
    member?: {
        id: string
        name: string
        surname: string
        memberNumber: string | null
    }
}

interface Proxy {
    id: string
    giverId: string
    receiverId: string
    proxyDoc: string | null
    isApproved: boolean
    giver?: { name: string; surname: string; memberNumber: string | null }
    receiver?: { name: string; surname: string; memberNumber: string | null }
}

interface Member {
    id: string
    name: string
    surname: string
    memberNumber: string | null
}

export default function AssemblyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params)
    const router = useRouter()
    const [assembly, setAssembly] = useState<Assembly | null>(null)
    const [attendees, setAttendees] = useState<Attendee[]>([])
    const [proxies, setProxies] = useState<Proxy[]>([])
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'agenda' | 'attendees' | 'proxies' | 'minutes'>('agenda')
    const [showAddAttendee, setShowAddAttendee] = useState(false)
    const [showAddProxy, setShowAddProxy] = useState(false)
    const [selectedMember, setSelectedMember] = useState('')
    const [proxyGiver, setProxyGiver] = useState('')
    const [proxyReceiver, setProxyReceiver] = useState('')

    useEffect(() => {
        fetchAssembly()
        fetchMembers()
    }, [resolvedParams.id])

    const fetchAssembly = async () => {
        try {
            const res = await fetch(`/api/stk/genel-kurul?details=true`)
            const data = await res.json()
            const found = data.assemblies?.find((a: Assembly) => a.id === resolvedParams.id)
            if (found) {
                setAssembly(found)
            }
            await fetchAttendees()
            await fetchProxies()
        } catch (error) {
            console.error('Error fetching assembly:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchAttendees = async () => {
        try {
            const res = await fetch(`/api/stk/genel-kurul/katilimci?assemblyId=${resolvedParams.id}`)
            const data = await res.json()
            if (data.attendees) {
                setAttendees(data.attendees)
            }
        } catch (error) {
            console.error('Error fetching attendees:', error)
        }
    }

    const fetchProxies = async () => {
        try {
            const res = await fetch(`/api/stk/genel-kurul/vekalet?assemblyId=${resolvedParams.id}`)
            const data = await res.json()
            if (data.proxies) {
                setProxies(data.proxies)
            }
        } catch (error) {
            console.error('Error fetching proxies:', error)
        }
    }

    const fetchMembers = async () => {
        try {
            const res = await fetch('/api/stk/members?status=ACTIVE')
            const data = await res.json()
            if (data.members) {
                setMembers(data.members)
            }
        } catch (error) {
            console.error('Error fetching members:', error)
        }
    }

    const addAttendee = async () => {
        if (!selectedMember) return
        try {
            const res = await fetch('/api/stk/genel-kurul/katilimci', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assemblyId: resolvedParams.id,
                    memberId: selectedMember,
                    attendType: 'IN_PERSON'
                })
            })
            if (res.ok) {
                setShowAddAttendee(false)
                setSelectedMember('')
                fetchAttendees()
            } else {
                const data = await res.json()
                alert(data.error || 'Hata oluştu')
            }
        } catch (error) {
            console.error('Error adding attendee:', error)
        }
    }

    const removeAttendee = async (id: string) => {
        if (!confirm('Bu katılımcıyı silmek istediğinizden emin misiniz?')) return
        try {
            const res = await fetch('/api/stk/genel-kurul/katilimci', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            if (res.ok) {
                fetchAttendees()
            }
        } catch (error) {
            console.error('Error removing attendee:', error)
        }
    }

    const toggleSignature = async (attendee: Attendee) => {
        try {
            await fetch('/api/stk/genel-kurul/katilimci', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: attendee.id, signature: !attendee.signature })
            })
            fetchAttendees()
        } catch (error) {
            console.error('Error updating signature:', error)
        }
    }

    const addProxy = async () => {
        if (!proxyGiver || !proxyReceiver) return
        try {
            const res = await fetch('/api/stk/genel-kurul/vekalet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assemblyId: resolvedParams.id,
                    giverId: proxyGiver,
                    receiverId: proxyReceiver
                })
            })
            if (res.ok) {
                setShowAddProxy(false)
                setProxyGiver('')
                setProxyReceiver('')
                fetchProxies()
            } else {
                const data = await res.json()
                alert(data.error || 'Hata oluştu')
            }
        } catch (error) {
            console.error('Error adding proxy:', error)
        }
    }

    const approveProxy = async (id: string, isApproved: boolean) => {
        try {
            await fetch('/api/stk/genel-kurul/vekalet', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isApproved })
            })
            fetchProxies()
        } catch (error) {
            console.error('Error updating proxy:', error)
        }
    }

    const removeProxy = async (id: string) => {
        if (!confirm('Bu vekaleti silmek istediğinizden emin misiniz?')) return
        try {
            const res = await fetch('/api/stk/genel-kurul/vekalet', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            if (res.ok) {
                fetchProxies()
            }
        } catch (error) {
            console.error('Error removing proxy:', error)
        }
    }

    const updateStatus = async (status: Assembly['status']) => {
        try {
            await fetch('/api/stk/genel-kurul', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: resolvedParams.id, status })
            })
            fetchAssembly()
        } catch (error) {
            console.error('Error updating status:', error)
        }
    }

    if (loading || !assembly) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    const availableMembers = members.filter(m => !attendees.some(a => a.memberId === m.id))

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {assembly.assemblyNumber}. {assembly.assemblyType === 'OLAGAN' ? 'Olağan' : 'Olağanüstü'} Genel Kurul
                    </h1>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(assembly.assemblyDate).toLocaleDateString('tr-TR')}
                        </span>
                        <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {assembly.location}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {assembly.status === 'PLANNED' && (
                        <Button onClick={() => updateStatus('IN_PROGRESS')} className="bg-yellow-600 hover:bg-yellow-700">
                            <Clock className="w-4 h-4 mr-2" />
                            Başlat
                        </Button>
                    )}
                    {assembly.status === 'IN_PROGRESS' && (
                        <Button onClick={() => updateStatus('COMPLETED')} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Tamamla
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{assembly.quorumRequired}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Yeter Sayı</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                                <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{attendees.length}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Katılımcı</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{proxies.length}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Vekalet</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${attendees.length + proxies.filter(p => p.isApproved).length >= assembly.quorumRequired
                                    ? 'bg-green-100 dark:bg-green-900/30'
                                    : 'bg-red-100 dark:bg-red-900/30'
                                }`}>
                                <CheckCircle className={`w-5 h-5 ${attendees.length + proxies.filter(p => p.isApproved).length >= assembly.quorumRequired
                                        ? 'text-green-600 dark:text-green-400'
                                        : 'text-red-600 dark:text-red-400'
                                    }`} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {attendees.length + proxies.filter(p => p.isApproved).length}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Toplam Oy</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <div className="border-b dark:border-slate-700">
                <nav className="flex gap-4">
                    {(['agenda', 'attendees', 'proxies', 'minutes'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab
                                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            {tab === 'agenda' && 'Gündem'}
                            {tab === 'attendees' && `Katılımcılar (${attendees.length})`}
                            {tab === 'proxies' && `Vekaletler (${proxies.length})`}
                            {tab === 'minutes' && 'Tutanak'}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'agenda' && (
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader>
                        <CardTitle className="dark:text-white">Gündem Maddeleri</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {assembly.agendaItems.length === 0 ? (
                            <p className="text-slate-500 dark:text-slate-400 text-center py-4">Gündem maddesi eklenmemiş</p>
                        ) : (
                            <div className="space-y-3">
                                {assembly.agendaItems.map((item) => (
                                    <div key={item.id} className="p-4 border dark:border-slate-700 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <span className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-sm font-medium">
                                                {item.orderNumber}
                                            </span>
                                            <div>
                                                <h4 className="font-medium text-slate-900 dark:text-white">{item.title}</h4>
                                                {item.description && (
                                                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{item.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 'attendees' && (
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="dark:text-white">Katılımcılar</CardTitle>
                        <Button onClick={() => setShowAddAttendee(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Katılımcı Ekle
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {attendees.length === 0 ? (
                            <p className="text-slate-500 dark:text-slate-400 text-center py-4">Henüz katılımcı eklenmemiş</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b dark:border-slate-700">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Üye</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Katılım</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">İmza</th>
                                            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendees.map((attendee) => (
                                            <tr key={attendee.id} className="border-b dark:border-slate-700">
                                                <td className="py-3 px-4">
                                                    <div className="text-slate-900 dark:text-white font-medium">
                                                        {attendee.member?.name} {attendee.member?.surname}
                                                    </div>
                                                    <div className="text-sm text-slate-500">
                                                        {attendee.member?.memberNumber || '-'}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${attendee.attendType === 'IN_PERSON'
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                        }`}>
                                                        {attendee.attendType === 'IN_PERSON' ? 'Şahsen' : 'Vekaletle'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <button
                                                        onClick={() => toggleSignature(attendee)}
                                                        className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${attendee.signature
                                                                ? 'bg-green-500 border-green-500 text-white'
                                                                : 'border-slate-300 dark:border-slate-600'
                                                            }`}
                                                    >
                                                        {attendee.signature && <Check className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        onClick={() => removeAttendee(attendee.id)}
                                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 'proxies' && (
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="dark:text-white">Vekaletler</CardTitle>
                        <Button onClick={() => setShowAddProxy(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Vekalet Ekle
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {proxies.length === 0 ? (
                            <p className="text-slate-500 dark:text-slate-400 text-center py-4">Henüz vekalet eklenmemiş</p>
                        ) : (
                            <div className="space-y-3">
                                {proxies.map((proxy) => (
                                    <div key={proxy.id} className="p-4 border dark:border-slate-700 rounded-lg flex items-center justify-between">
                                        <div>
                                            <div className="text-slate-900 dark:text-white font-medium">
                                                {proxy.giver?.name} {proxy.giver?.surname}
                                                <span className="text-slate-500 mx-2">→</span>
                                                {proxy.receiver?.name} {proxy.receiver?.surname}
                                            </div>
                                            <div className="text-sm text-slate-500 mt-1">
                                                Vekalet veren → Vekalet alan
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => approveProxy(proxy.id, !proxy.isApproved)}
                                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${proxy.isApproved
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    }`}
                                            >
                                                {proxy.isApproved ? 'Onaylı' : 'Onay Bekliyor'}
                                            </button>
                                            <button
                                                onClick={() => removeProxy(proxy.id)}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 'minutes' && (
                <Card className="dark:bg-slate-800 dark:border-slate-700">
                    <CardHeader>
                        <CardTitle className="dark:text-white">Tutanak</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                            Tutanak oluşturma özelliği yakında eklenecek
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Add Attendee Modal */}
            {showAddAttendee && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-6 border-b dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Katılımcı Ekle</h2>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Üye Seçin
                            </label>
                            <select
                                value={selectedMember}
                                onChange={(e) => setSelectedMember(e.target.value)}
                                className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            >
                                <option value="">Seçin...</option>
                                {availableMembers.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.name} {member.surname} {member.memberNumber && `(${member.memberNumber})`}
                                    </option>
                                ))}
                            </select>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="outline" onClick={() => setShowAddAttendee(false)}>
                                    İptal
                                </Button>
                                <Button onClick={addAttendee} className="bg-emerald-600 hover:bg-emerald-700">
                                    Ekle
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Proxy Modal */}
            {showAddProxy && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-6 border-b dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Vekalet Ekle</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Vekalet Veren
                                </label>
                                <select
                                    value={proxyGiver}
                                    onChange={(e) => setProxyGiver(e.target.value)}
                                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                >
                                    <option value="">Seçin...</option>
                                    {members.map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {member.name} {member.surname}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Vekalet Alan
                                </label>
                                <select
                                    value={proxyReceiver}
                                    onChange={(e) => setProxyReceiver(e.target.value)}
                                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                >
                                    <option value="">Seçin...</option>
                                    {members.filter(m => m.id !== proxyGiver).map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {member.name} {member.surname}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="outline" onClick={() => setShowAddProxy(false)}>
                                    İptal
                                </Button>
                                <Button onClick={addProxy} className="bg-emerald-600 hover:bg-emerald-700">
                                    Ekle
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
