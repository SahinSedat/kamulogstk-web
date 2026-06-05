import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * 🏦 Enterprise Security Middleware (v12.5)
 * 
 * STK_SERVER_MODE=true olduğunda:
 * - /dashboard, /admin, /users, /subscriptions vb. ADMIN rotaları tamamen ENGELLENİR
 * - Sadece /stk-panel, /login, / (landing) ve /api/stk-panel/* erişilebilir
 * - Bu sayede yeni sunucuda Admin panelinin "A"sı bile açılamaz
 */
const IS_STK_SERVER = process.env.STK_SERVER_MODE === "true";

// Admin-only rotalar (STK sunucusunda TAMAMEN kapalı)
const ADMIN_BLOCKED_PATHS = [
  "/dashboard",
  "/users",
  "/consultants",
  "/messages",
  "/becayis",
  "/subscriptions",
  "/orders",
  "/notifications",
  "/content",
  "/career",
  "/settings",
  "/requests",
  "/reports",
  "/stk-activities",
  "/stk-campaigns",
  "/stk-payments",
  "/stk/",
];

// Admin API rotaları (STK sunucusunda engellenir)
const ADMIN_API_PATHS = [
  "/api/admin",
  "/api/users",
  "/api/orders",
  "/api/becayis",
  "/api/conversations",
  "/api/kariyer",
  "/api/notifications",
];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // ═══════════════════════════════════════════════════════════
    // 🔒 STK SUNUCU İZOLASYONU — Admin rotalarını tamamen engelle
    // ═══════════════════════════════════════════════════════════
    if (IS_STK_SERVER) {
      // Admin sayfalarına erişim engeli
      const isAdminPage = ADMIN_BLOCKED_PATHS.some((p) => path === p || path.startsWith(p + "/"));
      if (isAdminPage) {
        console.log(`[Middleware] 🚫 STK Server izolasyonu: ${path} engellendi`);
        return NextResponse.redirect(new URL("/", req.url));
      }

      // Admin API'lerine erişim engeli
      const isAdminApi = ADMIN_API_PATHS.some((p) => path.startsWith(p));
      if (isAdminApi) {
        console.log(`[Middleware] 🚫 STK Server API izolasyonu: ${path} engellendi`);
        return NextResponse.json(
          { error: "Bu endpoint STK sunucusunda kullanılamaz" },
          { status: 403 }
        );
      }
    }

    // Public becayiş sayfasına herkes erişebilir
    if (path.startsWith("/becayis/public")) {
      return NextResponse.next();
    }

    // Giriş yapılmamışsa login'e yönlendir
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Sadece ADMIN, MODERATOR, CONSULTANT, STK_MANAGER erişebilir
    const role = token.role as string;
    if (!["ADMIN", "MODERATOR", "CONSULTANT", "STK_MANAGER"].includes(role)) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // STK_MANAGER sadece STK sayfalarına erişebilir
    const stkPaths = ["/stk", "/stk-panel", "/stk-activities", "/stk-campaigns", "/stk-payments"];
    if (role === "STK_MANAGER") {
      const isSTKPath = stkPaths.some((p) => path === p || path.startsWith(p + "/"));
      if (!isSTKPath) {
        return NextResponse.redirect(new URL("/stk-panel", req.url));
      }
      return NextResponse.next();
    }

    // RBAC kontrolleri (admin/moderator/consultant)
    const adminOnlyPaths = ["/subscriptions", "/settings"];
    const modPaths = ["/users", "/notifications", "/content", "/becayis", "/career", "/orders"];

    if (adminOnlyPaths.some((p) => path.startsWith(p)) && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (modPaths.some((p) => path.startsWith(p)) && role === "CONSULTANT") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Public becayiş sayfasına token olmadan da erişim
        if (req.nextUrl.pathname.startsWith("/becayis/public")) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/users/:path*",
    "/consultants/:path*",
    "/messages/:path*",
    "/becayis/:path*",
    "/subscriptions/:path*",
    "/orders/:path*",
    "/notifications/:path*",
    "/content/:path*",
    "/career/:path*",
    "/settings/:path*",
    "/requests/:path*",
    "/reports/:path*",
    "/stk/:path*",
    "/stk-activities/:path*",
    "/stk-campaigns/:path*",
    "/stk-payments/:path*",
    "/stk-panel/:path*",
  ],
};
