'use client'

import React from 'react'
import {
    Building2, Users, BarChart3, Brain, Shield, CreditCard
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const features = [
    {
        icon: Building2,
        title: 'STK Yönetimi',
        description: 'Sivil toplum kuruluşunuzun tüm süreçlerini tek platformdan yönetin.',
        color: 'from-blue-500 to-cyan-500'
    },
    {
        icon: Users,
        title: 'Üye Takibi',
        description: 'Üye kayıtları, aidat takibi ve iletişim yönetimini kolaylaştırın.',
        color: 'from-emerald-500 to-teal-500'
    },
    {
        icon: Brain,
        title: 'AI Destekli Analiz',
        description: 'Yapay zeka ile üye davranışları ve finansal tahminler alın.',
        color: 'from-purple-500 to-pink-500'
    },
    {
        icon: BarChart3,
        title: 'Gelişmiş İstatistikler',
        description: 'Gerçek zamanlı raporlar ve görselleştirmelerle karar verin.',
        color: 'from-orange-500 to-red-500'
    },
    {
        icon: CreditCard,
        title: 'Online Tahsilat',
        description: 'Aidat ve bağışları online olarak güvenle tahsil edin.',
        color: 'from-indigo-500 to-blue-500'
    },
    {
        icon: Shield,
        title: 'KVKK Uyumlu',
        description: 'Kişisel veriler KVKK mevzuatına uygun şekilde korunur.',
        color: 'from-slate-500 to-zinc-500'
    },
]

export default function FeaturesSection() {
    return (
        <section id="features" className="py-20 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Tüm İhtiyaçlarınız Tek Platformda
                    </h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        STK yönetiminin tüm karmaşık süreçlerini basitleştiren kapsamlı çözümler
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature) => (
                        <Card key={feature.title} className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 group">
                            <CardContent className="p-6">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <feature.icon className="w-7 h-7 text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                                <p className="text-slate-400">{feature.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    )
}
