import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBulkNotifications } from "@/lib/services/notificationService";
import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import nodemailer from "nodemailer";


import { sendDynamicWaMessage } from "@/lib/whatsappSender";

const TX_FROM = process.env.SMTP_TX_FROM || "Kamulog <iletisim@kamulogstk.net>";

function getTxTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_TX_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_TX_PORT || "587"),
    secure: false,
    auth: { user: process.env.SMTP_TX_USER, pass: process.env.SMTP_TX_PASS },
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

    const { decisionId, channels } = await request.json();
    if (!decisionId || !channels?.length) return NextResponse.json({ error: "decisionId ve channels gerekli" }, { status: 400 });

    // Kararı getir
    const decision = await prisma.sTKBoardDecision.findFirst({ where: { id: decisionId, stkId: stk.id } });
    if (!decision) return NextResponse.json({ error: "Karar bulunamadı" }, { status: 404 });

    // STK üyelerini getir (başvuru onaylananlar + manuel eklenenler)
    const [applications, members] = await Promise.all([
      prisma.sTKApplication.findMany({ where: { stkId: stk.id, status: "APPROVED" }, select: { userId: true, name: true, email: true, phone: true } }),
      prisma.member.findMany({ where: { stkId: stk.id, status: { not: "SUSPENDED" } }, select: { name: true, surname: true, email: true, phone: true } }),
    ]);

    const title = `📜 Dernek Kararı: ${decision.subject}`;
    const body = decision.content || decision.subject;
    let sent = { push: 0, email: 0, whatsapp: 0, sms: 0 };

    // Push Bildirim
    if (channels.includes("push")) {
      const userIds = applications.filter(a => a.userId).map(a => a.userId!);
      if (userIds.length > 0) {
        await createBulkNotifications(userIds, title, body, "SYSTEM", { category: "stk_decision", decisionId });
        sent.push = userIds.length;
      }
    }

    // E-posta
    if (channels.includes("email")) {
      const emails = [
        ...applications.filter(a => a.email).map(a => a.email),
        ...members.filter(m => m.email).map(m => m.email),
      ];
      if (emails.length > 0) {
        const transporter = getTxTransporter();
        for (const email of emails) {
          try {
            await transporter.sendMail({
              from: TX_FROM, to: email,
              subject: `📜 ${stk.name} — ${decision.subject}`,
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><div style="background:linear-gradient(135deg,#6366F1,#8B5CF6);padding:20px;border-radius:12px 12px 0 0;text-align:center;"><h1 style="color:#fff;margin:0;font-size:18px;">📜 Dernek Kararı</h1></div><div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;"><p style="color:#374151;font-size:15px;font-weight:bold;">${decision.subject}</p><p style="color:#374151;font-size:14px;line-height:1.6;">${body}</p><p style="color:#6b7280;font-size:12px;margin-top:16px;">Karar No: ${decision.decisionNumber} | Tarih: ${new Date(decision.date).toLocaleDateString("tr-TR")}</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"><p style="color:#9ca3af;font-size:11px;text-align:center;">${stk.name} — Kamulog STK Yönetim Paneli</p></div></div>`,
            });
            sent.email++;
          } catch (e) { console.error("[Decision Email]:", e); }
        }
      }
    }

    // WhatsApp
    if (channels.includes("whatsapp")) {
      const phones = [
        ...applications.filter(a => a.phone).map(a => a.phone),
        ...members.filter(m => m.phone).map(m => m.phone),
      ];
      for (const phone of phones) {
        try {
          const msg = `📜 *${stk.name} — Dernek Kararı*\n\n*${decision.subject}*\n\n${body}\n\n📌 Karar No: ${decision.decisionNumber}\n📅 Tarih: ${new Date(decision.date).toLocaleDateString("tr-TR")}`;
          const r = await sendDynamicWaMessage(phone, msg, stk.id);
          if (r.sent) sent.whatsapp++;
        } catch (e) { console.error("[Decision WhatsApp]:", e); }
      }
    }

    // Log kaydı
    console.log(`[STK Decision Notify] stkId: ${stk.id}, decisionId: ${decisionId}, channels: ${channels.join(",")}, sent:`, sent);

    return NextResponse.json({ success: true, sent });
  } catch (error) {
    console.error("[STK Decision Notify]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
