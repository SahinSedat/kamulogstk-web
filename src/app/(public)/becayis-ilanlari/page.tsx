'use client'

import { useState, useEffect } from 'react'
import { ArrowLeftRight, MapPin, ArrowRight, Building2, Search, Shield, Crown } from 'lucide-react'

interface BecayisListing {
    id: string; title: string; role: string; branch: string;
    currentCity: string; targetCity: string;
    description: string; isPremium: boolean; slug: string; createdAt: string;
    institution?: { name: string } | null;
}

function roleBadge(role: string) {
    const map: any = {
        'MEMUR': { label: '👔 Memur', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
        'ISCI': { label: '👷 4D İşçi', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
        'SOZLESMELI': { label: '📝 4B Sözleşmeli', cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    }
    const r = map[role] || { label: role, cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${r.cls}`}>{r.label}</span>
}

export default function BecayisPublicPage() {
    const [listings, setListings] = useState<BecayisListing[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [cityFilter, setCityFilter] = useState('')

    useEffect(() => { loadListings() }, [])

    const loadListings = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (search) params.append('search', search)
            if (roleFilter) params.append('role', roleFilter)
            if (cityFilter) params.append('city', cityFilter)
            const res = await fetch(`/api/public/becayis?${params}`)
            const data = await res.json()
            setListings(data.listings || [])
        } catch (e) {
            console.error('Becayis error:', e)
        } finally {
            setLoading(false)
        }
    }

    const cities = [...new Set(listings.flatMap(l => [l.currentCity, l.targetCity]))].sort()

    const filteredListings = listings.filter(l =>
        (l.title.toLowerCase().includes(search.toLowerCase()) ||
            l.branch.toLowerCase().includes(search.toLowerCase()) ||
            l.institution?.name?.toLowerCase().includes(search.toLowerCase())) &&
        (!roleFilter || l.role === roleFilter) &&
        (!cityFilter || l.currentCity.includes(cityFilter) || l.targetCity.includes(cityFilter))
    )

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Hero */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 rounded-full border border-indigo-500/30 mb-4">
                    <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
                    <span className="text-indigo-300 text-sm font-medium">Kamu Çalışanları Becayiş Platformu</span>
                </div>
                <h1 className="text-4xl font-bold text-white mb-3">Becayiş İlanları</h1>
                <p className="text-slate-400 text-lg">Kadro tipine göre uygun becayiş ilanlarını bulun.</p>
            </div>

            {/* Filters */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-slate-700 mb-8 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text" placeholder="İlan, branş veya kurum ara..."
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                    />
                </div>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white">
                    <option value="">Tüm Kadrolar</option>
                    <option value="MEMUR">👔 Memur</option>
                    <option value="ISCI">👷 4D İşçi</option>
                    <option value="SOZLESMELI">📝 4B Sözleşmeli</option>
                </select>
                <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
                    className="px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white">
                    <option value="">Tüm Şehirler</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={loadListings}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition">
                    🔍 Ara
                </button>
            </div>

            <p className="text-slate-400 text-sm mb-6">{filteredListings.length} ilan bulundu</p>

            {/* Listings Grid */}
            {loading ? (
                <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4" />
                    <p className="text-slate-400">İlanlar yükleniyor...</p>
                </div>
            ) : filteredListings.length === 0 ? (
                <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700">
                    <ArrowLeftRight className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">İlan bulunamadı</h3>
                    <p className="text-slate-400">Henüz yayında becayiş ilanı bulunmuyor veya filtreleri değiştirebilirsiniz.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredListings.map(listing => (
                        <div key={listing.id}
                            className={`bg-slate-800/50 backdrop-blur-xl rounded-2xl p-5 border transition hover:scale-[1.02] duration-200
                                ${listing.isPremium ? 'border-amber-500/50 shadow-lg shadow-amber-500/10' : 'border-slate-700 hover:border-indigo-500/50'}`}>

                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="text-sm font-semibold text-white line-clamp-2 flex-1">{listing.title}</h3>
                                {listing.isPremium && (
                                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0 ml-2">
                                        <Crown className="w-3 h-3" /> VIP
                                    </span>
                                )}
                            </div>

                            {/* Kadro */}
                            <div className="mb-3">{roleBadge(listing.role)}</div>

                            {/* Kurum */}
                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                                <Building2 className="w-3.5 h-3.5" />
                                <span className="line-clamp-1">{listing.institution?.name || 'Belirtilmemiş'}</span>
                            </div>

                            {/* Rota */}
                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-3 bg-slate-900/50 rounded-lg p-2">
                                <MapPin className="w-3.5 h-3.5 text-green-400" />
                                <span className="text-green-300 font-medium">{listing.currentCity}</span>
                                <ArrowRight className="w-3 h-3 text-slate-600" />
                                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-indigo-300 font-medium">{listing.targetCity}</span>
                            </div>

                            {/* Açıklama */}
                            <p className="text-xs text-slate-500 line-clamp-2 mb-3">{listing.description}</p>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                                <span className="text-[10px] text-slate-500">{listing.branch}</span>
                                <span className="text-[10px] text-slate-500">
                                    {new Date(listing.createdAt).toLocaleDateString('tr-TR')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    )
}
