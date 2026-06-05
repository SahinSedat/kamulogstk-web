import React from "react";
import Link from "next/link";

export const metadata = {
  title: "KVKK Aydınlatma Metni - Kamulog STK",
  description: "Kamulog STK platformu Kişisel Verilerin Korunması ve İşlenmesi Aydınlatma Metni.",
};

export default function KVKKPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Kişisel Verilerin Korunması ve İşlenmesi Aydınlatma Metni
          </h1>
          <p className="text-slate-500">Son Güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12 prose prose-slate prose-emerald max-w-none">
          
          <p className="lead text-lg text-slate-600 font-medium border-l-4 border-emerald-500 pl-4">
            Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, Kamulog STK platformunun ("Platform") kullanıcılarının kişisel verilerinin işlenmesine ilişkin usul ve esasları belirlemek amacıyla hazırlanmıştır.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">1. Veri Sorumlusunun Kimliği</h2>
          <p>
            KVKK kapsamında veri sorumlusu; merkezi <strong>Atatürk Mah. Çelikel Sk. Esbender Şahin Apt. No: 5 İç Kapı No: 2 Sancaktepe / İstanbul</strong> adresinde bulunan ve <strong>Sultanbeyli</strong> Vergi Dairesine <strong>7960109842</strong> vergi numarası ile kayıtlı olan, Suat Hayri Şahin yetkiliğindeki <strong>Kamulog</strong> (Şahıs Şirketi)'dir.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">2. Kişisel Verilerin İşlenme Amaçları</h2>
          <p>Kişisel verileriniz (kimlik, iletişim bilgileri, STK üyelik verileri, IP adresi, işlem güvenliği bilgileri vb.), aşağıdaki amaçlarla KVKK'nın 5. ve 6. maddelerinde belirtilen şartlara uygun olarak işlenmektedir:</p>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li>Platform üzerinden STK üyelik başvurularının alınması ve ilgili kurumlara iletilmesi,</li>
            <li>Kullanıcı kaydının oluşturulması ve hesap güvenliğinin sağlanması,</li>
            <li>Platformun teknik işleyişinin ve yasal yükümlülüklerin yerine getirilmesi,</li>
            <li>Sözleşme kapsamındaki hizmetlerin sunulması ve üye ilişkileri yönetiminin yürütülmesi,</li>
            <li>Yetkili kurum ve kuruluşların talepleri doğrultusunda bilgi verilmesi.</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">3. Kişisel Verilerin Aktarımı</h2>
          <p>
            Toplanan kişisel verileriniz, yukarıda belirtilen amaçların gerçekleştirilmesi doğrultusunda ve KVKK'nın 8. ve 9. maddeleri çerçevesinde;
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li>Başvuru yaptığınız sivil toplum kuruluşlarına (Dernek, Sendika vb.),</li>
            <li>Yasal zorunluluklar kapsamında adli makamlar, kamu kurum ve kuruluşlarına,</li>
            <li>Sistemin altyapısını sağlayan teknik servis tedarikçilerine aktarılabilmektedir.</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">4. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi</h2>
          <p>
            Kişisel verileriniz, Platform üzerinden doldurduğunuz formlar, başvuru ekranları ve elektronik ortamda gerçekleştirdiğiniz işlemler aracılığıyla otomatik veya kısmen otomatik yöntemlerle toplanmaktadır. İşlemeler, KVKK Madde 5/2 uyarınca "bir sözleşmenin kurulması veya ifası", "veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi" ve "ilgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla meşru menfaatler" hukuki sebeplerine dayanmaktadır.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">5. İlgili Kişinin Hakları (Madde 11)</h2>
          <p>KVKK'nın 11. maddesi uyarınca veri sahipleri, veri sorumlusuna başvurarak aşağıdaki haklarını kullanabilirler:</p>
          <ul className="list-disc pl-5 space-y-2 text-slate-700 mb-6">
            <li>Kişisel veri işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme,</li>
            <li>Kişisel verilerin işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
            <li>Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme,</li>
            <li>Eksik veya yanlış işlenen verilerin düzeltilmesini isteme ve silinmesini/yok edilmesini talep etme.</li>
          </ul>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-8">
            <h3 className="text-lg font-bold text-slate-800 mb-3">İletişim</h3>
            <p className="text-slate-600 mb-0">
              Haklarınıza ilişkin taleplerinizi <a href="mailto:iletisim@kamulogstk.net" className="text-emerald-600 font-semibold hover:underline">iletisim@kamulogstk.net</a> adresi üzerinden e-posta yoluyla veya <Link href="/iletisim" className="text-emerald-600 font-semibold hover:underline">İletişim Formu</Link> üzerinden bize iletebilirsiniz. Başvurularınız yasal süre olan 30 gün içerisinde sonuçlandırılacaktır.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
