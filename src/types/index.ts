import { UserRole, UserStatus, STKType, STKStatus, MemberStatus, PaymentStatus, PaymentType, DuesPeriod, BoardPosition, AuditAction } from '@prisma/client'

// Re-export Prisma enums for client-side usage
export { UserRole, UserStatus, STKType, STKStatus, MemberStatus, PaymentStatus, PaymentType, DuesPeriod, BoardPosition, AuditAction }

// API Response Types
export interface ApiResponse<T = unknown> {
    success: boolean
    data?: T
    error?: string
    code?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
    }
}

// Auth Types
export interface LoginRequest {
    email: string
    password: string
}

export interface RegisterRequest {
    email: string
    password: string
    name: string
    phone?: string
}

export interface AuthUser {
    id: string
    email: string
    name: string
    role: UserRole
    status: UserStatus
    stkId?: string
    avatar?: string
}

// STK Types
export interface STKFormData {
    name: string
    type: STKType
    registrationNumber?: string
    taxNumber?: string
    email: string
    phone: string
    website?: string
    address: string
    city: string
    district?: string
    postalCode?: string
    foundedAt?: Date
    description?: string
}

export interface STKSummary {
    id: string
    name: string
    type: STKType
    status: STKStatus
    city: string
    memberCount: number
    createdAt: Date
}

// Member Types
export interface MemberFormData {
    name: string
    surname: string
    tcKimlik?: string
    email: string
    phone: string
    birthDate?: Date
    gender?: string
    address?: string
    city?: string
    district?: string
    postalCode?: string
    occupation?: string
    workplace?: string
    education?: string
    membershipType?: string
    kvkkConsent: boolean
    marketingConsent?: boolean
}

export interface MemberSummary {
    id: string
    memberNumber?: string
    name: string
    surname: string
    email: string
    phone: string
    status: MemberStatus
    joinDate?: Date
    createdAt: Date
}

// Board Member Types
export interface BoardMemberFormData {
    name: string
    tcKimlik?: string
    email?: string
    phone?: string
    position: BoardPosition
    startDate: Date
    endDate?: Date
    hasSignature: boolean
}

// Payment Types
export interface PaymentFormData {
    memberId?: string
    type: PaymentType
    amount: number
    currency?: string
    periodStart?: Date
    periodEnd?: Date
    dueDate?: Date
    description?: string
}

export interface PaymentSummary {
    id: string
    memberName?: string
    type: PaymentType
    amount: number
    currency: string
    status: PaymentStatus
    dueDate?: Date
    paymentDate?: Date
    createdAt: Date
}

// Dues Plan Types
export interface DuesPlanFormData {
    name: string
    description?: string
    amount: number
    currency?: string
    period: DuesPeriod
    customPeriodDays?: number
    isDefault?: boolean
    validFrom?: Date
    validUntil?: Date
}

// Package Types
export interface PackageFormData {
    name: string
    description?: string
    monthlyPrice: number
    yearlyPrice: number
    currency?: string
    maxMembers?: number
    maxBoardMembers?: number
    features?: string[]
}

// Dashboard Stats Types
export interface AdminDashboardStats {
    totalSTKs: number
    activeSTKs: number
    pendingApplications: number
    totalPackages: number
    monthlyRevenue: number
    recentApplications: STKSummary[]
    stkByType: { type: STKType; count: number }[]
    stkByStatus: { status: STKStatus; count: number }[]
}

export interface STKDashboardStats {
    totalMembers: number
    activeMembers: number
    pendingApplications: number
    monthlyDues: number
    collectedDues: number
    pendingDues: number
    recentMembers: MemberSummary[]
    membersByStatus: { status: MemberStatus; count: number }[]
    monthlyCollection: { month: string; amount: number }[]
}

// Audit Log Types
export interface AuditLogEntry {
    id: string
    action: AuditAction
    entityType: string
    entityId?: string
    userName?: string
    userEmail?: string
    description?: string
    ipAddress?: string
    createdAt: Date
    metadata?: Record<string, unknown>
}

// Notification Types
export interface NotificationData {
    id: string
    title: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    isRead: boolean
    link?: string
    createdAt: Date
}

// Filter and Sort Types
export interface FilterOptions {
    search?: string
    status?: string
    type?: string
    startDate?: Date
    endDate?: Date
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

// Status Display Mappings (Turkish)
export const STKStatusDisplay: Record<STKStatus, string> = {
    PENDING: 'Beklemede',
    APPROVED: 'Onaylandı',
    REJECTED: 'Reddedildi',
    ACTIVE: 'Aktif',
    SUSPENDED: 'Askıda',
    INACTIVE: 'Pasif',
}

export const STKTypeDisplay: Record<STKType, string> = {
    DERNEK: 'Dernek',
    VAKIF: 'Vakıf',
    SENDIKA: 'Sendika',
    MESLEK_ODA: 'Meslek Odası',
    KOOPERATIF: 'Kooperatif',
    DIGER: 'Diğer',
}

export const MemberStatusDisplay: Record<MemberStatus, string> = {
    APPLIED: 'Başvurdu',
    PENDING: 'Beklemede',
    ACTIVE: 'Aktif',
    RESIGNATION_REQ: 'İstifa Talebi',
    RESIGNED: 'İstifa Etti',
    EXPELLED: 'İhraç Edildi',
    INACTIVE: 'Pasif',
    DECEASED: 'Vefat',
}

export const PaymentStatusDisplay: Record<PaymentStatus, string> = {
    PENDING: 'Bekleniyor',
    CONFIRMED: 'Onaylandı',
    REJECTED: 'Reddedildi',
    CANCELLED: 'İptal Edildi',
    REFUNDED: 'İade Edildi',
}

export const PaymentTypeDisplay: Record<PaymentType, string> = {
    DUES: 'Aidat',
    DONATION: 'Bağış',
    REGISTRATION: 'Kayıt Ücreti',
    OTHER: 'Diğer',
}

export const DuesPeriodDisplay: Record<DuesPeriod, string> = {
    MONTHLY: 'Aylık',
    QUARTERLY: '3 Aylık',
    BIANNUAL: '6 Aylık',
    YEARLY: 'Yıllık',
    CUSTOM: 'Özel',
}

export const BoardPositionDisplay: Record<BoardPosition, string> = {
    PRESIDENT: 'Başkan',
    VICE_PRESIDENT: 'Başkan Yardımcısı',
    SECRETARY: 'Sekreter',
    TREASURER: 'Sayman',
    MEMBER: 'Üye',
    AUDITOR: 'Denetçi',
}

export const UserRoleDisplay: Record<UserRole, string> = {
    ADMIN: 'Sistem Yöneticisi',
    STK_MANAGER: 'STK Yöneticisi',
}

export const UserStatusDisplay: Record<UserStatus, string> = {
    ACTIVE: 'Aktif',
    INACTIVE: 'Pasif',
    PENDING: 'Beklemede',
    SUSPENDED: 'Askıda',
}
