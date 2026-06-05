"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, MapPin, X, Building, Facebook, Instagram, Twitter, Linkedin, MessageCircle, Send, CheckCircle2, ChevronRight, HandCoins, ShieldCheck, Zap, Users, Megaphone, Handshake, Heart, Scale, GraduationCap, ArrowRight, Copy } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export default function STKDirectoryPage() {
  const [stks, setStks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedStk, setSelectedStk] = useState<any>(null);
  const [copiedIban, setCopiedIban] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchStks();
  }, [search]);

  const fetchStks = async () => {
    try {
      const res = await fetch(`/api/public/stks-directory?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setStks(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStkTypeColor = (type: string) => {
    switch (type) {
      case "DERNEK": return "bg-emerald-100 text-emerald-700";
      case "SENDIKA": return "bg-blue-100 text-blue-700";
      case "VAKIF": return "bg-purple-100 text-purple-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans overflow-x-hidden">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-40 transition-all">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 group">
              <span className="text-2xl font-black tracking-tighter text-slate-900 flex items-center">
                KamuLog<span className="text-emerald-600">STK</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <a href="#nasil-calisir" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors hidden md:block">
              Nasıl Çalışır?
            </a>
            <Link href="/kurumsal" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors hidden md:block">
              Kurumsal Çözümler
            </Link>
            <Link href="/login" className="px-6 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-bold hover:border-emerald-600 hover:text-emerald-600 transition-all">
              Kurumsal Giriş
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white border-b border-slate-200">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-400/20 rounded-full blur-[100px] -z-10"></div>
        
        <div className="max-w-4xl mx-auto px-4 pt-20 pb-24 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-semibold mb-6">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Türkiye'nin Lider STK Yönetim Platformu
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-6">
            Sivil Toplum Dünyasını <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#059669] to-[#34d399]">Tek Platformda Keşfedin</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Sizin için en doğru dernek, sendika veya vakfı keşfedin. İnandığınız değerler için harekete geçin ve karmaşık formlarla uğraşmadan saniyeler içinde toplumsal dayanışmanın bir parçası olun.
          </p>
          
          {/* Main Search Bar inside Hero */}
          <form 
            id="search-section" 
            className="max-w-2xl mx-auto relative group scroll-mt-32"
            onSubmit={(e) => {
              e.preventDefault();
              if (search.trim()) {
                const el = document.getElementById("directory-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            <input
              type="text"
              placeholder="Dernek, sendika veya vakıf arayın..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-16 pl-6 pr-32 rounded-2xl bg-white border-2 border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-lg font-medium transition-all"
            />
            <button type="submit" className="absolute right-2 top-2 bottom-2 px-6 rounded-xl bg-[#059669] text-white font-bold hover:bg-[#047857] transition-colors shadow-sm flex items-center gap-2">
              <Search className="w-5 h-5" /> Ara
            </button>
          </form>
        </div>
      </div>

      {/* Main Content - Directory */}
      <main id="directory-section" className="max-w-4xl mx-auto px-4 pb-24 pt-16 scroll-mt-20">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-3xl font-extrabold text-[#1e293b]">Kayıtlı Kuruluşlar</h2>
            <p className="text-slate-500 mt-1 font-medium">{stks.length} aktif sivil toplum kuruluşu bulundu</p>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-4 border-[#059669]"></div></div>
        ) : (
          <div className="flex flex-col gap-6">
            {stks.map(stk => (
              <div key={stk.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_12px_40px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-1">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  {/* Logo */}
                  {stk.logo ? (
                    <img src={stk.logo} alt={stk.name} className="w-20 h-20 rounded-2xl object-cover border border-slate-100 shadow-sm shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                      <Building className="w-10 h-10 text-slate-300" />
                    </div>
                  )}
                  
                  {/* Info */}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-800 leading-tight mb-3 pr-4">{stk.name}</h2>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-extrabold tracking-wide ${getStkTypeColor(stk.type)}`}>
                        {stk.type}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {stk.city}
                      </span>
                      {stk.registrationNumber && (
                        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-400">
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          Sicil: {stk.registrationNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-[15px] text-slate-600 line-clamp-2 leading-relaxed mb-5">
                      {stk.description}
                    </p>
                    
                    {/* Bottom Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                          <HandCoins className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aidat Tutarı</span>
                          <span className="text-sm font-bold text-slate-700">
                            {stk.monthlyDuesAmount ? `Aylık ₺${stk.monthlyDuesAmount}` : (stk.annualDuesAmount ? `Yıllık ₺${stk.annualDuesAmount}` : "Ücretsiz")}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedStk(stk)}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm transition-all hover:bg-slate-800 shadow-md shadow-slate-900/10"
                      >
                        Detayları İncele <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {stks.length === 0 && (
              <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100">
                <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-700 mb-2">Kuruluş Bulunamadı</h3>
                <p className="text-slate-500">Arama kriterlerinize uygun sivil toplum kuruluşu bulunamadı.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- YENİ BÖLÜMLER --- */}

      {/* Bölüm 1: Bireysel Güçten Toplumsal Güce (Neden STK?) */}
      <div className="bg-white py-20 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Neden Bir Sivil Toplum Kuruluşuna Üye Olmalısınız?</h2>
            <p className="text-lg text-slate-500 font-medium">Tek başımıza yapabileceklerimiz sınırlı olabilir, ancak birlikteyken dünyayı ve çalışma hayatımızı değiştirecek güce sahibiz.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-6 shadow-sm border border-orange-100">
                <Megaphone className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Sesinizi Daha Gür Duyurun</h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                Bireysel talepleriniz bürokraside kaybolmasın. İster çalışma koşullarınızı iyileştirin ister mahallenizin sorununu çözün; STK'lar sizin yasal sesinizdir.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mb-6 shadow-sm border border-sky-100">
                <Handshake className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Toplumsal Dayanışma Ağına Katılın</h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                Mesleki, hukuki veya sosyal zorluklarla tek başınıza mücadele etmeyin. Dar gününüzde yardımlaşabileceğiniz koca bir ailenin parçası olun.
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-6 shadow-sm border border-rose-100">
                <Heart className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">İnandığınız Değerleri Büyütün</h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                Düzelmesini istediğiniz konularda çabalarınızı doğru kanala yönlendirin. Topluma ve insanlığa doğrudan değer katmanın huzurunu yaşayın.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bölüm 2: Doğru Organizasyon, Gerçek Etki (Hangi STK Ne Yapar?) */}
      <div className="bg-slate-50 py-20 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Doğru Organizasyon, Gerçek Etki</h2>
            <p className="text-lg text-slate-500 font-medium">Hangi sivil toplum kuruluşu türü sizin hedeflerinize uygun?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:-translate-y-1 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[40px] -z-10 group-hover:bg-blue-500/10 transition-colors"></div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Scale className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Sendikalar</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Neden İhtiyaç Var?</span>
                  <p className="text-sm text-slate-700 font-medium">Daha adil gelir dağılımı ve güvenli çalışma ortamı için.</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nasıl Çözer?</span>
                  <p className="text-sm text-slate-600 leading-relaxed">Toplu iş sözleşmeleri (TİS), mesai düzenlemeleri, kıdem hakkı savunuculuğu ve ücretsiz hukuki danışmanlık ile emeğinizi güvence altına alır.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:-translate-y-1 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-[40px] -z-10 group-hover:bg-purple-500/10 transition-colors"></div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Vakıflar</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Neden İhtiyaç Var?</span>
                  <p className="text-sm text-slate-700 font-medium">Toplumdaki dezavantajlı grupların veya acil ihtiyaçların desteklenmesi için.</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nasıl Çözer?</span>
                  <p className="text-sm text-slate-600 leading-relaxed">Gönüllü bağışlar ve organize yardımlarla; eğitim bursları sağlar, sağlık araştırmalarını fonlar ve afet anlarında en hızlı sosyal kalkanı oluşturur.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:-translate-y-1 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px] -z-10 group-hover:bg-emerald-500/10 transition-colors"></div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Dernekler</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Neden İhtiyaç Var?</span>
                  <p className="text-sm text-slate-700 font-medium">Mesleki dayanışma, kültürel değerleri yaşatma ve ortak hobileri geliştirme için.</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nasıl Çözer?</span>
                  <p className="text-sm text-slate-600 leading-relaxed">Aynı vizyonu paylaşan insanları tek çatı altında toplar, sektörel standartları belirler ve sosyal farkındalık projeleri üretir.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bölüm 3: Call to Action (CTA - Harekete Geçirici Mesaj) */}
      <div className="bg-white py-24 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-10 md:p-16 text-center relative overflow-hidden shadow-2xl shadow-slate-900/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px]"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]"></div>
            
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 leading-tight relative z-10">
              İster çalışma şartlarınızı iyileştirecek bir sendika, <br className="hidden md:block" />
              <span className="text-emerald-400">ister ideallerinizi yaşatacak bir dernek arayın...</span>
            </h2>
            <p className="text-lg md:text-xl text-slate-300 font-medium mb-10 relative z-10">
              Sizin için doğru adres burada.
            </p>
            
            <button 
              onClick={() => {
                const el = document.getElementById("search-section");
                el?.scrollIntoView({ behavior: "smooth" });
                const input = el?.querySelector("input");
                if (input) setTimeout(() => input.focus(), 500);
              }}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-[#059669] text-white font-extrabold text-lg transition-all hover:bg-[#047857] hover:-translate-y-1 shadow-lg shadow-emerald-500/30 relative z-10"
            >
              Kuruluşları Keşfet <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Feature Cards - Biz Kimiz? */}
      <div id="nasil-calisir" className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-5 shadow-sm">
              <Zap className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Kolay Üyelik Süreci</h3>
            <p className="text-slate-500 font-medium leading-relaxed">
              Evrak işleriyle uğraşmayın. Seçtiğiniz kuruluşa dijital ortamda anında başvuru yapın ve sürecinizi takip edin.
            </p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-5 shadow-sm">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Güvenli Aidat Takibi</h3>
            <p className="text-slate-500 font-medium leading-relaxed">
              Ödemelerinizi IBAN bilgileriyle güvenle yapın, makbuzlarınızı sisteme yükleyip onay durumunu anlık görün.
            </p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center mb-5 shadow-sm">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Şeffaf İletişim</h3>
            <p className="text-slate-500 font-medium leading-relaxed">
              Kuruluşun WhatsApp gruplarına, sosyal medya hesaplarına ve tüzüğüne tek tıkla, şeffaf bir şekilde erişin.
            </p>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog.Root open={!!selectedStk} onOpenChange={(open) => !open && setSelectedStk(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 transition-opacity" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-[2.5rem] shadow-2xl z-50 focus:outline-none">
            {selectedStk && (
              <div className="flex flex-col">
                {/* Modal Header */}
                <div className="bg-[#0f172a] p-8 text-white relative rounded-t-[2.5rem] overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none"></div>
                  <Dialog.Close className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
                    <X className="w-5 h-5" />
                  </Dialog.Close>
                  <div className="flex items-start gap-6 relative z-10">
                    {selectedStk.logo ? (
                      <img src={selectedStk.logo} alt="Logo" className="w-24 h-24 rounded-2xl bg-white border-4 border-white/10 shadow-xl object-cover" />
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center border-4 border-white/10 shadow-xl">
                        <Building className="w-10 h-10 text-white/50" />
                      </div>
                    )}
                    <div className="flex-1 mt-1">
                      <h3 className="text-2xl font-extrabold leading-tight mb-4 pr-8">{selectedStk.name}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {selectedStk.type}
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          {selectedStk.city}
                        </span>
                      </div>
                      {selectedStk.registrationNumber && (
                        <div className="mt-4 text-xs font-medium text-slate-400 flex items-center gap-2">
                          <span className="p-1 rounded-md bg-white/5 border border-white/10 text-amber-400">🏛️</span> 
                          Sicil / Kütük No: <span className="text-white">{selectedStk.registrationNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-8">
                  
                  {/* Hakkımızda */}
                  <div className="mb-8">
                    <h4 className="flex items-center gap-2 text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Hakkımızda
                    </h4>
                    <p className="text-[16px] text-slate-700 leading-relaxed font-medium">
                      {selectedStk.description || "Henüz bir açıklama eklenmemiş."}
                    </p>
                  </div>

                  {/* Sosyal Medya */}
                  <div className="mb-8">
                    <h4 className="flex items-center gap-2 text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Sosyal Medya ve İletişim
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedStk.facebookUrl && (
                        <a href={selectedStk.facebookUrl} target="_blank" className="flex items-center gap-2 px-4 py-2.5 bg-[#1877F2]/10 text-[#1877F2] text-sm font-bold rounded-xl hover:bg-[#1877F2] hover:text-white transition-all">
                          <Facebook className="w-4 h-4" /> Facebook
                        </a>
                      )}
                      {selectedStk.twitterUrl && (
                        <a href={selectedStk.twitterUrl} target="_blank" className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-900 hover:text-white transition-all">
                          <Twitter className="w-4 h-4" /> X Twitter
                        </a>
                      )}
                      {selectedStk.instagramUrl && (
                        <a href={selectedStk.instagramUrl} target="_blank" className="flex items-center gap-2 px-4 py-2.5 bg-pink-50 text-pink-600 text-sm font-bold rounded-xl hover:bg-gradient-to-r hover:from-[#f9ce34] hover:via-[#ee2a7b] hover:to-[#6228d7] hover:text-white transition-all">
                          <Instagram className="w-4 h-4" /> Instagram
                        </a>
                      )}
                      {selectedStk.whatsappGroupUrl && (
                        <a href={selectedStk.whatsappGroupUrl} target="_blank" className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366]/10 text-[#075E54] text-sm font-bold rounded-xl hover:bg-[#25D366] hover:text-white transition-all">
                          <MessageCircle className="w-4 h-4" /> WhatsApp
                        </a>
                      )}
                      {selectedStk.telegramUrl && (
                        <a href={selectedStk.telegramUrl} target="_blank" className="flex items-center gap-2 px-4 py-2.5 bg-[#229ED9]/10 text-[#229ED9] text-sm font-bold rounded-xl hover:bg-[#229ED9] hover:text-white transition-all">
                          <Send className="w-4 h-4" /> Telegram
                        </a>
                      )}
                      {!selectedStk.facebookUrl && !selectedStk.instagramUrl && !selectedStk.twitterUrl && !selectedStk.whatsappGroupUrl && !selectedStk.telegramUrl && (
                        <span className="text-sm font-medium text-slate-500 bg-slate-50 px-4 py-2 rounded-xl">Sosyal medya hesabı bulunmuyor.</span>
                      )}
                    </div>
                  </div>


                  {/* CTA */}
                  <Link 
                    href={`/basvuru/${selectedStk.slug}`}
                    className="w-full flex items-center justify-center gap-2 py-5 rounded-2xl bg-[#059669] text-white font-extrabold text-[17px] shadow-lg shadow-emerald-500/25 transition-all hover:bg-[#047857] hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/30"
                  >
                    📝 Hemen Üyelik Başvurusu Yap
                  </Link>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 pt-16 pb-8 mt-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            {/* 1. Kolon: Marka ve Özet */}
            <div className="flex flex-col gap-4">
              <Link href="/" className="flex items-center gap-1.5 group mb-2">
                <span className="text-2xl font-black tracking-tighter text-slate-900 flex items-center">
                  KamuLog<span className="text-emerald-600">STK</span>
                </span>
              </Link>
              <p className="text-sm text-slate-500 leading-relaxed font-medium mt-2">
                Sivil Toplum Dünyasını Tek Platformda Keşfedin. Dernek, sendika ve vakıflar için yenilikçi yönetim ve üyelik çözümleri.
              </p>
              <a href="mailto:destek@kamulogstk.net" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors mt-2 inline-flex items-center gap-2">
                <Send className="w-4 h-4" /> destek@kamulogstk.net
              </a>
            </div>

            {/* 2. Kolon: Hızlı Bağlantılar */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-6 tracking-wide">Platform</h4>
              <ul className="space-y-4">
                <li><Link href="/" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium">Ana Sayfa</Link></li>
                <li><Link href="/kurumsal" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium">Kurumsal Çözümler</Link></li>
                <li><Link href="#nasil-calisir" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium">Nasıl Çalışır?</Link></li>
                <li><Link href="/" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium">Sıkça Sorulan Sorular (SSS)</Link></li>
                <li><Link href="/" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium">İletişim</Link></li>
              </ul>
            </div>

            {/* 3. Kolon: Çözümler */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-6 tracking-wide">Çözümler</h4>
              <ul className="space-y-4">
                <li><Link href="/" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium">Dernek Yönetimi</Link></li>
                <li><Link href="/" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium">Sendika Yönetimi</Link></li>
                <li><Link href="/" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium">Vakıf Yönetimi</Link></li>
                <li><Link href="/" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium">Aidat Takibi</Link></li>
                <li><Link href="/" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium">Şeffaf İletişim</Link></li>
              </ul>
            </div>

            {/* 4. Kolon: Yasal */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-6 tracking-wide">Yasal</h4>
              <ul className="space-y-4">
                <li><Link href="/kvkk" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium">KVKK Aydınlatma Metni</Link></li>
                <li><Link href="/gizlilik-politikasi" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium">Gizlilik Sözleşmesi</Link></li>
                <li><Link href="/kullanici-sozlesmesi" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium">Kullanıcı ve Üyelik Sözleşmesi</Link></li>
                <li><Link href="/" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium">Çerez (Cookie) Politikası</Link></li>
                <li><Link href="/" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium">İptal ve İade Koşulları</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-400 font-medium text-center md:text-left">
              © 2026 Kamulog STK. Tüm hakları saklıdır.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
