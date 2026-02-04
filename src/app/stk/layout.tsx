"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Users,
    UserPlus,
    Building2,
    Wallet,
    CreditCard,
    Calculator,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Bell,
    User,
    FileText,
    UserMinus,
    MessageSquare,
    FolderOpen,
    Globe,
    Gavel,
} from 'lucide-react'

interface STKLayoutProps {
    children: React.ReactNode
}

const sidebarItems = [
    {
        title: 'Anasayfa',
        href: '/stk/anasayfa',
        icon: LayoutDashboard,
    },
    {
        title: 'Dernek Profili',
        href: '/stk/dernek-profili',
        icon: Building2,
    },
    {
        title: 'Yönetim Kurulu',
        href: '/stk/yonetim-kurulu',
        icon: Users,
    },
    {
        title: 'Kararlar',
        href: '/stk/kararlar',
        icon: FileText,
    },
    {
        title: 'Genel Kurul',
        href: '/stk/genel-kurul',
        icon: Gavel,
    },
    {
        title: 'Üyeler',
        href: '/stk/uyeler',
        icon: Users,
    },
    {
        title: 'İstifa Yönetimi',
        href: '/stk/istifa-yonetimi',
        icon: UserMinus,
    },
    {
        title: 'Başvurular',
        href: '/stk/basvurular',
        icon: UserPlus,
    },
    {
        title: 'Aidat Planları',
        href: '/stk/aidat-planlari',
        icon: Wallet,
    },
    {
        title: 'Ödemeler',
        href: '/stk/odemeler',
        icon: CreditCard,
    },
    {
        title: 'Muhasebe',
        href: '/stk/muhasebe',
        icon: Calculator,
    },
    {
        title: 'Mesajlar',
        href: '/stk/mesajlar',
        icon: MessageSquare,
    },
    {
        title: 'Dokümanlar',
        href: '/stk/dokumanlar',
        icon: FolderOpen,
    },
    {
        title: 'Domain Talebi',
        href: '/stk/domain-talebi',
        icon: Globe,
    },
    {
        title: 'Ayarlar',
        href: '/stk/ayarlar',
        icon: Settings,
    },
]

export default function STKLayout({ children }: STKLayoutProps) {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = React.useState(false)

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed left-0 top-0 z-40 h-screen bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-lg transition-all duration-300 flex flex-col",
                    collapsed ? "w-20" : "w-72"
                )}
            >
                {/* Logo */}
                <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    {!collapsed && (
                        <Link href="/stk/anasayfa" className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                    KamulogSTK
                                </span>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">STK Panel</p>
                            </div>
                        </Link>
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        {collapsed ? (
                            <ChevronRight className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        ) : (
                            <ChevronLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        )}
                    </button>
                </div>

                {/* Navigation - Scrollable */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                    isActive
                                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30"
                                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "w-5 h-5 transition-transform group-hover:scale-110",
                                        isActive ? "text-white" : "text-slate-600 dark:text-slate-300"
                                    )}
                                />
                                {!collapsed && (
                                    <span className="font-medium">{item.title}</span>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Logout - Fixed at bottom */}
                <div className="flex-shrink-0 p-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                        className={cn(
                            "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors",
                            collapsed && "justify-center"
                        )}
                        onClick={() => {
                            window.location.href = '/api/auth/logout'
                        }}
                    >
                        <LogOut className="w-5 h-5" />
                        {!collapsed && <span className="font-medium">Çıkış Yap</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main
                className={cn(
                    "transition-all duration-300",
                    collapsed ? "ml-20" : "ml-72"
                )}
            >
                {/* Header */}
                <header className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between h-full px-6">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Türkiye Eğitim Vakfı</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Vakıf</p>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Notifications */}
                            <button className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                                    2
                                </span>
                            </button>

                            {/* User */}
                            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
                                <div className="w-9 h-9 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                <div className="hidden md:block">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">Ahmet Yılmaz</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">STK Yöneticisi</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    )
}
