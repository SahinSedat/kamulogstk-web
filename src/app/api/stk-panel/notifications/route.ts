import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


interface VirtualNotification {
  id: string;
  type: "NEW_MEMBER" | "PAYMENT" | "RESIGNATION" | "ASSEMBLY" | "DECISION";
  title: string;
  message: string;
  date: string;
  icon: string;
}

// GET /api/stk-panel/notifications — Sanal bildirimler (son etkinlikler)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const notifications: VirtualNotification[] = [];

    // 1. Tüm başvuru aktiviteleri (tüm statusler)
    const recentApps = await prisma.sTKApplication.findMany({
      where: { stkId: stk.id },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { id: true, name: true, status: true, createdAt: true, updatedAt: true },
    });
    const appStatusMap: Record<string, { title: string; icon: string }> = {
      PENDING: { title: "Yeni Üyelik Başvurusu", icon: "📝" },
      APPLIED: { title: "Yeni Üyelik Başvurusu", icon: "📝" },
      APPROVED: { title: "Üyelik Onaylandı", icon: "✅" },
      REJECTED: { title: "Üyelik Reddedildi", icon: "❌" },
      RESIGNED: { title: "Üye İstifa Etti", icon: "🚪" },
      RESIGN_PENDING: { title: "İstifa Talebi", icon: "🚪" },
      SUSPENDED: { title: "Üyelik Askıya Alındı", icon: "⛔" },
    };
    for (const app of recentApps) {
      const info = appStatusMap[app.status] || { title: `Başvuru: ${app.status}`, icon: "👤" };
      notifications.push({
        id: `app_${app.id}`,
        type: "NEW_MEMBER",
        title: info.title,
        message: `${app.name} — ${info.title.toLowerCase()}.`,
        date: (app.updatedAt || app.createdAt).toISOString(),
        icon: info.icon,
      });
    }

    // 2. Ödeme raporları ve dekont yükleme bildirimleri
    try {
      const payments = await prisma.sTKPaymentReport.findMany({
        where: { application: { stkId: stk.id } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, amount: true, status: true, receiptUrl: true, paymentType: true, createdAt: true, application: { select: { name: true } } },
      });
      for (const p of payments) {
        if (p.status === "PENDING") {
          if (p.receiptUrl) {
            notifications.push({
              id: `receipt_${p.id}`,
              type: "PAYMENT",
              title: "📎 Dekont Yüklendi",
              message: `${p.application?.name || "Bir üye"} ${p.amount?.toFixed(2) || "0"} TL ödeme dekontu yükledi. Onay bekliyor.`,
              date: p.createdAt.toISOString(),
              icon: "📎",
            });
          } else {
            notifications.push({
              id: `pay_${p.id}`,
              type: "PAYMENT",
              title: "Yeni Ödeme Bildirimi",
              message: `${p.application?.name || "Bir üye"} ${p.amount?.toFixed(2) || "0"} TL ödeme bildirdi. Onay bekliyor.`,
              date: p.createdAt.toISOString(),
              icon: "💰",
            });
          }
        }
      }
    } catch { /* tablo yoksa atla */ }

    // 3. Faaliyetler (son eklenen)
    try {
      const activities = await prisma.sTKActivity.findMany({
        where: { stkId: stk.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, title: true, createdAt: true },
      });
      for (const act of activities) {
        notifications.push({
          id: `act_${act.id}`,
          type: "DECISION",
          title: "Faaliyet Yayınlandı",
          message: `📢 ${act.title}`,
          date: act.createdAt.toISOString(),
          icon: "📅",
        });
      }
    } catch { /* tablo yoksa atla */ }

    // 4. Yaklaşan genel kurullar (3 gün ve altı)
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const upcomingAssemblies = await prisma.sTKGeneralAssembly.findMany({
      where: { stkId: stk.id, status: "PLANNED", date: { gte: now, lte: threeDaysLater } },
      select: { id: true, assemblyNumber: true, date: true, location: true },
    });
    for (const a of upcomingAssemblies) {
      const days = Math.ceil((new Date(a.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      notifications.push({
        id: `asm_${a.id}`,
        type: "ASSEMBLY",
        title: "Yaklaşan Genel Kurul",
        message: `${a.assemblyNumber}. Genel Kurul ${days === 0 ? "bugün" : `${days} gün sonra`} — ${a.location}`,
        date: now.toISOString(),
        icon: "🏛️",
      });
    }

    // 5. Son kararlar (son 7 gün)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentDecisions = await prisma.sTKBoardDecision.findMany({
      where: { stkId: stk.id, createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, decisionNumber: true, subject: true, createdAt: true },
    });
    for (const d of recentDecisions) {
      notifications.push({
        id: `dec_${d.id}`,
        type: "DECISION",
        title: "Yeni Karar",
        message: `Karar ${d.decisionNumber}: ${d.subject}`,
        date: d.createdAt.toISOString(),
        icon: "📋",
      });
    }

    // Tarihe göre sırala
    notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      data: notifications.slice(0, 50),
      unreadCount: notifications.length,
    });
  } catch (error) {
    console.error("[STK Notifications GET]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
