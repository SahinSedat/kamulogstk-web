import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { firebaseMessaging } from "@/lib/firebase/firebaseAdmin";
import nodemailer from "nodemailer";
import { sendDynamicCampaignWa } from "@/lib/whatsappSender";

function getTxTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_TX_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_TX_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_TX_USER,
      pass: process.env.SMTP_TX_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

const TX_FROM = process.env.SMTP_TX_FROM || "Kamulog <iletisim@kamulogstk.net>";

export async function GET(req: NextRequest) {
  const stkId = req.nextUrl.searchParams.get("stkId");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (stkId) where.stkId = stkId;
  const campaigns = await prisma.notificationCampaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { stk: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ success: true, data: campaigns });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  await prisma.notificationCampaign.delete({ where: { id } });
  return NextResponse.json({ success: true, deleted: 1 });
}

// ═══════════════════════════════════════════════════════
// Yardımcı fonksiyonlar - tek kullanıcıya gönderim
// ═══════════════════════════════════════════════════════
async function sendEmail(to: string, title: string, content: string) {
  const transporter = getTxTransporter();
  await transporter.sendMail({
    from: TX_FROM,
    to,
    subject: `📢 ${title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:20px;">📢 ${title}</h1>
        </div>
        <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <p style="color:#374151;font-size:15px;line-height:1.6;white-space:pre-line;">${content}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
          <p style="color:#9ca3af;font-size:11px;text-align:center;">
            Bu e-posta Kamulog STK sistemi tarafından gönderilmiştir.<br>
            <a href="https://kamulog.net" style="color:#4F46E5;">kamulog.net</a>
          </p>
        </div>
      </div>
    `,
  });
}

async function sendWhatsApp(phone: string, title: string, content: string, stkId?: string | null) {
  return sendDynamicCampaignWa(phone, title, content, stkId);
}

