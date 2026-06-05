import type { Metadata } from "next";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

/**
 * Admin Panel Layout
 * noindex, nofollow — Arama motorlarına tamamen kapalı
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <div className="ml-[260px] transition-all duration-300">
        <Header />
        <main className="p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
