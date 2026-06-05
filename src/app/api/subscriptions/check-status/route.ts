import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/subscriptions/check-status
 * Kullanıcının backend DB'deki abonelik durumunu kontrol eder.
 * Admin panelinden verilen abonelikleri de kapsar.
 * Mobil "Geri Yükle" butonu bu endpoint'i çağırır.
 */
export async function GET(req: NextRequest) {
  try {
    // Kullanıcı çözümleme (mobil auth)
    const auth = req.headers.get("authorization");
    let userId: string | null = null;

    if (auth) {
      const parts = auth.split(" ");
      const token = parts.length === 2 ? parts[1] : auth;
      if (token && token.length > 5) {
        const user = await prisma.user.findUnique({
          where: { id: token },
          select: { id: true },
        });
        userId = user?.id || null;
      }
    }

    if (!userId) {
      const phone = req.headers.get("x-user-phone");
      if (phone) {
        const user = await prisma.user.findFirst({
          where: { OR: [{ phone }, { phoneNumber: phone }] },
          select: { id: true },
        });
        userId = user?.id || null;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Yetkilendirme gerekli." }, { status: 401 });
    }

    // DB'den kullanıcı ve abonelik bilgilerini çek
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isPremium: true,
        premiumUntil: true,
        subscriptionTier: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }

    // Aktif abonelik var mı?
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: "active",
        endsAt: { gt: new Date() },
      },
      include: {
        plan: { select: { name: true, interval: true } },
      },
      orderBy: { endsAt: "desc" },
    });

    // Premium süresi geçmiş mi kontrol
    const now = new Date();
    const premiumExpired = user.premiumUntil && user.premiumUntil < now;

    // Eğer premium süresi geçmişse ama hala isPremium=true ise, güncelle
    if (premiumExpired && user.isPremium && !activeSubscription) {
      await prisma.user.update({
        where: { id: userId },
        data: { isPremium: false, subscriptionTier: null },
      });

      return NextResponse.json({
        isPremium: false,
        restored: false,
        message: "Premium süreniz dolmuş.",
      });
    }

    // Aktif abonelik varsa restore başarılı
    if (user.isPremium && (activeSubscription || (user.premiumUntil && user.premiumUntil > now))) {
      return NextResponse.json({
        isPremium: true,
        restored: true,
        premiumUntil: user.premiumUntil?.toISOString() || null,
        planName: activeSubscription?.plan?.name || user.subscriptionTier || "Premium",
        message: "Premium aboneliğiniz aktif!",
      });
    }

    // Premium değilse
    return NextResponse.json({
      isPremium: false,
      restored: false,
      message: "Aktif abonelik bulunamadı.",
    });
  } catch (error) {
    console.error("Subscription check error:", error);
    return NextResponse.json({ error: "Durum kontrol edilemedi." }, { status: 500 });
  }
}
