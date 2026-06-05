import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

function getTransporter() {
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

/**
 * POST /api/public/stk/[slug]/send-contract
 * Sözleşme PDF'ini kullanıcıya e-posta ile gönder
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { email } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Geçerli bir e-posta adresi gereklidir." }, { status: 400 });
    }

    const stk = await prisma.sTKOrganization.findUnique({
      where: { slug },
      select: { name: true, contractPdfUrl: true, consentText: true },
    });

    if (!stk) {
      return NextResponse.json({ error: "STK bulunamadı." }, { status: 404 });
    }

    if (!stk.contractPdfUrl) {
      return NextResponse.json({ error: "Bu STK için sözleşme PDF'i tanımlanmamış." }, { status: 400 });
    }

    const transporter = getTransporter();

    // PDF URL'ini tam public URL'e çevir
    const siteUrl = process.env.SITE_URL || "https://kamulog.net";
    const pdfFullUrl = stk.contractPdfUrl.startsWith("/") ? `${siteUrl}${stk.contractPdfUrl}` : stk.contractPdfUrl;

    await transporter.sendMail({
      from: TX_FROM,
      to: email,
      subject: `📋 ${stk.name} - Üyelik Sözleşmesi`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:20px;">📋 Üyelik Sözleşmesi</h1>
            <p style="color:#e0e7ff;margin:8px 0 0;font-size:14px;">${stk.name}</p>
          </div>
          <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;">
            <p style="color:#374151;font-size:15px;line-height:1.6;">Sayın üye adayımız,</p>
            <p style="color:#374151;font-size:15px;line-height:1.6;">
              <strong>${stk.name}</strong> üyelik başvurunuz için gerekli sözleşme belgesi aşağıdaki bağlantıdan indirilebilir:
            </p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${pdfFullUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;">
                📥 Sözleşmeyi İndir
              </a>
            </div>
            ${stk.consentText ? `
              <div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-top:16px;">
                <p style="color:#6b7280;font-size:12px;font-weight:bold;margin:0 0 8px;">Onam Metni:</p>
                <p style="color:#374151;font-size:13px;line-height:1.5;margin:0;white-space:pre-line;">${stk.consentText}</p>
              </div>
            ` : ""}
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
            <p style="color:#9ca3af;font-size:11px;text-align:center;">
              Bu e-posta Kamulog STK sistemi tarafından otomatik gönderilmiştir.<br>
              <a href="https://kamulog.net" style="color:#4F46E5;">kamulog.net</a>
            </p>
          </div>
          <div style="border-radius:0 0 12px 12px;background:#f3f4f6;padding:12px;text-align:center;">
            <p style="color:#9ca3af;font-size:10px;margin:0;">© ${new Date().getFullYear()} Kamulog - Tüm hakları saklıdır.</p>
          </div>
        </div>
      `,
    });

    console.log(`[STK Contract] ✅ Sözleşme maili gönderildi → ${email} (${stk.name})`);

    return NextResponse.json({
      success: true,
      message: "Sözleşme e-posta adresinize gönderildi.",
    });
  } catch (error: unknown) {
    console.error("[STK Contract] Mail hatası:", error);
    const msg = error instanceof Error ? error.message : "E-posta gönderilemedi.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
