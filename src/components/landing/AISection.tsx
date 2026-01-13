'use client'

import React from 'react'
import {
    Brain, TrendingUp, Sparkles, MessageSquare,
    FileText, Bell, Globe
} from 'lucide-react'

const aiFeatures = [
    { icon: Sparkles, text: 'Otomatik üye segmentasyonu' },
    { icon: TrendingUp, text: 'Aidat tahsilat tahmini' },
    { icon: MessageSquare, text: 'AI destekli iletişim önerileri' },
    { icon: FileText, text: 'Akıllı rapor oluşturma' },
    { icon: Bell, text: 'Proaktif bildirim sistemi' },
    { icon: Globe, text: 'Çoklu dil desteği' },
]

export default function AISection() {
    return (
        <section id="ai" className="py-20 px-4 relative overflow-hidden">
            <div className="absolute inset-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500 rounded-full blur-[200px] opacity-10" />
            </div>

            <div className="relative max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm mb-6">
                            <Brain className="w-4 h-4" />
                            <span>AI Teknolojisi</span>
                        </div>

                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                            Yapay Zeka ile{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                                Akıllı Kararlar
                            </span>
                        </h2>

                        <p className="text-slate-400 mb-8">
                            Makine öğrenimi algoritmaları ile üye davranışlarını analiz edin,
                            gelir tahminleri yapın ve proaktif aksiyonlar alın.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {aiFeatures.map((item) => (
                                <div key={item.text} className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                        <item.icon className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <span className="text-slate-300">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl p-8 border border-purple-500/30">
                            <div className="space-y-4">
                                <div className="bg-white/5 rounded-xl p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Brain className="w-5 h-5 text-purple-400" />
                                        <span className="text-white font-medium">AI Tahmin Motoru</span>
                                    </div>
                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full w-[85%] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                                    </div>
                                    <p className="text-sm text-slate-400 mt-2">Aidat tahsilat tahmini: %85 doğruluk</p>
                                </div>

                                <div className="bg-white/5 rounded-xl p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                                        <span className="text-white font-medium">Büyüme Analizi</span>
                                    </div>
                                    <div className="flex items-end gap-1 h-16">
                                        {[40, 55, 45, 70, 60, 85, 90].map((h, i) => (
                                            <div key={i} className="flex-1 bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t" style={{ height: `${h}%` }} />
                                        ))}
                                    </div>
                                    <p className="text-sm text-slate-400 mt-2">Önümüzdeki çeyrek: +23% üye artışı bekleniyor</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
