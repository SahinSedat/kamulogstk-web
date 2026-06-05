import { createAdminNotification } from "@/lib/services/adminNotificationService";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSTKApplicationNotification, sendSTKPaymentReceivedNotification } from "@/lib/services/notificationService";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * Base64 imza verisini dosya olarak kaydet ve URL döndür
 */
async function saveSignatureFile(base64Data: string, prefix: string): Promise<string> {
  try {
    let rawBase64 = base64Data;
    let extension = "png"; // default
    if (rawBase64.includes(",")) {
      const parts = rawBase64.split(",");
      const mimeStr = parts[0];
      if (mimeStr.includes("pdf")) extension = "pdf";
      else if (mimeStr.includes("jpeg") || mimeStr.includes("jpg")) extension = "jpg";
      else if (mimeStr.includes("png")) extension = "png";
      rawBase64 = parts[1];
    }

    const buffer = Buffer.from(rawBase64, "base64");
    // Replace spaces and special characters from prefix to make it a safe filename
    const safePrefix = prefix.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 20);
    const filename = `${safePrefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "signatures");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    return `/uploads/signatures/${filename}`;
  } catch (err) {
    console.error("[STK Signature] Dosya kaydetme hatası:", err);
    // Hata olursa orijinal base64'ü data URI olarak döndür
    return base64Data.startsWith("data:") ? base64Data : `data:image/png;base64,${base64Data}`;
  }
}
/**
 * POST /api/public/stk/[slug]/apply
 * STK üyelik başvurusu
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { name, tcKimlik, phone, email, userId, consentGiven, signatureType, signatureUrl, documentUrl, birthDate, contractUrl, receiptUrl, selectedPayments, isOnlyPayment } = body;

    if (isOnlyPayment) {
      if (!phone || !email) {
        return NextResponse.json(
          { error: "Ödeme bildirimi yapabilmek için Telefon ve E-posta bilgileriniz zorunludur." },
          { status: 400 }
        );
      }
    } else {
      if (!name || !tcKimlik || !phone || !email || !birthDate) {
        return NextResponse.json(
          { error: "Ad Soyad, TC Kimlik, Telefon, Doğum Tarihi ve E-posta zorunludur." },
          { status: 400 }
        );
      }

      // TC Kimlik doğrulama (11 hane)
      if (!/^\d{11}$/.test(tcKimlik)) {
        return NextResponse.json(
          { error: "T.C. Kimlik No 11 haneli olmalıdır." },
          { status: 400 }
        );
      }
    }

    // STK var mı ve aktif mi kontrol et
    const stk = await prisma.sTKOrganization.findUnique({
      where: { slug },
      select: { id: true, status: true, name: true },
    });

    if (!stk || stk.status !== "ACTIVE") {
      return NextResponse.json({ error: "STK bulunamadı." }, { status: 404 });
    }

    let existing = null;

    if (isOnlyPayment) {
      existing = await prisma.sTKApplication.findFirst({
        where: {
          stkId: stk.id,
          OR: [
            ...(phone ? [{ phone }] : []),
            ...(email ? [{ email }] : []),
            ...(userId ? [{ userId }] : []),
          ],
        },
      });
    } else {
      existing = await prisma.sTKApplication.findFirst({
        where: {
          stkId: stk.id,
          OR: [
            { tcKimlik },
            ...(userId ? [{ userId }] : []),
          ],
        },
      });
    }

    if (isOnlyPayment) {
      if (!existing) {
        return NextResponse.json({ error: "Sistemde Telefon numaranızla veya E-posta adresinizle eşleşen bir üyelik kaydı bulunamadı. Lütfen 'Sadece Aidat Ödeyeceğim' seçeneğini kaldırarak tam başvuru yapınız." }, { status: 404 });
      }

      if (!receiptUrl || !selectedPayments || selectedPayments.length === 0) {
        return NextResponse.json({ error: "Ödeme bildirimi yapabilmek için dekont yüklemeli ve ödeme tipi seçmelisiniz." }, { status: 400 });
      }

      let savedReceiptUrl = receiptUrl;
      if (receiptUrl.length > 500) {
        savedReceiptUrl = await saveSignatureFile(receiptUrl, `dekont_${existing.name.replace(/[^a-zA-Z0-9]/g, '_')}`);
      }

      for (const pType of selectedPayments) {
        let amount = 0;
        let paymentTypeEnum = "DONATION";
        if (pType === "MONTHLY") { paymentTypeEnum = "MONTHLY_DUES"; amount = stk.monthlyDuesAmount || 0; }
        else if (pType === "YEARLY") { paymentTypeEnum = "YEARLY_DUES"; amount = stk.annualDuesAmount || 0; }
        
        await prisma.sTKPaymentReport.create({
          data: {
            applicationId: existing.id,
            amount,
            paymentType: paymentTypeEnum,
            paymentDate: new Date(),
            receiptUrl: savedReceiptUrl,
            status: "PENDING"
          }
        });
      }

      // Bildirim gönder
      sendSTKPaymentReceivedNotification({
        applicantName: existing.name,
        applicantEmail: existing.email || email,
        applicantPhone: existing.phone || phone,
        stkName: stk.name,
        stkId: stk.id,
        userId: existing.userId || undefined,
      }).catch(e => console.error("[STK Payment Notify] Hata:", e));

      return NextResponse.json(
        {
          success: true,
          message: `Ödeme bildiriminiz ${stk.name} yönetimine başarıyla iletilmiştir.`,
        },
        { status: 200 }
      );
    }

    if (existing) {
      // Aktif veya bekleyen başvuru varsa mükerrer izin verme
      if (existing.status === "PENDING" || existing.status === "APPROVED" || existing.status === "RESIGN_PENDING") {
        return NextResponse.json(
          { error: "Bu T.C. Kimlik ile zaten bir başvurunuz bulunmaktadır." },
          { status: 409 }
        );
      }

      // RESIGNED veya REJECTED ise mevcut kaydı güncelle (yeni kayıt oluşturma)
      let savedSignatureUrl = signatureUrl || null;
      if (signatureUrl && signatureUrl.length > 500) {
        savedSignatureUrl = await saveSignatureFile(signatureUrl, name);
      }

      let savedDocumentUrl = documentUrl || null;
      if (documentUrl && documentUrl.length > 500) {
        savedDocumentUrl = await saveSignatureFile(documentUrl, `belge_${name}`);
      }

      let savedContractUrl = contractUrl || null;
      if (contractUrl && contractUrl.length > 500) {
        savedContractUrl = await saveSignatureFile(contractUrl, `sozlesme_${name}`);
      }

      let savedReceiptUrl = receiptUrl || null;
      if (receiptUrl && receiptUrl.length > 500) {
        savedReceiptUrl = await saveSignatureFile(receiptUrl, `dekont_${name}`);
      }

      const application = await prisma.sTKApplication.update({
        where: { id: existing.id },
        data: {
          name,
          phone,
          email,
          userId: userId || existing.userId,
          status: "PENDING",
          approvedAt: null,
          consentGiven: consentGiven ?? false,
          signatureType: signatureType || null,
          signatureUrl: savedSignatureUrl,
          documentUrl: savedDocumentUrl,
          birthDate: birthDate ? new Date(birthDate) : undefined,
          contractUrl: savedContractUrl,
          receiptUrl: savedReceiptUrl,
        },
      });

      if (savedReceiptUrl && selectedPayments && selectedPayments.length > 0) {
        for (const pType of selectedPayments) {
          let amount = 0;
          let paymentTypeEnum = "DONATION";
          if (pType === "MONTHLY") { paymentTypeEnum = "MONTHLY_DUES"; amount = stk.monthlyDuesAmount || 0; }
          else if (pType === "YEARLY") { paymentTypeEnum = "YEARLY_DUES"; amount = stk.annualDuesAmount || 0; }
          else { paymentTypeEnum = "DONATION"; }
          
          await prisma.sTKPaymentReport.create({
            data: {
              applicationId: application.id,
              amount,
              paymentType: paymentTypeEnum,
              paymentDate: new Date(),
              receiptUrl: savedReceiptUrl,
              status: "PENDING"
            }
          });
        }
      } else if (savedReceiptUrl) {
        await prisma.sTKPaymentReport.create({
          data: {
            applicationId: application.id,
            amount: 0,
            paymentType: "INITIAL_DUES",
            paymentDate: new Date(),
            receiptUrl: savedReceiptUrl,
            status: "PENDING"
          }
        });
      }

      // Başvuru bildirimi gönder
      sendSTKApplicationNotification({
        userId: userId || undefined,
        applicantName: name,
        applicantEmail: email,
        applicantPhone: phone,
        stkName: stk.name,
        stkId: stk.id,
      }).catch((e) => console.error("[STK notify] hata:", e));

      return NextResponse.json(
        {
          success: true,
          message: `Başvurunuz ${stk.name} yönetimine tekrar iletilmiştir.`,
          data: { id: application.id, status: application.status },
        },
        { status: 200 }
      );
    }

    let savedSignatureUrl2 = signatureUrl || null;
    if (signatureUrl && signatureUrl.length > 500) {
      savedSignatureUrl2 = await saveSignatureFile(signatureUrl, name);
    }

    let savedDocumentUrl2 = documentUrl || null;
    if (documentUrl && documentUrl.length > 500) {
      savedDocumentUrl2 = await saveSignatureFile(documentUrl, `belge_${name}`);
    }

    let savedContractUrl2 = contractUrl || null;
    if (contractUrl && contractUrl.length > 500) {
      savedContractUrl2 = await saveSignatureFile(contractUrl, `sozlesme_${name}`);
    }

    let savedReceiptUrl2 = receiptUrl || null;
    if (receiptUrl && receiptUrl.length > 500) {
      savedReceiptUrl2 = await saveSignatureFile(receiptUrl, `dekont_${name}`);
    }

    const application = await prisma.sTKApplication.create({
      data: {
        stkId: stk.id,
        userId: userId || null,
        name,
        tcKimlik,
        phone,
        email,
        status: "PENDING",
        consentGiven: consentGiven ?? false,
        signatureType: signatureType || null,
        signatureUrl: savedSignatureUrl2,
        documentUrl: savedDocumentUrl2,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        contractUrl: savedContractUrl2,
        receiptUrl: savedReceiptUrl2,
      },
    });

    if (savedReceiptUrl2 && selectedPayments && selectedPayments.length > 0) {
      for (const pType of selectedPayments) {
        let amount = 0;
        let paymentTypeEnum = "DONATION";
        if (pType === "MONTHLY") { paymentTypeEnum = "MONTHLY_DUES"; amount = stk.monthlyDuesAmount || 0; }
        else if (pType === "YEARLY") { paymentTypeEnum = "YEARLY_DUES"; amount = stk.annualDuesAmount || 0; }
        else { paymentTypeEnum = "DONATION"; }
        
        await prisma.sTKPaymentReport.create({
          data: {
            applicationId: application.id,
            amount,
            paymentType: paymentTypeEnum,
            paymentDate: new Date(),
            receiptUrl: savedReceiptUrl2,
            status: "PENDING"
          }
        });
      }
    } else if (savedReceiptUrl2) {
      await prisma.sTKPaymentReport.create({
        data: {
          applicationId: application.id,
          amount: 0,
          paymentType: "INITIAL_DUES",
          paymentDate: new Date(),
          receiptUrl: savedReceiptUrl2,
          status: "PENDING"
        }
      });
    }

    // Başvuru bildirimi gönder (e-posta + WhatsApp) - arka planda
    sendSTKApplicationNotification({
      userId: userId || undefined,
      applicantName: name,
      applicantEmail: email,
      applicantPhone: phone,
      stkName: stk.name,
      stkId: stk.id,
    }).catch((e) => console.error("[STK notify] hata:", e));

    return NextResponse.json(
      {
        success: true,
        message: `Başvurunuz ${stk.name} yönetimine iletilmiştir.`,
        data: { id: application.id, status: application.status },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
