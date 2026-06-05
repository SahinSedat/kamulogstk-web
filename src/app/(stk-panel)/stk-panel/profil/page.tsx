"use client";
import { useState, useEffect, useCallback } from "react";

export default function ProfilPage() {
  const [p, setP] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{m:string;t:string}|null>(null);
  const [form, setForm] = useState<any>({});
  const [tab, setTab] = useState("info");

  const show = (m:string,t="success") => { setToast({m,t}); setTimeout(()=>setToast(null),3000); };

  const fetch_ = useCallback(async()=>{
    try { const r=await fetch("/api/stk-panel/profile"); const j=await r.json();
      if(j.success&&j.data){ setP(j.data);
        setForm({email:j.data.email||"",phone:j.data.phone||"",website:j.data.website||"",city:j.data.city||"",district:j.data.district||"",address:j.data.address||"",description:j.data.description||"",
          kepAddress:j.data.kepAddress||"",mersisNo:j.data.mersisNo||"",trademarkNo:j.data.trademarkNo||"",taxNumber:j.data.taxNumber||"",taxOffice:j.data.taxOffice||"",registryDecisionNo:j.data.registryDecisionNo||"",registrationNumber:j.data.registrationNumber||"",
          iban:j.data.iban||"",bankAccountName:j.data.bankAccountName||"",paymentNote:j.data.paymentNote||"",donationNote:j.data.donationNote||"",duesNote:j.data.duesNote||"",annualDuesNote:j.data.annualDuesNote||"",monthlyDuesAmount:j.data.monthlyDuesAmount||"",annualDuesAmount:j.data.annualDuesAmount||"",
          consentText:j.data.consentText||"",contractPdfUrl:j.data.contractPdfUrl||"",logo:j.data.logo||"",
          acceptsDonation:j.data.acceptsDonation||false,acceptsDues:j.data.acceptsDues||false,acceptsAnnualDues:j.data.acceptsAnnualDues||false,requiresMembershipForFinance:j.data.requiresMembershipForFinance??true,showMemberCount:j.data.showMemberCount||false,isConsentActive:j.data.isConsentActive||false,isApplicationEnabled:j.data.isApplicationEnabled??true,
        });
      }
    } catch{} finally{setLoading(false);}
  },[]);
  useEffect(()=>{fetch_();},[fetch_]);

  const save = async()=>{
    setSaving(true);
    try { const r=await fetch("/api/stk-panel/profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      const j=await r.json(); if(j.success) show("✅ Profil güncellendi!"); else show(j.error||"Hata","error");
    } catch{show("Sunucu hatası","error");} finally{setSaving(false);}
  };

  const uploadFile = async(e:React.ChangeEvent<HTMLInputElement>, title:string)=>{
    const file=e.target.files?.[0]; if(!file) return;
    if(file.size>75*1024*1024){show("Dosya 75MB'ı aşamaz","error");return;}
    setUploading(true);
    try {
      const fd=new FormData(); fd.append("file",file); fd.append("type","stk-document");
      const r=await fetch("/api/upload",{method:"POST",body:fd}); const j=await r.json();
      if(j.url){
        await fetch("/api/stk-panel/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:title||file.name,fileUrl:j.url,fileType:file.name.split(".").pop()?.toUpperCase()||"PDF"})});
        show("✅ Belge yüklendi!"); fetch_();
      } else show(j.error||"Yükleme hatası","error");
    } catch{show("Dosya yüklenemedi","error");} finally{setUploading(false); e.target.value="";}
  };

  const uploadLogo = async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file) return;
    setUploading(true);
    try {
      const fd=new FormData(); fd.append("file",file); fd.append("type","stk-logos");
      const r=await fetch("/api/upload",{method:"POST",body:fd}); const j=await r.json();
      if(j.url){ setForm((f:any)=>({...f,logo:j.url})); show("Logo yüklendi, kaydetmeyi unutmayın"); }
      else show(j.error||"Hata","error");
    } catch{show("Hata","error");} finally{setUploading(false); e.target.value="";}
  };

  const uploadContract = async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file) return;
    setUploading(true);
    try {
      const fd=new FormData(); fd.append("file",file); fd.append("type","stk-contracts");
      const r=await fetch("/api/upload",{method:"POST",body:fd}); const j=await r.json();
      if(j.url){ setForm((f:any)=>({...f,contractPdfUrl:j.url})); show("PDF yüklendi, kaydetmeyi unutmayın"); }
      else show(j.error||"Hata","error");
    } catch{show("Hata","error");} finally{setUploading(false); e.target.value="";}
  };

  const deleteDoc = async(docId:string)=>{
    if(!confirm("Bu belgeyi silmek istediğinize emin misiniz?")) return;
    try {
      const r=await fetch(`/api/stk-panel/profile?docId=${docId}`,{method:"DELETE"});
      const j=await r.json();
      if(j.success){ show("🗑 Belge silindi!"); fetch_(); }
      else show(j.error||"Hata","error");
    } catch{show("Silme hatası","error");}
  };

  const F = (label:string,key:string,ph?:string,type?:string) => (
    <div key={key}><label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <input type={type||"text"} value={form[key]||""} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))} placeholder={ph||""}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white transition-all" />
    </div>
  );
  const TA = (label:string,key:string,rows=3) => (
    <div className="md:col-span-2" key={key}><label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <textarea rows={rows} value={form[key]||""} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 focus:bg-white transition-all resize-none" />
    </div>
  );
  const Toggle = (label:string,key:string,icon:string) => (
    <label key={key} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-indigo-50/50 transition-all cursor-pointer">
      <input type="checkbox" checked={form[key]||false} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.checked}))}
        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
      <span className="text-sm text-gray-700">{icon} {label}</span>
    </label>
  );

  if(loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/></div>;

  const tabs = [{k:"info",l:"📝 İletişim"},{k:"corp",l:"🏢 Kurumsal"},{k:"finance",l:"💰 Finans"},{k:"settings",l:"⚙️ Ayarlar"},{k:"docs",l:"📂 Belgeler"}];
  const TYPE_MAP: Record<string,string> = { DERNEK: "Dernek", VAKIF: "Vakıf", SENDIKA: "Sendika", KONFEDERASYON: "Konfederasyon", FEDERASYON: "Federasyon", BIRLIK: "Birlik", KOOPERATIF: "Kooperatif", ODA: "Oda" };
  const completion = p?.profileCompletion || 0;

  return (
    <div className="space-y-6" style={{animation:"fadeIn .5s ease-out"}}>
      {toast&&<div className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium text-white ${toast.t==="success"?"bg-gradient-to-r from-emerald-500 to-teal-500":"bg-gradient-to-r from-red-500 to-rose-500"}`}>{toast.m}</div>}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative group">
            {form.logo ? <img src={form.logo} alt="Logo" className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-100"/> : <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-2xl font-bold text-indigo-700">{p?.name?.charAt(0)||"S"}</div>}
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <span className="text-white text-xs font-medium">📷</span>
              <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={uploadLogo}/>
            </label>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{p?.name||"STK"}</h1>
            <p className="text-sm text-gray-500">Sicil: {form.registrationNumber||"—"} · {p?.memberCount||0} üye · {TYPE_MAP[p?.type]||p?.type||"—"}</p>
          </div>
        </div>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50">
          {saving?"Kaydediliyor...":"💾 Kaydet"}
        </button>
      </div>

      {/* Profil Doluluk */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">📊 Profil Doluluk Oranı</span>
          <span className={`text-sm font-bold ${completion>=80?'text-emerald-600':completion>=50?'text-amber-600':'text-red-500'}`}>%{completion}</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${completion>=80?'bg-gradient-to-r from-emerald-500 to-teal-500':completion>=50?'bg-gradient-to-r from-amber-400 to-orange-500':'bg-gradient-to-r from-red-400 to-rose-500'}`} style={{width:`${completion}%`}} />
        </div>
        <p className="text-[11px] text-gray-400 mt-2">{completion<50?'⚠️ İletişim, finans ve belge bilgilerinizi tamamlayın':completion<80?'💡 Profilinizi daha da geliştirin — KEP, MERSİS gibi alanları doldurun':'✅ Profiliniz büyük ölçüde tamamlanmış!'}</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map(t=><button key={t.k} onClick={()=>setTab(t.k)} className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${tab===t.k?"bg-indigo-600 text-white shadow-md":"bg-white text-gray-600 border border-gray-200 hover:border-indigo-300"}`}>{t.l}</button>)}
      </div>

      {/* İletişim */}
      {tab==="info"&&(
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-5">📝 İletişim Bilgileri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {F("E-posta","email","ornek@dernek.org","email")}
            {F("Telefon","phone","+90...")}
            {F("Web Sitesi","website","https://...")}
            {F("Şehir","city")}
            {F("İlçe","district")}
            <div className="md:col-span-2">{F("Adres","address","Tam adres")}</div>
            {TA("Açıklama","description",4)}
          </div>
        </div>
      )}

      {/* Kurumsal */}
      {tab==="corp"&&(
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-5">🏢 Kurumsal Kimlik & Hukuki Bilgiler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {F("Kütük No / Karar No","registrationNumber","Resmi sicil numarası")}
            {F("Vergi Numarası","taxNumber","Vergi kimlik no")}
            {F("Vergi Dairesi","taxOffice","Bağlı vergi dairesi")}
            {F("MERSİS No","mersisNo","MERSİS numarası")}
            {F("Marka Tescil No","trademarkNo","TPE tescil numarası")}
            {F("KEP Adresi","kepAddress","kurum@hs01.kep.tr")}
            {F("Kurul Karar No","registryDecisionNo","İlk kayıt karar numarası")}
          </div>
          <p className="text-[11px] text-gray-400 mt-3 italic">💡 Bu alanlar zorunlu değildir.</p>
        </div>
      )}

      {/* Finans */}
      {tab==="finance"&&(
        <div className="space-y-6">
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-5">💰 Finansal Ayarlar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {Toggle("Bağış Kabul Et","acceptsDonation","💜")}
              {Toggle("Aylık Aidat","acceptsDues","💳")}
              {Toggle("Yıllık Aidat","acceptsAnnualDues","🏦")}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {Toggle("Bağış/Aidat için üyelik zorunlu","requiresMembershipForFinance","🔒")}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {F("IBAN","iban","TR...")}
              {F("Hesap Alıcı Adı (Banka)","bankAccountName","Dernek adı")}
              {F("Aylık Aidat Ücreti (₺)","monthlyDuesAmount","100")}
              {F("Yıllık Aidat Ücreti (₺)","annualDuesAmount","250")}
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-5">📝 Açıklamalar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TA("Bağış Açıklaması","donationNote",2)}
              {TA("Aidat Açıklaması","duesNote",2)}
              {TA("Yıllık Aidat Açıklaması","annualDuesNote",2)}
              {TA("Ödeme Notu","paymentNote",2)}
            </div>
          </div>
        </div>
      )}

      {/* Ayarlar */}
      {tab==="settings"&&(
        <div className="space-y-6">
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-5">⚙️ Görünürlük & Başvuru Ayarları</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {Toggle("Üye sayısını mobilde göster","showMemberCount","📊")}
              {Toggle("Başvuru butonu aktif","isApplicationEnabled","✅")}
              {Toggle("Onam formu zorunlu","isConsentActive","📋")}
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-5">📋 Onam Metni (Kullanıcıya gösterilecek)</h2>
            {TA("Onam Metni","consentText",5)}
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-5">📄 Sözleşme PDF Dosyası</h2>
            {form.contractPdfUrl && <div className="mb-3 flex items-center gap-3"><a href={form.contractPdfUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">📥 Mevcut PDF&apos;i Gör</a><button onClick={()=>setForm((f:any)=>({...f,contractPdfUrl:""}))} className="text-xs text-red-500 hover:text-red-700">Kaldır</button></div>}
            <label className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer">
              <span className="text-sm text-gray-500">📤 Farklı PDF Yükle</span>
              <input type="file" accept=".pdf" className="hidden" onChange={uploadContract}/>
            </label>
          </div>
        </div>
      )}

      {/* Belgeler */}
      {tab==="docs"&&(
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">📂 Yüklenen Belgeler</h2>

            {/* Üyelik Sözleşmesi (contractPdfUrl — mobil API ile senkronize) */}
            {form.contractPdfUrl && (
              <div className="mb-3">
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 p-3 hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold flex-shrink-0">📄</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">Üyelik Sözleşmesi</p>
                    <p className="text-xs text-indigo-500 font-medium">Mobil uygulama ile senkronize</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={form.contractPdfUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">📥 İndir</a>
                    <button onClick={()=>{setForm((f:any)=>({...f,contractPdfUrl:""})); show("Sözleşme kaldırıldı, kaydetmeyi unutmayın");}} className="text-red-500 hover:text-red-700 text-xs font-medium">🗑 Kaldır</button>
                  </div>
                </div>
              </div>
            )}

            {p?.STKDocument&&p.STKDocument.length>0 ? (
              <div className="space-y-3">{p.STKDocument.map((d:any)=>(
                <div key={d.id} className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-100 p-3 hover:bg-indigo-50/50 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500 text-xs font-bold flex-shrink-0">{d.fileType}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{d.title}</p><p className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString("tr-TR")}</p></div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">📥 İndir</a>
                    <button onClick={()=>deleteDoc(d.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">🗑 Sil</button>
                  </div>
                </div>
              ))}</div>
            ) : !form.contractPdfUrl && <p className="text-sm text-gray-400 text-center py-8">Henüz belge yüklenmemiş</p>}
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">📤 Belge Yükle</h2>
            {uploading&&<p className="text-xs text-amber-600 mb-3 animate-pulse">⏳ Dosya yükleniyor...</p>}
            <div className="space-y-2">
              {/* Üyelik Sözleşmesi — Özel yükleme (contractPdfUrl ile senkronize) */}
              <label className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border-2 border-indigo-200 p-4 hover:bg-indigo-100/50 hover:border-indigo-400 transition-all cursor-pointer group">
                <span className="text-xl">📝</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-700 font-semibold block">Üyelik Sözleşmesi</span>
                  <span className="text-[10px] text-indigo-500">Mobil uygulamada üyelere gösterilir</span>
                </div>
                <span className="text-xs text-white bg-indigo-600 px-3 py-1.5 rounded-lg font-semibold opacity-80 group-hover:opacity-100 transition-opacity">{form.contractPdfUrl ? "🔄 Değiştir" : "📤 Yükle"}</span>
                <input type="file" accept=".pdf" className="hidden" onChange={uploadContract} disabled={uploading}/>
              </label>

              {[{l:"Kuruluş Bildirimi / Alındı Belgesi",i:"🏛️"},{l:"Güncel Faaliyet Belgesi (DERBİS)",i:"📋"},{l:"Onaylı Dernek Tüzüğü",i:"📜"},{l:"İmza Sirküleri / Yetki Belgesi",i:"✍️"},{l:"Vergi Levhası",i:"🧾"},{l:"Diğer Belge",i:"📎"}].map(d=>(
                <label key={d.l} className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-200 p-4 hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer group">
                  <span className="text-xl">{d.i}</span>
                  <span className="text-sm text-gray-700 flex-1 font-medium">{d.l}</span>
                  <span className="text-xs text-white bg-indigo-600 px-3 py-1.5 rounded-lg font-semibold opacity-80 group-hover:opacity-100 transition-opacity">📤 Dosya Yükle</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e=>uploadFile(e,d.l)} disabled={uploading}/>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-3">Desteklenen: PDF, JPG, JPEG, PNG · Maks: 75MB</p>
          </div>
        </div>
      )}

      <style jsx>{`@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
