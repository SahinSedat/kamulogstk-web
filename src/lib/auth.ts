import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { UserRole, UserStatus } from '@prisma/client'
import prisma from './prisma'

// JWT Configuration
const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)
const JWT_EXPIRES_IN = '7d'
const COOKIE_NAME = 'auth_token'

// Types
export interface JWTPayload {
    userId: string
    email: string
    role: UserRole
    stkId?: string
    iat?: number
    exp?: number
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

// Password Hashing
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
}

// JWT Token Management
export async function createToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    const token = await new SignJWT(payload as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(JWT_EXPIRES_IN)
        .sign(JWT_SECRET)

    return token
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        return payload as unknown as JWTPayload
    } catch {
        return null
    }
}

// Session Management
export async function setAuthCookie(token: string): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
    })
}

export async function getAuthCookie(): Promise<string | null> {
    const cookieStore = await cookies()
    return cookieStore.get(COOKIE_NAME)?.value || null
}

export async function removeAuthCookie(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_NAME)
}

// Get Current User
export async function getCurrentUser(): Promise<AuthUser | null> {
    const token = await getAuthCookie()
    if (!token) return null

    const payload = await verifyToken(token)
    if (!payload) return null

    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            avatar: true,
            stk: {
                select: { id: true }
            }
        }
    })

    if (!user || user.status !== 'ACTIVE') return null

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        stkId: user.stk?.id,
        avatar: user.avatar || undefined
    }
}

// Login
export async function login(email: string, password: string): Promise<{ success: boolean; token?: string; user?: AuthUser; error?: string }> {
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            stk: {
                select: { id: true, status: true }
            }
        }
    })

    if (!user) {
        return { success: false, error: 'Kullanıcı bulunamadı' }
    }

    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
        return { success: false, error: 'Geçersiz şifre' }
    }

    if (user.status !== 'ACTIVE') {
        return { success: false, error: 'Hesabınız aktif değil' }
    }

    // STK Manager için STK durumu kontrolü
    if (user.role === 'STK_MANAGER' && user.stk) {
        if (user.stk.status !== 'ACTIVE' && user.stk.status !== 'APPROVED') {
            return { success: false, error: 'STK hesabınız aktif değil' }
        }
    }

    const token = await createToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        stkId: user.stk?.id
    })

    // Update last login
    await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
    })

    await setAuthCookie(token)

    return {
        success: true,
        token,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            stkId: user.stk?.id,
            avatar: user.avatar || undefined
        }
    }
}

// Logout
export async function logout(): Promise<void> {
    await removeAuthCookie()
}

// Register (STK Manager)
export async function register(data: {
    email: string
    password: string
    name: string
    phone?: string
}): Promise<{ success: boolean; userId?: string; error?: string }> {
    const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
    })

    if (existingUser) {
        return { success: false, error: 'Bu e-posta adresi zaten kullanılıyor' }
    }

    const hashedPassword = await hashPassword(data.password)

    const user = await prisma.user.create({
        data: {
            email: data.email,
            password: hashedPassword,
            name: data.name,
            phone: data.phone,
            role: 'STK_MANAGER',
            status: 'PENDING'
        }
    })

    return { success: true, userId: user.id }
}
