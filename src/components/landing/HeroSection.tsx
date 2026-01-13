'use client'

import React from 'react'
import Link from 'next/link'
import {
    Building2, Users, Brain, TrendingUp,
    ArrowRight, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const stats = [
    { label: 'Aktif STK', value: '500+', icon: Building2 },
    { label: 'Toplam Üye', value: '50.000+', icon: Users },
    { label: 'Aylık İşlem', value: '₺2M+', icon: TrendingUp },
    { label: 'AI Analiz', value: '10.000+', icon: Brain },
]

export default function HeroSection() {
    return (
        <section className="relative pt-32 pb-20 px-4 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-emerald-500 rounded-full blur-[180px] opacity-20" />
                <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] bg-teal-500 rounded-full blur-[150px] opacity-15" />
                <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-cyan-500 rounded-full blur-[120px] opacity-10" />
            </div>

            <div className="relative max-w-7xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-8">
                    <Sparkles className="w-4 h-4" />
                    <span>Yapay Zeka Destekli STK Yönetim Platformu</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                    STK Yönetiminde{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                        Yeni Nesil
                    </span>
                </h1>

                <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10">
                    Üye takibi, aidat yönetimi, finansal raporlama ve yapay zeka destekli analizlerle
                    sivil toplum kuruluşunuzu dijital çağa taşıyın.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                    <Link href="/auth/register">
                        <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/30">
                            Ücretsiz Deneyin
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </Link>
                    <Link href="#features">
                        <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/20 text-white hover:bg-white/10">
                            Özellikleri Keşfedin
                        </Button>
                    </Link>
                </div>

                {/* Stats Bar */}
                <div id="stats" className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                    {stats.map((stat) => (
                        <div key={stat.label} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                            <stat.icon className="w-8 h-8 text-emerald-400 mb-3 mx-auto" />
                            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                            <div className="text-sm text-slate-400">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
