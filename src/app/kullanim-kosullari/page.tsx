import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kullanım Koşulları — Kamulog",
  description:
    "Kamulog uygulamasının kullanım koşulları ve şartları. Uygulamayı kullanmadan önce lütfen bu koşulları okuyun.",
};

export const dynamic = "force-dynamic";

export default async function KullanimKosullariPage() {
  const doc = await prisma.appDocument.findUnique({
    where: { slug: "terms-of-service" },
  });

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0a0e1a 100%)",
      }}
    >
      {/* ─── Navbar ─────────────────────────────────────────────── */}
      <header
        className="border-b border-white/5 backdrop-blur-2xl sticky top-0 z-50"
        style={{ background: "rgba(10,14,26,0.85)" }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              }}
            >
              <span className="text-white text-lg font-bold">K</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none group-hover:text-blue-400 transition-colors">
                Kamulog
              </h1>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">
                Super App
              </p>
            </div>
          </Link>
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            ← Ana Sayfa
          </Link>
        </div>
      </header>

      {/* ─── İçerik ─────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div
          className="rounded-2xl p-8 md:p-12"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Başlık */}
          <div className="mb-10">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4"
              style={{
                background: "rgba(99, 102, 241, 0.15)",
                color: "#818cf8",
                border: "1px solid rgba(99, 102, 241, 0.2)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              Yasal Bilgilendirme
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              {doc?.title || "Kullanım Koşulları"}
            </h1>
            {doc?.updatedAt && (
              <p className="text-sm text-slate-500">
                Son güncelleme:{" "}
                {new Date(doc.updatedAt).toLocaleDateString("tr-TR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </div>

          {/* İçerik */}
          {doc ? (
            <div
              className="document-content max-w-none"
              style={{ color: "#f1f5f9", lineHeight: "1.8", fontSize: "16px" }}
              dangerouslySetInnerHTML={{ __html: doc.content }}
            />
          ) : (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📄</div>
              <p className="text-slate-400 text-lg">
                Bu belge henüz yayınlanmamıştır.
              </p>
              <p className="text-slate-500 text-sm mt-2">
                Lütfen daha sonra tekrar deneyin.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8" style={{ background: "#0a0e1a" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-600">
              © 2026 Kamulog — Tüm hakları saklıdır.
            </p>
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <Link
                href="/gizlilik-politikasi"
                className="hover:text-slate-300 transition"
              >
                Gizlilik Politikası
              </Link>
              <span className="text-slate-300 font-medium cursor-default">
                Kullanım Koşulları
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
