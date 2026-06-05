export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { ArrowLeftRight, MapPin, ArrowRight, Building2, Shield } from "lucide-react";

export default async function PublicBecayisPage() {
  const listings = await prisma.becayisListing.findMany({
    where: { status: "published" },
    orderBy: { createdAt: "desc" },
    include: {
      institution: { select: { name: true } },
    },
  });

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-white/5 bg-sidebar">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white">Kamulog</h1>
              <p className="text-[10px] text-text-muted">Becayiş İlanları</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">Becayiş İlanları</h2>
          <p className="text-text-secondary mt-2">{listings.length} ilan yayında</p>
        </div>

        {listings.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <ArrowLeftRight className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-secondary">Henüz yayında ilan bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <div key={listing.id} className="glass-card p-5 hover:scale-[1.02] transition-transform duration-200">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold line-clamp-2">{listing.title}</h3>
                  {listing.isPremium && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent flex-shrink-0 ml-2">PRO</span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{listing.institution?.name || "Belirtilmemiş"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <MapPin className="w-3.5 h-3.5 text-green-400" />
                    <span>{listing.currentCity}</span>
                    <ArrowRight className="w-3 h-3 text-text-muted" />
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{listing.targetCity}</span>
                  </div>
                </div>

                <p className="text-xs text-text-muted line-clamp-3 mb-3">{listing.description}</p>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-[10px] text-text-muted">
                    {listing.branch}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {new Date(listing.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-text-muted">
        © 2026 Kamulog — Kamu Çalışanları Platformu
      </footer>
    </div>
  );
}
