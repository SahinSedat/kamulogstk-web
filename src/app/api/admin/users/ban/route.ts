import { createAdminNotification } from "@/lib/services/adminNotificationService";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/admin/users/ban
 * Kullanıcıya forum veya becayiş kısıtlaması uygula
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { userId, banType, durationDays, reason } = await req.json();
  if (!userId || !banType || !reason) {
    return NextResponse.json({ error: "userId, banType, reason zorunlu" }, { status: 400 });
  }

  const banUntil = durationDays === 0 
    ? new Date("2099-12-31") // Sınırsız
    : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  const data: Record<string, unknown> = { banReason: reason };
  if (banType === "forum" || banType === "both") data.banForumUntil = banUntil;
  if (banType === "becayis" || banType === "both") data.banBecayisUntil = banUntil;

  const user = await prisma.user.update({ where: { id: userId }, data });

  // 🔔 Admin Bildirim — Ban
  createAdminNotification({
    type: "USER_BAN",
    title: "Kullanıcı Kısıtlaması",
    message: `Kullanıcıya ${banType} kısıtlaması uygulandı. Sebep: ${reason}`,
    userId: userId,
    metadata: { banType, durationDays, reason },
  }).catch(() => {});
  return NextResponse.json({ success: true, user: { id: user.id, banForumUntil: user.banForumUntil, banBecayisUntil: user.banBecayisUntil, banReason: user.banReason } });
}

/**
 * DELETE /api/admin/users/ban?userId=xxx
 * Kısıtlamayı kaldır
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId gerekli" }, { status: 400 });

  await prisma.user.update({
    where: { id: userId },
    data: { banForumUntil: null, banBecayisUntil: null, banReason: null },
  });

  return NextResponse.json({ success: true, message: "Kısıtlama kaldırıldı" });
}
