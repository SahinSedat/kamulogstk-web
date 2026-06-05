import { Metadata } from "next";
import { Megaphone, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Şeffaf İletişim | KamuLogSTK",
  description: "Üyelerinizle kesintisiz, şeffaf ve çift yönlü iletişim kurmanızı sağlayan araçlar.",
};

export default function SeffafIletisimPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-semibold mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Anasayfaya Dön
        </Link>
        
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-emerald-600 p-12 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <Megaphone className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight">Şeffaf İletişim</h1>
            <p className="text-emerald-100 text-lg max-w-2xl mx-auto font-medium">
              Kurum içi demokrasinin ve güvenin temeli olan şeffaf iletişimi dijital araçlarla en üst seviyeye taşıyın.
            </p>
          </div>
          
          <div className="p-8 sm:p-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">İletişim Kanallarımız</h2>
            <div className="grid sm:grid-cols-2 gap-6 mb-12">
              {[
                "Karar Defteri ve Duyuruların Şeffaf Paylaşımı",
                "Özel WhatsApp Entegrasyonu ile Anlık Bilgilendirme",
                "Sistem İçi Üye Destek ve Talep Yönetimi",
                "Otomatik E-posta Kampanyaları ve Bültenler",
                "Canlı Yayınlar ve Etkinlik Takvimi",
                "Gelişmiş Anket ve Geri Bildirim Sistemleri"
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 text-center">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Güven İnşa Edin</h3>
              <p className="text-slate-600 mb-6">Şeffaflıkla üyelerinizin sadakatini ve aidiyet duygusunu artırın.</p>
              <Link href="/iletisim" className="inline-block bg-slate-800 text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-900 transition-colors shadow-lg">
                İletişim Çözümlerimizi Keşfedin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
