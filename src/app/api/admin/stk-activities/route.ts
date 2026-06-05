import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createNotification } from "@/lib/services/notificationService";
import nodemailer from "nodemailer";

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  return role === "ADMIN" || role === "MODERATOR" || role === "STK_MANAGER";
}

// ─── SMTP Transporter (iletisim@kamulogstk.net) ─────────────
function getTxTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_TX_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_TX_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_TX_USER,
      pass: process.env.SMTP_TX_PASS,
    },
  });
}
const TX_FROM = process.env.SMTP_TX_FROM || "Kamulog <iletisim@kamulogstk.net>";
import { sendDynamicWaMessage } from "@/lib/whatsappSender";

/**
 * GET /api/admin/stk-activities — Tüm faaliyetleri listele (admin)
 */
export async function GET(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const stkId = searchParams.get("stkId");
  const where = stkId ? { stkId } : {};

  const activities = await prisma.sTKActivity.findMany({
    where,
    include: { stk: { select: { name: true, slug: true, logo: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ success: true, activities });
}

/**
 * POST /api/admin/stk-activities — Yeni faaliyet ekle + Premium haberleşme motoru
 */
export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { stkId, title, content, imageUrl, sendPush, sendEmail, sendWhatsapp } = body;

    if (!stkId || !title || !content) {
      return NextResponse.json({ error: "STK, başlık ve içerik zorunludur" }, { status: 400 });
    }

    // STK var mı?
    const stk = await prisma.sTKOrganization.findUnique({
      where: { id: stkId },
      select: { id: true, name: true, slug: true },
    });
    if (!stk) {
      return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });
    }

    // Faaliyeti kaydet
    const activity = await prisma.sTKActivity.create({
      data: { stkId, title, content, imageUrl: imageUrl || null, isPublished: true },
    });

    let pushCount = 0;
    let emailCount = 0;
    let whatsappCount = 0;

    const anyChannel = sendPush || sendEmail || sendWhatsapp;
    const quotaWarnings: string[] = [];

    if (anyChannel) {
      // ═══════════════════════════════════════════════════════════
      // 🔒 BETON GÜVENLİK: SADECE bu STK'nın AKTİF üyeleri
      // ═══════════════════════════════════════════════════════════
      const activeMembers = await prisma.sTKApplication.findMany({
        where: {
          stkId,
          OR: [
            { membershipStatus: "ACTIVE" },
            { status: "APPROVED" },
          ],
          userId: { not: null },
        },
        select: { userId: true, name: true, email: true, phone: true },
      });

      // Duplicate userId temizleme
      const seen = new Set<string>();
      const uniqueMembers = activeMembers.filter(m => {
        if (seen.has(m.userId!)) return false;
        seen.add(m.userId!);
        return true;
      });

      // ═══ KOTA KONTROLÜ — gönderim öncesi kredi yeterliliği ═══
      const stkCredits = await prisma.sTKOrganization.findUnique({
        where: { id: stkId },
        select: { pushCredits: true, emailCredits: true, whatsappCredits: true },
      });
      const targetCount = uniqueMembers.length;
      let pushAllowed = sendPush && (stkCredits?.pushCredits ?? 0) >= targetCount;
      let emailAllowed = sendEmail && (stkCredits?.emailCredits ?? 0) >= targetCount;
      let waAllowed = sendWhatsapp && (stkCredits?.whatsappCredits ?? 0) >= targetCount;
      if (sendPush && !pushAllowed) quotaWarnings.push(`Push kredisi yetersiz (mevcut: ${stkCredits?.pushCredits ?? 0}, gerekli: ${targetCount})`);
      if (sendEmail && !emailAllowed) quotaWarnings.push(`E-posta kredisi yetersiz (mevcut: ${stkCredits?.emailCredits ?? 0}, gerekli: ${targetCount})`);
      if (sendWhatsapp && !waAllowed) quotaWarnings.push(`WhatsApp kredisi yetersiz (mevcut: ${stkCredits?.whatsappCredits ?? 0}, gerekli: ${targetCount})`);

      // Kotaları düş
      const decrementData: Record<string, { decrement: number }> = {};
      if (pushAllowed) decrementData.pushCredits = { decrement: targetCount };
      if (emailAllowed) decrementData.emailCredits = { decrement: targetCount };
      if (waAllowed) decrementData.whatsappCredits = { decrement: targetCount };
      if (Object.keys(decrementData).length > 0) {
        await prisma.sTKOrganization.update({ where: { id: stkId }, data: decrementData });
      }

      // ╔═══════════════════════════════════════════════════════╗
      // ║  🛡️  HEDEF ONAYI — AUDIT LOG                        ║
      // ╚═══════════════════════════════════════════════════════╝
      console.log(`\n═══════════════════════════════════════════════════════`);
      console.log(`[HEDEF ONAYI]: Bu faaliyet mesajı SADECE STK_ID="${stkId}" (${stk.name}) kuruluşuna ait ${uniqueMembers.length} adet AKTİF üyeye gönderiliyor.`);
      console.log(`[KANALLAR]: Push=${!!sendPush} | Email=${!!sendEmail} | WhatsApp=${!!sendWhatsapp}`);
      console.log(`═══════════════════════════════════════════════════════\n`);

      const deepLink = `https://kamulog.net/api/public/stk/${stk.slug}`;

      // ─── 1. PUSH BİLDİRİM ─────────────────────────────────
      if (pushAllowed) {
        for (const member of uniqueMembers) {
          try {
            await createNotification({
              userId: member.userId!,
              title: `📢 ${stk.name}`,
              message: `Yeni faaliyet yayınlandı: ${title}`,
              type: "STK_CAMPAIGN",
              payload: {
                category: "stk_activity",
                stkSlug: stk.slug,
                activityId: activity.id,
                route: `/community/stk-detail/${stk.slug}`,
              },
            });
            pushCount++;
          } catch (e) {
            console.error(`[Push] ❌ Hata (userId: ${member.userId}):`, e);
          }
        }
        console.log(`[Push] ✅ ${pushCount}/${uniqueMembers.length} üyeye gönderildi`);
      }

      // ─── 2. E-POSTA ────────────────────────────────────────
      if (emailAllowed) {
        const transporter = getTxTransporter();
        for (const member of uniqueMembers) {
          if (!member.email) continue;
          try {
            await transporter.sendMail({
              from: TX_FROM,
              to: member.email,
              subject: `📢 ${stk.name} — ${title}`,
              html: buildActivityEmailHtml({
                stkName: stk.name,
                activityTitle: title,
                activityContent: content,
                memberName: member.name,
                deepLink,
                imageUrl: imageUrl || null,
              }),
            });
            emailCount++;
          } catch (e) {
            console.error(`[Email] ❌ Hata (${member.email}):`, e);
          }
        }
        console.log(`[Email] ✅ ${emailCount}/${uniqueMembers.length} üyeye gönderildi`);
      }

      // ─── 3. WHATSAPP ───────────────────────────────────────
      if (waAllowed) {
        for (const member of uniqueMembers) {
          if (!member.phone) continue;
          const phone = member.phone.replace(/\D/g, "").replace(/^0/, "90");
          const waMessage = `📢 Sayın Üyemiz,\n\nÜyesi olduğunuz *${stk.name}* yeni bir faaliyet yayınladı:\n\n📌 *${title}*\n\n${content.length > 200 ? content.substring(0, 200) + "..." : content}\n\nDetayları incelemek için Kamulog uygulamanızı açabilirsiniz. 📲`;
          try {
            const r = await sendDynamicWaMessage(phone, waMessage, stkId);
            if (r.sent) {
              whatsappCount++;
            } else {
              console.warn(`[WhatsApp] ⚠️ Gönderilemedi → ${phone}`);
            }
          } catch (e) {
            console.error(`[WhatsApp] ❌ Hata (${phone}):`, e);
          }
        }
        console.log(`[WhatsApp] ✅ ${whatsappCount}/${uniqueMembers.length} üyeye gönderildi`);
      }

      console.log(`[STK Activity] 📊 Özet — Push: ${pushCount} | Email: ${emailCount} | WhatsApp: ${whatsappCount} — STK: ${stk.name}\n`);
    }

    return NextResponse.json({
      success: true,
      activity,
      pushCount,
      emailCount,
      whatsappCount,
      quotaWarnings: quotaWarnings.length > 0 ? quotaWarnings : undefined,
    });
  } catch (error: any) {
    console.error("[STK Activity] Hata:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/stk-activities — Faaliyet sil
 */
export async function DELETE(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID gerekli" }, { status: 400 });
  }

  await prisma.sTKActivity.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// ══════════════════════════════════════════════════════════════
// 💎 PREMIUM HTML E-POSTA ŞABLONU
// ══════════════════════════════════════════════════════════════

function buildActivityEmailHtml(params: {
  stkName: string;
  activityTitle: string;
  activityContent: string;
  memberName: string;
  deepLink: string;
  imageUrl: string | null;
}): string {
  const { stkName, activityTitle, activityContent, memberName, deepLink, imageUrl } = params;
  return `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header Gradient -->
        <tr><td style="background:linear-gradient(135deg,#0A1628 0%,#1E3A5F 50%,#0891B2 100%);padding:32px 24px;text-align:center;">
          <h1 style="color:#ffffff;font-size:22px;margin:0 0 6px 0;font-weight:800;">📢 ${stkName}</h1>
          <p style="color:#94a3b8;font-size:13px;margin:0;">Yeni Faaliyet Bildirimi</p>
        </td></tr>

        ${imageUrl ? `
        <!-- Faaliyet Görseli -->
        <tr><td>
          <img src="${imageUrl}" alt="${activityTitle}" style="width:100%;max-height:280px;object-fit:cover;display:block;" />
        </td></tr>
        ` : ""}

        <!-- İçerik -->
        <tr><td style="padding:28px 24px;">
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
            Merhaba <strong>${memberName}</strong>,
          </p>

          <h2 style="color:#0f172a;font-size:18px;font-weight:800;margin:0 0 12px 0;">${activityTitle}</h2>

          <div style="background:#f8fafc;border-left:4px solid #0891B2;padding:16px;border-radius:0 8px 8px 0;margin:0 0 24px 0;">
            <p style="color:#334155;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap;">${activityContent.length > 500 ? activityContent.substring(0, 500) + "..." : activityContent}</p>
          </div>

          <!-- CTA Butonu -->
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${deepLink}" target="_blank"
              style="display:inline-block;background:linear-gradient(135deg,#0891B2,#06B6D4);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 40px;border-radius:12px;letter-spacing:0.3px;">
              📲 Kamulog Uygulamasında Görüntüle
            </a>
          </td></tr></table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:20px 24px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#94a3b8;font-size:11px;margin:0;line-height:1.6;">
            Bu e-posta, <strong>${stkName}</strong> kuruluşunun aktif üyelerine gönderilmiştir.<br/>
            © ${new Date().getFullYear()} Kamulog · Kamu Çalışanlarının Süper Uygulaması
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
