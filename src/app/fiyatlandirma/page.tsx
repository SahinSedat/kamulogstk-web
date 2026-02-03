import { Metadata } from 'next'
import Link from 'next/link'
import { Navbar, Footer } from '@/components/landing'
import { Check, X, Sparkles, Building2, Users, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
    title: 'Fiyatlandırma',
    description: 'KamulogSTK fiyatlandırma planları. STK\'nız için en uygun paketi seçin.',
}

const plans = [
    {
        name: 'Başlangıç',
        price: '299',
        period: '/ay',
        description: 'Küçük STK\'lar için ideal başlangıç paketi',
        features: [
            { text: '100 üyeye kadar', included: true },
            { text: 'Üye yönetimi', included: true },
            { text: 'Aidat takibi', included: true },
            { text: 'Temel raporlar', included: true },
            { text: 'E-posta desteği', included: true },
            { text: 'Online tahsilat', included: false },
            { text: 'AI analiz', included: false },
            { text: 'API erişimi', included: false },
        ],
        popular: false,
        cta: 'Başla',
    },
    {
        name: 'Profesyonel',
        price: '599',
        period: '/ay',
        description: 'Büyüyen STK\'lar için kapsamlı çözüm',
        features: [
            { text: '1.000 üyeye kadar', included: true },
            { text: 'Üye yönetimi', included: true },
            { text: 'Aidat takibi', included: true },
            { text: 'Gelişmiş raporlar', included: true },
            { text: 'Öncelikli destek', included: true },
            { text: 'Online tahsilat', included: true },
            { text: 'AI analiz', included: true },
            { text: 'API erişimi', included: false },
        ],
        popular: true,
        cta: 'En Popüler',
    },
    {
        name: 'Kurumsal',
        price: '1.299',
        period: '/ay',
        description: 'Büyük STK\'lar için sınırsız çözüm',
        features: [
            { text: 'Sınırsız üye', included: true },
            { text: 'Üye yönetimi', included: true },
            { text: 'Aidat takibi', included: true },
            { text: 'Özel raporlar', included: true },
            { text: '7/24 destek', included: true },
            { text: 'Online tahsilat', included: true },
            { text: 'AI analiz', included: true },
            { text: 'API erişimi', included: true },
        ],
        popular: false,
        cta: 'İletişime Geç',
    },
]

const features = [
    { icon: Building2, title: 'Çoklu Şube', description: 'Birden fazla şubeyi tek panelden yönetin' },
    { icon: Users, title: 'Sınırsız Yönetici', description: 'Tüm planlarda sınırsız yönetici hesabı' },
    { icon: Brain, title: 'AI Destekli', description: 'Yapay zeka ile akıllı tahminler ve analizler' },
]

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <Navbar />

            <main className="pt-24 pb-20">
                <section className="px-4 py-16">
                    <div className="max-w-6xl mx-auto">
                        {/* Header */}
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-6">
                                <Sparkles className="w-4 h-4" />
                                <span>Fiyatlandırma</span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                                STK&apos;nız İçin <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Doğru Plan</span>
                            </h1>
                            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                                İhtiyaçlarınıza uygun planı seçin. Tüm planlar 30 gün ücretsiz deneme içerir.
                            </p>
                        </div>

                        {/* Pricing Cards */}
                        <div className="grid md:grid-cols-3 gap-8 mb-16">
                            {plans.map((plan) => (
                                <div
                                    key={plan.name}
                                    className={`relative rounded-2xl p-8 ${plan.popular
                                            ? 'bg-gradient-to-b from-emerald-500/20 to-teal-500/10 border-2 border-emerald-500/50'
                                            : 'bg-white/5 border border-white/10'
                                        }`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full text-white text-sm font-medium">
                                            En Popüler
                                        </div>
                                    )}

                                    <div className="text-center mb-8">
                                        <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                        <p className="text-slate-400 text-sm mb-4">{plan.description}</p>
                                        <div className="flex items-end justify-center gap-1">
                                            <span className="text-4xl font-bold text-white">₺{plan.price}</span>
                                            <span className="text-slate-400 mb-1">{plan.period}</span>
                                        </div>
                                    </div>

                                    <ul className="space-y-4 mb-8">
                                        {plan.features.map((feature, index) => (
                                            <li key={index} className="flex items-center gap-3">
                                                {feature.included ? (
                                                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                                ) : (
                                                    <X className="w-5 h-5 text-slate-600 flex-shrink-0" />
                                                )}
                                                <span className={feature.included ? 'text-slate-300' : 'text-slate-600'}>
                                                    {feature.text}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    <Link href="/kayit">
                                        <Button
                                            className={`w-full h-12 ${plan.popular
                                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                                                    : 'bg-white/10 hover:bg-white/20'
                                                }`}
                                        >
                                            {plan.cta}
                                        </Button>
                                    </Link>
                                </div>
                            ))}
                        </div>

                        {/* Additional Features */}
                        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                            <h2 className="text-2xl font-bold text-white text-center mb-8">
                                Tüm Planlarda Dahil
                            </h2>
                            <div className="grid md:grid-cols-3 gap-8">
                                {features.map((feature) => (
                                    <div key={feature.title} className="text-center">
                                        <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl mx-auto flex items-center justify-center mb-4">
                                            <feature.icon className="w-7 h-7 text-emerald-400" />
                                        </div>
                                        <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                                        <p className="text-slate-400 text-sm">{feature.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* FAQ */}
                        <div className="mt-16 text-center">
                            <h2 className="text-2xl font-bold text-white mb-4">Sorularınız mı var?</h2>
                            <p className="text-slate-400 mb-6">
                                Fiyatlandırma veya özellikler hakkında sorularınız için bize ulaşın.
                            </p>
                            <Link href="/contact">
                                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                                    İletişime Geçin
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    )
}
