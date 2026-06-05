import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Kullanıcı ve Üyelik Sözleşmesi - Kamulog STK",
  description: "Kamulog STK platformu resmi Kullanıcı ve Üyelik Sözleşmesi.",
};

export default function KullaniciSozlesmesiPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Kamulog STK Kullanıcı ve Üyelik Sözleşmesi
          </h1>
          <p className="text-slate-500">Yürürlük Tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12 prose prose-slate prose-emerald max-w-none">
          
          <h2 className="text-2xl font-bold text-slate-800 mt-0 mb-4 border-b pb-2">1. Taraflar</h2>
          <p>
            İşbu sözleşme, <strong>Atatürk Mah. Çelikel Sk. Esbender Şahin Apt. No: 5 İç Kapı No: 2 Sancaktepe / İstanbul</strong> adresinde faaliyet gösteren <strong>Kamulog</strong> (Şahıs Şirketi / Yasal Yetkili: Suat Hayri Şahin) ile Kamulog STK platformuna ("Platform") üye olan veya ziyaret eden Kullanıcı arasında elektronik ortamda onaylanarak yürürlüğe girmiştir.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">2. Sözleşmenin Amacı</h2>
          <p>
            Bu sözleşmenin amacı; Kullanıcının Platform üzerinde yer alan Sivil Toplum Kuruluşlarını (Dernek, Sendika, Vakıf vb.) bulması, incelemesi, üyelik başvurusu yapması ve aidat ödemesi süreçlerinde tarafların hak ve yükümlülüklerini belirlemektir. Kamulog, STK'lar ile vatandaşları dijital ortamda bir araya getiren bir <strong>aracı hizmet sağlayıcıdır</strong>.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">3. Tarafların Hak ve Yükümlülükleri</h2>
          
          <h3 className="text-lg font-bold text-slate-800 mt-6">3.1. Kullanıcının Yükümlülükleri</h3>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li>Kullanıcı, Platforma üye olurken veya STK başvurusu yaparken verdiği bilgilerin (T.C. Kimlik No, İletişim, Ad-Soyad vb.) doğru ve kendisine ait olduğunu beyan ve taahhüt eder.</li>
            <li>Platform üzerinden yapılan başvuruların onaylanması veya reddedilmesi tamamen ilgili STK'nın inisiyatifindedir. Kamulog, üyelik başvurularının sonucu hakkında garanti vermez.</li>
            <li>Kullanıcı, hesabının güvenliğinden bizzat sorumludur. Hesabının üçüncü kişilerce yetkisiz kullanımından doğacak zararlardan Kamulog sorumlu tutulamaz.</li>
            <li>Kullanıcı, platformu Türkiye Cumhuriyeti yasalarına, ahlaka ve kamu düzenine aykırı şekilde kullanamaz.</li>
          </ul>

          <h3 className="text-lg font-bold text-slate-800 mt-6">3.2. Kamulog'un Hak ve Yükümlülükleri</h3>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li>Kamulog, Kullanıcının başvuru ve evraklarını sadece kullanıcının seçtiği ve onay verdiği ilgili Sivil Toplum Kuruluşu ile paylaşmakla yükümlüdür.</li>
            <li>Kamulog, platformun kesintisiz ve hatasız çalışması için makul çabayı gösterir ancak teknik arızalar, siber saldırılar veya mücbir sebeplerden doğan kesintilerden sorumlu tutulamaz.</li>
            <li>Kamulog, gerekli gördüğü takdirde platformun tasarımında, işleyişinde değişiklik yapma veya siteyi geçici olarak durdurma hakkını saklı tutar.</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">4. Telif Hakları (Fikri Mülkiyet)</h2>
          <p>
            Kamulog STK platformunda yer alan yazılım kodları, arayüz tasarımları, veritabanı yapısı, logolar ve metinler Kamulog şirketinin mülkiyetindedir. Kullanıcılar, platform içeriğini izinsiz kopyalayamaz, çoğaltamaz veya ticari amaçla kullanamaz. Sitede listelenen STK'lara ait logolar ve isim hakları ise kendi sahiplerine aittir.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">5. Veri Gizliliği (KVKK)</h2>
          <p>
            Kullanıcının platformda paylaştığı veriler, 6698 sayılı KVKK kapsamında işlenmekte ve saklanmaktadır. Veri işleme şartları ve haklarınız hakkında detaylı bilgi için lütfen <Link href="/kvkk" className="text-emerald-600 hover:underline">KVKK Aydınlatma Metni</Link>'ni inceleyiniz.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">6. Uyuşmazlıkların Çözümü</h2>
          <p>
            İşbu sözleşmenin uygulanmasından veya yorumlanmasından doğacak her türlü uyuşmazlığın çözümünde Türk Hukuku uygulanacak olup, <strong>İstanbul Mahkemeleri ve İcra Daireleri</strong> kesin ve münhasıran yetkilidir.
          </p>

          <h2 className="text-2xl font-bold text-slate-800 mt-10 mb-4 border-b pb-2">7. Yürürlük</h2>
          <p>
            Kullanıcı, üyelik formunu doldurarak veya platform üzerinden STK başvurusu yaparak, bu sözleşmede yer alan tüm maddeleri okuduğunu, anladığını ve elektronik ortamda onayladığını kabul etmiş sayılır.
          </p>

        </div>
      </div>
    </div>
  );
}
