import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const siteUrl = process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://kamulog.net";
  let contractPdfUrl = org.contractPdfUrl;
  if (contractPdfUrl && contractPdfUrl.startsWith("/")) {
    contractPdfUrl = `${siteUrl}${contractPdfUrl}`;
  }

  let finalLogo = org.logo;
  if (finalLogo && !finalLogo.startsWith('http')) {
    finalLogo = `https://kamulogstk.net${finalLogo}`;
  }

  return NextResponse.json({ success: true, data: { ...org, logo: finalLogo, memberCount: approvedCount, contractPdfUrl } });
}
