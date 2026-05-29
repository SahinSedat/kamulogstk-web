"use client"

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CitizenNavbar() {
    const router = useRouter()

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
            router.push('/giris')
        } catch (error) {
            console.error('Logout failed', error)
        }
    }

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link href="/uyegirisi" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">KamulogSTK</span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link href="/uyegirisi/profil">
                            <Button
                                variant="ghost"
                                className="text-slate-300 hover:text-white hover:bg-white/5 gap-2"
                            >
                                <User className="w-4 h-4" />
                                <span className="hidden sm:inline">Profilim</span>
                            </Button>
                        </Link>
                        <Button
                            variant="ghost"
                            onClick={handleLogout}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Çıkış Yap</span>
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    )
}
