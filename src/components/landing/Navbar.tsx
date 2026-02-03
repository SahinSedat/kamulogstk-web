'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Navbar() {
    const pathname = usePathname()
    const router = useRouter()

    const scrollToSection = (sectionId: string) => {
        // Eğer ana sayfada değilsek, önce ana sayfaya git
        if (pathname !== '/') {
            router.push('/')
            // Ana sayfa yüklendikten sonra scroll yap
            setTimeout(() => {
                const element = document.getElementById(sectionId)
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' })
                }
            }, 100)
        } else {
            // Zaten ana sayfadaysak direkt scroll yap
            const element = document.getElementById(sectionId)
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' })
            }
        }
    }

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">KamulogSTK</span>
                    </Link>
                    <div className="hidden md:flex items-center gap-8">
                        <button
                            onClick={() => scrollToSection('features')}
                            className="text-slate-300 hover:text-white transition-colors"
                        >
                            Özellikler
                        </button>
                        <button
                            onClick={() => scrollToSection('ai')}
                            className="text-slate-300 hover:text-white transition-colors"
                        >
                            AI Teknolojisi
                        </button>
                        <button
                            onClick={() => scrollToSection('stats')}
                            className="text-slate-300 hover:text-white transition-colors"
                        >
                            İstatistikler
                        </button>
                        <Link href="/fiyatlandirma" className="text-slate-300 hover:text-white transition-colors">
                            Fiyatlandırma
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/giris">
                            <Button variant="ghost" className="text-slate-300 hover:text-white">
                                Giriş Yap
                            </Button>
                        </Link>
                        <Link href="/kayit">
                            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                                Başvuru Yap
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    )
}
