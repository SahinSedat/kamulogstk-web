'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Building2, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

interface NavbarProps {
    showAuthButtons?: boolean
}

export default function Navbar({ showAuthButtons = true }: NavbarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [user, setUser] = React.useState<{ role: string } | null>(null)
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/auth/me')
                const data = await res.json()
                if (data.success) {
                    setUser(data.user)
                }
            } catch (error) {
                console.error('Auth check failed', error)
            } finally {
                setLoading(false)
            }
        }
        checkAuth()
    }, [])

    const scrollToSection = (sectionId: string) => {
        // Eğer ana sayfada değilsek, önce ana sayfaya git
        if (pathname !== '/') {
            router.push('/')
            // Ana sayfa yüklendikten sonra scroll yap
            setTimeout(() => {
                const element = document.getElementById(sectionId)
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            }, 100)
        } else {
            // Zaten ana sayfadaysak direkt scroll yap
            const element = document.getElementById(sectionId)
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
        }
    }

    const getDashboardLink = () => {
        if (!user) return '/giris'
        if (user.role === 'ADMIN') return '/sistemyoneticisi'
        if (user.role === 'CITIZEN') return '/uyegirisi' // Updated to landing page
        return '/stkuyesi'
    }

    const handleLogout = async () => {
        try {
            const res = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            if (res.ok) {
                // Clear state and redirect
                setUser(null)
                router.push('/')
                router.refresh()
            }
        } catch (error) {
            console.error('Logout failed', error)
        }
    }

    const NavItems = ({ mobile = false }: { mobile?: boolean }) => (
        <>
            <button
                onClick={() => scrollToSection('stats')}
                className={`text-slate-300 hover:text-white transition-colors ${mobile ? 'text-left text-lg py-2' : ''}`}
            >
                İstatistikler
            </button>
            <button
                onClick={() => scrollToSection('features')}
                className={`text-slate-300 hover:text-white transition-colors ${mobile ? 'text-left text-lg py-2' : ''}`}
            >
                Özellikler
            </button>
            <button
                onClick={() => scrollToSection('ai')}
                className={`text-slate-300 hover:text-white transition-colors ${mobile ? 'text-left text-lg py-2' : ''}`}
            >
                AI Teknolojisi
            </button>
            <Link
                href="/fiyatlandirma"
                className={`text-slate-300 hover:text-white transition-colors ${mobile ? 'text-left text-lg py-2' : ''}`}
            >
                Fiyatlandırma
            </Link>
        </>
    )

    const AuthButtons = ({ mobile = false }: { mobile?: boolean }) => {
        if (loading) return null

        if (user) {
            // Citizen users see "Çıkış Yap" only on the landing page (/uyegirisi)
            if (user.role === 'CITIZEN' && pathname === '/uyegirisi') {
                return (
                    <Button
                        onClick={handleLogout}
                        className={`bg-red-600 hover:bg-red-700 text-white ${mobile ? 'w-full' : ''}`}
                    >
                        Çıkış Yap
                    </Button>
                )
            }

            return (
                <Link href={getDashboardLink()} className={mobile ? 'w-full' : ''}>
                    <Button className={`bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 ${mobile ? 'w-full' : ''}`}>
                        Panele Git
                    </Button>
                </Link>
            )
        }

        return (
            <div className={`flex ${mobile ? 'flex-col gap-4 w-full' : 'items-center gap-3'}`}>
                <Link href="/giris" className={mobile ? 'w-full' : ''}>
                    <Button
                        variant="ghost"
                        className={`text-slate-300 hover:text-white hover:bg-transparent transition-colors ${mobile ? 'w-full justify-start' : ''}`}
                    >
                        Giriş Yap
                    </Button>
                </Link>
                <Link href="/kayit" className={mobile ? 'w-full' : ''}>
                    <Button className={`bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 ${mobile ? 'w-full' : ''}`}>
                        Başvuru Yap
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/20 backdrop-blur-xl border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">KamulogSTK</span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <NavItems />
                    </div>

                    {showAuthButtons && (
                        <div className="hidden md:flex items-center gap-3">
                            <AuthButtons />
                        </div>
                    )}

                    {/* Mobile Menu */}
                    <div className="md:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white">
                                    <Menu className="w-6 h-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="bg-slate-950 border-white/10 text-white w-[300px]">
                                <SheetHeader>
                                    <SheetTitle className="text-white text-left flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                                            <Building2 className="w-4 h-4 text-white" />
                                        </div>
                                        KamulogSTK
                                    </SheetTitle>
                                </SheetHeader>
                                <div className="flex flex-col gap-6 mt-8">
                                    <div className="flex flex-col gap-4">
                                        <NavItems mobile />
                                    </div>

                                    {showAuthButtons && (
                                        <>
                                            <div className="h-px bg-white/10" />
                                            <div className="flex flex-col gap-4">
                                                <AuthButtons mobile />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </nav>
    )
}
