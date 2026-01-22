'use client'

import React from 'react'
import { Star, Quote } from 'lucide-react'

const testimonials = [
    {
        name: 'Mehmet Yıldırım',
        role: 'Başkan',
        org: 'Eğitim Gönüllüleri Derneği',
        content: 'KamulogSTK ile üye yönetimimiz inanılmaz kolaylaştı. Eskiden Excel\'de saatler harcıyorduk, şimdi her şey otomatik.',
        rating: 5,
        avatar: 'MY',
    },
    {
        name: 'Ayşe Kara',
        role: 'Genel Sekreter',
        org: 'Çevre Koruma Vakfı',
        content: 'AI destekli analiz özellikleri sayesinde aidat tahsilatımızı %40 artırdık. Harika bir platform!',
        rating: 5,
        avatar: 'AK',
    },
    {
        name: 'Ali Demir',
        role: 'Sayman',
        org: 'Spor Kulüpleri Federasyonu',
        content: 'Muhasebe modülü tam ihtiyacımız olan şeydi. Artık mali raporları dakikalar içinde oluşturabiliyoruz.',
        rating: 5,
        avatar: 'AD',
    },
]

export default function TestimonialsSection() {
    return (
        <section className="py-20 px-4 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-emerald-500 rounded-full blur-[200px] opacity-5" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-teal-500 rounded-full blur-[200px] opacity-5" />
            </div>

            <div className="relative max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        STK&apos;ların <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Tercihi</span>
                    </h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Türkiye&apos;nin dört bir yanından STK&apos;lar platformumuzu kullanıyor
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <div
                            key={index}
                            className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-emerald-500/50 transition-all duration-500 group hover:-translate-y-2"
                        >
                            {/* Quote Icon */}
                            <div className="absolute -top-4 -left-4 w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Quote className="w-5 h-5 text-white" />
                            </div>

                            {/* Stars */}
                            <div className="flex gap-1 mb-4">
                                {[...Array(testimonial.rating)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                                ))}
                            </div>

                            {/* Content */}
                            <p className="text-slate-300 mb-6 leading-relaxed">
                                &ldquo;{testimonial.content}&rdquo;
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                                    {testimonial.avatar}
                                </div>
                                <div>
                                    <div className="font-semibold text-white">{testimonial.name}</div>
                                    <div className="text-sm text-slate-400">{testimonial.role}, {testimonial.org}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Stats */}
                <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {[
                        { value: '4.9/5', label: 'Kullanıcı Puanı' },
                        { value: '%98', label: 'Memnuniyet' },
                        { value: '500+', label: 'Mutlu STK' },
                        { value: '7/24', label: 'Destek' },
                    ].map((stat, i) => (
                        <div key={i}>
                            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                            <div className="text-slate-400 text-sm">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
