export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { FileText, Download } from 'lucide-react'

export default async function TISPublicPage({
    searchParams,
}: {
    searchParams: Promise<{ role?: string }>
}) {
    const params = await searchParams
    const roleFilter = params.role || ''

    const docWhere: any = { isActive: true }
    const fileWhere: any = { isActive: true }
    if (roleFilter) {
        docWhere.role = roleFilter
        fileWhere.role = roleFilter
    }

    const documents = await prisma.tISDocument.findMany({ where: docWhere, orderBy: { createdAt: 'desc' } })
    const files = await prisma.tISFile.findMany({ where: fileWhere, orderBy: { createdAt: 'desc' } })

    const institutions = [...new Set(documents.map(d => d.institution))].sort()

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Hero */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/20 rounded-full border border-emerald-500/30 mb-4">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300 text-sm font-medium">TİS Arşivi</span>
                </div>
                <h1 className="text-4xl font-bold text-white mb-3">Toplu İş Sözleşmesi & Dosyalar</h1>
                <p className="text-slate-400 text-lg">Kurum bazlı TİS belgeleri ve mevzuat dosyalarına erişin.</p>
            </div>

            {/* Role Filter */}
            <div className="flex items-center justify-center gap-3 mb-8">
                <a href="/tis-arsiv" className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${!roleFilter ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                    Tümü
                </a>
                <a href="/tis-arsiv?role=isci" className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${roleFilter === 'isci' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                    👷 İşçi
                </a>
                <a href="/tis-arsiv?role=memur" className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${roleFilter === 'memur' ? 'bg-green-600 border-green-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                    👔 Memur
                </a>
                <a href="/tis-arsiv?role=sozlesmeli" className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${roleFilter === 'sozlesmeli' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                    📝 Sözleşmeli
                </a>
            </div>

            {/* TİS Belgeleri */}
            {documents.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        📄 TİS Belgeleri
                        <span className="text-sm font-normal text-slate-400">({documents.length} belge)</span>
                    </h2>

                    {institutions.map(inst => {
                        const instDocs = documents.filter(d => d.institution === inst)
                        return (
                            <div key={inst} className="mb-6">
                                <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
                                    🏛️ {inst}
                                </h3>
                                <div className="grid gap-3">
                                    {instDocs.map(doc => (
                                        <div key={doc.id} className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-4 border border-slate-700 flex items-center justify-between hover:border-emerald-500/30 transition">
                                            <div className="flex-1">
                                                <h4 className="text-white font-medium">{doc.title}</h4>
                                                {doc.description && <p className="text-slate-400 text-sm mt-1">{doc.description}</p>}
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${doc.role === 'isci' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : doc.role === 'memur' ? 'bg-green-500/20 text-green-400 border-green-500/30' : doc.role === 'sozlesmeli' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                                                        {doc.role === 'isci' ? '👷 İşçi' : doc.role === 'memur' ? '👔 Memur' : doc.role === 'sozlesmeli' ? '📝 Sözleşmeli' : '🌐 Tümü'}
                                                    </span>
                                                    {doc.fileSize > 0 && (
                                                        <span className="text-xs text-slate-500">{(doc.fileSize / 1048576).toFixed(1)} MB</span>
                                                    )}
                                                </div>
                                            </div>
                                            {doc.fileUrl && (
                                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition flex-shrink-0 ml-4">
                                                    <Download className="w-4 h-4" /> İndir
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Genel Dosyalar */}
            {files.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        📁 Mevzuat & Genel Dosyalar
                        <span className="text-sm font-normal text-slate-400">({files.length} dosya)</span>
                    </h2>
                    <div className="grid md:grid-cols-2 gap-3">
                        {files.map(file => (
                            <div key={file.id} className="bg-slate-800/50 backdrop-blur-xl rounded-xl p-4 border border-slate-700 flex items-center justify-between hover:border-emerald-500/30 transition">
                                <div className="flex-1">
                                    <h4 className="text-white font-medium text-sm">{file.title}</h4>
                                    {file.description && <p className="text-slate-400 text-xs mt-1">{file.description}</p>}
                                    <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-semibold rounded-full border ${file.role === 'isci' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : file.role === 'memur' ? 'bg-green-500/20 text-green-400 border-green-500/30' : file.role === 'sozlesmeli' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                                        {file.role === 'isci' ? '👷 İşçi' : file.role === 'memur' ? '👔 Memur' : file.role === 'sozlesmeli' ? '📝 Sözleşmeli' : '🌐 Tümü'}
                                    </span>
                                </div>
                                {file.fileUrl && (
                                    <a href={file.fileUrl} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition flex-shrink-0 ml-4">
                                        <Download className="w-3.5 h-3.5" /> İndir
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {documents.length === 0 && files.length === 0 && (
                <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700">
                    <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Dosya bulunamadı</h3>
                    <p className="text-slate-400">Filtreleri değiştirmeyi deneyin.</p>
                </div>
            )}
        </main>
    )
}
