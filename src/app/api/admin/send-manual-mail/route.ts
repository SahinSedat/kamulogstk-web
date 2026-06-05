import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import nodemailer from "nodemailer";

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  return role === "ADMIN" || role === "MODERATOR";
}

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

export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const to = formData.get("to") as string;
    const subject = formData.get("subject") as string;
    const message = formData.get("message") as string;
    const attachment = formData.get("attachment") as File | null;

    if (!to || !subject || !message) {
      return NextResponse.json({ error: "Alıcı, konu ve mesaj zorunludur" }, { status: 400 });
    }

    const transporter = getTxTransporter();

    const mailOptions: any = {
      from: TX_FROM,
      to,
      subject,
      html: `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#0A1628 0%,#1E3A5F 50%,#0891B2 100%);padding:28px 24px;text-align:center;">
          <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:800;">Kamulog</h1>
        </td></tr>
        <tr><td style="padding:28px 24px;">
          <div style="color:#334155;font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}</div>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:16px 24px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">© ${new Date().getFullYear()} Kamulog · Kamu Çalışanlarının Süper Uygulaması</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    };

    // Dosya eki varsa ekle
    if (attachment && attachment.size > 0) {
      const buffer = Buffer.from(await attachment.arrayBuffer());
      mailOptions.attachments = [
        {
          filename: attachment.name,
          content: buffer,
          contentType: attachment.type,
        },
      ];
    }

    const result = await transporter.sendMail(mailOptions);
    console.log(`[Manuel Mail] ✅ Gönderildi → ${to} | Konu: ${subject} | MessageId: ${result.messageId}`);

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error: any) {
    console.error("[Manuel Mail] ❌ Hata:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
