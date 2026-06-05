import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Gizlilik ve Çerez (Cookie) Politikası - Kamulog STK",
  description: "Kamulog STK platformu gizlilik ve çerez politikası.",
};

export default function GizlilikPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Gizlilik ve Çerez (Cookie) Politikası
          </h1>
          <p className="text-slate-500">Son Güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12 prose prose-slate prose-emerald max-w-none">
          
          <p className="lead text-lg text-slate-600 font-medium border-l-4 border-emerald-500 pl-4">
            Kamulog STK olarak ziyaretçilerimizin ve kullanıcılarımızın gizliliğine büyük önem veriyoruz. Bu politika, platformumuzu kullanırken toplanan verilerin nasıl korunduğunu, işlendiğini ve çerezlerin (cookies) ne amaçla kullanıldığını açıklamaktadır.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">1. Verilerin Güvenliği ve Korunması</h2>
          <p>
            Kamulog STK platformuna ilettiğiniz tüm veriler (kişisel bilgiler, form verileri, üyelik bilgileri vb.) endüstri standardı güvenlik protokolleri (SSL/TLS şifreleme) ile sunucularımızda korunmaktadır. Sistemlerimize yetkisiz erişimi engellemek için düzenli olarak siber güvenlik testleri yapılmakta ve altyapı güncel tutulmaktadır.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">2. Veri Paylaşımı (Üçüncü Şahıslar)</h2>
          <p>
            Kamulog STK platformu, kullanıcı verilerini kesinlikle ticari amaçla satmaz, kiralamaz ve pazarlama amacıyla yetkisiz üçüncü şahıslarla paylaşmaz.
            Verileriniz yalnızca <strong>kendi rızanızla başvuru yaptığınız sivil toplum kuruluşları</strong> ve yasal zorunluluklar kapsamında resmi makamlarla (mahkeme kararı, emniyet birimi talebi vb.) paylaşılabilir.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">3. Log Kayıtları ve Sistem Verileri</h2>
          <p>
            Sitemizi ziyaretiniz sırasında, platformun kararlılığını sağlamak ve olası hata/siber saldırı durumlarını inceleyebilmek amacıyla otomatik olarak log kayıtları (IP adresi, tarayıcı tipi, ziyaret tarihi ve saati, işletim sistemi) tutulmaktadır. Bu veriler anonimleştirilerek istatistiksel amaçlı incelenir ve güvenlik haricinde kişisel profil oluşturmak için kullanılmaz.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">4. Çerez (Cookie) Kullanımı</h2>
          <p>
            Çerezler (Cookies), web sitemizi ziyaret ettiğinizde tarayıcınız aracılığıyla cihazınıza kaydedilen küçük metin dosyalarıdır. Platformumuzda çerezler şu amaçlarla kullanılmaktadır:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li><strong>Zorunlu Çerezler:</strong> Sitenin temel fonksiyonlarının çalışması (örneğin oturum açık kalması) için zorunludur.</li>
            <li><strong>Performans Çerezleri:</strong> Sitenin nasıl kullanıldığını analiz ederek (örneğin hangi sayfaların daha çok ziyaret edildiği) kullanıcı deneyimini geliştirmemize yardımcı olur.</li>
            <li><strong>İşlevsel Çerezler:</strong> Dil tercihleri veya kullanıcı ayarları gibi site özelliklerinin kişiselleştirilmesini sağlar.</li>
          </ul>
          <p className="mt-4">
            Tarayıcı ayarlarınızı değiştirerek çerezleri reddedebilir veya silebilirsiniz. Ancak zorunlu çerezleri engellemeniz durumunda platformun bazı fonksiyonları düzgün çalışmayabilir.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">5. Diğer Sitelere Bağlantılar</h2>
          <p>
            Kamulog STK platformu, farklı sivil toplum kuruluşlarına veya haber kaynaklarına ait bağlantılar içerebilir. Platformumuz, bağlantı verilen harici sitelerin gizlilik politikalarından veya içeriklerinden sorumlu tutulamaz.
          </p>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-8">
            <h3 className="text-lg font-bold text-slate-800 mb-3">İletişim ve Veri Sorumlusu</h3>
            <p className="text-slate-600 mb-2">
              Gizlilik politikamız veya çerez kullanımımız hakkında sorularınız için bizimle iletişime geçebilirsiniz:
            </p>
            <ul className="list-none space-y-1 text-slate-700">
              <li><strong>Şirket:</strong> Kamulog (Şahıs Şirketi / Yasal Yetkili: Suat Hayri Şahin)</li>
              <li><strong>E-Posta:</strong> <a href="mailto:iletisim@kamulogstk.net" className="text-emerald-600 hover:underline font-semibold">iletisim@kamulogstk.net</a></li>
              <li><strong>Telefon:</strong> 0539 264 76 55</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
