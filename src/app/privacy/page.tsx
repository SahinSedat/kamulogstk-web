import { Metadata } from 'next'
import { Navbar, Footer } from '@/components/landing'
import { Shield, Calendar } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Gizlilik Politikası',
    description: 'KamulogSTK gizlilik politikası. Kişisel verilerinizin nasıl toplandığı, kullanıldığı ve korunduğu hakkında bilgi.',
}

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <Navbar />

            <main className="pt-24 pb-20">
                <section className="px-4 py-16">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-6">
                                <Shield className="w-4 h-4" />
                                <span>Yasal</span>
                            </div>
                            <h1 className="text-4xl font-bold text-white mb-4">Gizlilik Politikası</h1>
                            <p className="flex items-center justify-center gap-2 text-slate-400">
                                <Calendar className="w-4 h-4" />
                                Son güncelleme: 1 Ocak 2026
                            </p>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                            <div className="prose prose-invert max-w-none">
                                <div className="space-y-8 text-slate-300">
                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">1. Giriş</h2>
                                        <p>
                                            KamulogSTK olarak, kullanıcılarımızın gizliliğine büyük önem veriyoruz.
                                            Bu Gizlilik Politikası, web sitemizi ve hizmetlerimizi kullanırken
                                            kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">2. Toplanan Veriler</h2>
                                        <p className="mb-4">Hizmetlerimizi kullanırken aşağıdaki verileri toplayabiliriz:</p>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li>Ad, soyad, e-posta adresi, telefon numarası gibi kimlik bilgileri</li>
                                            <li>STK bilgileri (kuruluş adı, vergi numarası, adres vb.)</li>
                                            <li>Üyelik ve aidat bilgileri</li>
                                            <li>Ödeme işlem bilgileri</li>
                                            <li>Kullanım verileri (IP adresi, tarayıcı bilgisi, tıklama verileri)</li>
                                            <li>Çerezler aracılığıyla toplanan veriler</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">3. Verilerin Kullanımı</h2>
                                        <p className="mb-4">Topladığımız verileri aşağıdaki amaçlarla kullanırız:</p>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li>Hizmetlerimizi sunmak ve geliştirmek</li>
                                            <li>Kullanıcı hesaplarını yönetmek</li>
                                            <li>Ödeme işlemlerini gerçekleştirmek</li>
                                            <li>Teknik destek sağlamak</li>
                                            <li>Yasal yükümlülükleri yerine getirmek</li>
                                            <li>Güvenlik önlemleri almak</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">4. Veri Güvenliği</h2>
                                        <p>
                                            Kişisel verilerinizi korumak için endüstri standardı güvenlik önlemleri
                                            uyguluyoruz. Tüm veriler şifreli bağlantılar üzerinden iletilir ve
                                            güvenli sunucularda saklanır. Düzenli güvenlik denetimleri
                                            gerçekleştiriyoruz.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">5. Üçüncü Taraflarla Paylaşım</h2>
                                        <p>
                                            Kişisel verilerinizi, yasal zorunluluklar dışında, izniniz olmadan
                                            üçüncü taraflarla paylaşmayız. Ödeme işlemleri için güvenilir ödeme
                                            sağlayıcıları ile çalışıyoruz.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">6. Çerezler</h2>
                                        <p>
                                            Web sitemizde deneyiminizi geliştirmek için çerezler kullanıyoruz.
                                            Tarayıcı ayarlarınızdan çerezleri devre dışı bırakabilirsiniz, ancak
                                            bu bazı özelliklerin çalışmamasına neden olabilir.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">7. Haklarınız</h2>
                                        <p className="mb-4">KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                                            <li>Kişisel verileriniz hakkında bilgi talep etme</li>
                                            <li>Verilerinizin düzeltilmesini veya silinmesini isteme</li>
                                            <li>İşlemenin kısıtlanmasını talep etme</li>
                                            <li>Veri taşınabilirliği hakkı</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">8. İletişim</h2>
                                        <p>
                                            Gizlilik politikamız hakkında sorularınız için{' '}
                                            <a href="mailto:privacy@kamulogstk.net" className="text-emerald-400 hover:underline">
                                                privacy@kamulogstk.net
                                            </a>{' '}
                                            adresinden bize ulaşabilirsiniz.
                                        </p>
                                    </section>
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
