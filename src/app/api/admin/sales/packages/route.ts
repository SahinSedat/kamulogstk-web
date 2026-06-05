import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

// GET — Paketleri listele
export async function GET() {
  const packages = await prisma.sTKPackage.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { purchases: true } } },
  });
  return NextResponse.json({ success: true, data: packages });
}

// POST — Yeni paket oluştur
export async function POST(req: NextRequest) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description, type, price, smsAmount, whatsappAmount, pushAmount, emailAmount, featuredDays, whatsappBotDays, durationLabel } = body;

  if (!name || price === undefined) return NextResponse.json({ error: "İsim ve fiyat zorunlu" }, { status: 400 });

  const pkg = await prisma.sTKPackage.create({
    data: {
      name,
      description: description || null,
      type: type || "QUOTA",
      price: parseFloat(price),
      smsAmount: parseInt(smsAmount) || 0,
      whatsappAmount: parseInt(whatsappAmount) || 0,
      pushAmount: parseInt(pushAmount) || 0,
      emailAmount: parseInt(emailAmount) || 0,
      featuredDays: parseInt(featuredDays) || 0,
      whatsappBotDays: parseInt(whatsappBotDays) || 0,
      durationLabel: durationLabel || null,
    },
  });

  return NextResponse.json({ success: true, data: pkg });
}

// PATCH — Paket güncelle
export async function PATCH(req: NextRequest) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  if (updates.price !== undefined) updates.price = parseFloat(updates.price);
  if (updates.smsAmount !== undefined) updates.smsAmount = parseInt(updates.smsAmount);
  if (updates.whatsappAmount !== undefined) updates.whatsappAmount = parseInt(updates.whatsappAmount);
  if (updates.pushAmount !== undefined) updates.pushAmount = parseInt(updates.pushAmount);
  if (updates.emailAmount !== undefined) updates.emailAmount = parseInt(updates.emailAmount);
  if (updates.featuredDays !== undefined) updates.featuredDays = parseInt(updates.featuredDays);
  if (updates.whatsappBotDays !== undefined) updates.whatsappBotDays = parseInt(updates.whatsappBotDays);
  if (updates.durationLabel !== undefined) updates.durationLabel = updates.durationLabel || null;

  const pkg = await prisma.sTKPackage.update({ where: { id }, data: updates });
  return NextResponse.json({ success: true, data: pkg });
}

// DELETE — Paket sil
export async function DELETE(req: NextRequest) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  await prisma.sTKPackage.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
