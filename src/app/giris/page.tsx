"use client"

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'method' | 'input' | 'otp'
type Method = 'whatsapp' | 'email'

export default function LoginPage() {
    const router = useRouter()
    const [step, setStep] = useState<Step>('method')
    const [method, setMethod] = useState<Method>('whatsapp')
    const [identifier, setIdentifier] = useState('')
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [userId, setUserId] = useState('')
    const [maskedContact, setMaskedContact] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [countdown, setCountdown] = useState(0)
    const otpRefs = useRef<(HTMLInputElement | null)[]>([])

    // Countdown timer
    useEffect(() => {
        if (countdown <= 0) return
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
        return () => clearTimeout(timer)
    }, [countdown])

    // OTP input handler
    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1)
        if (!/^\d*$/.test(value)) return

        const newOtp = [...otp]
        newOtp[index] = value
        setOtp(newOtp)

        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus()
        }
    }

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus()
        }
    }

    // Paste handler for OTP
    const handleOtpPaste = (e: React.ClipboardEvent) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
        if (pasted.length === 6) {
            setOtp(pasted.split(''))
            otpRefs.current[5]?.focus()
        }
    }

    // Step 1: Select method
    const selectMethod = (m: Method) => {
        setMethod(m)
        setStep('input')
        setError('')
    }

    // Step 2: Send OTP
    const sendOTP = async () => {
        if (!identifier.trim()) {
            setError(method === 'whatsapp' ? 'Telefon numarası gerekli' : 'E-posta adresi gerekli')
            return
        }
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: identifier.trim(), method }),
            })
            const data = await res.json()

            if (data.success) {
                setUserId(data.userId)
                setMaskedContact(data.maskedContact)
                setStep('otp')
                setCountdown(60)
                setOtp(['', '', '', '', '', ''])
                setTimeout(() => otpRefs.current[0]?.focus(), 100)
            } else {
                setError(data.error || 'Kod gönderilemedi')
            }
        } catch {
            setError('Bağlantı hatası. Lütfen tekrar deneyin.')
        } finally {
            setLoading(false)
        }
    }

    // Step 3: Verify OTP
    const verifyOTP = async () => {
        const code = otp.join('')
        if (code.length !== 6) {
            setError('6 haneli doğrulama kodunu girin')
            return
        }
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, code }),
            })
            const data = await res.json()

            if (data.success) {
                if (data.user.role === 'ADMIN') {
                    router.push('/admin/dashboard')
                } else {
                    router.push('/stk/uyeler')
                }
            } else {
                setError(data.error || 'Doğrulama başarısız')
                setOtp(['', '', '', '', '', ''])
                otpRefs.current[0]?.focus()
            }
        } catch {
            setError('Bağlantı hatası. Lütfen tekrar deneyin.')
        } finally {
            setLoading(false)
        }
    }

    // Auto-verify when all 6 digits are entered
    useEffect(() => {
        if (step === 'otp' && otp.every(d => d !== '') && !loading) {
            verifyOTP()
        }
    }, [otp, step])

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0a0e1a 100%)' }}>

            {/* Header */}
            <header className="border-b border-white/5 backdrop-blur-2xl" style={{ background: 'rgba(10,14,26,0.85)' }}>
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            <span className="text-white text-lg font-bold">K</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white leading-none">KamulogSTK</h1>
                            <p className="text-[10px] text-slate-500 leading-none mt-0.5">STK Yönetim Platformu</p>
                        </div>
                    </a>
                </div>
            </header>

            {/* Main */}
            <main className="flex-grow flex items-center justify-center px-4 py-20">
                <div className="w-full max-w-md">
                    {/* Logo Badge */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-6"
                            style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            🛡️ Güvenli Giriş
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">STK Paneline Giriş</h1>
                        <p className="text-slate-400">
                            {step === 'method' && 'Doğrulama yönteminizi seçin'}
                            {step === 'input' && (method === 'whatsapp' ? 'Kayıtlı telefon numaranızı girin' : 'Kayıtlı e-posta adresinizi girin')}
                            {step === 'otp' && 'Doğrulama kodunuzu girin'}
                        </p>
                    </div>

                    {/* Card */}
                    <div className="rounded-2xl p-8 border border-white/10 backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.05)' }}>

                        {error && (
                            <div className="mb-6 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                                ⚠️ {error}
                            </div>
                        )}

                        {/* Step 1: Method Selection */}
                        {step === 'method' && (
                            <div className="space-y-4">
                                <button onClick={() => selectMethod('whatsapp')}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'rgba(37, 211, 102, 0.15)' }}>
                                        💬
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white font-medium group-hover:text-emerald-400 transition-colors">WhatsApp ile Giriş</p>
                                        <p className="text-slate-500 text-sm">Kayıtlı numaranıza kod gönderilecek</p>
                                    </div>
                                    <span className="ml-auto text-slate-600 group-hover:text-emerald-400 transition-colors">→</span>
                                </button>

                                <button onClick={() => selectMethod('email')}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                                        📧
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white font-medium group-hover:text-blue-400 transition-colors">E-posta ile Giriş</p>
                                        <p className="text-slate-500 text-sm">Kayıtlı adresinize kod gönderilecek</p>
                                    </div>
                                    <span className="ml-auto text-slate-600 group-hover:text-blue-400 transition-colors">→</span>
                                </button>

                                <div className="mt-6 p-3 rounded-lg text-xs text-center" style={{ background: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8' }}>
                                    🔒 Sadece admin tarafından yetkilendirilmiş STK yöneticileri giriş yapabilir.
                                </div>
                            </div>
                        )}

                        {/* Step 2: Input */}
                        {step === 'input' && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-300">
                                        {method === 'whatsapp' ? '📱 Telefon Numarası' : '📧 E-posta Adresi'}
                                    </label>
                                    <input
                                        type={method === 'whatsapp' ? 'tel' : 'email'}
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        placeholder={method === 'whatsapp' ? '05XX XXX XX XX' : 'ornek@email.com'}
                                        className="w-full h-12 px-4 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                        onKeyDown={(e) => e.key === 'Enter' && sendOTP()}
                                        autoFocus
                                    />
                                </div>

                                <button onClick={sendOTP} disabled={loading}
                                    className="w-full h-12 rounded-xl text-white font-medium transition-all disabled:opacity-50"
                                    style={{ background: method === 'whatsapp' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                                    {loading ? '⏳ Gönderiliyor...' : `${method === 'whatsapp' ? '💬' : '📧'} Doğrulama Kodu Gönder`}
                                </button>

                                <button onClick={() => { setStep('method'); setError(''); setIdentifier('') }}
                                    className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors">
                                    ← Farklı yöntem seç
                                </button>
                            </div>
                        )}

                        {/* Step 3: OTP */}
                        {step === 'otp' && (
                            <div className="space-y-6">
                                <div className="text-center">
                                    <p className="text-slate-400 text-sm">
                                        {method === 'whatsapp' ? '💬 WhatsApp' : '📧 E-posta'} ile gönderildi
                                    </p>
                                    <p className="text-emerald-400 font-medium mt-1">{maskedContact}</p>
                                </div>

                                {/* OTP Input */}
                                <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={(el) => { otpRefs.current[i] = el }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            className="w-12 h-14 text-center text-xl font-bold text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                                            style={{
                                                background: digit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                                                border: digit ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                                            }}
                                        />
                                    ))}
                                </div>

                                <button onClick={verifyOTP} disabled={loading || otp.some(d => !d)}
                                    className="w-full h-12 rounded-xl text-white font-medium transition-all disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                    {loading ? '⏳ Doğrulanıyor...' : '✅ Giriş Yap'}
                                </button>

                                {/* Resend */}
                                <div className="text-center">
                                    {countdown > 0 ? (
                                        <p className="text-slate-500 text-sm">Yeni kod gönderebilmek için {countdown}s bekleyin</p>
                                    ) : (
                                        <button onClick={() => { setOtp(['', '', '', '', '', '']); sendOTP() }}
                                            className="text-emerald-400 text-sm hover:text-emerald-300 transition-colors">
                                            🔄 Yeni kod gönder
                                        </button>
                                    )}
                                </div>

                                <button onClick={() => { setStep('input'); setError(''); setOtp(['', '', '', '', '', '']) }}
                                    className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors">
                                    ← Geri
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Footer info */}
                    <p className="text-center text-slate-600 text-xs mt-6">
                        © 2026 KamulogSTK — Tüm hakları saklıdır.
                    </p>
                </div>
            </main>
        </div>
    )
}
