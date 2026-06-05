import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUser } from "@/lib/auth-helpers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/admin/subscriptions/cancel-request
 *
 * Kullanıcı abonelik iptal talebi gönderir.
 * - Kullanıcının premium durumu devam eder (premiumUntil'e kadar)
 * - Bir sonraki dönemde ücret alınmaz
 * - Admin panelde bildirim oluşturulur
 */
export async function POST(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    const authUser = await resolveUser(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "Yetkilendirme gerekli." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        isPremium: true,
        premiumUntil: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı." },
        { status: 404 }
      );
    }

    if (!user.isPremium) {
      return NextResponse.json(
        { error: "Aktif bir aboneliğiniz bulunmamaktadır." },
        { status: 400 }
      );
    }

    const userName =
      user.name ||
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      user.email ||
      "Bilinmeyen";

    // Mevcut aktif aboneliği bul
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: "active",
      },
      orderBy: { endsAt: "desc" },
    });

    // Aboneliği "cancelled" yap ama premiumUntil'e kadar devam etsin
    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "cancelled" },
      });
    }

    // Admin bildirim oluştur
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "SYSTEM",
        title: "Abonelik İptal Talebi",
        message: `${userName} kullanıcısı premium aboneliğini iptal etti. Abonelik ${
          user.premiumUntil
            ? new Date(user.premiumUntil).toLocaleDateString("tr-TR")
            : "bilinmeyen tarih"
        } tarihine kadar devam edecek.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "İptal talebiniz alındı. Kalan süreniz devam edecektir.",
      premiumUntil: user.premiumUntil,
    });
  } catch (error) {
    console.error("Abonelik iptal hatası:", error);
    return NextResponse.json(
      { error: "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
