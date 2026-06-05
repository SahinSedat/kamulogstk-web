"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Shield, Phone, Loader2, ArrowLeft, CheckCircle2,
    Lock, Smartphone, ChevronRight, Fingerprint,
} from "lucide-react";

type Stage = "phone" | "otp";

export default function MobileLoginPage() {
    const [stage, setStage] = useState<Stage>("phone");
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState(0);
    const [verified, setVerified] = useState(false);
    const [otpCode, setOtpCode] = useState<string | null>(null);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown timer
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
        return () => clearInterval(timer);
    }, [countdown]);

    const formatPhone = (value: string) => {
        const digits = value.replace(/\D/g, "").slice(0, 10);
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, "");
        setPhone(raw.slice(0, 10));
        setError("");
    };

    const handleSendOtp = async () => {
        if (phone.length < 10) {
            setError("Lütfen geçerli bir telefon numarası girin.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/auth/otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: `90${phone}` }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setOtpCode(data.code);
                setStage("otp");
                setCountdown(300);
                setOtp(["", "", "", "", "", ""]);
            } else {
                setError(data.error || "Bir hata oluştu.");
            }
        } catch {
            setError("Sunucuya bağlanılamadı.");
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = useCallback((index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        setError("");

        // Auto-focus next
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits are filled
        if (newOtp.every((d) => d !== "")) {
            verifyOtp(newOtp.join(""));
        }
    }, [otp]);

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (paste.length === 6) {
            const newOtp = paste.split("");
            setOtp(newOtp);
            otpRefs.current[5]?.focus();
            verifyOtp(paste);
        }
    };

    const verifyOtp = async (code: string) => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/auth/otp", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: `90${phone}`, code }),
            });
            const data = await res.json();
            if (res.ok && data.verified) {
                setVerified(true);
            } else {
                setError(data.error || "Doğrulama kodu hatalı.");
                setOtp(["", "", "", "", "", ""]);
                otpRefs.current[0]?.focus();
            }
        } catch {
            setError("Sunucuya bağlanılamadı.");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = () => {
        if (countdown > 0) return;
        handleSendOtp();
    };

    // Success screen
    if (verified) {
        return (
            <div className="min-h-screen flex items-center justify-center px-5" style={{ background: "var(--bg)" }}>
                <BgDecoration />
                <div className="relative w-full max-w-sm text-center animate-scale-in">
                    <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-5"
                        style={{ background: "linear-gradient(135deg, #48BB78, #38A169)", boxShadow: "0 8px 24px rgba(72, 187, 120, 0.3)" }}>
                        <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Giriş Başarılı!</h2>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        Hoş geldiniz. Ana sayfaya yönlendiriliyorsunuz...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-5 relative" style={{ background: "var(--bg)" }}>
            <BgDecoration />

            <div className="relative w-full max-w-sm">
                {/* Logo & Brand */}
                <div className="text-center mb-8 animate-fade-in">
                    <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-4"
                        style={{
                            background: "linear-gradient(135deg, var(--primary), var(--primary-light))",
                            boxShadow: "0 8px 32px rgba(66, 153, 225, 0.3)",
                        }}>
                        <Shield className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold" style={{ color: "var(--primary)" }}>Kamulog</h1>
                    <p className="text-xs mt-1.5 max-w-[240px] mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>
                        Kamu & Özel Sektör Çalışanlarının Güvenli Super App Platformu
                    </p>
                </div>

                {/* Card */}
                <div
                    className="rounded-3xl p-7 animate-slide-in"
                    style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
                    }}
                >
                    {stage === "phone" ? (
                        /* ========= PHONE STAGE ========= */
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Smartphone className="w-5 h-5" style={{ color: "var(--primary)" }} />
                                <h2 className="text-lg font-bold">Giriş Yap</h2>
                            </div>
                            <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
                                Telefon numaranızı girin, doğrulama kodu oluşturulacak.
                            </p>

                            {error && (
                                <div className="p-3 rounded-xl text-xs mb-4 animate-scale-in"
                                    style={{ background: "rgba(229, 62, 62, 0.08)", border: "1px solid rgba(229, 62, 62, 0.15)", color: "#E53E3E" }}>
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--text-secondary)" }}>
                                    Telefon Numarası
                                </label>
                                <div className="flex gap-2">
                                    {/* Country Code */}
                                    <div
                                        className="flex items-center gap-1.5 px-3 rounded-xl text-sm font-medium flex-shrink-0"
                                        style={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border)",
                                            color: "var(--text)",
                                            minHeight: "44px",
                                        }}
                                    >
                                        <span className="text-base">🇹🇷</span>
                                        <span>+90</span>
                                    </div>
                                    {/* Phone Input */}
                                    <div className="relative flex-1">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
                                        <input
                                            type="tel"
                                            value={formatPhone(phone)}
                                            onChange={handlePhoneChange}
                                            placeholder="(5XX) XXX XXXX"
                                            className="w-full !pl-9 text-sm"
                                            style={{ minHeight: "44px" }}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSendOtp}
                                disabled={loading || phone.length < 10}
                                className="w-full mt-6 py-3.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                                style={{
                                    background: "linear-gradient(135deg, var(--primary), var(--primary-light))",
                                    boxShadow: phone.length >= 10 ? "0 4px 14px rgba(66, 153, 225, 0.35)" : "none",
                                }}
                            >
                                {loading ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Gönderiliyor...</>
                                ) : (
                                    <>Doğrulama Kodu Gönder <ChevronRight className="w-4 h-4" /></>
                                )}
                            </button>

                            {/* Trust Badges */}
                            <div className="flex items-center justify-center gap-4 mt-6">
                                {[
                                    { icon: Lock, text: "Şifreli" },
                                    { icon: Fingerprint, text: "Güvenli" },
                                    { icon: Shield, text: "KVKK" },
                                ].map((badge) => {
                                    const Icon = badge.icon;
                                    return (
                                        <div key={badge.text} className="flex items-center gap-1">
                                            <Icon className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{badge.text}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* ========= OTP STAGE ========= */
                        <div>
                            <button
                                onClick={() => { setStage("phone"); setError(""); }}
                                className="flex items-center gap-1 text-xs mb-4 transition-colors"
                                style={{ color: "var(--text-muted)" }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Numarayı Değiştir
                            </button>

                            <div className="text-center mb-6">
                                <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3"
                                    style={{ background: "linear-gradient(135deg, #25D366, #128C7E)", boxShadow: "0 4px 14px rgba(37, 211, 102, 0.25)" }}>
                                    <Lock className="w-7 h-7 text-white" />
                                </div>
                                <h2 className="text-lg font-bold mb-1">Doğrulama Kodu</h2>
                                {otpCode && (
                                    <div className="my-3 px-4 py-3 rounded-xl" style={{ background: "rgba(37, 211, 102, 0.08)", border: "1px solid rgba(37, 211, 102, 0.2)" }}>
                                        <p className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>Doğrulama kodunuz:</p>
                                        <p className="text-2xl font-mono font-bold tracking-[.4em] text-center" style={{ color: "#25D366" }}>{otpCode}</p>
                                    </div>
                                )}
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                    Yukarıdaki 6 haneli kodu aşağıya girin.
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl text-xs mb-4 text-center animate-scale-in"
                                    style={{ background: "rgba(229, 62, 62, 0.08)", border: "1px solid rgba(229, 62, 62, 0.15)", color: "#E53E3E" }}>
                                    {error}
                                </div>
                            )}

                            {/* OTP Boxes */}
                            <div className="flex gap-2.5 justify-center mb-6" onPaste={handleOtpPaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => { otpRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(i, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                        className="w-12 h-14 text-center text-xl font-bold rounded-xl transition-all"
                                        style={{
                                            background: "var(--bg-input)",
                                            border: `2px solid ${digit ? "var(--primary)" : "var(--border)"}`,
                                            color: "var(--text)",
                                            boxShadow: digit ? "0 0 0 3px rgba(66, 153, 225, 0.1)" : "none",
                                            caretColor: "var(--primary)",
                                        }}
                                        autoFocus={i === 0}
                                    />
                                ))}
                            </div>

                            {/* Loading indicator */}
                            {loading && (
                                <div className="flex items-center justify-center gap-2 mb-4 animate-fade-in">
                                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--primary)" }} />
                                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Doğrulanıyor...</span>
                                </div>
                            )}

                            {/* Countdown & Resend */}
                            <div className="text-center">
                                {countdown > 0 ? (
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                        Kodu almadınız mı? <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>
                                            {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, "0")}
                                        </span> sonra tekrar gönderebilirsiniz.
                                    </p>
                                ) : (
                                    <button
                                        onClick={handleResend}
                                        className="text-xs font-semibold transition-colors"
                                        style={{ color: "var(--primary)" }}
                                    >
                                        Tekrar Kod Gönder
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-[10px] mt-6" style={{ color: "var(--text-muted)" }}>
                    © 2026 Kamulog — Kamu & Özel Sektör Super App
                </p>
            </div>
        </div>
    );
}

/* Background Decorations */
function BgDecoration() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full blur-[100px]"
                style={{ background: "rgba(66, 153, 225, 0.1)" }} />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-[100px]"
                style={{ background: "rgba(37, 211, 102, 0.07)" }} />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[120px]"
                style={{ background: "rgba(66, 153, 225, 0.05)" }} />
        </div>
    );
}
