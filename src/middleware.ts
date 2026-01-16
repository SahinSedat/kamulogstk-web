import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

const COOKIE_NAME = 'auth-token'

// Public routes that don't require authentication
const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/api/auth/login',
    '/api/auth/register',
    '/api/public',
    // Landing page routes
    '/about',
    '/contact',
    '/blog',
    '/privacy',
    '/terms',
    '/kvkk',
    '/pricing',
]

// Admin-only routes
const adminRoutes = ['/admin', '/api/admin']

// STK routes (requires STK_MANAGER or ADMIN)
const stkRoutes = ['/stk', '/api/stk']

function isPublicRoute(pathname: string): boolean {
    return publicRoutes.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    )
}

function isAdminRoute(pathname: string): boolean {
    return adminRoutes.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    )
}

function isSTKRoute(pathname: string): boolean {
    return stkRoutes.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    )
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Skip middleware for static files and Next.js internals
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.') // Static files like .css, .js, .png
    ) {
        return NextResponse.next()
    }

    // Allow public routes
    if (isPublicRoute(pathname)) {
        return NextResponse.next()
    }

    // Get auth token from cookie
    const token = request.cookies.get(COOKIE_NAME)?.value

    if (!token) {
        // No token - redirect to login for pages, return 401 for API
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'Yetkilendirme gerekli', code: 'UNAUTHORIZED' },
                { status: 401 }
            )
        }
        return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    try {
        // Verify token
        const { payload } = await jwtVerify(token, JWT_SECRET)
        const userRole = payload.role as string

        // Check admin routes
        if (isAdminRoute(pathname)) {
            if (userRole !== 'ADMIN') {
                if (pathname.startsWith('/api/')) {
                    return NextResponse.json(
                        { error: 'Bu işlem için yetkiniz yok', code: 'FORBIDDEN' },
                        { status: 403 }
                    )
                }
                return NextResponse.redirect(new URL('/auth/login', request.url))
            }
        }

        // Check STK routes
        if (isSTKRoute(pathname)) {
            if (userRole !== 'STK_MANAGER' && userRole !== 'ADMIN') {
                if (pathname.startsWith('/api/')) {
                    return NextResponse.json(
                        { error: 'Bu işlem için yetkiniz yok', code: 'FORBIDDEN' },
                        { status: 403 }
                    )
                }
                return NextResponse.redirect(new URL('/auth/login', request.url))
            }
        }

        // Add user info to headers for API routes
        const response = NextResponse.next()
        response.headers.set('x-user-id', payload.userId as string)
        response.headers.set('x-user-role', userRole)
        if (payload.stkId) {
            response.headers.set('x-stk-id', payload.stkId as string)
        }

        return response

    } catch {
        // Invalid token
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'Geçersiz token', code: 'INVALID_TOKEN' },
                { status: 401 }
            )
        }

        // Clear invalid cookie and redirect to login
        const response = NextResponse.redirect(new URL('/auth/login', request.url))
        response.cookies.delete(COOKIE_NAME)
        return response
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
    ],
}
