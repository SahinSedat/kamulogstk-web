"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Building2,
    FileCheck,
    Package,
    ScrollText,
    Shield,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Bell,
    Search,
    User,
} from 'lucide-react'

interface AdminLayoutProps {
    children: React.ReactNode
}

const sidebarItems = [
    {
        title: 'Dashboard',
        href: '/admin/anasayfa',
        icon: LayoutDashboard,
    },
    {
        title: 'STK Başvuruları',
        href: '/admin/stk-applications',
        icon: FileCheck,
    },
    {
        title: 'STK Yönetimi',
        href: '/admin/stk-management',
        icon: Building2,
    },
    {
        title: 'Paket Planları',
        href: '/admin/packages',
        icon: Package,
    },
    {
        title: 'Sistem Logları',
        href: '/admin/logs',
        icon: ScrollText,
    },
    {
        title: 'Roller & Yetkiler',
        href: '/admin/roles',
        icon: Shield,
    },
    {
        title: 'Ayarlar',
        href: '/admin/settings',
        icon: Settings,
    },
]

export default function AdminLayout({ children }: AdminLayoutProps) {
    const pathname = usePathname()
    const [collapsed, setCollapsed] = React.useState(false)

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed left-0 top-0 z-40 h-screen bg-white/80 backdrop-blur-xl border-r border-slate-200/50 shadow-xl transition-all duration-300 dark:bg-slate-900/80 dark:border-slate-800/50",
                    collapsed ? "w-20" : "w-72"
                )}
            >
                {/* Logo */}
                <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200/50 dark:border-slate-800/50">
                    {!collapsed && (
                        <Link href="/admin/anasayfa" className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    KamulogSTK
                                </span>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">Admin Panel</p>
                            </div>
                        </Link>
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        {collapsed ? (
                            <ChevronRight className="w-5 h-5 text-slate-500" />
                        ) : (
                            <ChevronLeft className="w-5 h-5 text-slate-500" />
                        )}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2">
                    {sidebarItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                    isActive
                                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30"
                                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "w-5 h-5 transition-transform group-hover:scale-110",
                                        isActive ? "text-white" : "text-slate-500 dark:text-slate-400"
                                    )}
                                />
                                {!collapsed && (
                                    <span className="font-medium">{item.title}</span>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Logout */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200/50 dark:border-slate-800/50">
                    <button
                        className={cn(
                            "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors",
                            collapsed && "justify-center"
                        )}
                        onClick={() => {
                            // Handle logout
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
                <header className="sticky top-0 z-30 h-16 bg-white/60 backdrop-blur-xl border-b border-slate-200/50 dark:bg-slate-900/60 dark:border-slate-800/50">
                    <div className="flex items-center justify-between h-full px-6">
                        {/* Search */}
                        <div className="relative w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="STK, üye veya işlem ara..."
                                className="w-full h-10 pl-10 pr-4 bg-slate-100 rounded-xl border-0 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:bg-slate-800 dark:text-white"
                            />
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-4">
                            {/* Notifications */}
                            <button className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                                    3
                                </span>
                            </button>

                            {/* User */}
                            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
                                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                <div className="hidden md:block">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">Admin</p>
                                    <p className="text-xs text-slate-500">Sistem Yöneticisi</p>
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
