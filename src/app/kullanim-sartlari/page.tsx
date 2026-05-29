import { Metadata } from 'next'
import { Navbar, Footer } from '@/components/landing'
import { FileText, Calendar } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Kullanım Şartları',
    description: 'KamulogSTK kullanım şartları ve koşulları. Platformumuzu kullanmadan önce lütfen okuyunuz.',
}

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <Navbar />

            <main className="pt-24 pb-20">
                <section className="px-4 py-16">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-6">
                                <FileText className="w-4 h-4" />
                                <span>Yasal</span>
                            </div>
                            <h1 className="text-4xl font-bold text-white mb-4">Kullanım Şartları</h1>
                            <p className="flex items-center justify-center gap-2 text-slate-400">
                                <Calendar className="w-4 h-4" />
                                Son güncelleme: 1 Ocak 2026
                            </p>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                            <div className="prose prose-invert max-w-none">
                                <div className="space-y-8 text-slate-300">
                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">1. Genel Hükümler</h2>
                                        <p>
                                            Bu Kullanım Şartları, KamulogSTK platformunu ("Hizmet") kullanan tüm
                                            kullanıcılar için geçerlidir. Platformu kullanarak bu şartları kabul
                                            etmiş sayılırsınız.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">2. Hizmet Tanımı</h2>
                                        <p>
                                            KamulogSTK, sivil toplum kuruluşları için üye yönetimi, aidat takibi,
                                            finansal raporlama ve yapay zeka destekli analiz hizmetleri sunan bir
                                            bulut tabanlı platformdur.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">3. Hesap Oluşturma</h2>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li>Hesap oluşturmak için gerçek ve doğru bilgiler vermelisiniz</li>
                                            <li>Hesap güvenliğinden siz sorumlusunuz</li>
                                            <li>Hesabınızı başkalarıyla paylaşmamalısınız</li>
                                            <li>Şüpheli aktivite tespit edilirse hesabınız askıya alınabilir</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">4. Kabul Edilebilir Kullanım</h2>
                                        <p className="mb-4">Platformu kullanırken aşağıdaki kurallara uymalısınız:</p>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li>Yasalara ve düzenlemelere uygun hareket etmek</li>
                                            <li>Başkalarının haklarına saygı göstermek</li>
                                            <li>Platformun güvenliğini tehlikeye atmamak</li>
                                            <li>Spam veya kötü amaçlı içerik paylaşmamak</li>
                                            <li>Fikri mülkiyet haklarına saygı göstermek</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">5. Ödeme ve Abonelik</h2>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li>Abonelik ücretleri peşin olarak tahsil edilir</li>
                                            <li>Fiyat değişiklikleri 30 gün önceden bildirilir</li>
                                            <li>İptal işlemleri dönem sonunda geçerli olur</li>
                                            <li>İade politikası ilk 14 gün içinde geçerlidir</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">6. Fikri Mülkiyet</h2>
                                        <p>
                                            Platform üzerindeki tüm içerik, tasarım, logo ve yazılımlar
                                            KamulogSTK&apos;nin fikri mülkiyetidir. İzinsiz kopyalama,
                                            dağıtma veya değiştirme yasaktır.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">7. Sorumluluk Sınırlaması</h2>
                                        <p>
                                            KamulogSTK, hizmet kesintileri, veri kaybı veya dolaylı zararlardan
                                            sorumlu değildir. Maksimum sorumluluk, son 12 aylık abonelik
                                            ücretini geçemez.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">8. Hizmet Değişiklikleri</h2>
                                        <p>
                                            KamulogSTK, hizmeti değiştirme, güncelleme veya sonlandırma hakkını
                                            saklı tutar. Önemli değişiklikler kullanıcılara önceden bildirilir.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">9. Fesih</h2>
                                        <p>
                                            Kullanım şartlarının ihlali halinde hesabınız uyarılmadan
                                            sonlandırılabilir. Hesap kapatıldığında verileriniz 30 gün
                                            içinde silinir.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">10. Uyuşmazlık Çözümü</h2>
                                        <p>
                                            Bu şartlardan doğan uyuşmazlıklarda İstanbul Mahkemeleri ve
                                            İcra Daireleri yetkilidir. Türk Hukuku uygulanır.
                                        </p>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">11. İletişim</h2>
                                        <p>
                                            Kullanım şartları hakkında sorularınız için{' '}
                                            <a href="mailto:legal@kamulogstk.net" className="text-emerald-400 hover:underline">
                                                legal@kamulogstk.net
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
