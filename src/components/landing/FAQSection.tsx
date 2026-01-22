'use client'

import React, { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'

const faqs = [
    {
        question: 'KamulogSTK hangi tür STK\'lar için uygundur?',
        answer: 'Dernekler, vakıflar, sendikalar, kooperatifler ve her türlü sivil toplum kuruluşu platformumuzu kullanabilir. Küçük mahalle derneklerinden büyük ulusal federasyonlara kadar her ölçekte STK için çözümler sunuyoruz.',
    },
    {
        question: 'Ücretsiz deneme süresi var mı?',
        answer: 'Evet! Tüm paketlerde 30 gün ücretsiz deneme hakkı sunuyoruz. Kredi kartı bilgisi gerekmez ve deneme süresi sonunda otomatik ücretlendirme yapılmaz.',
    },
    {
        question: 'Verilerimiz güvende mi?',
        answer: 'Kesinlikle! Tüm verileriniz SSL şifreleme ile korunur, KVKK uyumlu altyapımızda Türkiye\'deki güvenli sunucularda saklanır. Düzenli yedekleme ve güvenlik denetimleri yapılmaktadır.',
    },
    {
        question: 'Mevcut verilerimizi nasıl aktarabiliriz?',
        answer: 'Excel, CSV veya diğer formatlardaki mevcut üye ve aidat verilerinizi kolayca içe aktarabilirsiniz. Teknik ekibimiz geçiş sürecinde size yardımcı olur.',
    },
    {
        question: 'Online ödeme nasıl çalışıyor?',
        answer: 'Üyeleriniz kredi kartı, banka kartı veya havale/EFT ile aidat ve bağışlarını online olarak ödeyebilir. Tüm ödemeler güvenli ödeme altyapısı üzerinden işlenir.',
    },
    {
        question: 'Mobil uygulama var mı?',
        answer: 'Web platformumuz mobil uyumludur ve tüm cihazlarda sorunsuz çalışır. Ayrıca iOS ve Android için native mobil uygulamamız yakında yayınlanacaktır.',
    },
]

export default function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0)

    return (
        <section id="faq" className="py-20 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-6">
                        <HelpCircle className="w-4 h-4" />
                        <span>Sıkça Sorulan Sorular</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Merak Edilenler
                    </h2>
                    <p className="text-slate-400">
                        En çok sorulan sorular ve cevapları
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className={`bg-white/5 rounded-2xl border transition-all duration-300 ${openIndex === index
                                    ? 'border-emerald-500/50 bg-emerald-500/5'
                                    : 'border-white/10 hover:border-white/20'
                                }`}
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full px-6 py-5 flex items-center justify-between text-left"
                            >
                                <span className="font-medium text-white pr-4">{faq.question}</span>
                                <ChevronDown
                                    className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${openIndex === index ? 'rotate-180 text-emerald-400' : ''
                                        }`}
                                />
                            </button>
                            <div
                                className={`overflow-hidden transition-all duration-300 ${openIndex === index ? 'max-h-96' : 'max-h-0'
                                    }`}
                            >
                                <p className="px-6 pb-5 text-slate-400 leading-relaxed">
                                    {faq.answer}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Contact CTA */}
                <div className="mt-12 text-center">
                    <p className="text-slate-400 mb-4">Başka sorularınız mı var?</p>
                    <a
                        href="/contact"
                        className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                        Bizimle iletişime geçin
                        <span className="text-xl">→</span>
                    </a>
                </div>
            </div>
        </section>
    )
}
