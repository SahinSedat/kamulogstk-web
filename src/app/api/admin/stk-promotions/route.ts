import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — Kampanyaları listele (tüm veya belirli STK için)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stkId = searchParams.get("stkId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (stkId) {
      // STK'ya özel veya genel kampanyalar
      where.OR = [{ stkId }, { stkId: null }];
    }

    const promotions = await prisma.sTKPromotion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        stk: { select: { id: true, name: true, slug: true, logo: true } },
        package: { select: { id: true, name: true, type: true, price: true } },
      },
    });

    return NextResponse.json({ success: true, data: promotions });
  } catch (error) {
    console.error("[STK Promotions GET]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST — Yeni kampanya oluştur
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, stkId, packageId, discountPercent, discountAmount, startDate, endDate, message } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "Kampanya adı, başlangıç ve bitiş tarihi zorunlu" }, { status: 400 });
    }

    if (!discountPercent && !discountAmount) {
      return NextResponse.json({ error: "İndirim yüzdesi veya sabit tutar belirtilmeli" }, { status: 400 });
    }

    const promotion = await prisma.sTKPromotion.create({
      data: {
        name,
        stkId: stkId || null,
        packageId: packageId || null,
        discountPercent: discountPercent ? parseFloat(discountPercent) : null,
        discountAmount: discountAmount ? parseFloat(discountAmount) : null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        message: message || null,
        isActive: true,
      },
      include: {
        stk: { select: { id: true, name: true } },
        package: { select: { id: true, name: true, type: true, price: true } },
      },
    });

    return NextResponse.json({ success: true, data: promotion, message: "Kampanya başarıyla oluşturuldu" });
  } catch (error) {
    console.error("[STK Promotions POST]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE — Kampanya sil
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 });

    await prisma.sTKPromotion.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Kampanya silindi" });
  } catch (error) {
    console.error("[STK Promotions DELETE]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// PATCH — Kampanya güncelle (aktif/pasif)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isActive, name, discountPercent, discountAmount, startDate, endDate, message } = body;
    if (!id) return NextResponse.json({ error: "id zorunlu" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: any = {};
    if (isActive !== undefined) update.isActive = isActive;
    if (name) update.name = name;
    if (discountPercent !== undefined) update.discountPercent = discountPercent ? parseFloat(discountPercent) : null;
    if (discountAmount !== undefined) update.discountAmount = discountAmount ? parseFloat(discountAmount) : null;
    if (startDate) update.startDate = new Date(startDate);
    if (endDate) update.endDate = new Date(endDate);
    if (message !== undefined) update.message = message || null;

    const updated = await prisma.sTKPromotion.update({
      where: { id },
      data: update,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[STK Promotions PATCH]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
