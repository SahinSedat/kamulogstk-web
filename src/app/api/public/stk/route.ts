import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/stk
 * Sadece ACTIVE STK'ları vitrin formatında getir (mobil liste)
 * ?featured=true → Sadece isFeatured=true olanları döndür (max 6)
 * Üye sayısı = yalnızca APPROVED başvurular (gerçek aktif üyeler)
 */
export async function GET(req: NextRequest) {
  const featured = req.nextUrl.searchParams.get("featured");

  const where: any = { status: "ACTIVE" };
  if (featured === "true") {
    where.isFeatured = true;
  }

  const organizations = await prisma.sTKOrganization.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      logo: true,
      city: true,
      showMemberCount: true,
      isFeatured: true,
    },
    orderBy: { name: "asc" },
    ...(featured === "true" ? { take: 6 } : {}),
  });

  // Fetch latest details from kamulogstk.net individually
  const data = await Promise.all(organizations.map(async (org) => {
    const approvedCount = await prisma.sTKApplication.count({
      where: { stkId: org.id, status: "APPROVED" },
    });
    
    let finalLogo = org.logo;
    try {
      const res = await fetch(`https://kamulogstk.net/api/public/stk/${org.slug}`);
      if (res.ok) {
        const detailData = await res.json();
        if (detailData.success && detailData.data && detailData.data.logo) {
          finalLogo = detailData.data.logo;
        }
      }
    } catch (error) {
      console.error(`Error fetching logo for ${org.slug}:`, error);
    }
    
    if (finalLogo && !finalLogo.startsWith('http')) {
      finalLogo = `https://kamulogstk.net${finalLogo}`;
    }
    
    return { ...org, logo: finalLogo, memberCount: approvedCount };
  }));

  return NextResponse.json({ success: true, data, count: data.length });
}
