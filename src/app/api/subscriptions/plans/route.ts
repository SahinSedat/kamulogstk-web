import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Prisma'ya geçirilecek güvenli alan listesi
const ALLOWED_FIELDS = [
  'name', 'price', 'interval', 'description', 'badgeText',
  'yearlyDiscountRate', 'yearlyPrice', 'includedQuota', 'aiSearchQuota',
  'listingQuota', 'boostQuota', 'boostDurationDays',
  'urgentQuota', 'urgentDurationDays', 'matchRequestQuota',
  'hasRadarFeature', 'radarDurationDays', 'isUnlimited', 'isActive', 'order', 'tisChatQuota',
  'appleProductId', 'googleProductId', 'entitlements', 'features',
];

function sanitizeBody(body: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) data[key] = body[key];
  }
  return data;
}

export async function GET() {
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = sanitizeBody(body);

    if (!data.name || !data.interval) {
      return NextResponse.json({ error: "Plan adı ve periyot gerekli" }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.create({ data });
    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("[Plans API] POST hatası:", error);
    return NextResponse.json({ error: "Plan oluşturulamadı" }, { status: 500 });
  }
}

// PUT — Plan güncelle
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "id gerekli" }, { status: 400 });
    }

    // Sadece bilinen alanları Prisma'ya geçir (güvenlik + hata önleme)
    const data = sanitizeBody(body);

    const plan = await prisma.subscriptionPlan.update({
      where: { id },
      data,
    });
    return NextResponse.json(plan);
  } catch (error) {
    console.error("[Plans API] PUT hatası:", error);
    return NextResponse.json({ error: "Plan güncellenemedi" }, { status: 500 });
  }
}

// DELETE — Plan pasif/aktif toggle
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  }
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan) {
    return NextResponse.json({ error: "Plan bulunamadı" }, { status: 404 });
  }
  if (plan.isDefault) {
    return NextResponse.json({ error: "Standart plan pasif yapılamaz" }, { status: 403 });
  }
  const updated = await prisma.subscriptionPlan.update({
    where: { id },
    data: { isActive: !plan.isActive },
  });
  return NextResponse.json(updated);
}
