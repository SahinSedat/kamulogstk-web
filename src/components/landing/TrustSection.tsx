'use client'

import React from 'react'
import { Shield, Award, CheckCircle2, Lock } from 'lucide-react'

const badges = [
    { icon: Shield, label: 'KVKK Uyumlu', description: 'Veri koruma standartları' },
    { icon: Lock, label: 'SSL Güvenlik', description: '256-bit şifreleme' },
    { icon: Award, label: 'ISO 27001', description: 'Bilgi güvenliği' },
    { icon: CheckCircle2, label: '%99.9 Uptime', description: 'Kesintisiz hizmet' },
]

const partners = [
    'Türkiye Dernekler Birliği',
    'Vakıflar Federasyonu',
    'Sivil Toplum Ağı',
    'STK Platformu',
]

export default function TrustSection() {
    return (
        <section className="py-16 px-4 border-y border-white/10">
            <div className="max-w-7xl mx-auto">
                {/* Trust Badges */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                    {badges.map((badge, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-emerald-500/30 transition-colors group"
                        >
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                                <badge.icon className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <div className="font-semibold text-white">{badge.label}</div>
                                <div className="text-sm text-slate-400">{badge.description}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Partners */}
                <div className="text-center">
                    <p className="text-slate-500 text-sm mb-6">Güvenilir kuruluşlar tarafından tercih ediliyoruz</p>
                    <div className="flex flex-wrap items-center justify-center gap-8 opacity-50">
                        {partners.map((partner, index) => (
                            <div
                                key={index}
                                className="text-slate-400 font-medium hover:text-white transition-colors cursor-default"
                            >
                                {partner}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
