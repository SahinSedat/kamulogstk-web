"use client";

import React from "react";
import { MapPin, Phone, Mail, Building, FileText, Send } from "lucide-react";
import Link from "next/link";

export default function IletisimPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Bize Ulaşın
          </h1>
          <p className="text-lg text-slate-600">
            Soru, görüş ve önerileriniz için aşağıdaki iletişim kanallarından bize ulaşabilir veya iletişim formunu doldurabilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 bg-white rounded-3xl shadow-xl overflow-hidden">
          
          {/* Sol Taraf - İletişim Bilgileri */}
          <div className="lg:col-span-2 bg-emerald-600 text-white p-10 flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-8">İletişim Bilgileri</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-500/30 p-3 rounded-xl shrink-0">
                    <Building className="w-6 h-6 text-emerald-50" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-emerald-50 mb-1">Şirket Ünvanı</h4>
                    <p className="text-white/90 leading-relaxed text-sm">
                      Kamulog<br />
                      (Şahıs Şirketi / Yasal Yetkili: Suat Hayri Şahin)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-emerald-500/30 p-3 rounded-xl shrink-0">
                    <MapPin className="w-6 h-6 text-emerald-50" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-emerald-50 mb-1">Adres</h4>
                    <p className="text-white/90 leading-relaxed text-sm">
                      Atatürk Mah. Çelikel Sk.<br />
                      Esbender Şahin Apt. No: 5 İç Kapı No: 2<br />
                      Sancaktepe / İstanbul
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500/30 p-3 rounded-xl shrink-0">
                    <Phone className="w-6 h-6 text-emerald-50" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-emerald-50 mb-1">Telefon</h4>
                    <p className="text-white/90 font-medium">0539 264 76 55</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500/30 p-3 rounded-xl shrink-0">
                    <Mail className="w-6 h-6 text-emerald-50" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-emerald-50 mb-1">E-Posta</h4>
                    <a href="mailto:iletisim@kamulogstk.net" className="text-white/90 font-medium hover:text-white transition-colors">
                      iletisim@kamulogstk.net
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500/30 p-3 rounded-xl shrink-0">
                    <FileText className="w-6 h-6 text-emerald-50" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-emerald-50 mb-1">Vergi Bilgileri</h4>
                    <p className="text-white/90 text-sm">
                      Sultanbeyli V.D.<br />
                      VN: 7960109842
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-emerald-500/30 text-emerald-100 text-sm">
              <p>Hafta içi: 09:00 - 18:00 saatleri arasında destek vermekteyiz.</p>
            </div>
          </div>

          {/* Sağ Taraf - Form */}
          <div className="lg:col-span-3 p-10">
            <h3 className="text-2xl font-bold text-slate-800 mb-6">Bize Mesaj Gönderin</h3>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-semibold text-slate-700">Adınız Soyadınız</label>
                  <input 
                    type="text" 
                    id="name" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    placeholder="Adınız Soyadınız"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold text-slate-700">E-Posta Adresiniz</label>
                  <input 
                    type="email" 
                    id="email" 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    placeholder="ornek@mail.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-semibold text-slate-700">Konu</label>
                <input 
                  type="text" 
                  id="subject" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="Hangi konuda iletişim kurmak istiyorsunuz?"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-semibold text-slate-700">Mesajınız</label>
                <textarea 
                  id="message" 
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Mesajınızı buraya yazınız..."
                ></textarea>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="kvkk" className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <label htmlFor="kvkk" className="text-sm text-slate-600">
                  <Link href="/kvkk" className="text-emerald-600 hover:underline font-medium">Aydınlatma Metni</Link>'ni okudum ve kabul ediyorum.
                </label>
              </div>

              <button 
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors focus:ring-4 focus:ring-emerald-500/20"
              >
                <span>Mesajı Gönder</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
