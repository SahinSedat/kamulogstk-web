import { UserRole } from '@prisma/client'

// Permission definitions
export type Permission =
    // Admin permissions
    | 'admin:dashboard'
    | 'admin:stk:view'
    | 'admin:stk:manage'
    | 'admin:stk:approve'
    | 'admin:packages:view'
    | 'admin:packages:manage'
    | 'admin:logs:view'
    | 'admin:roles:view'
    | 'admin:roles:manage'
    | 'admin:stats:view'
    // STK permissions
    | 'stk:dashboard'
    | 'stk:profile:view'
    | 'stk:profile:edit'
    | 'stk:board:view'
    | 'stk:board:manage'
    | 'stk:members:view'
    | 'stk:members:manage'
    | 'stk:applications:view'
    | 'stk:applications:manage'
    | 'stk:dues:view'
    | 'stk:dues:manage'
    | 'stk:payments:view'
    | 'stk:payments:manage'
    | 'stk:accounting:view'

// Role-Permission mapping
const rolePermissions: Record<UserRole, Permission[]> = {
    ADMIN: [
        'admin:dashboard',
        'admin:stk:view',
        'admin:stk:manage',
        'admin:stk:approve',
        'admin:packages:view',
        'admin:packages:manage',
        'admin:logs:view',
        'admin:roles:view',
        'admin:roles:manage',
        'admin:stats:view',
    ],
    STK_MANAGER: [
        'stk:dashboard',
        'stk:profile:view',
        'stk:profile:edit',
        'stk:board:view',
        'stk:board:manage',
        'stk:members:view',
        'stk:members:manage',
        'stk:applications:view',
        'stk:applications:manage',
        'stk:dues:view',
        'stk:dues:manage',
        'stk:payments:view',
        'stk:payments:manage',
        'stk:accounting:view',
    ],
}

// Check if a role has a specific permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
    return rolePermissions[role]?.includes(permission) ?? false
}

// Check if a role has any of the specified permissions
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
    return permissions.some(permission => hasPermission(role, permission))
}

// Check if a role has all of the specified permissions
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
    return permissions.every(permission => hasPermission(role, permission))
}

// Get all permissions for a role
export function getPermissions(role: UserRole): Permission[] {
    return rolePermissions[role] || []
}

// Route protection helpers
export function canAccessAdmin(role: UserRole): boolean {
    return role === 'ADMIN'
}

export function canAccessSTK(role: UserRole): boolean {
    return role === 'STK_MANAGER' || role === 'ADMIN'
}

// Resource-level access control
export function canManageSTK(role: UserRole, userStkId?: string, targetStkId?: string): boolean {
    // Admin can manage any STK
    if (role === 'ADMIN') return true

    // STK Manager can only manage their own STK
    if (role === 'STK_MANAGER' && userStkId && targetStkId) {
        return userStkId === targetStkId
    }

    return false
}

// Permission guard for API routes
export interface PermissionCheckResult {
    allowed: boolean
    reason?: string
}

export function checkPermission(
    role: UserRole,
    permission: Permission,
    context?: { userStkId?: string; targetStkId?: string }
): PermissionCheckResult {
    // First check if the role has the permission
    if (!hasPermission(role, permission)) {
        return { allowed: false, reason: 'Bu işlem için yetkiniz bulunmamaktadır' }
    }

    // For STK-related permissions, check STK ownership
    if (permission.startsWith('stk:') && context?.targetStkId) {
        if (!canManageSTK(role, context.userStkId, context.targetStkId)) {
            return { allowed: false, reason: 'Bu STK üzerinde işlem yetkiniz bulunmamaktadır' }
        }
    }

    return { allowed: true }
}

// Role display names (Turkish)
export const roleDisplayNames: Record<UserRole, string> = {
    ADMIN: 'Sistem Yöneticisi',
    STK_MANAGER: 'STK Yöneticisi',
}

// Permission display names (Turkish)
export const permissionDisplayNames: Record<Permission, string> = {
    'admin:dashboard': 'Admin Dashboard Görüntüleme',
    'admin:stk:view': 'STK Görüntüleme',
    'admin:stk:manage': 'STK Yönetimi',
    'admin:stk:approve': 'STK Onaylama/Reddetme',
    'admin:packages:view': 'Paket Görüntüleme',
    'admin:packages:manage': 'Paket Yönetimi',
    'admin:logs:view': 'Log Görüntüleme',
    'admin:roles:view': 'Rol Görüntüleme',
    'admin:roles:manage': 'Rol Yönetimi',
    'admin:stats:view': 'İstatistik Görüntüleme',
    'stk:dashboard': 'STK Dashboard Görüntüleme',
    'stk:profile:view': 'Profil Görüntüleme',
    'stk:profile:edit': 'Profil Düzenleme',
    'stk:board:view': 'Yönetim Kurulu Görüntüleme',
    'stk:board:manage': 'Yönetim Kurulu Yönetimi',
    'stk:members:view': 'Üye Görüntüleme',
    'stk:members:manage': 'Üye Yönetimi',
    'stk:applications:view': 'Başvuru Görüntüleme',
    'stk:applications:manage': 'Başvuru Yönetimi',
    'stk:dues:view': 'Aidat Görüntüleme',
    'stk:dues:manage': 'Aidat Yönetimi',
    'stk:payments:view': 'Ödeme Görüntüleme',
    'stk:payments:manage': 'Ödeme Yönetimi',
    'stk:accounting:view': 'Muhasebe Görüntüleme',
}
