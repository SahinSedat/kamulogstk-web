import { Metadata } from 'next'
import { Navbar, Footer } from '@/components/landing'
import { Building2, Users, Target, Award, Globe, Heart } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Hakkımızda',
    description: 'KamulogSTK - Sivil toplum kuruluşları için yapay zeka destekli yönetim platformu. Misyonumuz, vizyonumuz ve ekibimiz hakkında bilgi alın.',
}

const values = [
    { icon: Target, title: 'Misyon', description: 'STK\'ların dijital dönüşümünü kolaylaştırarak sivil toplumun güçlenmesine katkı sağlamak.' },
    { icon: Globe, title: 'Vizyon', description: 'Türkiye\'nin en kapsamlı ve yenilikçi STK yönetim platformu olmak.' },
    { icon: Heart, title: 'Değerler', description: 'Şeffaflık, güvenilirlik, yenilikçilik ve toplumsal fayda odaklı çalışma.' },
]

const stats = [
    { value: '500+', label: 'Aktif STK' },
    { value: '50.000+', label: 'Kayıtlı Üye' },
    { value: '₺2M+', label: 'Aylık İşlem' },
    { value: '99.9%', label: 'Uptime' },
]

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <Navbar />

            <main className="pt-24 pb-20">
                {/* Hero */}
                <section className="px-4 py-16">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-6">
                            <Building2 className="w-4 h-4" />
                            <span>Hakkımızda</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                            STK Yönetiminde <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Dijital Dönüşüm</span>
                        </h1>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                            2024 yılında kurulan KamulogSTK, sivil toplum kuruluşlarının dijital çağa uyum sağlamasını
                            kolaylaştırmak amacıyla yola çıktı. Yapay zeka destekli çözümlerimizle STK yönetimini
                            basitleştiriyoruz.
                        </p>
                    </div>
                </section>

                {/* Values */}
                <section className="px-4 py-16">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-3 gap-8">
                            {values.map((item) => (
                                <div key={item.title} className="bg-white/5 rounded-2xl p-8 border border-white/10">
                                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6">
                                        <item.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                                    <p className="text-slate-400">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Stats */}
                <section className="px-4 py-16">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-3xl p-8 border border-emerald-500/30">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                {stats.map((stat) => (
                                    <div key={stat.label} className="text-center">
                                        <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.value}</div>
                                        <div className="text-slate-400">{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Team */}
                <section className="px-4 py-16">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl font-bold text-white mb-6">Ekibimiz</h2>
                        <p className="text-slate-400 mb-12 max-w-2xl mx-auto">
                            Deneyimli yazılım geliştiricileri, STK uzmanları ve yapay zeka mühendislerinden oluşan
                            ekibimiz, en iyi çözümleri sunmak için çalışıyor.
                        </p>
                        <div className="grid md:grid-cols-3 gap-6">
                            {[
                                { name: 'Sedat Şahin', role: 'Kurucu & CEO', icon: Users },
                                { name: 'Teknik Ekip', role: 'Yazılım Geliştirme', icon: Award },
                                { name: 'Destek Ekibi', role: 'Müşteri Hizmetleri', icon: Heart },
                            ].map((member) => (
                                <div key={member.name} className="bg-white/5 rounded-xl p-6 border border-white/10">
                                    <div className="w-16 h-16 bg-slate-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                                        <member.icon className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-white font-semibold">{member.name}</h3>
                                    <p className="text-slate-400 text-sm">{member.role}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    )
}
