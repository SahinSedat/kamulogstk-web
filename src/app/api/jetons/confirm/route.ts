import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/jetons/confirm
 * Flutter → Backend jeton satın alım bildirimi.
 * RevenueCat webhook'a ek güvence — widget gecikmeli gelirse
 * bu endpoint kullanıcının jetonlarını anında güncellemesini sağlar.
 *
 * Body: { productId, jetonCount, source }
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const userId = authHeader.replace(/^(Bearer|Token)\s+/i, "");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { productId, source } = body;

    // 🛡️ GÜVENLİK: productId ZORUNLU — client'tan gelen jetonCount ASLA kullanılmaz
    if (!productId || typeof productId !== "string" || productId.trim().length === 0) {
      console.warn(`[JetonConfirm] 🚫 productId olmadan istek reddedildi | userId: ${userId}`);
      return NextResponse.json({ error: "Geçersiz istek: Mağaza ürün kimliği gereklidir." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, credits: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // 🛡️ Backend'deki paket tanımından jeton miktarını al — client değerine ASLA güvenme
    const pkg = await prisma.creditPackage.findFirst({
      where: {
        OR: [
          { appleProductId: productId },
          { googleProductId: productId },
        ],
        isActive: true,
      },
    });

    if (!pkg) {
      console.warn(`[JetonConfirm] 🚫 Bilinmeyen productId reddedildi: ${productId} | userId: ${userId}`);
      return NextResponse.json({ error: "Tanımsız ürün. İşlem reddedildi." }, { status: 403 });
    }

    const confirmedJetons = pkg.jetons; // SADECE backend tanımı geçerli

    // 🛡️ Rate limiting — aynı kullanıcı son 10 saniyede aynı ürünü tekrar onaylatamaz
    const recentOrder = await prisma.order.findFirst({
      where: {
        userId,
        notes: { contains: productId },
        createdAt: { gte: new Date(Date.now() - 10_000) },
      },
    });

    if (recentOrder) {
      console.warn(`[JetonConfirm] 🚫 Duplicate confirm engellendi | userId: ${userId} | productId: ${productId}`);
      return NextResponse.json({ error: "Bu işlem zaten onaylandı." }, { status: 429 });
    }

    // Kullanıcının jetonlarını artır
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: confirmedJetons } },
      select: { credits: true },
    });

    // Sipariş kaydı oluştur
    const orderNumber = `JTN-CONFIRM-${Date.now().toString(36).toUpperCase()}`;
    await prisma.order.create({
      data: {
        orderNumber,
        userId,
        amount: 0,
        status: "COMPLETED",
        orderType: "JETON",
        notes: `[CONFIRM] ${confirmedJetons} Jeton | ${source || "UNKNOWN"} | ${productId || ""}`,
      },
    });

    console.log(`[JetonConfirm] ✅ ${user.email} → +${confirmedJetons} jeton | Toplam: ${updated.credits}`);

    return NextResponse.json({
      success: true,
      jetons: confirmedJetons,
      totalJetons: updated.credits,
    });
  } catch (error: any) {
    console.error("[JetonConfirm] ❌ Hata:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
