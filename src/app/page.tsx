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
