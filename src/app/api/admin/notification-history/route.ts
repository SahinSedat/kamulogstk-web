import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/admin/notification-history — Geçmiş bildirim kampanyaları
export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  const campaigns = await prisma.notificationCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      content: true,
      channels: true,
      audience: true,
      sentCount: true,
      status: true,
      createdAt: true,
      stk: { select: { name: true } },
    },
  });

  return NextResponse.json({ success: true, data: campaigns });
}

/**
 * DELETE /api/admin/notification-history?id=xxx
 * Bildirim kampanyasını ve ilişkili tüm kullanıcı bildirimlerini sil
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id parametresi gerekli" }, { status: 400 });
  }

  try {
    // Kampanya bilgisini al
    const campaign = await prisma.notificationCampaign.findUnique({
      where: { id },
      select: { id: true, title: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Kampanya bulunamadı" }, { status: 404 });
    }

    // Kullanıcıların bildirim listesinden de sil
    // Notification.payload içinde campaignId veya title eşleşen kayıtları temizle
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { payload: { path: ["campaignId"], equals: id } },
          { title: campaign.title, type: "SYSTEM" },
        ],
      },
    });

    // Kampanya kaydını sil
    await prisma.notificationCampaign.delete({ where: { id } });

    return NextResponse.json({ 
      success: true, 
      message: "Bildirim kampanyası ve ilişkili tüm kullanıcı bildirimleri silindi." 
    });
  } catch (error: any) {
    console.error("[NotifHistory DELETE] Hata:", error);
    return NextResponse.json({ error: error.message || "Sunucu hatası" }, { status: 500 });
  }
}
