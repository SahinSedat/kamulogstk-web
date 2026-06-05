import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/stk/[slug]/announcements
 * STK'nın yayınlanmış duyurularını getirir (en yeni önce)
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const stk = await prisma.sTKOrganization.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (!stk || stk.status !== "ACTIVE") {
      return NextResponse.json({ error: "STK bulunamadı." }, { status: 404 });
    }

    const announcements = await prisma.sTKAnnouncement.findMany({
      where: {
        stkId: stk.id,
        isPublished: true,
      },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        imageUrl: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: announcements });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
