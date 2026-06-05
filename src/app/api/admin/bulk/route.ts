import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Toplu İşlem API — Admin Panel
 *
 * POST body:
 *   { action: string, ids: string[] }
 *
 * Desteklenen action'lar:
 *   - "delete_orders"           → Siparişleri sil
 *   - "delete_subscriptions"    → Abonelikleri sil
 *   - "cancel_subscriptions"    → Abonelikleri iptal et
 *   - "remove_premium"          → Kullanıcılardan premiumu kaldır (ids = userId'ler)
 *   - "delete_plans"            → Planları kalıcı sil
 *   - "activate_plans"          → Planları aktif yap
 *   - "deactivate_plans"        → Planları pasif yap
 */
export async function POST(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    const { action, ids } = await req.json();

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "action ve ids[] gereklidir." }, { status: 400 });
    }

    let result: { count: number } = { count: 0 };

    switch (action) {
      case "delete_orders":
        result = await prisma.order.deleteMany({ where: { id: { in: ids } } });
        break;

      case "delete_subscriptions":
        result = await prisma.subscription.deleteMany({ where: { id: { in: ids } } });
        break;

      case "cancel_subscriptions":
        result = await prisma.subscription.updateMany({
          where: { id: { in: ids } },
          data: { status: "cancelled" },
        });
        break;

      case "remove_premium":
        result = await prisma.user.updateMany({
          where: { id: { in: ids } },
          data: {
            isPremium: false,
            premiumUntil: null,
            subscriptionTier: null,
          },
        });
        break;

      case "delete_plans": {
        // Standart (isDefault) planlar silinemez
        const defaultPlans = await prisma.subscriptionPlan.count({ where: { id: { in: ids }, isDefault: true } });
        if (defaultPlans > 0) {
          return NextResponse.json({ error: "Standart plan silinemez." }, { status: 403 });
        }
        // Bağlı subscription/order kontrolü
        const linkedSubs = await prisma.subscription.count({ where: { planId: { in: ids } } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const linkedOrders = await prisma.order.count({ where: { planId: { in: ids } } as any });
        if (linkedSubs > 0 || linkedOrders > 0) {
          return NextResponse.json(
            { error: `Bu planlara bağlı ${linkedSubs} abonelik ve ${linkedOrders} sipariş bulunuyor. Önce bunları silin.` },
            { status: 409 }
          );
        }
        result = await prisma.subscriptionPlan.deleteMany({ where: { id: { in: ids }, isDefault: false } });
        break;
      }

      case "activate_plans":
        result = await prisma.subscriptionPlan.updateMany({
          where: { id: { in: ids } },
          data: { isActive: true },
        });
        break;

      case "deactivate_plans":
        result = await prisma.subscriptionPlan.updateMany({
          where: { id: { in: ids }, isDefault: false },
          data: { isActive: false },
        });
        break;

      default:
        return NextResponse.json({ error: `Bilinmeyen action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, affected: result.count, action });
  } catch (error) {
    console.error("Bulk işlem hatası:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
