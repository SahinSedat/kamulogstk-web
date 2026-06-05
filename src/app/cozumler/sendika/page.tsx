import { Metadata } from "next";
import { Briefcase, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sendika Yönetimi | KamuLogSTK",
  description: "Sendikalar için kapsamlı üye takibi, aidat yönetimi ve toplu iletişim çözümleri.",
};

export default function SendikaYonetimiPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-semibold mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Anasayfaya Dön
        </Link>
        
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-emerald-600 p-12 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <Briefcase className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight">Sendika Yönetimi</h1>
            <p className="text-emerald-100 text-lg max-w-2xl mx-auto font-medium">
              Binlerce üyesi olan sendikalar için yüksek performanslı, güvenli ve organize edilmiş dijital yönetim platformu.
            </p>
          </div>
          
          <div className="p-8 sm:p-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Sendikalara Özel Çözümler</h2>
            <div className="grid sm:grid-cols-2 gap-6 mb-12">
              {[
                "Şube ve Temsilcilik Bazlı Yetkilendirme",
                "İşkolu ve Kurum Bazlı Üye Raporlamaları",
                "Maaş Kesintisi (Tevkifat) Dosyası Çıktıları",
                "Büyük Ölçekli Toplu SMS/WhatsApp Entegrasyonu",
                "Online Hukuki Destek Talepleri Toplama",
                "TİS (Toplu İş Sözleşmesi) Arşivi"
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 text-center">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Sendikanızın Gücüne Güç Katın</h3>
              <p className="text-slate-600 mb-6">Üyelerinizle iletişimi güçlendirin, bürokrasiyi azaltın.</p>
              <Link href="/iletisim" className="inline-block bg-slate-800 text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-900 transition-colors shadow-lg">
                Bizimle İletişime Geçin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
