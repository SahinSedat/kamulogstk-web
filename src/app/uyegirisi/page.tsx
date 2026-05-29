'use client'

import React from 'react'
import { Smartphone, Download, ArrowRight, Building2, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

import Navbar from '@/components/landing/Navbar'

export default function CitizenLandingPage() {
    return (
        <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white selection:bg-emerald-500/30 flex flex-col">
            {/* Navbar */}
            <Navbar showAuthButtons={true} />

            <main className="relative flex-grow flex items-center justify-center overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-emerald-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[80px] -z-10 pointer-events-none" />

                <div className="w-full max-w-7xl mx-auto px-6 h-full flex flex-col justify-center">
                    <div className="grid lg:grid-cols-2 gap-8 items-center h-full">
                        {/* Text Content */}
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col justify-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium w-fit">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Mobil Uygulama Yayında
                            </div>

                            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight leading-tight">
                                STK Dünyası <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                                    Cebinizde
                                </span>
                            </h1>

                            <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                                KamulogSTK mobil uygulaması ile üyesi olduğunuz dernek, vakıf ve sivil toplum kuruluşlarını tek yerden yönetin.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <button className="bg-white text-slate-900 rounded-xl px-5 py-2.5 flex items-center gap-3 hover:bg-slate-100 transition-colors shadow-xl group">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/3/31/Apple_logo_white.svg" alt="Apple" className="w-5 h-5 invert group-hover:scale-110 transition-transform" />
                                    <div className="text-left">
                                        <div className="text-[9px] font-medium opacity-60 uppercase tracking-wider">Download on the</div>
                                        <div className="text-xs font-bold leading-none">App Store</div>
                                    </div>
                                </button>
                                <button className="bg-transparent border border-white/20 text-white rounded-xl px-5 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors group">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg" alt="Android" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <div className="text-left">
                                        <div className="text-[9px] font-medium opacity-60 uppercase tracking-wider">Get it on</div>
                                        <div className="text-xs font-bold leading-none">Google Play</div>
                                    </div>
                                </button>
                            </div>

                            <div className="pt-6 flex items-center gap-6 text-slate-400">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                        <Shield className="w-4 h-4" />
                                    </div>
                                    <div className="text-xs">
                                        <div className="font-bold text-white">Güvenli</div>
                                        <div>KVKK Uyumlu</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div className="text-xs">
                                        <div className="font-bold text-white">Kolay</div>
                                        <div>Hızlı Üyelik</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Phone Mockup & QR */}
                        <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-200 h-full flex items-center justify-center">
                            {/* Glow behind phone */}
                            <div className="absolute w-[400px] h-[400px] bg-gradient-to-tr from-emerald-500/20 to-blue-500/20 rounded-full blur-[60px]" />

                            <div className="relative z-10 flex flex-col items-center scale-90 lg:scale-100">
                                {/* Mockup Frame */}
                                <div className="relative w-[280px] h-[560px] bg-slate-950 rounded-[2.5rem] border-8 border-slate-900 shadow-2xl overflow-hidden ring-1 ring-white/10">
                                    <div className="absolute top-0 w-full h-full bg-slate-900 flex flex-col items-center justify-center p-6 text-center space-y-6">
                                        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-2 animate-pulse">
                                            <Building2 className="w-8 h-8 text-emerald-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">KamulogSTK</h3>
                                        <p className="text-xs text-slate-400">Sivil Toplum Kuruluşları için dijital dönüşüm platformu.</p>

                                        <div className="mt-4 p-3 bg-white rounded-xl">
                                            <img
                                                src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://kamulog.com/app"
                                                alt="Download QR"
                                                className="w-28 h-28"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-500">İndirmek için tarayın</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
