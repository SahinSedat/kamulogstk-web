import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { notFound } from "next/navigation"

export const metadata = {
  title: "Kullanıcı Sözleşmesi | KamuLog STK",
  description: "KamuLog STK Kullanıcı Sözleşmesi",
}

export default async function TermsOfServicePage() {
  const doc = await prisma.appDocument.findFirst({
    where: { slug: "terms-of-service" }
  })

  if (!doc) {
    notFound()
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0a0e1a 100%)' }}>
      <header className="border-b border-white/5 backdrop-blur-2xl sticky top-0 z-50" style={{ background: 'rgba(10,14,26,0.85)' }}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <span className="text-white text-lg font-bold">K</span>
            </div>
            <span className="text-lg font-bold text-white">KamuLog</span>
          </Link>
          <Link href="/" className="text-sm text-slate-400 hover:text-white transition">
            Ana Sayfaya Dön
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">{doc.title}</h1>
          <p className="text-slate-400">Son Güncelleme: {new Date(doc.updatedAt).toLocaleDateString('tr-TR')}</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-6 md:p-10 border border-white/10 prose prose-invert prose-emerald max-w-none">
          <div dangerouslySetInnerHTML={{ __html: doc.content || "İçerik henüz eklenmedi." }} />
        </div>
      </main>
    </div>
  )
}
