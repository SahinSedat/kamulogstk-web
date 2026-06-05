"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UploadCloud, FileText, CheckCircle2, ShieldCheck, HandCoins, User, Mail, Phone, Calendar, CreditCard } from "lucide-react";

export default function STKApplicationPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const [stk, setStk] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    tcKimlik: "",
    phone: "",
    email: "",
    birthDate: "",
  });

  const [contractFile, setContractFile] = useState<File | null>(null);
  const [contractBase64, setContractBase64] = useState<string>("");

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string>("");

  const [copiedIban, setCopiedIban] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const fetchStk = async () => {
      try {
        const res = await fetch(`/api/public/stk/${slug}`);
        const data = await res.json();
        if (data.success) {
          setStk(data.data);
        } else {
          setError(data.error || "STK bulunamadı.");
        }
      } catch (err) {
        setError("Bağlantı hatası oluştu.");
      } finally {
        setLoading(false);
      }
    };
    fetchStk();
  }, [slug]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "contract" | "receipt") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Dosya boyutu 10MB'dan büyük olamaz.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (type === "contract") {
        setContractFile(file);
        setContractBase64(base64);
      } else {
        setReceiptFile(file);
        setReceiptBase64(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.name || !formData.tcKimlik || !formData.phone || !formData.email || !formData.birthDate) {
      setError("Lütfen tüm zorunlu kimlik ve iletişim bilgilerinizi doldurun.");
      return;
    }

    if (formData.tcKimlik.length !== 11) {
      setError("T.C. Kimlik No 11 haneli olmalıdır.");
      return;
    }

    if (stk?.contractPdfUrl && !contractBase64) {
      setError("Lütfen ıslak imzalı üyelik sözleşmesini yükleyiniz.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/public/stk/${slug}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          contractUrl: contractBase64,
          receiptUrl: receiptBase64,
          consentGiven: true,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(data.error || "Başvuru sırasında bir hata oluştu.");
      }
    } catch (err) {
      setError("Sistemsel bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error && !stk) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <ShieldCheck className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{error}</h2>
          <button onClick={() => router.push("/")} className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-lg">Anasayfaya Dön</button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center border border-emerald-100">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Başvurunuz Alındı!</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            {stk?.name} kuruluşuna yapmış olduğunuz üyelik başvurusu başarıyla iletilmiştir. Yetkililer belgelerinizi inceledikten sonra sizinle iletişime geçecektir.
          </p>
          <button onClick={() => router.push("/")} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/30">
            Anasayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.push("/")} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-semibold mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Geri Dön
        </button>

        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-emerald-600 p-8 text-white text-center">
            <h1 className="text-2xl sm:text-3xl font-black mb-2 tracking-tight">{stk?.name}</h1>
            <p className="text-emerald-100 font-medium">Resmi Üyelik Başvuru Formu</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-semibold flex items-center gap-3">
                <ShieldCheck className="w-5 h-5" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Kişisel Bilgiler */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-500" /> 1. Kişisel Bilgileriniz
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5"><User className="w-4 h-4 text-slate-400" /> İsim Soyisim <span className="text-red-500">*</span></label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium" placeholder="Kimlikteki adınız" />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5"><ShieldCheck className="w-4 h-4 text-slate-400" /> T.C. Kimlik No <span className="text-red-500">*</span></label>
                    <input type="text" maxLength={11} required value={formData.tcKimlik} onChange={e => setFormData({...formData, tcKimlik: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium font-mono" placeholder="11 haneli" />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5"><Calendar className="w-4 h-4 text-slate-400" /> Doğum Tarihi (GG.AA.YYYY) <span className="text-red-500">*</span></label>
                    <input type="date" required value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium" />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5"><Phone className="w-4 h-4 text-slate-400" /> Cep Telefonu <span className="text-red-500">*</span></label>
                    <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium" placeholder="05XX XXX XX XX" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5"><Mail className="w-4 h-4 text-slate-400" /> E-posta Adresi <span className="text-red-500">*</span></label>
                    <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium" placeholder="ornek@posta.com" />
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-200 w-full" />

              {/* Üyelik Sözleşmesi (Zorunlu) */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-500" /> 2. Üyelik Sözleşmesi
                </h3>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
                  <p className="text-sm text-amber-800 font-medium mb-4 leading-relaxed">
                    Başvurunuzun işleme alınabilmesi için kuruluşun belirlediği Üyelik Sözleşmesini bilgisayarınıza indirip, <strong className="text-amber-900 font-bold">ıslak imzalı</strong> bir şekilde taratarak (PDF/JPG) sisteme geri yüklemeniz <strong className="text-amber-900 font-bold">zorunludur</strong>.
                  </p>
                  {stk?.contractPdfUrl ? (
                    <a href={stk.contractPdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-amber-300 text-amber-700 hover:bg-amber-100 rounded-xl font-bold text-sm transition-colors shadow-sm">
                      <FileText className="w-4 h-4" /> Sözleşme Şablonunu İndir
                    </a>
                  ) : (
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">Bu kuruluş için henüz sözleşme şablonu yüklenmemiş. Lütfen boş bir beyan yükleyiniz.</span>
                  )}
                </div>

                <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-emerald-500 hover:bg-emerald-50 transition-colors bg-slate-50">
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, "contract")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <UploadCloud className={`w-10 h-10 mx-auto mb-3 ${contractFile ? 'text-emerald-500' : 'text-slate-400'}`} />
                  {contractFile ? (
                    <div>
                      <p className="text-sm font-bold text-emerald-700">{contractFile.name}</p>
                      <p className="text-xs text-emerald-600 mt-1">Sözleşme Başarıyla Yüklendi ✅</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-slate-700">İmzalı Sözleşmeyi Yüklemek İçin Tıklayın <span className="text-red-500">*</span></p>
                      <p className="text-xs font-medium text-slate-500 mt-1">PDF, JPG, PNG (Maks 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-px bg-slate-200 w-full" />

              {/* Aidat Dekontu (Opsiyonel) */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <HandCoins className="w-5 h-5 text-emerald-500" /> 3. Aidat ve Dekont Bildirimi (Opsiyonel)
                </h3>
                
                {(stk?.annualDuesAmount || stk?.monthlyDuesAmount || stk?.iban) && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {stk?.annualDuesAmount && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><HandCoins className="w-5 h-5" /></div>
                        <div><p className="text-xs font-bold text-slate-500 uppercase">Yıllık Aidat</p><p className="text-sm font-black text-slate-800">₺{stk.annualDuesAmount}</p></div>
                      </div>
                    )}
                    {stk?.monthlyDuesAmount && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><HandCoins className="w-5 h-5" /></div>
                        <div><p className="text-xs font-bold text-slate-500 uppercase">Aylık Aidat</p><p className="text-sm font-black text-slate-800">₺{stk.monthlyDuesAmount}</p></div>
                      </div>
                    )}
                    {stk?.iban && (
                      <div className="sm:col-span-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><CreditCard className="w-5 h-5" /></div>
                          <div><p className="text-xs font-bold text-slate-500 uppercase">Banka IBAN Numarası</p><p className="text-sm font-mono font-bold text-slate-800">{stk.iban}</p></div>
                        </div>
                        <button type="button" onClick={() => { navigator.clipboard.writeText(stk.iban); setCopiedIban(true); setTimeout(() => setCopiedIban(false), 2000); }} className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors border border-emerald-100">
                          {copiedIban ? "KOPYALANDI" : "KOPYALA"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-emerald-500 hover:bg-emerald-50 transition-colors bg-slate-50">
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, "receipt")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${receiptFile ? 'text-emerald-500' : 'text-slate-400'}`} />
                  {receiptFile ? (
                    <div>
                      <p className="text-sm font-bold text-emerald-700">{receiptFile.name}</p>
                      <p className="text-xs text-emerald-600 mt-1">Dekont Seçildi ✅</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-slate-700">Ödeme Dekontunuzu Yüklemek İçin Tıklayın (Opsiyonel)</p>
                      <p className="text-xs font-medium text-slate-500 mt-1">PDF, JPG, PNG</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-black text-lg transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Gönderiliyor...</>
                  ) : (
                    <><CheckCircle2 className="w-6 h-6" /> BAŞVURUYU TAMAMLA</>
                  )}
                </button>
                <p className="text-center text-xs font-medium text-slate-500 mt-4 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Tüm bilgileriniz KVKK kapsamında şifrelenerek korunmaktadır.
                </p>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
