import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

function generateOrderNumber(): string {
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  return `KMLG-${rand}`;
}

// POST — Manuel premium ver
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { userId, planId, durationDays, notes } = await req.json();
  if (!userId || !planId) {
    return NextResponse.json({ error: "userId ve planId gerekli" }, { status: 400 });
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.json({ error: "Plan bulunamadı" }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  const days = durationDays || (plan.interval === "yearly" ? 365 : plan.interval === "weekly" ? 7 : 30);
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + days);

  // Transaction: Subscription + Order + User update
  const result = await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.create({
      data: {
        userId,
        planId,
        status: "active",
        store: "ADMIN",
        endsAt,
      },
    });

    const order = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        planId,
        amount: 0, // Manuel atama — Ücretsiz
        status: "MANUAL",
        orderType: "SUBSCRIPTION",
        invoiceStatus: "UNSENT",
        notes: notes || `[ADMIN] Manuel atama — Ücretsiz`,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        isPremium: true,
        premiumUntil: endsAt,
        subscriptionTier: plan.name,
        aiTokens: { increment: plan.includedQuota },
      },
    });

    return { subscription, order };
  });

  return NextResponse.json(result, { status: 201 });
}

// PUT — Süre uzat
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { subscriptionId, newEndsAt, additionalDays } = await req.json();
  if (!subscriptionId) {
    return NextResponse.json({ error: "subscriptionId gerekli" }, { status: 400 });
  }

  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) return NextResponse.json({ error: "Abonelik bulunamadı" }, { status: 404 });

  let finalEndsAt: Date;
  if (newEndsAt) {
    finalEndsAt = new Date(newEndsAt);
  } else if (additionalDays) {
    finalEndsAt = new Date(sub.endsAt);
    finalEndsAt.setDate(finalEndsAt.getDate() + additionalDays);
  } else {
    return NextResponse.json({ error: "newEndsAt veya additionalDays gerekli" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedSub = await tx.subscription.update({
      where: { id: subscriptionId },
      data: { endsAt: finalEndsAt, status: "active" },
    });

    await tx.user.update({
      where: { id: sub.userId },
      data: { isPremium: true, premiumUntil: finalEndsAt },
    });

    return updatedSub;
  });

  return NextResponse.json(updated);
}

// DELETE — Abonelik iptal
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const subscriptionId = searchParams.get("id");
  if (!subscriptionId) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) return NextResponse.json({ error: "Abonelik bulunamadı" }, { status: 404 });

  const result = await prisma.$transaction(async (tx) => {
    const cancelled = await tx.subscription.update({
      where: { id: subscriptionId },
      data: { status: "cancelled" },
    });

    // Kullanıcının başka aktif aboneliği var mı kontrol et
    const activeCount = await tx.subscription.count({
      where: { userId: sub.userId, status: "active", id: { not: subscriptionId } },
    });

    if (activeCount === 0) {
      await tx.user.update({
        where: { id: sub.userId },
        data: { isPremium: false, premiumUntil: null, subscriptionTier: null },
      });
    }

    return cancelled;
  });

  return NextResponse.json(result);
}
