import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// PUT — Kullanıcı premium bilgilerini güncelle
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const { userId, isPremium, premiumUntil, subscriptionTier, credits, aiTokens } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId gerekli" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  // Build update data dynamically — only include fields that are provided
  const updateData: Record<string, unknown> = {};

  if (typeof isPremium === "boolean") {
    updateData.isPremium = isPremium;
    if (!isPremium) {
      updateData.premiumUntil = null;
      updateData.subscriptionTier = null;
    }
  }

  if (premiumUntil !== undefined) {
    updateData.premiumUntil = premiumUntil ? new Date(premiumUntil) : null;
  }

  if (subscriptionTier !== undefined) {
    updateData.subscriptionTier = subscriptionTier || null;
  }

  if (typeof credits === "number") {
    updateData.credits = credits;
  }

  if (typeof aiTokens === "number") {
    updateData.aiTokens = aiTokens;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true, firstName: true, lastName: true, name: true, email: true,
      phone: true, phoneNumber: true, isPremium: true, premiumUntil: true,
      subscriptionTier: true, aiTokens: true, credits: true,
    },
  });

  return NextResponse.json(updated);
}

// POST — Kullanıcıyı premium yap (hızlı)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { userId, durationDays = 30, tier = "pro" } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId gerekli" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + durationDays);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isPremium: true,
      premiumUntil: endsAt,
      subscriptionTier: tier,
    },
    select: {
      id: true, firstName: true, lastName: true, name: true, email: true,
      isPremium: true, premiumUntil: true, subscriptionTier: true,
    },
  });

  return NextResponse.json(updated, { status: 201 });
}

// DELETE — Premium'u kaldır
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId gerekli" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  // Premium'u kaldır + aktif abonelikleri iptal et
  const updated = await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({
      where: { userId, status: "active" },
      data: { status: "cancelled" },
    });

    return tx.user.update({
      where: { id: userId },
      data: {
        isPremium: false,
        premiumUntil: null,
        subscriptionTier: null,
      },
      select: {
        id: true, firstName: true, lastName: true, name: true,
        isPremium: true, premiumUntil: true, subscriptionTier: true,
      },
    });
  });

  return NextResponse.json(updated);
}
