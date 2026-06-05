'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Briefcase, MapPin, Building2, Search, Sparkles, ExternalLink, Clock } from 'lucide-react'

interface JobListing {
    id: string; code?: string | null; title: string; company: string;
    location: string | null; type: string; description: string;
    sourceUrl?: string | null; applicationUrl?: string | null;
    salary?: string | null; deadline?: string | null; createdAt: string;
}

export default function KariyerPage() {
    const [jobs, setJobs] = useState<JobListing[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('ALL')
    const [search, setSearch] = useState('')
    const [cityFilter, setCityFilter] = useState('')

    useEffect(() => { loadJobs() }, [filter])

    const loadJobs = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filter !== 'ALL') params.append('type', filter)
            if (search.trim()) params.append('search', search.trim())
            if (cityFilter) params.append('city', cityFilter)
            const res = await fetch(`/api/public/jobs?${params}`)
            const data = await res.json()
            setJobs(data.jobs || [])
        } catch (e) {
            console.error('Jobs error:', e)
        } finally {
            setLoading(false)
        }
    }

    const cities = [...new Set(jobs.map(j => j.location).filter(Boolean))] as string[]

    const filteredJobs = jobs.filter(job =>
    (job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.company.toLowerCase().includes(search.toLowerCase()) ||
        (job.code && job.code.toLowerCase().includes(search.toLowerCase())))
    )

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Hero */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 rounded-full border border-blue-500/30 mb-4">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-300 text-sm font-medium">AI Destekli İş Arama</span>
                </div>
                <h1 className="text-4xl font-bold text-white mb-3">İş İlanları</h1>
                <p className="text-slate-400 text-lg">Kamu ve özel sektördeki en güncel iş ilanlarını keşfedin.</p>
            </div>

            {/* Filters */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-slate-700 mb-8 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text" placeholder="İlan kodu, pozisyon veya şirket ara..."
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadJobs()}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    />
                </div>
                <select value={cityFilter} onChange={(e) => { setCityFilter(e.target.value); loadJobs() }}
                    className="px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500">
                    <option value="">Tüm Şehirler</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex gap-2">
                    {['ALL', 'PUBLIC', 'PRIVATE'].map(t => (
                        <button key={t} onClick={() => setFilter(t)}
                            className={`px-4 py-2.5 rounded-xl border transition font-medium text-sm ${filter === t
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                            {t === 'ALL' ? 'Tümü' : t === 'PUBLIC' ? '🏛️ Kamu' : '🏢 Özel'}
                        </button>
                    ))}
                </div>
            </div>

            {/* İlanlar Sayısı */}
            <div className="flex items-center justify-between mb-6">
                <p className="text-slate-400 text-sm">{filteredJobs.length} ilan bulundu</p>
            </div>

            {/* Job List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4" />
                        <p className="text-slate-400">İlanlar yükleniyor...</p>
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700">
                        <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">İlan bulunamadı</h3>
                        <p className="text-slate-400">Farklı arama kriterleri deneyebilirsiniz.</p>
                    </div>
                ) : (
                    filteredJobs.map(job => (
                        <div key={job.id} className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700 hover:border-blue-500/50 transition group">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        {job.code && (
                                            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-slate-700 text-slate-300 border border-slate-600">
                                                {job.code}
                                            </span>
                                        )}
                                        <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition">{job.title}</h3>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${job.type === 'PUBLIC' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {job.type === 'PUBLIC' ? '🏛️ Kamu' : '🏢 Özel'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-slate-400 text-sm mb-3">
                                        <div className="flex items-center gap-1">
                                            <Building2 className="w-4 h-4" />{job.company}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />{job.location || 'Türkiye Geneli'}
                                        </div>
                                        {job.salary && (
                                            <span className="text-green-400 font-medium">💰 {job.salary}</span>
                                        )}
                                    </div>
                                    <p className="text-slate-300 line-clamp-2 text-sm mb-3">{job.description}</p>
                                    <div className="flex flex-wrap gap-3">
                                        {job.deadline && (
                                            <span className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded-lg">
                                                <Clock className="w-3 h-3" /> Son: {new Date(job.deadline).toLocaleDateString('tr-TR')}
                                            </span>
                                        )}
                                        <span className="text-xs text-slate-500">
                                            {new Date(job.createdAt).toLocaleDateString('tr-TR')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 justify-center">
                                    {job.sourceUrl && (
                                        <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition text-center justify-center">
                                            <ExternalLink className="w-4 h-4" /> Başvur
                                        </a>
                                    )}
                                    {job.applicationUrl && job.applicationUrl !== job.sourceUrl && (
                                        <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-xl transition text-center justify-center">
                                            🔗 Kaynak Sitede Gör
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </main>
    )
}
