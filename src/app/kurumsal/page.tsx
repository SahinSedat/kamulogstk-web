import Link from 'next/link'
import type { Metadata } from 'next'
import ApplicationFormClient from "@/components/stk/ApplicationForm";

export const metadata: Metadata = {
  title: 'KamuLog STK & Sendika Yönetim Platformu',
  description: 'Dernek, sendika ve vakıflar için profesyonel dijital yönetim platformu. Üye takibi, aidat yönetimi, faaliyetler, kampanyalar ve WhatsApp entegrasyonu.',
}

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0a0e1a 100%)' }}>

      {/* ─── Navbar ─────────────────────────────────────────────── */}
      <header className="border-b border-white/5 backdrop-blur-2xl sticky top-0 z-50" style={{ background: 'rgba(10,14,26,0.85)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <span className="text-white text-lg font-bold">K</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">KamuLog</h1>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">STK Yönetim Platformu</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.03] hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.25)' }}>
              🛡️ STK Yetkili Girişi
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ───────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* Sol: İçerik */}
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
                  style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Kurumsal Seviye STK Yönetimi
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-white">
                  KamuLog STK &
                  <span className="block mt-2" style={{ background: 'linear-gradient(135deg, #34d399, #10b981, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Sendika Yönetim Platformu
                  </span>
                </h1>
              </div>
              <p className="text-lg text-slate-400 leading-relaxed max-w-lg">
                Dernek, sendika ve vakıflarınızı tek panelden yönetin. Üye takibi, aidat yönetimi, faaliyetler, kampanyalar, WhatsApp entegrasyonu ve banka seviyesi güvenlik — hepsi bir arada.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4">
                <Link href="/login"
                  className="group flex items-center gap-3 px-8 py-4 rounded-2xl transition-all duration-300 hover:scale-[1.03] hover:shadow-xl text-white font-semibold"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)' }}>
                  🛡️ STK Yetkili Girişi
                </Link>
                <a href="#basvuru"
                  className="group flex items-center gap-3 px-8 py-4 rounded-2xl transition-all duration-300 hover:scale-[1.03] hover:shadow-xl text-white font-semibold"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)' }}>
                  📝 Platforma Başvur
                </a>
              </div>

              {/* Güvenlik Rozetleri */}
              <div className="flex items-center gap-4 pt-2 flex-wrap">
                {[
                  { icon: '🔐', text: 'WhatsApp 2FA' },
                  { icon: '🛡️', text: 'Adli Bilişim Log' },
                  { icon: '🏦', text: 'Banka Güvenliği' },
                ].map((badge, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                    style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                    <span>{badge.icon}</span> {badge.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Sağ: Dashboard Mockup */}
            <div className="flex justify-center order-first md:order-last">
              <div className="relative">
                <div className="absolute inset-0 rounded-3xl blur-[60px] opacity-40" style={{ background: 'linear-gradient(135deg, #10b981, #059669, #047857)' }} />
                <div className="relative w-80 md:w-96 rounded-2xl p-1"
                  style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.1))', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div className="w-full rounded-xl overflow-hidden"
                    style={{ background: 'linear-gradient(180deg, #111827, #1e293b)' }}>
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                      </div>
                      <span className="text-[10px] text-slate-500 ml-2">yonetim.kamulogstk.net</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Üyeler', value: '1,247', color: '#10b981' },
                          { label: 'Gelir', value: '₺84.5K', color: '#3b82f6' },
                          { label: 'Etkinlik', value: '23', color: '#8b5cf6' },
                        ].map((stat, i) => (
                          <div key={i} className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <p className="text-[10px] text-slate-500">{stat.label}</p>
                            <p className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</p>
                          </div>
                        ))}
                      </div>
                      {[
                        { icon: '👥', title: 'Üye Yönetimi', desc: 'TC kimlik, aidat takibi', color: '#10b981' },
                        { icon: '💰', title: 'Finans', desc: 'Gelir-gider, dekontlar', color: '#3b82f6' },
                        { icon: '📢', title: 'Kampanyalar', desc: 'WhatsApp, SMS, Push', color: '#8b5cf6' },
                        { icon: '📋', title: 'Yönetim Kurulu', desc: 'Kararlar, genel kurul', color: '#f59e0b' },
                        { icon: '🛡️', title: 'Güvenlik', desc: '2FA, audit logları', color: '#ef4444' },
                      ].map((m, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                            style={{ background: `${m.color}15` }}>{m.icon}</div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{m.title}</p>
                            <p className="text-[10px] text-slate-500 truncate">{m.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3" style={{ background: 'rgba(16, 185, 129, 0.08)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[120px] translate-y-1/2 -translate-x-1/3" style={{ background: 'rgba(5, 150, 105, 0.06)' }} />
      </section>

      {/* ─── Özellikler Section ──────────────────────────────────── */}
      <section className="py-20 md:py-28 relative" style={{ background: 'linear-gradient(180deg, #111827, #0a0e1a)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-medium mb-3" style={{ color: '#34d399' }}>Platform Özellikleri</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Neden <span style={{ background: 'linear-gradient(135deg, #34d399, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>KamuLog STK?</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '👥', title: 'Üye Yönetimi', desc: 'TC kimlik doğrulama, e-imza, üyelik başvuru formu, şube yönetimi ve kategorili üye takibi.', gradient: 'from-emerald-600/20 to-emerald-800/20' },
              { icon: '💰', title: 'Finans & Aidat', desc: 'Gelir-gider takibi, aidat hatırlatıcı, dekont onaylama, banka seviyesi mali raporlama.', gradient: 'from-blue-600/20 to-blue-800/20' },
              { icon: '📢', title: 'Çoklu Kanal İletişim', desc: 'WhatsApp, SMS, Push Bildirim ve E-posta ile toplu/bireysel üye iletişimi.', gradient: 'from-purple-600/20 to-purple-800/20' },
              { icon: '📋', title: 'Yönetim Kurulu', desc: 'Karar defteri, genel kurul yönetimi, yönetim kurulu üyeleri ve görev dağılımı.', gradient: 'from-amber-600/20 to-amber-800/20' },
              { icon: '🔐', title: 'WhatsApp 2FA Güvenlik', desc: 'Şifre + WhatsApp OTP ile banka seviyesi iki faktörlü kimlik doğrulama.', gradient: 'from-red-600/20 to-red-800/20' },
              { icon: '🛡️', title: 'Adli Bilişim Logları', desc: 'Her silme ve değiştirme işlemi JSON olarak loglanır. Veri kaybı sıfır.', gradient: 'from-cyan-600/20 to-cyan-800/20' },
              { icon: '🤖', title: 'WhatsApp Bot Entegrasyonu', desc: "STK'nıza özel WhatsApp botu ile otomatik yanıt, SSS ve 7/24 üye desteği.", gradient: 'from-green-600/20 to-green-800/20' },
              { icon: '📊', title: 'Faaliyet & Kampanya', desc: 'Etkinlik yönetimi, duyurular, anketler ve hedefli kampanyalar.', gradient: 'from-indigo-600/20 to-indigo-800/20' },
              { icon: '📱', title: 'Mobil Entegrasyon', desc: 'Kamulog mobil uygulaması ile üyeler mobilde aidat ödeme, başvuru ve faaliyet takibi yapabilir.', gradient: 'from-teal-600/20 to-teal-800/20' },
            ].map((item, i) => (
              <div key={i} className="group p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)' }}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-2xl mb-4`}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Başvuru Formu ──────────────────────────────────────── */}
      <section id="basvuru" className="py-20 md:py-28 relative">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-medium mb-3" style={{ color: '#34d399' }}>📝 Platforma Katılın</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              STK&apos;nızı <span style={{ background: 'linear-gradient(135deg, #34d399, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Dijitalleştirin</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Dernek, sendika veya vakfınızı KamuLog platformuna taşımak için başvuru formunu doldurun. Ekibimiz en kısa sürede sizinle iletişime geçecektir.
            </p>
          </div>

          <ApplicationFormClient />
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10" style={{ background: '#0a0e1a' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <span className="text-white text-sm font-bold">K</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">KamuLog STK</p>
                <p className="text-[10px] text-slate-600">STK & Sendika Yönetim Platformu</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500">
              <Link href="/gizlilik-politikasi" className="hover:text-slate-300 transition">Gizlilik Politikası</Link>
              <Link href="/kullanim-kosullari" className="hover:text-slate-300 transition">Kullanım Koşulları</Link>
              <a href="mailto:destek@kamulog.net" className="hover:text-slate-300 transition">destek@kamulog.net</a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-slate-600">© 2026 KamuLog — STK & Sendika Yönetim Platformu. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
