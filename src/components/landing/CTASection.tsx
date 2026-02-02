'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CTASection() {
    return (
        <section className="py-20 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-3xl p-8 md:p-12 border border-emerald-500/30 text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        STK&apos;nızı Dijitale Taşıyın
                    </h2>
                    <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
                        30 gün ücretsiz deneme ile tüm özellikleri test edin.
                        Kredi kartı gerekmez, iptal etmek kolay.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/auth/kayit">
                            <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                                Hemen Başvurun
                                <ChevronRight className="w-5 h-5 ml-1" />
                            </Button>
                        </Link>
                        <Link href="/auth/giris">
                            <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/20 text-white hover:bg-white/10">
                                Mevcut Hesaba Giriş
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}
