import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

function generateOrderNumber(): string {
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  return `KRY-${rand}`;
}

// POST — Manuel Kariyer Premium ver
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { userId, notes } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId gerekli" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  if (user.isCareerPremium) {
    return NextResponse.json({ error: "Kullanıcı zaten Kariyer Premium" }, { status: 400 });
  }

  // Aktif kariyer planını bul
  const plan = await prisma.careerSubscriptionPlan.findFirst({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  const tokenBonus = plan?.aiTokens || 100;

  // Lifetime = 100 yıl (pratik sonsuzluk)
  const premiumUntil = new Date();
  premiumUntil.setFullYear(premiumUntil.getFullYear() + 100);

  const result = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        isCareerPremium: true,
        careerPremiumUntil: premiumUntil,
        careerAiTokens: { increment: tokenBonus },
      },
    });

    const order = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        amount: 0,
        status: "MANUAL",
        notes: notes || `[KARİYER] Admin tarafından manuel atandı | Token: ${tokenBonus}`,
      },
    });

    // Admin log
    const adminUser = session?.user as { id?: string };
    if (adminUser?.id) {
      await tx.adminLog.create({
        data: {
          adminId: adminUser.id,
          action: "CAREER_MANUAL_GRANT",
          targetType: "User",
          targetId: userId,
          details: `Kariyer Premium manuel atandı | Token: ${tokenBonus}`,
        },
      });
    }

    return { order, tokenBonus };
  });

  return NextResponse.json({ success: true, ...result }, { status: 201 });
}

// DELETE — Kariyer Premium iptal
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId gerekli" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  await prisma.user.update({
    where: { id: userId },
    data: {
      isCareerPremium: false,
      careerPremiumUntil: null,
    },
  });

  // Admin log
  const adminUser = session?.user as { id?: string };
  if (adminUser?.id) {
    await prisma.adminLog.create({
      data: {
        adminId: adminUser.id,
        action: "CAREER_MANUAL_REVOKE",
        targetType: "User",
        targetId: userId,
        details: `Kariyer Premium iptal edildi`,
      },
    });
  }

  return NextResponse.json({ success: true });
}
