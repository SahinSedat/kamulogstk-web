import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId gerekli" }, { status: 400 });

    await prisma.user.update({
        where: { id: userId },
        data: { isCareerPremium: false, careerPremiumUntil: null, careerAiTokens: 0 },
    });

    return NextResponse.json({ success: true });
}
