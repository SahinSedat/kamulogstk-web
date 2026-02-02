import { Metadata } from 'next'
import {
  Navbar,
  HeroSection,
  FeaturesSection,
  AISection,
  TestimonialsSection,
  TrustSection,
  FAQSection,
  CTASection,
  Footer
} from '@/components/landing'

export const metadata: Metadata = {
  title: 'KamulogSTK - Yapay Zeka Destekli STK Yönetim Platformu',
  description: 'Sivil toplum kuruluşları için yapay zeka destekli üye takibi, aidat yönetimi ve finansal raporlama. Dernek, vakıf ve sendikalar için profesyonel çözüm.',
  alternates: {
    canonical: 'https://kamulogstk.net',
  },
}

// Webhook auto-deploy test - v1.0
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Navbar />
      <HeroSection />
      <TrustSection />
      <FeaturesSection />
      <AISection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  )
}