async function sendPush(tokens: string[], title: string, content: string, stkSlug: string) {
  if (!firebaseMessaging || tokens.length === 0) return 0;
  let sent = 0;
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    try {
      const r = await firebaseMessaging.sendEachForMulticast({
        tokens: batch,
        notification: { title, body: content },
        data: {
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          type: "STK_CAMPAIGN",
          stkSlug: stkSlug || "",
          route: stkSlug ? `/community/stk-detail/${stkSlug}` : "/stk",
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "kamulog_notifications",
            icon: "ic_launcher_foreground",
            color: "#0891B2",
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          headers: {
            "apns-priority": "10",
            "apns-push-type": "alert",
          },
          payload: {
            aps: {
              sound: "default",
              badge: 1,
              "content-available": 1,
              "mutable-content": 1,
            },
          },
        },
      });
      sent += r.successCount;

      // Geçersiz token'ları temizle
      if (r.failureCount > 0) {
        r.responses.forEach(async (resp, idx) => {
          if (!resp.success) {
            const errCode = (resp.error as { code?: string })?.code || "";
            if (errCode.includes("not-registered") || errCode.includes("invalid")) {
              try {
                await prisma.user.updateMany({ where: { fcmToken: batch[idx] }, data: { fcmToken: null } });
                console.log(`[STK Campaign] 🗑️ Geçersiz token temizlendi`);
              } catch (_) { /* ignore */ }
            }
          }
        });
      }

      console.log(`[STK Campaign] ✅ FCM Push: ${r.successCount} başarılı, ${r.failureCount} başarısız`);
    } catch (e: unknown) {
      console.error("[STK Campaign] ❌ FCM batch hatası:", e instanceof Error ? e.message : e);
    }
  }
  return sent;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, content, channels, audience, stkId, individualMode, recipientPhone, recipientEmail } = body;

    console.log("[STK Campaign] Gelen veriler:", JSON.stringify({ title, channels, audience, stkId, individualMode }));

    if (!title || !content || !channels || channels.length === 0) {
      return NextResponse.json(
        { error: "Başlık, içerik ve en az bir kanal gereklidir." },
        { status: 400 }
      );
    }

    // ═══════════════════════════════════════
    // MÜNFERİT (TEKİL) KULLANICIYA GÖNDERİM
    // ═══════════════════════════════════════
    if (individualMode) {
      let emailSent = 0, whatsappSent = 0, pushSent = 0;
      const errors: string[] = [];

      // E-posta
      if (channels.includes("EMAIL") && recipientEmail) {
        try {
          await sendEmail(recipientEmail, title, content);
          emailSent++;
          console.log(`[STK Campaign] ✅ Münferit Email → ${recipientEmail}`);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`Email hatası: ${msg}`);
          console.error(`[STK Campaign] ❌ Münferit Email hatası:`, msg);
        }
      }

      // WhatsApp
      if (channels.includes("WHATSAPP") && recipientPhone) {
        try {
          const res = await sendWhatsApp(recipientPhone, title, content, stkId);
          if (res.sent) {
            whatsappSent++;
            console.log(`[STK Campaign] ✅ Münferit WhatsApp → ${recipientPhone}`);
          } else {
            errors.push(`WhatsApp gönderilemedi: ${recipientPhone}`);
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`WhatsApp hatası: ${msg}`);
          console.error(`[STK Campaign] ❌ Münferit WhatsApp hatası:`, msg);
        }
      }

      // Push bildirimi (kullanıcının FCM token'ı gerekli - phone veya email ile bul)
      if (channels.includes("PUSH")) {
        try {
          // Kullanıcıyı phone veya email ile bul
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const userWhere: any = {};
          if (recipientEmail) userWhere.email = recipientEmail;
          else if (recipientPhone) userWhere.phone = recipientPhone;

          if (Object.keys(userWhere).length > 0) {
            const user = await prisma.user.findFirst({
              where: userWhere,
              select: { id: true, fcmToken: true },
            });

            if (user?.fcmToken) {
              pushSent = await sendPush([user.fcmToken], title, content, "");
              console.log(`[STK Campaign] ✅ Münferit Push → token bulundu`);

              // In-app bildirim de oluştur
              await prisma.notification.create({
                data: {
                  userId: user.id,
                  title,
                  message: content,
                  type: "STK_CAMPAIGN",
                  payload: { type: "STK_CAMPAIGN" },
                },
              });
            } else {
              errors.push("Kullanıcının push token'ı bulunamadı");
            }
          }
        } catch (e: unknown) {
          console.error("[STK Campaign] ❌ Münferit Push hatası:", e);
          errors.push("Push hatası");
        }
      }

      // Kampanya kaydı (münferit)
      await prisma.notificationCampaign.create({
        data: {
          title,
          content,
          channels,
          audience: "INDIVIDUAL",
          stkId: stkId || null,
          status: "SENT",
          sentCount: 1,
        },
      });

      return NextResponse.json({
        success: true,
        sentCount: 1,
        stats: { push: pushSent, email: emailSent, whatsapp: whatsappSent },
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // ═══════════════════════════════════════
    // TOPLU KAMPANYA GÖNDERİMİ
    // ═══════════════════════════════════════
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // STK slug çek
    let stkSlug = "";
    if (stkId) {
      const stkOrg = await prisma.sTKOrganization.findUnique({
        where: { id: stkId },
        select: { slug: true },
      });
      stkSlug = stkOrg?.slug || "";
    }

    // ══════════════════════════════════════════════════════════
    // Hedef kitle: STKApplication + Member tablolarından birleş
    // ══════════════════════════════════════════════════════════
    interface Recipient { userId: string | null; email: string; phone: string; name: string; }
    let recipients: Recipient[] = [];

    if (audience === "ALL_MEMBERS") {
      // Tüm üyeler = onaylı + aktif (her iki tablo)
      const [apps, members] = await Promise.all([
        prisma.sTKApplication.findMany({
          where: { stkId: stkId || undefined, status: { in: ["APPROVED", "ACTIVE"] } },
          select: { userId: true, email: true, phone: true, name: true },
        }),
        prisma.member.findMany({
          where: { stkId: stkId || undefined, status: "ACTIVE" },
          select: { userId: true, email: true, phone: true, name: true },
        }),
      ]);
      recipients = [...apps, ...members.map(m => ({ ...m, name: `${m.name}` }))];

    } else if (audience === "ACTIVE") {
      // Sadece aktif/onaylı
      const [apps, members] = await Promise.all([
        prisma.sTKApplication.findMany({
          where: { stkId: stkId || undefined, status: { in: ["APPROVED", "ACTIVE"] } },
          select: { userId: true, email: true, phone: true, name: true },
        }),
        prisma.member.findMany({
          where: { stkId: stkId || undefined, status: "ACTIVE" },
          select: { userId: true, email: true, phone: true, name: true },
        }),
      ]);
      recipients = [...apps, ...members.map(m => ({ ...m, name: `${m.name}` }))];

    } else if (audience === "REJECTED") {
      // Sadece reddedilen başvurular
      const [apps, members] = await Promise.all([
        prisma.sTKApplication.findMany({
          where: { stkId: stkId || undefined, status: "REJECTED" },
          select: { userId: true, email: true, phone: true, name: true },
        }),
        prisma.member.findMany({
          where: { stkId: stkId || undefined, status: "REJECTED" },
          select: { userId: true, email: true, phone: true, name: true },
        }),
      ]);
      recipients = [...apps, ...members.map(m => ({ ...m, name: `${m.name}` }))];

    } else if (audience === "PENDING") {
      // Beklemede olan başvurular
      const [apps, members] = await Promise.all([
        prisma.sTKApplication.findMany({
          where: { stkId: stkId || undefined, status: { in: ["PENDING", "APPLIED"] } },
          select: { userId: true, email: true, phone: true, name: true },
        }),
        prisma.member.findMany({
          where: { stkId: stkId || undefined, status: { in: ["PENDING", "APPLIED"] } },
          select: { userId: true, email: true, phone: true, name: true },
        }),
      ]);
      recipients = [...apps, ...members.map(m => ({ ...m, name: `${m.name}` }))];

    } else if (audience === "OVERDUE_DUES") {
      // Aidatı gecikenler: onaylı üyeler + nextDuesDate geçmiş VEYA hiç onaylanmış ödemesi yok
      const apps = await prisma.sTKApplication.findMany({
        where: {
          stkId: stkId || undefined,
          status: { in: ["APPROVED", "ACTIVE"] },
          OR: [
            { nextDuesDate: { lt: now } },
            { nextDuesDate: null },
          ],
        },
        select: { userId: true, email: true, phone: true, name: true },
      });
      recipients = apps;

    } else if (audience === "UPCOMING_DUES") {
      // Aidatı yaklaşanlar: 3 gün içinde ödeme vadesi
      const apps = await prisma.sTKApplication.findMany({
        where: {
          stkId: stkId || undefined,
          status: { in: ["APPROVED", "ACTIVE"] },
          nextDuesDate: { gte: now, lte: threeDaysLater },
        },
        select: { userId: true, email: true, phone: true, name: true },
      });
      recipients = apps;

    } else if (audience === "INCOMPLETE_PROFILE") {
      // Profil eksik: aktif/onaylı üyeler AMA email veya phone eksik
      const [apps, members] = await Promise.all([
        prisma.sTKApplication.findMany({
          where: {
            stkId: stkId || undefined,
            status: { in: ["APPROVED", "ACTIVE"] },
            OR: [
              { email: { equals: "" } },
              { phone: { equals: "" } },
            ],
          },
          select: { userId: true, email: true, phone: true, name: true },
        }),
        prisma.member.findMany({
          where: {
            stkId: stkId || undefined,
            status: "ACTIVE",
            OR: [
              { tcKimlik: null },
              { tcKimlik: "" },
              { city: null },
              { city: "" },
            ],
          },
          select: { userId: true, email: true, phone: true, name: true },
        }),
      ]);
      recipients = [...apps, ...members.map(m => ({ ...m, name: `${m.name}` }))];

    } else {
      // Fallback — aktif/onaylı
      const apps = await prisma.sTKApplication.findMany({
        where: { stkId: stkId || undefined, status: { in: ["APPROVED", "ACTIVE"] } },
        select: { userId: true, email: true, phone: true, name: true },
      });
      recipients = apps;
    }

    // Telefon numarasına göre dedup (aynı kişiye çift gönderim engelle)
    const seen = new Set<string>();
    const targetMembers = recipients.filter(r => {
      const key = r.phone?.replace(/\D/g, "") || r.email || r.userId || "";
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const targetCount = targetMembers.length;
    console.log(`[STK Campaign] Hedef üye sayısı: ${targetCount}`);

    // ══════════════════════════════════════
    // KREDİ KONTROLÜ — stkId varsa kota düşümü yap
    // ══════════════════════════════════════
    if (stkId && targetCount > 0) {
      const stkOrg = await prisma.sTKOrganization.findUnique({
        where: { id: stkId },
        select: { smsCredits: true, whatsappCredits: true, pushCredits: true, emailCredits: true },
      });

      if (stkOrg) {
        const insufficientChannels: string[] = [];
        if (channels.includes("PUSH") && (stkOrg.pushCredits || 0) < targetCount) insufficientChannels.push(`Push (mevcut: ${stkOrg.pushCredits || 0}, gerekli: ${targetCount})`);
        if (channels.includes("WHATSAPP") && (stkOrg.whatsappCredits || 0) < targetCount) insufficientChannels.push(`WhatsApp (mevcut: ${stkOrg.whatsappCredits || 0}, gerekli: ${targetCount})`);
        if (channels.includes("EMAIL") && (stkOrg.emailCredits || 0) < targetCount) insufficientChannels.push(`E-posta (mevcut: ${stkOrg.emailCredits || 0}, gerekli: ${targetCount})`);

        if (insufficientChannels.length > 0) {
          return NextResponse.json({
            error: `Yetersiz kredi! ${insufficientChannels.join(", ")}. Market sayfasından kredi satın alabilirsiniz.`,
            creditInsufficient: true,
          }, { status: 400 });
        }

        // Kredi düşümü — sadece seçilen kanallar için
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const decrementData: any = {};
        if (channels.includes("PUSH")) decrementData.pushCredits = { decrement: targetCount };
        if (channels.includes("WHATSAPP")) decrementData.whatsappCredits = { decrement: targetCount };
        if (channels.includes("EMAIL")) decrementData.emailCredits = { decrement: targetCount };

        if (Object.keys(decrementData).length > 0) {
          await prisma.sTKOrganization.update({
            where: { id: stkId },
            data: decrementData,
          });
          console.log(`[STK Campaign] 💳 Kredi düşüldü: ${JSON.stringify(decrementData)} (STK: ${stkId})`);
        }
      }
    }

    let pushSent = 0, emailSent = 0, whatsappSent = 0;
    const errors: string[] = [];

    const userIds = targetMembers
      .map((m) => m.userId)
      .filter((id): id is string => !!id);

    // ══════════════════════════════════════
    // 1) IN-APP BİLDİRİM — SADECE PUSH seçiliyse
    // ══════════════════════════════════════
    if (channels.includes("PUSH") && userIds.length > 0) {
      try {
        await prisma.notification.createMany({
          data: userIds.map((userId) => ({
            userId,
            title,
            message: content,
            type: "STK_CAMPAIGN" as const,
            payload: {
              type: "STK_CAMPAIGN",
              stkSlug: stkSlug || undefined,
              route: stkSlug ? `/community/stk-detail/${stkSlug}` : "/stk",
            },
          })),
        });
        console.log(`[STK Campaign] ✅ In-app bildirim: ${userIds.length} kullanıcıya kaydedildi`);
      } catch (e) {
        console.error("[STK Campaign] In-app bildirim hatası:", e);
        errors.push("In-app bildirim hatası");
      }
    }

    // ══════════════════════════════════════
    // 2) E-POSTA — sadece EMAIL seçiliyse
    // ══════════════════════════════════════
    if (channels.includes("EMAIL")) {
      const emails = targetMembers.map((m) => m.email).filter((e) => e && e.includes("@"));
      console.log(`[STK Campaign] Email hedef: ${emails.length} adres`);

      for (const email of emails) {
        try {
          await sendEmail(email, title, content);
          emailSent++;
          console.log(`[STK Campaign] ✅ Email → ${email}`);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`[STK Campaign] ❌ Mail hatası → ${email}:`, msg);
          errors.push(`Email hatası: ${email}`);
        }
      }
    }

    // ══════════════════════════════════════
    // 3) WHATSAPP — sadece WHATSAPP seçiliyse
    // ══════════════════════════════════════
    if (channels.includes("WHATSAPP")) {
      const phones = targetMembers.map((m) => m.phone).filter((p) => p && p.length >= 10);
      console.log(`[STK Campaign] WhatsApp hedef: ${phones.length} numara`);

      for (const phone of phones) {
        try {
          const res = await sendWhatsApp(phone, title, content, stkId);
          if (res.sent) {
            whatsappSent++;
            console.log(`[STK Campaign] ✅ WhatsApp → ${phone}`);
          } else {
            console.warn(`[STK Campaign] ⚠️ WhatsApp gönderilemedi → ${phone}`);
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`[STK Campaign] ❌ WhatsApp hatası → ${phone}:`, msg);
          errors.push(`WhatsApp hatası: ${phone}`);
        }
      }
    }

    // ══════════════════════════════════════
    // 4) FCM PUSH — sadece PUSH seçiliyse
    // ══════════════════════════════════════
    if (channels.includes("PUSH") && userIds.length > 0 && firebaseMessaging) {
      try {
        const usersWithTokens = await prisma.user.findMany({
          where: { id: { in: userIds }, fcmToken: { not: null } },
          select: { fcmToken: true },
        });
        const tokens = usersWithTokens.map((u) => u.fcmToken!).filter((t) => t && t.length > 10);
        console.log(`[STK Campaign] FCM token sayısı: ${tokens.length}`);
        pushSent = await sendPush(tokens, title, content, stkSlug);
      } catch (e: unknown) {
        console.error("[STK Campaign] ❌ FCM genel hatası:", e instanceof Error ? e.message : e);
        errors.push("FCM Push hatası");
      }
    }

    // Kampanya kaydı
    const campaign = await prisma.notificationCampaign.create({
      data: {
        title,
        content,
        channels,
        audience: audience || "ALL_MEMBERS",
        stkId: stkId || null,
        status: "SENT",
        sentCount: targetCount,
      },
      include: { stk: { select: { id: true, name: true } } },
    });

    console.log(
      `[STK Campaign] ✅ Kampanya tamamlandı → ${targetCount} üye | Push: ${pushSent}, Email: ${emailSent}, WhatsApp: ${whatsappSent}`
    );

    return NextResponse.json({
      success: true,
      data: campaign,
      sentCount: targetCount,
      stats: { push: pushSent, email: emailSent, whatsapp: whatsappSent },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    console.error("Notification campaign error:", error);
    const errMsg = error instanceof Error ? error.message : "Kampanya oluşturulamadı.";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
