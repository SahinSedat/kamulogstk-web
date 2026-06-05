import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const userId = req.headers.get("x-user-id") || authHeader.replace(/^(Bearer|Token)\s+/i, "");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isCareerPremium: true, isCareerRadarActive: true, careerRadarExpiresAt: true, careerAiTokens: true },
    });
    if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    if (!user.isCareerPremium) return NextResponse.json({ error: "PREMIUM_REQUIRED" }, { status: 403 });

    // CV yoksa radar aktifleştirilemez
    const cvCount = await prisma.cV.count({ where: { userId } });
    if (cvCount === 0) {
      return NextResponse.json({ error: "CV_REQUIRED", message: "Radar aktifleştirmek için önce bir CV yükleyin." }, { status: 400 });
    }

    if (user.isCareerRadarActive && user.careerRadarExpiresAt && new Date() < user.careerRadarExpiresAt) {
      return NextResponse.json({ isRadarActive: true, radarExpiresAt: user.careerRadarExpiresAt, remainingTokens: user.careerAiTokens, matches: [], message: "Radar zaten aktif." });
    }

    const RADAR_TOKEN_COST = 10;
    if (user.careerAiTokens < RADAR_TOKEN_COST) {
      return NextResponse.json({ error: "INSUFFICIENT_TOKENS", remainingTokens: user.careerAiTokens }, { status: 403 });
    }

    const radarDays = 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + radarDays);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isCareerRadarActive: true, careerRadarExpiresAt: expiresAt, careerAiTokens: { decrement: RADAR_TOKEN_COST } },
      select: { isCareerRadarActive: true, careerRadarExpiresAt: true, careerAiTokens: true },
    });

    try {
      await prisma.aIUsageLog.create({ data: { userId, module: "CAREER_RADAR_ACTIVATE", tokenUsed: RADAR_TOKEN_COST } });
    } catch (_) {}

    return NextResponse.json({ isRadarActive: true, radarExpiresAt: updated.careerRadarExpiresAt, remainingTokens: updated.careerAiTokens, matches: [] });
  } catch (error: any) {
    console.error("[career/radar/activate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
