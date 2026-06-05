import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/stk/[slug]
 * Slug ile STK detay sayfası (tüm alanlar)
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const org = await prisma.sTKOrganization.findUnique({
    where: { slug },
  });

  if (!org) {
    return NextResponse.json({ error: "STK bulunamadı." }, { status: 404 });
  }

  // Askıya alınmış veya pasif STK'lar public'te gösterilmez
  if (org.status !== "ACTIVE") {
    return NextResponse.json({ error: "Bu kuruluş şu an aktif değildir." }, { status: 403 });
  }

  // Gerçek APPROVED üye sayısını hesapla (statik memberCount yerine)
  const approvedCount = await prisma.sTKApplication.count({
    where: { stkId: org.id, status: "APPROVED" },
  });

  // contractPdfUrl'i tam URL'e çevir (mobil erişim için)
  const siteUrl = "https://kamulogstk.net";
  let contractPdfUrl = org.contractPdfUrl;
  if (contractPdfUrl && contractPdfUrl.startsWith("/")) {
    contractPdfUrl = `${siteUrl}${contractPdfUrl}`;
  }

  // Logo URL'i absolute yap
  // STK panelden yüklenen logolar /uploads/stk-logos/ altında → kamulogstk.net
  // Admin panelden yüklenen eski logolar /uploads/ altında → kamulog.net
  let logoUrl = org.logo;
  if (logoUrl && logoUrl.startsWith("/")) {
    if (logoUrl.startsWith("/uploads/stk-logos/")) {
      logoUrl = `https://kamulogstk.net${logoUrl}`;
    } else {
      logoUrl = `https://kamulog.net${logoUrl}`;
    }
  }

  return NextResponse.json({ success: true, data: {
    ...org,
    logo: logoUrl,
    memberCount: approvedCount,
    contractPdfUrl,
    branchesPublic: (org as any).branchesPublic ?? true,
    activitiesPublic: (org as any).activitiesPublic ?? false,
    decisionsPublic: (org as any).decisionsPublic ?? false,
    boardPublic: (org as any).boardPublic ?? true,
    chatPublic: (org as any).chatPublic ?? false,
    chatDisabledForMembers: (org as any).chatDisabledForMembers ?? false,
  } });
}
