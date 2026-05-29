'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, X, Trash2, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Notification {
    id: string
    title: string
    message: string
    type: string
    isRead: boolean
    createdAt: string
    link?: string
    icon?: string
}

export function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Bildirimleri yükle
    useEffect(() => {
        fetchNotifications()
        
        // Her 30 saniyede bildirimleri yenile
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [])

    // Dropdown dışında tıklanınca kapat
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/stk/notifications')
            const data = await res.json()

            if (data.success) {
                setNotifications(data.notifications || [])
                setUnreadCount(data.unreadCount || 0)
            }
        } catch (error) {
            console.error('Error fetching notifications:', error)
        }
    }

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await fetch('/api/stk/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId })
            })
            fetchNotifications()
        } catch (error) {
            console.error('Error marking notification as read:', error)
        }
    }

    const handleMarkAllAsRead = async () => {
        try {
            await fetch('/api/stk/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAllAsRead: true })
            })
            fetchNotifications()
        } catch (error) {
            console.error('Error marking all as read:', error)
        }
    }

    const handleDeleteNotification = async (notificationId: string) => {
        try {
            await fetch('/api/stk/notifications', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId })
            })
            fetchNotifications()
        } catch (error) {
            console.error('Error deleting notification:', error)
        }
    }

    const handleDeleteAll = async () => {
        if (confirm('Tüm bildirimleri silmek istediğinizden emin misiniz?')) {
            try {
                await fetch('/api/stk/notifications', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deleteAll: true })
                })
                fetchNotifications()
                setIsOpen(false)
            } catch (error) {
                console.error('Error deleting all notifications:', error)
            }
        }
    }

    const getNotificationIcon = (type: string) => {
        const icons: Record<string, string> = {
            'member_request': '👤',
            'membership_application': '📝',
            'resignation': '📤',
            'payment': '💰',
            'system': '⚙️',
            'decision': '📋',
            'assembly_attendance': '📅',
            'assembly_attendance_response': '✅',
            default: '🔔'
        }
        return icons[type] || icons.default
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

        if (diff < 60) return 'az önce'
        if (diff < 3600) return `${Math.floor(diff / 60)} dakika önce`
        if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`
        return `${Math.floor(diff / 86400)} gün önce`
    }

    return (
        <div ref={dropdownRef} className="relative">
            {/* Notification Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-medium">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl z-50 border border-slate-200 dark:border-slate-700 max-h-[600px] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                        <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">Bildirimler</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {unreadCount} okunmamış
                            </p>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                        >
                            <X className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        </button>
                    </div>

                    {/* Notifications List */}
                    {notifications.length === 0 ? (
                        <div className="flex items-center justify-center p-8 text-slate-500 dark:text-slate-400">
                            <p>Bildirim yok</p>
                        </div>
                    ) : (
                        <div className="overflow-y-auto flex-1">
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                                        !notif.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                    }`}
                                >
                                    <div className="flex gap-3">
                                        <div className="text-xl flex-shrink-0">
                                            {getNotificationIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white text-sm">
                                                        {notif.title}
                                                    </p>
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                                                        {notif.message}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                                        {formatTime(notif.createdAt)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    {!notif.isRead && (
                                                        <button
                                                            onClick={() => handleMarkAsRead(notif.id)}
                                                            title="Okundu işaretle"
                                                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                                                        >
                                                            <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteNotification(notif.id)}
                                                        title="Sil"
                                                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer - Actions */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                            <Button
                                onClick={handleMarkAllAsRead}
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs dark:border-slate-600 dark:text-slate-300"
                            >
                                <CheckCheck className="w-3 h-3 mr-1" />
                                Tümünü Oku
                            </Button>
                            <Button
                                onClick={handleDeleteAll}
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs dark:border-slate-600 dark:text-slate-300 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Tümünü Sil
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
