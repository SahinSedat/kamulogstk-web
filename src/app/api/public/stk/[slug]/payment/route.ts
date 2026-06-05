import { createAdminNotification } from "@/lib/services/adminNotificationService";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSTKPaymentReceivedNotification } from "@/lib/services/notificationService";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * Base64 dekont görselini dosya olarak kaydet
 */
async function saveReceiptFile(base64Data: string): Promise<string> {
  try {
    let rawBase64 = base64Data;
    if (rawBase64.includes(",")) rawBase64 = rawBase64.split(",")[1];

    const buffer = Buffer.from(rawBase64, "base64");
    const filename = `dekont_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "receipts");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    return `/uploads/receipts/${filename}`;
  } catch (err) {
    console.error("[STK Receipt] Dosya kaydetme hatası:", err);
    return base64Data.startsWith("data:") ? base64Data : `data:image/png;base64,${base64Data}`;
  }
}

/**
 * POST /api/public/stk/[slug]/payment
 * Mobil uygulamadan ödeme/aidat bildirimi gönder
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { applicationId, amount, paymentType, paymentDate, receiptUrl, note } = body;

    if (!applicationId || !amount) {
      return NextResponse.json({ error: "applicationId ve amount zorunludur." }, { status: 400 });
    }

    // STK var mı?
    const stk = await prisma.sTKOrganization.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });
    if (!stk) return NextResponse.json({ error: "STK bulunamadı." }, { status: 404 });

    // Başvuru var mı ve bu STK'ya ait mi?
    const app = await prisma.sTKApplication.findFirst({
      where: { id: applicationId, stkId: stk.id },
    });
    if (!app) return NextResponse.json({ error: "Başvuru bulunamadı." }, { status: 404 });

    // Dekont base64 ise dosya olarak kaydet
    let savedReceiptUrl = receiptUrl || null;
    if (receiptUrl && receiptUrl.length > 500) {
      savedReceiptUrl = await saveReceiptFile(receiptUrl);
    }

    const payment = await prisma.sTKPaymentReport.create({
      data: {
        applicationId,
        amount: parseFloat(amount),
        paymentType: paymentType || "MONTHLY",
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        receiptUrl: savedReceiptUrl,
        note: note || null,
        status: "PENDING",
      },
    });

    console.log(`[STK Payment] 📩 Ödeme bildirimi → ${app.name} | ${amount} TL | ${paymentType || "MONTHLY"}`);

    // Bildirim gönder
    sendSTKPaymentReceivedNotification({
      applicantName: app.name,
      applicantEmail: app.email || "mail@yok.com",
      applicantPhone: app.phone || "0",
      stkName: stk.name,
      stkId: stk.id,
      userId: app.userId || undefined,
    }).catch(e => console.error("[STK Payment Notify] Hata:", e));

    return NextResponse.json({
      success: true,
      message: "Ödeme bildiriminiz alındı ve incelemeye gönderildi.",
      data: { id: payment.id, status: payment.status },
    });
  } catch (error: unknown) {
    console.error("[STK Payment] Hata:", error);
    const msg = error instanceof Error ? error.message : "İşlem başarısız";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
