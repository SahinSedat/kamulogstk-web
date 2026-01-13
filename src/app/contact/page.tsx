import { Metadata } from 'next'
import { Navbar, Footer } from '@/components/landing'
import { Mail, Phone, MapPin, Clock, Send, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
    title: 'İletişim',
    description: 'KamulogSTK ile iletişime geçin. Sorularınız, önerileriniz veya destek talepleriniz için bize ulaşın.',
}

const contactInfo = [
    { icon: Mail, label: 'E-posta', value: 'info@kamulogstk.net', href: 'mailto:info@kamulogstk.net' },
    { icon: Phone, label: 'Telefon', value: '+90 (212) 000 00 00', href: 'tel:+902120000000' },
    { icon: MapPin, label: 'Adres', value: 'İstanbul, Türkiye', href: '#' },
    { icon: Clock, label: 'Çalışma Saatleri', value: 'Pzt-Cuma: 09:00-18:00', href: '#' },
]

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <Navbar />

            <main className="pt-24 pb-20">
                <section className="px-4 py-16">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-6">
                                <MessageSquare className="w-4 h-4" />
                                <span>İletişim</span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                                Bize <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Ulaşın</span>
                            </h1>
                            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                                Sorularınız, önerileriniz veya destek talepleriniz için bizimle iletişime geçin.
                                En kısa sürede size dönüş yapacağız.
                            </p>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-12">
                            {/* Contact Form */}
                            <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                                <h2 className="text-2xl font-bold text-white mb-6">Mesaj Gönderin</h2>
                                <form className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Ad Soyad</label>
                                            <input
                                                type="text"
                                                className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                placeholder="Adınız Soyadınız"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">E-posta</label>
                                            <input
                                                type="email"
                                                className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                                placeholder="ornek@email.com"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Konu</label>
                                        <select className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                                            <option value="" className="bg-slate-900">Konu Seçin</option>
                                            <option value="genel" className="bg-slate-900">Genel Bilgi</option>
                                            <option value="satis" className="bg-slate-900">Satış / Fiyatlandırma</option>
                                            <option value="destek" className="bg-slate-900">Teknik Destek</option>
                                            <option value="oneri" className="bg-slate-900">Öneri / Şikayet</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Mesajınız</label>
                                        <textarea
                                            rows={5}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                                            placeholder="Mesajınızı yazın..."
                                        />
                                    </div>
                                    <Button className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                                        <Send className="w-4 h-4 mr-2" />
                                        Gönder
                                    </Button>
                                </form>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-6">
                                <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                                    <h2 className="text-2xl font-bold text-white mb-6">İletişim Bilgileri</h2>
                                    <div className="space-y-6">
                                        {contactInfo.map((item) => (
                                            <a
                                                key={item.label}
                                                href={item.href}
                                                className="flex items-start gap-4 group"
                                            >
                                                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/30 transition-colors">
                                                    <item.icon className="w-5 h-5 text-emerald-400" />
                                                </div>
                                                <div>
                                                    <div className="text-slate-400 text-sm">{item.label}</div>
                                                    <div className="text-white font-medium">{item.value}</div>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl p-8 border border-emerald-500/30">
                                    <h3 className="text-xl font-bold text-white mb-4">Hızlı Destek</h3>
                                    <p className="text-slate-300 mb-4">
                                        Acil destek talepleriniz için WhatsApp hattımızı kullanabilirsiniz.
                                    </p>
                                    <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                                        WhatsApp ile İletişim
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    )
}
