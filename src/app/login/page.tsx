"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Shield, Mail, Lock, Loader2, Smartphone, ArrowLeft, CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";

type LoginStep = "credentials" | "otp" | "verifying";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>("credentials");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(300); // 5 dakika
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  // OTP Geri sayım
  useEffect(() => {
    if (step !== "otp") return;
    if (otpTimer <= 0) return;
    const interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // ADIM 1: Kimlik bilgileri doğrula + OTP gönder
  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Giriş hatası. E-posta veya şifre yanlış.");
        setLoading(false);
        return;
      }

      if (data.skipOtp) {
        // Telefon yoksa direkt NextAuth ile giriş
        await completeLogin();
        return;
      }

      // OTP gönderildi, ikinci adıma geç
      setMaskedPhone(data.maskedPhone || "");
      setStep("otp");
      setOtpTimer(300);
      setLoading(false);
      // İlk input'a focus
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch {
      setError("Sunucu bağlantı hatası");
      setLoading(false);
    }
  };

  // ADIM 2: OTP doğrula + session başlat
  const handleVerifyOtp = async () => {
    const otp = otpDigits.join("");
    if (otp.length !== 6) {
      setError("Lütfen 6 haneli kodu eksiksiz girin");
      return;
    }

    setLoading(true);
    setError("");
    setStep("verifying");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Doğrulama hatası");
        setStep("otp");
        setLoading(false);
        return;
      }

      // OTP doğrulandı, NextAuth session başlat
      await completeLogin();
    } catch {
      setError("Sunucu bağlantı hatası");
      setStep("otp");
      setLoading(false);
    }
  };

  // NextAuth session oluştur ve yönlendir
  const completeLogin = async () => {
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (result?.error) {
      setError("Oturum başlatılamadı. Lütfen tekrar deneyin.");
      setStep("credentials");
      return;
    }

    try {
      const sess = await fetch("/api/auth/session");
      const sessData = await sess.json();
      const role = sessData?.user?.role;
      if (role === "STK_MANAGER") {
        window.location.href = "/stk-panel";
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      router.push("/dashboard");
      router.refresh();
    }
  };

  // OTP digit input handler
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // İleri git
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Son haneden sonra otomatik doğrula
    if (index === 5 && value) {
      const fullOtp = newDigits.join("");
      if (fullOtp.length === 6) {
        setTimeout(() => handleVerifyOtp(), 200);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      handleVerifyOtp();
    }
  };

  // OTP Paste handler
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newDigits = pasted.split("");
      setOtpDigits(newDigits);
      otpRefs.current[5]?.focus();
      setTimeout(() => handleVerifyOtp(), 300);
    }
  };

  // Geri dönüş
  const handleBack = () => {
    setStep("credentials");
    setOtpDigits(["", "", "", "", "", ""]);
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] font-sans relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-slate-100 to-transparent -z-10"></div>
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none"></div>

      {/* Back to Home Navigation */}
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
        <ArrowLeft className="w-4 h-4" /> Anasayfaya Dön
      </Link>

      <div className="w-full max-w-[420px] px-4 z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#059669] to-[#10b981] mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Kurumsal Giriş</h1>
          <p className="text-[15px] font-medium text-slate-500 mt-2">
            {step === "credentials" ? "STK Yönetim Panelinize hoş geldiniz." : "Hesabınızı doğrulamak için güvenlik kodunu girin."}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] border border-slate-100/50 backdrop-blur-xl">
          
          {/* ═══ ADIM 1: Kimlik Bilgileri ═══ */}
          {step === "credentials" && (
            <form onSubmit={handleCredentials} className="space-y-6">
              {error && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold animate-in fade-in slide-in-from-top-2">
                  <div className="mt-0.5"><Shield className="w-4 h-4" /></div>
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">E-posta Adresi</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="yönetici@stk.org.tr" 
                    className="w-full h-14 pl-12 pr-4 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 font-medium transition-all" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Şifre</label>
                  <a href="#" className="text-[13px] font-bold text-emerald-600 hover:text-emerald-700">Şifremi Unuttum</a>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="••••••••" 
                    className="w-full h-14 pl-12 pr-4 rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 font-medium tracking-widest transition-all" 
                    required 
                  />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full h-14 rounded-xl bg-slate-900 text-white font-bold text-[15px] hover:bg-slate-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 hover:-translate-y-0.5">
                {loading ? (<><Loader2 className="w-5 h-5 animate-spin" /> Doğrulanıyor...</>) : (<>Panele Giriş Yap <ChevronRight className="w-5 h-5" /></>)}
              </button>

              {/* Security Note */}
              <div className="flex items-center justify-center gap-2 pt-4">
                <Smartphone className="w-4 h-4 text-emerald-500" />
                <p className="text-xs font-semibold text-slate-500">
                  İki adımlı doğrulama (WhatsApp) ile korunmaktadır.
                </p>
              </div>
            </form>
          )}

          {/* ═══ ADIM 2: OTP Doğrulama ═══ */}
          {(step === "otp" || step === "verifying") && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              {/* Back Button */}
              <button onClick={handleBack} className="flex items-center gap-1.5 text-[13px] font-bold text-slate-400 hover:text-slate-700 transition-colors mb-2">
                <ArrowLeft className="w-4 h-4" /> Geri Dön
              </button>

              {error && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold animate-in fade-in slide-in-from-top-2">
                  <div className="mt-0.5"><Shield className="w-4 h-4" /></div>
                  <p>{error}</p>
                </div>
              )}

              {/* WhatsApp Info */}
              <div className="p-4 rounded-2xl bg-[#25D366]/5 border border-[#25D366]/20 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="#25D366" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-800">Doğrulama Kodu Gönderildi</p>
                  <p className="text-[13px] text-slate-500 mt-0.5">
                    <span className="font-bold text-slate-700">{maskedPhone}</span> numarasına gönderilen 6 haneli kodu girin.
                  </p>
                </div>
              </div>

              {/* OTP Input Boxes */}
              <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    disabled={step === "verifying"}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-extrabold rounded-xl bg-white border-2 border-slate-200 text-slate-900 focus:outline-none focus:border-[#25D366] focus:ring-4 focus:ring-[#25D366]/10 transition-all shadow-sm"
                    style={{
                      borderColor: digit ? "#25D366" : "",
                      backgroundColor: digit ? "#f0fdf4" : ""
                    }}
                  />
                ))}
              </div>

              {/* Timer & Resend */}
              <div className="flex items-center justify-between text-sm pt-2">
                {otpTimer > 0 ? (
                  <span className="font-semibold text-slate-500">Kalan Süre: <span className={otpTimer < 60 ? "text-red-500" : "text-emerald-600"}>{formatTimer(otpTimer)}</span></span>
                ) : (
                  <button onClick={() => { setStep("credentials"); setOtpDigits(["", "", "", "", "", ""]); }} className="font-bold text-emerald-600 hover:text-emerald-700">
                    Kodu Tekrar Gönder
                  </button>
                )}
              </div>

              {/* Submit Button */}
              <button onClick={handleVerifyOtp} disabled={loading || otpDigits.join("").length !== 6}
                className="w-full h-14 rounded-xl bg-[#25D366] text-white font-bold text-[15px] hover:bg-[#1DA851] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/25 hover:-translate-y-0.5 mt-4">
                {step === "verifying" ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Sistem Onaylıyor...</>
                ) : (
                  <><CheckCircle2 className="w-5 h-5" /> Doğrula ve Giriş Yap</>
                )}
              </button>
            </div>
          )}

        </div>
        
        {/* Footer */}
        <p className="text-center text-[13px] font-semibold text-slate-400 mt-8">
          © 2026 KamuLog. Türkiye'nin Dijital STK Altyapısı.
        </p>
      </div>
    </div>
  );
}
