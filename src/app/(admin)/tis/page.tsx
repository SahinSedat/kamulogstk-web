import { prisma } from '@/lib/prisma'
import TISClientPage from './TISClientPage'

export default async function TISPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; search?: string; role?: string }>
}) {
    const params = await searchParams
    const tab = params.tab || 'documents'
    const search = params.search || ''
    const role = params.role || ''

    // İstatistikler
    // TIS AI jeton orani
    const jetonSetting = await prisma.siteSettings.findUnique({ where: { key: 'tisJetonRate' } })
    const tisJetonRate = parseInt(jetonSetting?.value || '10') || 10

    const [
        totalDocuments,
        totalFiles,
        isciDocuments,
        memurDocuments,
        sozlesmeli,
    ] = await Promise.all([
        prisma.tISDocument.count(),
        prisma.tISFile.count(),
        prisma.tISDocument.count({ where: { role: 'isci' } }),
        prisma.tISDocument.count({ where: { role: 'memur' } }),
        prisma.tISDocument.count({ where: { role: 'sozlesmeli' } }),
    ])

    // Verileri çek
    const documentWhere: any = {}
    const fileWhere: any = {}

    if (search) {
        documentWhere.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { institution: { contains: search, mode: 'insensitive' } },
        ]
        fileWhere.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
        ]
    }
    if (role) {
        documentWhere.role = role
        fileWhere.role = role
    }

    const [documents, files] = await Promise.all([
        prisma.tISDocument.findMany({ where: documentWhere, orderBy: { createdAt: 'desc' } }),
        prisma.tISFile.findMany({ where: fileWhere, orderBy: { createdAt: 'desc' } }),
    ])

    // Kurum listesi (benzersiz)
    const institutions = [...new Set(documents.map(d => d.institution))].sort()

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
                        📋 Toplu İş Sözleşmesi & Dosyalar
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {totalDocuments} TİS dökümanı, {totalFiles} genel dosya
                    </p>
                </div>
            </div>

            {/* İstatistik Kartları */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="glass-panel p-4 rounded-2xl">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>📄 TİS Belgeleri</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{totalDocuments}</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>📁 Genel Dosyalar</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{totalFiles}</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>👷 İşçi</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: 'var(--primary)' }}>{isciDocuments}</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>👔 Memur</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: 'var(--accent)' }}>{memurDocuments}</p>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>📝 Sözleşmeli</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: 'var(--warning)' }}>{sozlesmeli}</p>
                </div>
            </div>

            <TISClientPage
                documents={JSON.parse(JSON.stringify(documents))}
                files={JSON.parse(JSON.stringify(files))}
                institutions={institutions}
                initialTab={tab}
                initialSearch={search}
                initialRole={role}
                tisJetonRate={tisJetonRate}
            />
        </div>
    )
}
