import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || req.headers.get("authorization")?.replace("Bearer ", "");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { module, amount = 1 } = body;
    if (!module) return NextResponse.json({ error: "module alanı zorunlu" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isCareerPremium: true, careerAiTokens: true },
    });
    if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    if (!user.isCareerPremium) return NextResponse.json({ error: "PREMIUM_REQUIRED" }, { status: 403 });
    if (user.careerAiTokens < amount) return NextResponse.json({ error: "INSUFFICIENT_TOKENS", remainingTokens: user.careerAiTokens }, { status: 403 });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { careerAiTokens: { decrement: amount } },
      select: { careerAiTokens: true },
    });

    try {
      await prisma.aIUsageLog.create({ data: { userId, module: "CAREER_" + module, tokenUsed: amount } });
    } catch (_) {}

    return NextResponse.json({ success: true, remainingTokens: updated.careerAiTokens, deducted: amount });
  } catch (error: any) {
    console.error("[career/token-deduct]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
