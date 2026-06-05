import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/stk/[slug]/membership?userId=xxx
 * Kullanıcının bu STK'ya üyelik durumunu döndür
 * RESIGNED → başvurmamış gibi davran (null status)
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const userId = req.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: true, data: { status: null, isMember: false } });
    }

    const stk = await prisma.sTKOrganization.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!stk) {
      return NextResponse.json({ error: "STK bulunamadı." }, { status: 404 });
    }

    const app = await prisma.sTKApplication.findFirst({
      where: { stkId: stk.id, userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, createdAt: true, approvedAt: true },
    });

    // RESIGNED → hiç başvurmamış gibi göster (ama profil logunda kalacak)
    const effectiveStatus = app?.status === "RESIGNED" ? null : app?.status || null;

    return NextResponse.json({
      success: true,
      data: {
        status: effectiveStatus,
        isMember: app?.status === "APPROVED",
        isPending: app?.status === "PENDING",
        isResignPending: app?.status === "RESIGN_PENDING",
        isResigned: app?.status === "RESIGNED",
        applicationId: app?.id,
        approvedAt: app?.approvedAt?.toISOString() || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
