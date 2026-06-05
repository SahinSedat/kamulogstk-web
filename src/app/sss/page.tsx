import { Metadata } from "next";
import { HelpCircle, ChevronDown } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular (SSS) | KamuLogSTK",
  description: "KamuLogSTK Sivil Toplum Kuruluşları Yönetim Platformu hakkında sıkça sorulan sorular ve cevapları.",
};

const faqs = [
  {
    question: "KamuLogSTK nedir?",
    answer: "KamuLogSTK, sivil toplum kuruluşları (dernek, sendika, vakıf) için özel olarak geliştirilmiş bulut tabanlı bir yönetim platformudur. Üye takibinden aidat yönetimine, genel kurul organizasyonlarından detaylı raporlamalara kadar bir STK'nın ihtiyaç duyduğu tüm araçları tek bir çatı altında sunar."
  },
  {
    question: "Sistem güvenli mi? Verilerim nerede saklanıyor?",
    answer: "Tüm verileriniz KVKK standartlarına uygun olarak en üst düzey şifreleme teknolojileri ile Türkiye'deki güvenli sunucularımızda saklanmaktadır. Düzenli olarak yedeklenen verilerinize sadece yetkilendirdiğiniz kişiler erişebilir."
  },
  {
    question: "Üyelerimiz kendi aidatlarını ödeyebilir mi?",
    answer: "Evet! KamuLogSTK'nın sunduğu üye arayüzü sayesinde üyeleriniz sisteme giriş yaparak kendi aidat borçlarını görüntüleyebilir, online ödeme yapabilir ve dekont yükleyerek bildirimde bulunabilirler."
  },
  {
    question: "Sadece aidat takibi yapmak istiyorum, mümkün mü?",
    answer: "Elbette. İhtiyacınıza göre sistemi modüler olarak kullanabilirsiniz. Üyelerinize sadece 'Aidat Öde' linki göndererek aidat toplama sürecinizi tamamen dijitalleştirebilirsiniz."
  },
  {
    question: "Mobil uygulama desteği var mı?",
    answer: "KamuLogSTK hem web üzerinden hem de mobil cihazlardan tam uyumlu (responsive) olarak çalışır. Ayrıca üyelerinizin ve yöneticilerinizin anlık bildirimler alabilmesi için özel mobil altyapımız mevcuttur."
  }
];

export default function SSSPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-semibold mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Anasayfaya Dön
        </Link>
        
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Sıkça Sorulan Sorular</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            KamuLogSTK hakkında aklınıza takılan soruların cevaplarını burada bulabilirsiniz.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
              <details className="cursor-pointer">
                <summary className="flex items-center justify-between font-bold text-lg text-slate-800 list-none">
                  {faq.question}
                  <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-4 text-slate-600 leading-relaxed pl-2 border-l-2 border-emerald-500">
                  {faq.answer}
                </p>
              </details>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-emerald-600 rounded-3xl p-8 text-center text-white shadow-xl shadow-emerald-600/20">
          <h2 className="text-2xl font-bold mb-4">Başka bir sorunuz mu var?</h2>
          <p className="text-emerald-100 mb-6 max-w-xl mx-auto">Destek ekibimiz sorularınızı yanıtlamak için her zaman hazır. Bizimle iletişime geçmekten çekinmeyin.</p>
          <Link href="/iletisim" className="inline-block bg-white text-emerald-600 font-bold py-3 px-8 rounded-xl hover:bg-slate-50 transition-colors shadow-lg">
            İletişime Geçin
          </Link>
        </div>
      </div>
    </div>
  );
}
