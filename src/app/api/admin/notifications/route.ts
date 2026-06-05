import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  return role === "ADMIN" || role === "MODERATOR";
}

/**
 * GET /api/admin/notifications
 * Admin bildirimlerini listeler + userId varsa kullanıcı bilgileriyle zenginleştirir
 */
export async function GET(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const unreadOnly = searchParams.get("unread") === "true";

  const where = unreadOnly ? { isRead: false } : {};

  const [notifications, unreadCount] = await Promise.all([
    prisma.adminNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.adminNotification.count({ where: { isRead: false } }),
  ]);

  // userId'leri topla ve kullanıcı bilgilerini çek (tek sorgu)
  const userIds = [...new Set(notifications.map(n => n.userId).filter(Boolean))] as string[];
  const usersMap: Record<string, { name: string | null; email: string | null }> = {};

  if (userIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });
    users.forEach(u => {
      usersMap[u.id] = { name: u.name, email: u.email };
    });
  }

  // Bildirimlere kullanıcı bilgisi ekle
  const enriched = notifications.map(n => ({
    ...n,
    userName: n.userId ? usersMap[n.userId]?.name || n.senderName || null : n.senderName || null,
    userEmail: n.userId ? usersMap[n.userId]?.email || null : null,
  }));

  return NextResponse.json({ notifications: enriched, unreadCount });
}

/**
 * PUT /api/admin/notifications
 * Bildirimi okundu olarak işaretle
 */
export async function PUT(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await req.json();

  if (body.markAllRead) {
    await prisma.adminNotification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  }

  if (body.id) {
    await prisma.adminNotification.update({
      where: { id: body.id },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "id veya markAllRead gerekli" }, { status: 400 });
}
