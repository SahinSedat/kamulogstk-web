import type { MetadataRoute } from "next";

/**
 * robots.txt — SEO Kamuflaj
 * 
 * Sadece landing page ve yasal metinler taranabilir.
 * Admin paneli, becayiş, login ve tüm API rotaları kapalı.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/gizlilik-politikasi", "/kullanim-kosullari"],
        disallow: [
          // ─── Admin Paneli ───────────────────────────
          "/dashboard",
          "/users",
          "/consultants",
          "/requests",
          "/content",
          "/becayis",
          "/messages",
          "/stk",
          "/career",
          "/reports",
          "/tis",
          "/stories",
          "/notifications",
          "/stk-campaigns",
          "/subscriptions",
          "/stk-payments",
          "/credit-packages",
          "/payouts",
          "/orders",
          "/maas-hesaplama",
          "/salary-settings",
          "/logs",
          "/ai-statistics",
          "/ai-keys",
          "/settings",
          "/whatsapp-bot",
          "/forum",
          "/tis-arsiv",
          // ─── Giriş Sayfaları ────────────────────────
          "/login",
          "/mobile-login",
          // ─── API Rotaları ───────────────────────────
          "/api/",
        ],
      },
    ],
    sitemap: "https://kamulog.net/sitemap.xml",
  };
}
