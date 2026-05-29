'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
    Users, Calendar, MapPin, ArrowLeft, UserPlus,
    CheckCircle, Clock, FileText, UserCheck, Trash2, Check, CircleCheckBig
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
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
    rejectionReason?: string | null
    respondedAt?: string | null
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
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [selectedMembers, setSelectedMembers] = useState<string[]>([])
    const [proxyGiver, setProxyGiver] = useState('')
    const [proxyReceiver, setProxyReceiver] = useState('')
    const [selectedAttendeeForReject, setSelectedAttendeeForReject] = useState<Attendee | null>(null)
    const [rejectionReason, setRejectionReason] = useState('')

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
        if (selectedMembers.length === 0) return
        try {
            let successCount = 0
            let failureCount = 0

            // Her bir seçilen üyeyi ayrı ayrı ekle
            for (const memberId of selectedMembers) {
                const res = await fetch('/api/stk/genel-kurul/katilimci', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        assemblyId: resolvedParams.id,
                        memberId,
                        attendType: 'IN_PERSON'
                    })
                })
                if (res.ok) {
                    successCount++
                } else {
                    failureCount++
                }
            }

            if (successCount > 0) {
                setShowAddAttendee(false)
                setSelectedMembers([])
                fetchAttendees()
                if (failureCount > 0) {
                    alert(`${successCount} üye eklendi, ${failureCount} üye eklenemedi`)
                }
            } else {
                alert('Hiçbir üye eklenemedi')
            }
        } catch (error) {
            console.error('Error adding attendees:', error)
            alert('Bir hata oluştu')
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
        // Optimistic UI update
        const previousAttendees = [...attendees]
        setAttendees(prev => prev.map(a =>
            a.id === attendee.id ? { ...a, signature: !a.signature } : a
        ))

        try {
            const res = await fetch('/api/stk/genel-kurul/katilimci', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: attendee.id, signature: !attendee.signature })
            })

            if (!res.ok) {
                throw new Error('İmza güncellenemedi')
            }

            // Başarılıysa veriyi tekrar çekmeye gerek yok, zaten güncelledik.
            // Ama senkronizasyon için arka planda çekebiliriz veya çekmeyebiliriz.
            // Veri tutarlılığı için sessizce çekelim.
            fetchAttendees()
        } catch (error) {
            console.error('Error updating signature:', error)
            // Hata durumunda eski duruma geri dön
            setAttendees(previousAttendees)
            alert('İmza durumu güncellenirken bir hata oluştu.')
        }
    }

    const acceptAttendee = async (attendeeId: string) => {
        try {
            const res = await fetch('/api/stk/genel-kurul/katilimci', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: attendeeId,
                    status: 'ACCEPTED',
                    attendType: 'IN_PERSON'
                })
            })
            if (res.ok) {
                fetchAttendees()
            } else {
                alert('Kabul edilirken hata oluştu')
            }
        } catch (error) {
            console.error('Error accepting attendee:', error)
            alert('Hata oluştu')
        }
    }

    const rejectAttendee = async () => {
        if (!selectedAttendeeForReject || !rejectionReason.trim()) {
            alert('Lütfen ret nedeni yazınız')
            return
        }
        try {
            const res = await fetch('/api/stk/genel-kurul/katilimci', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedAttendeeForReject.id,
                    status: 'REJECTED',
                    rejectionReason: rejectionReason.trim()
                })
            })
            if (res.ok) {
                setShowRejectModal(false)
                setSelectedAttendeeForReject(null)
                setRejectionReason('')
                fetchAttendees()
            } else {
                alert('Ret edilirken hata oluştu')
            }
        } catch (error) {
            console.error('Error rejecting attendee:', error)
            alert('Hata oluştu')
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
        if (!confirm('Bu vekaleti onaylamak istediğinizden emin misiniz?')) return
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
                        <div className="flex flex-col items-end gap-1">
                            <Button
                                onClick={() => updateStatus('IN_PROGRESS')}
                                className="bg-yellow-600 hover:bg-yellow-700"
                                disabled={attendees.filter(a => a.status === 'ACCEPTED').length + proxies.filter(p => p.isApproved).length < assembly.quorumRequired}
                            >
                                <Clock className="w-4 h-4 mr-2" />
                                Başlat
                            </Button>
                            {attendees.filter(a => a.status === 'ACCEPTED').length + proxies.filter(p => p.isApproved).length < assembly.quorumRequired && (
                                <span className="text-xs text-red-500">
                                    Yeteri onaya ulaşılmadı ({attendees.filter(a => a.status === 'ACCEPTED').length + proxies.filter(p => p.isApproved).length}/{assembly.quorumRequired})
                                </span>
                            )}
                        </div>
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
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{attendees.filter(a => a.status !== 'REJECTED').length}</p>
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
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${attendees.filter(a => a.status !== 'REJECTED').length + proxies.length >= assembly.quorumRequired
                                ? 'bg-green-100 dark:bg-green-900/30'
                                : 'bg-red-100 dark:bg-red-900/30'
                                }`}>
                                <CheckCircle className={`w-5 h-5 ${attendees.filter(a => a.status !== 'REJECTED').length + proxies.length >= assembly.quorumRequired
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                    }`} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {attendees.filter(a => a.status !== 'REJECTED').length + proxies.length}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Onaylı Katılım</p>
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
                                            <th className="text-center py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">Katılım</th>
                                            <th className="text-center py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">İmza</th>
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
                                                    <div className="flex flex-col items-center">
                                                        {attendee.status === 'PENDING' && (
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                                Beklemede
                                                            </span>
                                                        )}
                                                        {attendee.status === 'ACCEPTED' && (
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${attendee.attendType === 'IN_PERSON'
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                                }`}>
                                                                {attendee.attendType === 'IN_PERSON' ? 'Şahsen' : 'Vekaletle'}
                                                            </span>
                                                        )}
                                                        {attendee.status === 'REJECTED' && (
                                                            <div className="flex flex-col items-center text-center">
                                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                                    Ret
                                                                </span>
                                                                {attendee.rejectionReason && (
                                                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                                                        Nedeni: {attendee.rejectionReason}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                        {attendee.attendType === 'BY_PROXY' && (() => {
                                                            const proxy = proxies.find(p => p.receiverId === attendee.memberId && p.isApproved)
                                                            if (proxy && proxy.giver) {
                                                                return (
                                                                    <div className="text-xs text-indigo-500 dark:text-indigo-400 mt-1 font-medium text-center">
                                                                        (Vekaleten {proxy.giver.name} {proxy.giver.surname} yerine)
                                                                    </div>
                                                                )
                                                            }
                                                            return null
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex justify-center">
                                                        <button
                                                            onClick={() => toggleSignature(attendee)}
                                                            disabled={attendee.status === 'REJECTED' || attendee.status === 'PENDING'}
                                                            title={
                                                                attendee.status === 'REJECTED' ? 'Katılım Reddedildi' :
                                                                    attendee.status === 'PENDING' ? 'Katılım Onayı Bekleniyor' :
                                                                        'İmza Ekle / Kaldır'
                                                            }
                                                            className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${attendee.signature
                                                                ? 'bg-green-500 border-green-500 text-white'
                                                                : 'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                                } ${(attendee.status === 'REJECTED' || attendee.status === 'PENDING') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                        >
                                                            {attendee.signature && <Check className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {attendee.status === 'PENDING' && (
                                                            <button
                                                                onClick={() => removeAttendee(attendee.id)}
                                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                                                title="Sil / Kaldır"
                                                            >
                                                                <Trash2 className="w-4 h-4 text-red-600" />
                                                            </button>
                                                        )}
                                                    </div>
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
                                            {proxy.isApproved ? (
                                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                    Onaylı
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => approveProxy(proxy.id, true)}
                                                    className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-200 transition-colors"
                                                >
                                                    Onayla
                                                </button>
                                            )}
                                            {!proxy.isApproved && (
                                                <button
                                                    onClick={() => removeProxy(proxy.id)}
                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </button>
                                            )}
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
                                Üye Seç
                            </label>

                            {/* Üye Listesi */}
                            <div className="max-h-[200px] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                                {availableMembers.length === 0 ? (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                                        Seçilebilir üye yok
                                    </p>
                                ) : (
                                    availableMembers.map((member, index) => {
                                        const isSelected = selectedMembers.includes(member.id)
                                        const initials = `${member.name.charAt(0)}${member.surname.charAt(0)}`.toUpperCase()
                                        const colors = [
                                            'from-blue-500 to-cyan-500',
                                            'from-orange-500 to-rose-500',
                                            'from-purple-500 to-pink-500',
                                            'from-emerald-500 to-teal-500',
                                            'from-amber-500 to-orange-500',
                                            'from-red-500 to-rose-500',
                                            'from-indigo-500 to-blue-500',
                                            'from-green-500 to-emerald-500'
                                        ]
                                        const colorClass = colors[index % colors.length]

                                        return (
                                            <button
                                                key={member.id}
                                                onClick={() => {
                                                    if (selectedMembers.includes(member.id)) {
                                                        setSelectedMembers(selectedMembers.filter(id => id !== member.id))
                                                    } else {
                                                        setSelectedMembers([...selectedMembers, member.id])
                                                    }
                                                }}
                                                className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${isSelected
                                                    ? 'bg-blue-50 dark:bg-blue-500/10'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                    }`}
                                            >
                                                {/* Avatar */}
                                                <div className={`w-8 h-8 bg-gradient-to-br ${colorClass} rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                                                    {initials}
                                                </div>

                                                {/* Üye Bilgisi */}
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm text-slate-900 dark:text-white">
                                                        {member.name} {member.surname}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        No: {member.memberNumber || '-'} · Aktif
                                                    </p>
                                                </div>

                                                {/* Checkmark Icon */}
                                                {isSelected && (
                                                    <CircleCheckBig className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                )}
                                            </button>
                                        )
                                    })
                                )}
                            </div>

                            {selectedMembers.length > 0 && (
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3 font-medium">
                                    ✓ {selectedMembers.length} üye seçildi
                                </p>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="outline" onClick={() => {
                                    setShowAddAttendee(false)
                                    setSelectedMembers([])
                                }}>
                                    İptal
                                </Button>
                                <Button onClick={addAttendee} disabled={selectedMembers.length === 0} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {selectedMembers.length > 0 ? `${selectedMembers.length} Üyeyi Ekle` : 'Ekle'}
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
                                    {members.filter(m => {
                                        const attendee = attendees.find(a => a.memberId === m.id)
                                        return attendee?.status === 'REJECTED'
                                    }).map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {member.name} {member.surname} (Ret)
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
                                    {members.filter(m => {
                                        if (m.id === proxyGiver) return false
                                        const attendee = attendees.find(a => a.memberId === m.id)
                                        return !attendee
                                    }).map((member) => (
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

            {/* Reject Attendee Modal */}
            {showRejectModal && selectedAttendeeForReject && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-6 border-b dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {selectedAttendeeForReject.member?.name} {selectedAttendeeForReject.member?.surname} - Katılımı Reddet
                            </h2>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Red Nedeni (gerekli)
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Katılımı ret etme nedeninizi yazınız..."
                                className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                                rows={4}
                            />
                            <div className="flex justify-end gap-3 mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowRejectModal(false)
                                        setSelectedAttendeeForReject(null)
                                        setRejectionReason('')
                                    }}
                                >
                                    İptal
                                </Button>
                                <Button
                                    onClick={rejectAttendee}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    Reddet
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
