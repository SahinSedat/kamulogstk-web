import Link from 'next/link'
import { Shield } from 'lucide-react'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
            {/* Navbar */}
            <header className="border-b border-white/10 backdrop-blur-xl sticky top-0 z-50" style={{ background: 'rgba(15,23,42,0.9)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">Kamulog</h1>
                            <p className="text-[10px] text-slate-400 -mt-0.5">Kamu Çalışanları Platformu</p>
                        </div>
                    </Link>
                    <nav className="flex items-center gap-4">
                        <Link href="/kariyer" className="text-sm text-slate-300 hover:text-white transition">İş İlanları</Link>
                        <Link href="/becayis-ilanlari" className="text-sm text-slate-300 hover:text-white transition">Becayiş</Link>
                        <Link href="/tis-arsiv" className="text-sm text-slate-300 hover:text-white transition">TİS & Dosyalar</Link>
                        <Link href="/login" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition">
                            Giriş Yap
                        </Link>
                    </nav>
                </div>
            </header>

            {children}

            {/* Footer */}
            <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-500">
                © 2026 Kamulog — Kamu Çalışanları İçin Tek Platform
            </footer>
        </div>
    )
}
