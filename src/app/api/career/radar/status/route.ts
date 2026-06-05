import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const userId = req.headers.get("x-user-id") || authHeader.replace(/^(Bearer|Token)\s+/i, "");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isCareerPremium: true, isCareerRadarActive: true, careerRadarExpiresAt: true, careerAiTokens: true },
    });
    if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

    // CV var mı kontrol et
    const cvCount = await prisma.cV.count({ where: { userId } });

    let isRadarActive = user.isCareerRadarActive;
    if (isRadarActive && user.careerRadarExpiresAt && new Date() > user.careerRadarExpiresAt) {
      await prisma.user.update({ where: { id: userId }, data: { isCareerRadarActive: false } });
      isRadarActive = false;
    }

    // CV silinmişse radarı otomatik kapat
    if (isRadarActive && cvCount === 0) {
      await prisma.user.update({ where: { id: userId }, data: { isCareerRadarActive: false } });
      isRadarActive = false;
    }

    return NextResponse.json({
      isRadarActive,
      hasCv: cvCount > 0,
      radarExpiresAt: user.careerRadarExpiresAt,
      remainingTokens: user.careerAiTokens,
      matches: [],
    });
  } catch (error: any) {
    console.error("[career/radar/status]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
