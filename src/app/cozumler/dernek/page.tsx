import { Metadata } from "next";
import { Users, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dernek Yönetimi | KamuLogSTK",
  description: "Dernekler için özel olarak geliştirilmiş üye, aidat ve etkinlik yönetimi çözümleri.",
};

export default function DernekYonetimiPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-semibold mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Anasayfaya Dön
        </Link>
        
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-emerald-600 p-12 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight">Dernek Yönetimi</h1>
            <p className="text-emerald-100 text-lg max-w-2xl mx-auto font-medium">
              Derneğinizin tüm yönetim süreçlerini dijitalleştirerek zamandan tasarruf edin ve üyelerinizle bağınızı güçlendirin.
            </p>
          </div>
          
          <div className="p-8 sm:p-12">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Neler Sunuyoruz?</h2>
            <div className="grid sm:grid-cols-2 gap-6 mb-12">
              {[
                "Online Üyelik Başvurusu ve Onay Süreçleri",
                "Otomatik Aidat Takibi ve Hatırlatmalar",
                "Karar Defteri ve Genel Kurul Yönetimi",
                "Üyelere Toplu SMS ve E-posta Gönderimi",
                "Detaylı Finansal Raporlama",
                "Mobil Uyumlu Yönetici Paneli"
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 text-center">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Derneğinizi Hemen Dijitale Taşıyın</h3>
              <p className="text-slate-600 mb-6">KamuLogSTK ile dernek yönetimi artık çok daha kolay ve şeffaf.</p>
              <Link href="/iletisim" className="inline-block bg-slate-800 text-white font-bold py-3 px-8 rounded-xl hover:bg-slate-900 transition-colors shadow-lg">
                Demo Talep Edin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
