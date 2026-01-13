'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Building2, Users, BarChart3, Brain, Shield, CreditCard,
  ArrowRight, CheckCircle2, Sparkles, TrendingUp, Globe,
  MessageSquare, FileText, Bell, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const stats = [
  { label: 'Aktif STK', value: '500+', icon: Building2 },
  { label: 'Toplam Üye', value: '50.000+', icon: Users },
  { label: 'Aylık İşlem', value: '₺2M+', icon: TrendingUp },
  { label: 'AI Analiz', value: '10.000+', icon: Brain },
]

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

const aiFeatures = [
  { icon: Sparkles, text: 'Otomatik üye segmentasyonu' },
  { icon: TrendingUp, text: 'Aidat tahsilat tahmini' },
  { icon: MessageSquare, text: 'AI destekli iletişim önerileri' },
  { icon: FileText, text: 'Akıllı rapor oluşturma' },
  { icon: Bell, text: 'Proaktif bildirim sistemi' },
  { icon: Globe, text: 'Çoklu dil desteği' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">KamulogSTK</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-300 hover:text-white transition-colors">Özellikler</a>
              <a href="#ai" className="text-slate-300 hover:text-white transition-colors">AI Teknolojisi</a>
              <a href="#stats" className="text-slate-300 hover:text-white transition-colors">İstatistikler</a>
              <a href="#pricing" className="text-slate-300 hover:text-white transition-colors">Fiyatlandırma</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-slate-300 hover:text-white">
                  Giriş Yap
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                  Başvuru Yap
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-emerald-500 rounded-full blur-[180px] opacity-20" />
          <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] bg-teal-500 rounded-full blur-[150px] opacity-15" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-cyan-500 rounded-full blur-[120px] opacity-10" />
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-8">
            <Sparkles className="w-4 h-4" />
            <span>Yapay Zeka Destekli STK Yönetim Platformu</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            STK Yönetiminde{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
              Yeni Nesil
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Üye takibi, aidat yönetimi, finansal raporlama ve yapay zeka destekli analizlerle
            sivil toplum kuruluşunuzu dijital çağa taşıyın.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/auth/register">
              <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/30">
                Ücretsiz Deneyin
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/20 text-white hover:bg-white/10">
                Özellikleri Keşfedin
              </Button>
            </Link>
          </div>

          {/* Stats Bar */}
          <div id="stats" className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <stat.icon className="w-8 h-8 text-emerald-400 mb-3 mx-auto" />
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
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

      {/* AI Section */}
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

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-3xl p-8 md:p-12 border border-emerald-500/30 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              STK&apos;nızı Dijitale Taşıyın
            </h2>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
              30 gün ücretsiz deneme ile tüm özellikleri test edin.
              Kredi kartı gerekmez, iptal etmek kolay.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/register">
                <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                  Hemen Başvurun
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/20 text-white hover:bg-white/10">
                  Mevcut Hesaba Giriş
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">KamulogSTK</span>
              </div>
              <p className="text-slate-400 text-sm">
                Yapay zeka destekli, yeni nesil STK yönetim platformu.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Ürün</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Özellikler</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Fiyatlandırma</a></li>
                <li><a href="#ai" className="hover:text-white transition-colors">AI Teknolojisi</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Şirket</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="/about" className="hover:text-white transition-colors">Hakkımızda</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">İletişim</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Yasal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="/privacy" className="hover:text-white transition-colors">Gizlilik Politikası</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Kullanım Şartları</a></li>
                <li><a href="/kvkk" className="hover:text-white transition-colors">KVKK Aydınlatma</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">
              © 2026 KamulogSTK. Tüm hakları saklıdır.
            </p>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="text-sm">Türkiye&apos;de 🇹🇷 sevgiyle geliştirildi</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
