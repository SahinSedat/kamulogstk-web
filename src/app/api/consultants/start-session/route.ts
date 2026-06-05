import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/consultants/start-session
 * Body: { consultantId }
 * Kullanıcının jetonunu düşür, danışmana ekle, conversation başlat
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const userId = req.headers.get("x-user-id") || authHeader.replace(/^(Bearer|Token)\s+/i, "");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { consultantId } = await req.json();
    if (!consultantId) return NextResponse.json({ error: "consultantId gerekli" }, { status: 400 });

    const [user, consultant] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, credits: true } }),
      prisma.consultant.findUnique({ where: { id: consultantId }, select: { id: true, sessionFeeJeton: true, category: true } }),
    ]);

    if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    if (!consultant) return NextResponse.json({ error: "Danışman bulunamadı" }, { status: 404 });

    const fee = consultant.sessionFeeJeton;
    if (user.credits < fee) {
      return NextResponse.json({ error: "INSUFFICIENT_CREDITS", required: fee, current: user.credits }, { status: 403 });
    }

    // Mevcut aktif conversation var mı? (sonlanmış olanları atla)
    let conversation = await prisma.conversation.findFirst({
      where: { userId: user.id, consultantId: consultant.id, isEnded: false },
      select: { id: true },
    });

    // Transaction: jeton düş + danışmana ekle + conversation oluştur
    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { credits: { decrement: fee } } });
      await tx.consultant.update({ where: { id: consultantId }, data: { consultantCredits: { increment: fee } } });

      if (!conversation) {
        conversation = await tx.conversation.create({
          data: { userId: user.id, consultantId: consultant.id, category: consultant.category || "Genel" },
          select: { id: true },
        });
      }

      return conversation;
    });

    // Danışmana bildirim gönder (fire & forget — response'u bekletme)
    notifyConsultant(consultantId, userId).catch(() => {});

    return NextResponse.json({
      success: true,
      conversationId: result!.id,
      remainingCredits: user.credits - fee,
      charged: fee,
    });
  } catch (error: any) {
    console.error("[start-session]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

/**
 * Danışmana yeni görüşme bildirimi gönder (E-posta + Push)
 * Sadece start-session anında 1 kez tetiklenir
 */
async function notifyConsultant(consultantId: string, userId: string) {
  try {
    // Danışman bilgilerini al
    const consultant = await prisma.consultant.findUnique({
      where: { id: consultantId },
      select: { userId: true, name: true },
    });
    if (!consultant?.userId) return;

    const consultantUser = await prisma.user.findUnique({
      where: { id: consultant.userId },
      select: { email: true, name: true, firstName: true },
    });
    if (!consultantUser) return;

    const requestingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, firstName: true, lastName: true },
    });
    const userName = requestingUser?.name || `${requestingUser?.firstName || ''} ${requestingUser?.lastName || ''}`.trim() || 'Bir kullanıcı';

    // E-posta bildirimi
    if (consultantUser.email) {
      try {
        const nodemailer = require("nodemailer");
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_TX_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_TX_PORT || "587"),
          secure: false,
          auth: { user: process.env.SMTP_TX_USER, pass: process.env.SMTP_TX_PASS },
        });

        await transporter.sendMail({
          from: process.env.SMTP_TX_FROM || "Kamulog <iletisim@kamulogstk.net>",
          to: consultantUser.email,
          subject: "🔔 Yeni Danışmanlık Talebi — Kamulog",
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;">
              <h2 style="color:#1e40af;margin-bottom:16px;">🔔 Yeni Danışmanlık Talebi</h2>
              <p>Sayın <strong>${consultantUser.firstName || consultantUser.name || 'Danışman'}</strong>,</p>
              <p><strong>${userName}</strong> sizinle danışmanlık görüşmesi başlatmak istiyor.</p>
              <p style="margin-top:16px;padding:12px;background:#dbeafe;border-radius:8px;color:#1e3a5f;">
                Lütfen Kamulog uygulamasını açarak mesajlarınızı kontrol edin.
              </p>
              <p style="color:#6b7280;font-size:12px;margin-top:24px;">Bu e-posta Kamulog tarafından otomatik gönderilmiştir.</p>
            </div>
          `,
        });
        console.log(`[start-session] Danışmana e-posta gönderildi: ${consultantUser.email}`);
      } catch (emailErr) {
        console.error("[start-session] E-posta hatası:", emailErr);
      }
    }

    // Push bildirim (in-app notification)
    try {
      await prisma.notification.create({
        data: {
          userId: consultant.userId,
          title: "🔔 Yeni Danışmanlık Talebi",
          message: `${userName} sizinle danışmanlık görüşmesi başlatmak istiyor.`,
          type: "CONSULTANT_REQUEST",
        },
      });
    } catch (notifErr) {
      console.error("[start-session] Push bildirim hatası:", notifErr);
    }
  } catch (e) {
    console.error("[start-session] notifyConsultant hatası:", e);
  }
}
