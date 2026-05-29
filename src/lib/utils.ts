import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Format currency for Turkish Lira
export function formatCurrency(amount: number | string, currency = 'TRY'): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(numAmount)
}

// Format date for Turkish locale
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...options,
    }).format(dateObj)
}

// Format datetime for Turkish locale
export function formatDateTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(dateObj)
}

// Format relative time (e.g., "2 saat önce")
export function formatRelativeTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Az önce'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} gün önce`
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} ay önce`
    return `${Math.floor(diffInSeconds / 31536000)} yıl önce`
}

// Format phone number
export function formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`
    }
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
        return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`
    }
    return phone
}

// Validate TC Kimlik number
export function validateTCKimlik(tcKimlik: string): boolean {
    if (!/^[1-9]\d{10}$/.test(tcKimlik)) return false

    const digits = tcKimlik.split('').map(Number)

    // Algorithm check
    const sumOdd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8]
    const sumEven = digits[1] + digits[3] + digits[5] + digits[7]

    const check10 = (sumOdd * 7 - sumEven) % 10
    if (check10 !== digits[9]) return false

    const sumFirst10 = digits.slice(0, 10).reduce((a, b) => a + b, 0)
    const check11 = sumFirst10 % 10
    if (check11 !== digits[10]) return false

    return true
}

// Validate email
export function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Validate IBAN (Turkish)
export function validateIBAN(iban: string): boolean {
    const cleaned = iban.replace(/\s/g, '').toUpperCase()
    if (!/^TR\d{24}$/.test(cleaned)) return false

    // Move first 4 chars to end
    const rearranged = cleaned.slice(4) + cleaned.slice(0, 4)

    // Replace letters with numbers (A=10, B=11, etc.)
    const numericString = rearranged.replace(/[A-Z]/g, (char) =>
        (char.charCodeAt(0) - 55).toString()
    )

    // Mod 97 check
    let remainder = 0
    for (let i = 0; i < numericString.length; i += 7) {
        const segment = remainder.toString() + numericString.slice(i, i + 7)
        remainder = parseInt(segment, 10) % 97
    }

    return remainder === 1
}

// Format IBAN
export function formatIBAN(iban: string): string {
    const cleaned = iban.replace(/\s/g, '').toUpperCase()
    return cleaned.replace(/(.{4})/g, '$1 ').trim()
}

// Truncate text
export function truncate(text: string, length: number): string {
    if (text.length <= length) return text
    return text.slice(0, length) + '...'
}

// Generate random string
export function generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

// Generate unique member number
export function generateMemberNumber(prefix: string = 'UYE'): string {
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = generateRandomString(4).toUpperCase()
    return `${prefix}-${timestamp}-${random}`
}

// Slugify text (Turkish-friendly)
export function slugify(text: string): string {
    const turkishMap: Record<string, string> = {
        'ç': 'c', 'Ç': 'C',
        'ğ': 'g', 'Ğ': 'G',
        'ı': 'i', 'I': 'I',
        'İ': 'I', 'i': 'i',
        'ö': 'o', 'Ö': 'O',
        'ş': 's', 'Ş': 'S',
        'ü': 'u', 'Ü': 'U',
    }

    let result = text.toLowerCase()

    for (const [turkish, latin] of Object.entries(turkishMap)) {
        result = result.replace(new RegExp(turkish, 'g'), latin.toLowerCase())
    }

    return result
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

// Debounce function
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null

    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => func(...args), wait)
    }
}

// Sleep function
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}
