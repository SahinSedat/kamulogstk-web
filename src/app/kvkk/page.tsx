import { Metadata } from 'next'
import { Navbar, Footer } from '@/components/landing'
import { Shield, Calendar, AlertCircle } from 'lucide-react'

export const metadata: Metadata = {
    title: 'KVKK Aydınlatma Metni',
    description: 'KamulogSTK 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.',
}

export default function KVKKPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <Navbar />

            <main className="pt-24 pb-20">
                <section className="px-4 py-16">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-6">
                                <Shield className="w-4 h-4" />
                                <span>KVKK</span>
                            </div>
                            <h1 className="text-4xl font-bold text-white mb-4">KVKK Aydınlatma Metni</h1>
                            <p className="flex items-center justify-center gap-2 text-slate-400">
                                <Calendar className="w-4 h-4" />
                                Son güncelleme: 1 Ocak 2026
                            </p>
                        </div>

                        {/* Important Notice */}
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-8">
                            <div className="flex gap-4">
                                <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
                                <div>
                                    <h3 className="text-amber-400 font-semibold mb-2">Önemli Bilgilendirme</h3>
                                    <p className="text-slate-300 text-sm">
                                        Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu&apos;nun 10. maddesi
                                        gereğince hazırlanmıştır. Platformumuzu kullanmadan önce lütfen dikkatle okuyunuz.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                            <div className="prose prose-invert max-w-none">
                                <div className="space-y-8 text-slate-300">
                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">1. Veri Sorumlusu</h2>
                                        <p>
                                            6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca,
                                            kişisel verileriniz; veri sorumlusu olarak KamulogSTK Yazılım ve
                                            Teknoloji A.Ş. tarafından aşağıda açıklanan kapsamda işlenebilecektir.
                                        </p>
                                        <div className="mt-4 p-4 bg-white/5 rounded-lg">
                                            <p><strong className="text-white">Şirket:</strong> KamulogSTK Yazılım ve Teknoloji A.Ş.</p>
                                            <p><strong className="text-white">Adres:</strong> İstanbul, Türkiye</p>
                                            <p><strong className="text-white">E-posta:</strong> kvkk@kamulogstk.net</p>
                                        </div>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">2. İşlenen Kişisel Veriler</h2>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-white/10">
                                                        <th className="text-left py-3 text-white">Veri Kategorisi</th>
                                                        <th className="text-left py-3 text-white">Veri Türleri</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr className="border-b border-white/10">
                                                        <td className="py-3">Kimlik Bilgileri</td>
                                                        <td className="py-3">Ad, soyad, T.C. kimlik no, doğum tarihi</td>
                                                    </tr>
                                                    <tr className="border-b border-white/10">
                                                        <td className="py-3">İletişim Bilgileri</td>
                                                        <td className="py-3">E-posta, telefon, adres</td>
                                                    </tr>
                                                    <tr className="border-b border-white/10">
                                                        <td className="py-3">Finansal Bilgiler</td>
                                                        <td className="py-3">Banka hesap bilgileri, ödeme geçmişi</td>
                                                    </tr>
                                                    <tr className="border-b border-white/10">
                                                        <td className="py-3">Dijital İzler</td>
                                                        <td className="py-3">IP adresi, çerez verileri, oturum bilgileri</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">3. Kişisel Verilerin İşlenme Amaçları</h2>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li>Platform hizmetlerinin sunulması ve iyileştirilmesi</li>
                                            <li>Kullanıcı hesaplarının yönetimi</li>
                                            <li>Ödeme ve fatura işlemlerinin gerçekleştirilmesi</li>
                                            <li>Yasal yükümlülüklerin yerine getirilmesi</li>
                                            <li>Müşteri destek hizmetlerinin sağlanması</li>
                                            <li>İstatistiksel analizler ve raporlama</li>
                                            <li>Bilgi güvenliği süreçlerinin yürütülmesi</li>
                                            <li>Pazarlama ve iletişim faaliyetleri (onay halinde)</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">4. Kişisel Verilerin Aktarılması</h2>
                                        <p className="mb-4">
                                            Kişisel verileriniz, KVKK&apos;nin 8. ve 9. maddelerinde belirtilen şartlara
                                            uygun olarak aşağıdaki taraflara aktarılabilir:
                                        </p>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li>Yasal zorunluluklar kapsamında kamu kurumlarına</li>
                                            <li>Ödeme hizmetleri için bankalar ve ödeme kuruluşlarına</li>
                                            <li>Bulut hizmeti sağlayıcılarına (yurt içi/yurt dışı)</li>
                                            <li>İş ortaklarımıza (gizlilik sözleşmesi kapsamında)</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">5. Veri İşlemenin Hukuki Sebepleri</h2>
                                        <p>KVKK&apos;nin 5. maddesinde belirtilen:</p>
                                        <ul className="list-disc pl-6 space-y-2 mt-4">
                                            <li>Açık rızanızın bulunması</li>
                                            <li>Kanunlarda açıkça öngörülmesi</li>
                                            <li>Sözleşmenin kurulması veya ifası için gerekli olması</li>
                                            <li>Veri sorumlusunun hukuki yükümlülüğü</li>
                                            <li>Meşru menfaatler için gerekli olması</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">6. KVKK Kapsamındaki Haklarınız</h2>
                                        <p className="mb-4">KVKK&apos;nin 11. maddesi uyarınca, aşağıdaki haklara sahipsiniz:</p>
                                        <ul className="list-disc pl-6 space-y-2">
                                            <li>Kişisel verinizin işlenip işlenmediğini öğrenme</li>
                                            <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
                                            <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
                                            <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
                                            <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
                                            <li>KVKK&apos;nin 7. maddesi çerçevesinde silinmesini veya yok edilmesini isteme</li>
                                            <li>Düzeltme/silme işlemlerinin aktarılan üçüncü kişilere bildirilmesini isteme</li>
                                            <li>Münhasıran otomatik sistemler vasıtasıyla analiz edilmesi sonucu aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
                                            <li>Kanuna aykırı işleme nedeniyle zarara uğramanız halinde tazminat talep etme</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h2 className="text-xl font-bold text-white mb-4">7. Başvuru Yöntemi</h2>
                                        <p>
                                            Yukarıda belirtilen haklarınızı kullanmak için{' '}
                                            <a href="mailto:kvkk@kamulogstk.net" className="text-emerald-400 hover:underline">
                                                kvkk@kamulogstk.net
                                            </a>{' '}
                                            adresine e-posta göndererek veya kayıtlı elektronik posta (KEP)
                                            üzerinden başvuru yapabilirsiniz.
                                        </p>
                                        <p className="mt-4">
                                            Başvurularınız 30 gün içinde ücretsiz olarak sonuçlandırılacaktır.
                                            İşlemin ayrıca bir maliyet gerektirmesi halinde, Kurul&apos;ca
                                            belirlenen tarife uygulanabilir.
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
