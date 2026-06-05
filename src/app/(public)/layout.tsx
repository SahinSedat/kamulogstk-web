import Link from 'next/link'
import { Shield } from 'lucide-react'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Navbar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-1.5">
                        <span className="text-2xl font-black tracking-tighter text-slate-900 flex items-center">
                            KamuLog<span className="text-emerald-600">STK</span>
                        </span>
                    </Link>
                </div>
            </header>

            <main className="flex-grow">
                {children}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-8 text-center">
                <p className="text-sm text-slate-500 font-medium">
                    © {new Date().getFullYear()} KamuLog STK. Tüm hakları saklıdır.
                </p>
            </footer>
        </div>
    )
}
