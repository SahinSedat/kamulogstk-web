import React from "react";
import Link from "next/link";

export const metadata = {
  title: "İptal ve İade Koşulları - Kamulog STK",
  description: "Kamulog STK platformu iptal ve iade bilgilendirme metni.",
};

export default function IptalIadePage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            İptal ve İade Koşulları
          </h1>
          <p className="text-slate-500">Son Güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12 prose prose-slate prose-emerald max-w-none">
          
          <p className="lead text-lg text-slate-600 font-medium border-l-4 border-emerald-500 pl-4">
            Kamulog STK, vatandaşlar ile Sivil Toplum Kuruluşlarını (Dernek, Sendika, Vakıf vb.) dijital ortamda bir araya getiren <strong>bağımsız bir aracı platformdur.</strong>
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">1. Ödeme İşlemleri ve İade Politikası</h2>
          <p>
            Kamulog STK platformu üzerinden doğrudan kullanıcılardan (üyelerden) herhangi bir aidat, bağış veya başvuru ücreti <strong>tahsil edilmemektedir.</strong>
          </p>
          <p>
            Kullanıcıların gerçekleştirdiği tüm ödeme işlemleri (örneğin yıllık aidat ödemeleri), kullanıcının kendi rızasıyla başvuru yaptığı veya üyesi olduğu <strong>ilgili Sivil Toplum Kuruluşunun kendi finansal hesaplarına veya ödeme altyapılarına</strong> doğrudan yapılmaktadır.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">2. İptal ve İade Talepleri</h2>
          <p>
            Kamulog STK platformu, bir ödeme kuruluşu veya alıcı taraf olmadığından, üyelik aidatları veya bağışlarla ilgili hiçbir <strong>iptal ve iade işlemini gerçekleştirme yetkisine sahip değildir.</strong>
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li>Üyelik başvurusunun iptali,</li>
            <li>Yanlışlıkla yapılan veya fazla ödenen aidat tutarlarının iadesi,</li>
            <li>Dernek/Sendika üyeliğinden istifa durumlarında aidat iade talepleri,</li>
          </ul>
          <p className="mt-4">
            gibi tüm finansal talepler, <strong>doğrudan üyesi olduğunuz Sivil Toplum Kuruluşu (Dernek/Sendika yönetimi) ile</strong> görüşülerek çözülmelidir. İlgili STK'nın kendi tüzüğüne ve iptal/iade politikalarına göre işlem yapılacaktır.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">3. Platform Üyeliği İptali</h2>
          <p>
            Kamulog STK sistemi üzerindeki dijital hesabınızı dilediğiniz zaman "Profilim" veya "Ayarlar" menüsünden iptal edebilir ve silebilirsiniz. Ancak dijital hesabınızın silinmesi, yasal olarak kayıtlı olduğunuz Sivil Toplum Kuruluşundaki (örn: e-Devlet veya STK'nın resmi kütüğündeki) üyeliğinizi <strong>otomatik olarak sonlandırmaz.</strong> Resmi istifa süreçleri için ilgili STK ile veya resmi kurumlarla (e-Devlet) işlem yapmanız gerekmektedir.
          </p>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-8">
            <h3 className="text-lg font-bold text-slate-800 mb-3">İletişim ve Destek</h3>
            <p className="text-slate-600 mb-2">
              Sistemin teknik işleyişi veya aracı hizmetlerimizle ilgili tüm sorularınız için bizimle iletişime geçebilirsiniz. Ancak finansal iadeler konusunda lütfen doğrudan üyesi olduğunuz kuruma başvurunuz.
            </p>
            <ul className="list-none space-y-1 text-slate-700 mt-4">
              <li><strong>E-Posta:</strong> <a href="mailto:destek@kamulogstk.net" className="text-emerald-600 hover:underline font-semibold">destek@kamulogstk.net</a></li>
              <li><strong>İletişim Formu:</strong> <Link href="/iletisim" className="text-emerald-600 hover:underline font-semibold">Buraya tıklayarak</Link> bize ulaşabilirsiniz.</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
