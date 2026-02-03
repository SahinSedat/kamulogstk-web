'use client'

import React from 'react'
import Link from 'next/link'
import { Building2 } from 'lucide-react'

export default function Footer() {
    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' })
        }
    }

    return (
        <footer className="border-t border-white/10 py-12 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-4 gap-8 mb-8">
                    <div>
                        <Link href="/" className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">KamulogSTK</span>
                        </Link>
                        <p className="text-slate-400 text-sm">
                            Yapay zeka destekli, yeni nesil STK yönetim platformu.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Ürün</h4>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li>
                                <button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">
                                    Özellikler
                                </button>
                            </li>
                            <li>
                                <Link href="/fiyatlandirma" className="hover:text-white transition-colors">
                                    Fiyatlandırma
                                </Link>
                            </li>
                            <li>
                                <button onClick={() => scrollToSection('ai')} className="hover:text-white transition-colors">
                                    AI Teknolojisi
                                </button>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Şirket</h4>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><Link href="/hakkimizda" className="hover:text-white transition-colors">Hakkımızda</Link></li>
                            <li><Link href="/iletisim" className="hover:text-white transition-colors">İletişim</Link></li>
                            <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Yasal</h4>
                        <ul className="space-y-2 text-sm text-slate-400">
                            <li><Link href="/gizlilik" className="hover:text-white transition-colors">Gizlilik Politikası</Link></li>
                            <li><Link href="/kullanim-sartlari" className="hover:text-white transition-colors">Kullanım Şartları</Link></li>
                            <li><Link href="/kvkk" className="hover:text-white transition-colors">KVKK Aydınlatma</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-slate-400 text-sm">
                        © 2026 KamulogSTK. Tüm hakları saklıdır.
                    </p>
                    <div className="flex items-center gap-4 text-slate-400">
                        <span className="text-sm">Türkiye&apos;de 🇹🇷 sevgiyle geliştirildi</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
