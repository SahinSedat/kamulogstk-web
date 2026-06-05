import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/me/community?userId=xxx
 * Kullanıcının topluluk geçmişi (konular + STK başvuruları)
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId parametresi zorunludur." }, { status: 400 });
    }

    // Kullanıcının açtığı konular
    const myTopics = await prisma.forumTopic.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
    });

    // Kullanıcının STK başvuruları
    const myApplications = await prisma.sTKApplication.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        stk: { select: { id: true, name: true, slug: true, type: true, logo: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: { myTopics, myApplications },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
