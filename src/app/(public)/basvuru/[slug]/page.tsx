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

  const [isOnlyPayment, setIsOnlyPayment] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [membershipNotFound, setMembershipNotFound] = useState(false);
  
  const [duesStatus, setDuesStatus] = useState<{message: string; dueDate: string | null; name: string} | null>(null);
  const [checkingDues, setCheckingDues] = useState(false);

  const [receiptNumber, setReceiptNumber] = useState("");
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [contractBase64, setContractBase64] = useState<string>("");

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string>("");
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);

  const [copiedIban, setCopiedIban] = useState(false);

  const togglePayment = (type: string) => {
    if (selectedPayments.includes(type)) {
      setSelectedPayments(selectedPayments.filter(p => p !== type));
    } else {
      setSelectedPayments([...selectedPayments, type]);
    }
  };

  const [consentMembership, setConsentMembership] = useState(false);
  const [consentKVKK, setConsentKVKK] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
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

    const errors: string[] = [];

    // Validation
    if (isOnlyPayment) {
      if (!formData.phone || !formData.email) {
        errors.push("Ödeme bildirimi için Telefon Numaranızı ve E-posta adresinizi girmelisiniz.");
      }
    } else {
      if (!formData.name || !formData.tcKimlik || !formData.phone || !formData.email) {
        errors.push("Lütfen tüm zorunlu kimlik ve iletişim bilgilerinizi doldurun.");
      }

      if (formData.tcKimlik && formData.tcKimlik.length !== 11) {
        errors.push("T.C. Kimlik No 11 haneli olmalıdır.");
      }
    }

    if (formData.phone && formData.phone.length !== 11) {
      errors.push("Cep telefonu numaranız 0 ile başlayacak şekilde 11 haneli olmalıdır.");
    }

    if (!isOnlyPayment) {
      if (stk?.contractPdfUrl && !contractBase64) {
        errors.push("Lütfen ıslak imzalı üyelik sözleşmesini yükleyiniz.");
      }

      if (!consentMembership || !consentKVKK || !consentPrivacy) {
        errors.push("Başvurunuzu tamamlamak için lütfen onay kutularını işaretleyiniz.");
      }
    } else {
      if (selectedPayments.length === 0) {
        errors.push("Sadece aidat ödemesi yapıyorsanız en az bir ödeme tipi (Aylık, Yıllık, Bağış) seçmelisiniz.");
      }
      if (!receiptBase64) {
        errors.push("Sadece aidat ödemesi yapıyorsanız ödeme dekontunuzu yüklemelisiniz.");
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowErrorDialog(true);
      return;
    }

    setValidationErrors([]);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/public/stk/${slug}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          contractUrl: contractBase64,
          receiptUrl: receiptBase64,
          selectedPayments,
          consentGiven: !isOnlyPayment,
          isOnlyPayment,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        if (data.receiptNumber) {
          setReceiptNumber(data.receiptNumber);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        if (data.error && data.error.includes("Sistemde Telefon numaranızla veya E-posta adresinizle eşleşen bir üyelik kaydı bulunamadı")) {
          setMembershipNotFound(true);
        } else {
          setError(data.error || "Başvuru sırasında bir hata oluştu.");
        }
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
          <h2 className="text-2xl font-bold text-slate-800 mb-4">
            {isOnlyPayment ? "Aidat Ödemeniz Alındı!" : "Başvurunuz Alındı!"}
          </h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            {isOnlyPayment 
              ? `${stk?.name} kuruluşuna yapmış olduğunuz aidat/bağış bildiriminiz başarıyla iletilmiştir. Yetkililer dekontunuzu inceledikten sonra onaylayacaktır.`
              : `${stk?.name} kuruluşuna yapmış olduğunuz üyelik başvurusu başarıyla iletilmiştir. Yetkililer belgelerinizi inceledikten sonra sizinle iletişime geçecektir.`}
          </p>
          {isOnlyPayment && receiptNumber && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-8">
              <p className="text-sm text-emerald-800 font-medium mb-1">Dekont / İşlem Numarası</p>
              <p className="text-xl font-bold text-emerald-700 tracking-wider font-mono">{receiptNumber}</p>
            </div>
          )}
          <button onClick={() => router.push("/")} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/30">
            Anasayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto relative">
        {/* Hata Dialog Modalı */}
        {showErrorDialog && (
          <div className="fixed inset-0 z-[99] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-red-100 transform transition-all scale-100">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <ShieldCheck className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 text-center mb-4">Eksik Bilgiler Var!</h3>
              <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-semibold mb-6 space-y-2">
                {validationErrors.map((err, i) => (
                  <p key={i} className="flex items-start gap-2"><span className="text-red-500 mt-0.5">•</span> {err}</p>
                ))}
              </div>
              <button 
                onClick={() => setShowErrorDialog(false)}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/30"
              >
                Anladım, Düzeltiyorum
              </button>
            </div>
          </div>
        )}

        {/* Üyelik Bulunamadı Dialog Modalı */}
        {membershipNotFound && (
          <div className="fixed inset-0 z-[99] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-red-100 transform transition-all scale-100 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <ShieldCheck className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Kayıt Bulunamadı</h3>
              <p className="text-slate-600 mb-6 font-medium text-sm leading-relaxed">
                Sistemde Telefon numaranızla veya E-posta adresinizle eşleşen bir üyelik kaydı bulunamadı. Lütfen "Sadece Aidat Ödeyeceğim" seçeneğini kaldırarak tam başvuru yapınız.
              </p>
              <button 
                onClick={() => setMembershipNotFound(false)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all shadow-lg"
              >
                Anladım, Düzeltiyorum
              </button>
            </div>
          </div>
        )}

        {/* Aidat Sorgu Sonucu Dialog Modalı */}
        {duesStatus && (
          <div className="fixed inset-0 z-[99] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-emerald-100 transform transition-all scale-100 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Sayın {duesStatus.name}</h3>
              <p className="text-slate-600 mb-6 font-medium text-sm leading-relaxed">
                {duesStatus.message}
              </p>
              <button 
                onClick={() => setDuesStatus(null)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg"
              >
                Kapat
              </button>
            </div>
          </div>
        )}

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
              
              {/* Sadece Aidat Ödeyeceğim Toggle */}
              <div className="bg-slate-50 border-2 border-emerald-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <HandCoins className="w-5 h-5 text-emerald-500" /> Sadece Aidat / Bağış Ödeyeceğim
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Zaten kayıtlı bir üyeyseniz ve yalnızca ödeme dekontu iletmek istiyorsanız bu seçeneği işaretleyin.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input type="checkbox" checked={isOnlyPayment} onChange={(e) => setIsOnlyPayment(e.target.checked)} className="sr-only peer" />
                  <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                </label>
              </div>

              {/* Kişisel Bilgiler */}
              <div className={`transition-all ${isOnlyPayment ? 'opacity-80' : ''}`}>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-500" /> 1. Kişisel Bilgileriniz
                </h3>
                {isOnlyPayment && <p className="text-xs font-bold text-emerald-600 mb-4 bg-emerald-50 p-2 rounded-lg">Ödemenizin hesabınıza işlenebilmesi için sistemde kayıtlı Telefon numaranız ve E-posta adresiniz üzerinden eşleştirme yapılacaktır.</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5"><ShieldCheck className="w-4 h-4 text-slate-400" /> T.C. Kimlik No <span className="text-red-500">*</span></label>
                    <input type="text" maxLength={11} required value={formData.tcKimlik} onChange={e => setFormData({...formData, tcKimlik: e.target.value.replace(/\D/g, '')})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium font-mono" placeholder="11 haneli" />
                    {isOnlyPayment && (
                      <button type="button" onClick={handleCheckDues} disabled={checkingDues} className="mt-2 text-sm text-emerald-600 font-bold hover:underline">
                        {checkingDues ? "Sorgulanıyor..." : "Aidat Durumumu Sorgula"}
                      </button>
                    )}
                  </div>
                  {!isOnlyPayment && (
                    <>
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5"><User className="w-4 h-4 text-slate-400" /> İsim Soyisim <span className="text-red-500">*</span></label>
                        <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium" placeholder="Kimlikteki adınız" />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5"><Calendar className="w-4 h-4 text-slate-400" /> Doğum Tarihi (GG.AA.YYYY) <span className="text-slate-400 font-normal text-xs">(İsteğe Bağlı)</span></label>
                        <input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium" />
                      </div>
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5"><Phone className="w-4 h-4 text-slate-400" /> Cep Telefonu <span className="text-red-500">*</span></label>
                        <input type="tel" maxLength={11} required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium font-mono" placeholder="05XX XXX XX XX" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-1.5"><Mail className="w-4 h-4 text-slate-400" /> E-posta Adresi <span className="text-red-500">*</span></label>
                        <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-medium" placeholder="ornek@posta.com" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="h-px bg-slate-200 w-full" />

              {/* Üyelik Sözleşmesi (Zorunlu) */}
              {!isOnlyPayment && (
                <>
                  <div className="h-px bg-slate-200 w-full" />
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
                </>
              )}

              <div className="h-px bg-slate-200 w-full" />

              {/* Aidat Dekontu (Opsiyonel) */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <HandCoins className="w-5 h-5 text-emerald-500" /> 3. Aidat ve Dekont Bildirimi (Opsiyonel)
                </h3>
                
                {(stk?.annualDuesAmount || stk?.monthlyDuesAmount || stk?.iban) && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {stk?.annualDuesAmount && (
                      <button type="button" onClick={() => togglePayment('YEARLY')} className={`text-left p-3 rounded-xl border shadow-sm flex items-center gap-3 transition-all ${selectedPayments.includes('YEARLY') ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-300'}`}>
                        <div className={`p-2 rounded-lg ${selectedPayments.includes('YEARLY') ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600'}`}><HandCoins className="w-5 h-5" /></div>
                        <div><p className={`text-xs font-bold uppercase ${selectedPayments.includes('YEARLY') ? 'text-emerald-700' : 'text-slate-500'}`}>Yıllık Aidat</p><p className="text-sm font-black text-slate-800">₺{stk.annualDuesAmount}</p></div>
                      </button>
                    )}
                    {stk?.monthlyDuesAmount && (
                      <button type="button" onClick={() => togglePayment('MONTHLY')} className={`text-left p-3 rounded-xl border shadow-sm flex items-center gap-3 transition-all ${selectedPayments.includes('MONTHLY') ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                        <div className={`p-2 rounded-lg ${selectedPayments.includes('MONTHLY') ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'}`}><HandCoins className="w-5 h-5" /></div>
                        <div><p className={`text-xs font-bold uppercase ${selectedPayments.includes('MONTHLY') ? 'text-blue-700' : 'text-slate-500'}`}>Aylık Aidat</p><p className="text-sm font-black text-slate-800">₺{stk.monthlyDuesAmount}</p></div>
                      </button>
                    )}
                    <button type="button" onClick={() => togglePayment('DONATION')} className={`sm:col-span-2 text-left p-3 rounded-xl border shadow-sm flex items-center gap-3 transition-all ${selectedPayments.includes('DONATION') ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500' : 'bg-white border-slate-200 hover:border-amber-300'}`}>
                      <div className={`p-2 rounded-lg ${selectedPayments.includes('DONATION') ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600'}`}><HandCoins className="w-5 h-5" /></div>
                      <div><p className={`text-xs font-bold uppercase ${selectedPayments.includes('DONATION') ? 'text-amber-700' : 'text-slate-500'}`}>Bağış Yapıyorum</p><p className="text-sm font-black text-slate-800">Gönüllü Bağış</p></div>
                    </button>
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

              <div className="h-px bg-slate-200 w-full" />

              {/* Onay Kutuları */}
              {!isOnlyPayment && (
                <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input type="checkbox" checked={consentMembership} onChange={(e) => setConsentMembership(e.target.checked)} className="peer sr-only" />
                    <div className="w-5 h-5 rounded border-2 border-slate-300 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                    Kuruluşun tarafıma sunmuş olduğu <strong>Üyelik Sözleşmesi</strong>'ni okudum, anladım ve kabul ediyorum.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input type="checkbox" checked={consentKVKK} onChange={(e) => setConsentKVKK(e.target.checked)} className="peer sr-only" />
                    <div className="w-5 h-5 rounded border-2 border-slate-300 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                    <Link href="/kvkk" target="_blank" className="text-emerald-600 hover:underline">KVKK Aydınlatma Metni</Link>'ni okudum ve kişisel verilerimin işlenmesini onaylıyorum.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input type="checkbox" checked={consentPrivacy} onChange={(e) => setConsentPrivacy(e.target.checked)} className="peer sr-only" />
                    <div className="w-5 h-5 rounded border-2 border-slate-300 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                    <Link href="/gizlilik-politikasi" target="_blank" className="text-emerald-600 hover:underline">Gizlilik Sözleşmesi</Link>'ni okudum ve kabul ediyorum.
                  </span>
                </label>
              </div>
              )}

              {/* Submit */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full py-4 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-2 ${
                    validationErrors.length > 0 && !showErrorDialog 
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse border-2 border-red-400' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30'
                  } disabled:bg-slate-400 disabled:shadow-none disabled:animate-none`}
                >
                  {submitting ? (
                    <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Gönderiliyor...</>
                  ) : (
                    <><CheckCircle2 className="w-6 h-6" /> {isOnlyPayment ? 'ÖDEME BİLDİRİMİNİ GÖNDER' : 'BAŞVURUYU TAMAMLA'}</>
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
