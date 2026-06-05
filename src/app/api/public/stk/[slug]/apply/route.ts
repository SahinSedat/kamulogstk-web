import { createAdminNotification } from "@/lib/services/adminNotificationService";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSTKApplicationNotification } from "@/lib/services/notificationService";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * Base64 imza verisini dosya olarak kaydet ve URL döndür
 */
async function saveSignatureFile(base64Data: string, applicantName: string): Promise<string> {
  try {
    // "data:image/png;base64," prefix varsa çıkar
    let rawBase64 = base64Data;
    if (rawBase64.includes(",")) {
      rawBase64 = rawBase64.split(",")[1];
    }

    const buffer = Buffer.from(rawBase64, "base64");
    const filename = `imza_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
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
    const { name, tcKimlik, phone, email, userId, consentGiven, signatureType, signatureUrl, documentUrl } = body;

    if (!name || !tcKimlik || !phone || !email) {
      return NextResponse.json(
        { error: "Ad Soyad, TC Kimlik, Telefon ve E-posta zorunludur." },
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

    // STK var mı ve aktif mi kontrol et
    const stk = await prisma.sTKOrganization.findUnique({
      where: { slug },
      select: { id: true, status: true, name: true },
    });

    if (!stk || stk.status !== "ACTIVE") {
      return NextResponse.json({ error: "STK bulunamadı." }, { status: 404 });
    }

    // Aynı TC veya userId ile aynı STK'ya mevcut kayıt var mı?
    const existing = await prisma.sTKApplication.findFirst({
      where: {
        stkId: stk.id,
        OR: [
          { tcKimlik },
          ...(userId ? [{ userId }] : []),
        ],
      },
    });

    if (existing) {
      // Aktif veya bekleyen başvuru varsa mükerrer izin verme
      if (existing.status === "PENDING" || existing.status === "APPROVED" || existing.status === "RESIGN_PENDING") {
        return NextResponse.json(
          { error: "Bu T.C. Kimlik ile zaten bir başvurunuz bulunmaktadır." },
          { status: 409 }
        );
      }

      // RESIGNED veya REJECTED ise mevcut kaydı güncelle (yeni kayıt oluşturma)
      // İmza base64 ise dosya olarak kaydet
      let savedSignatureUrl = signatureUrl || null;
      if (signatureUrl && signatureUrl.length > 500) {
        savedSignatureUrl = await saveSignatureFile(signatureUrl, name);
      }

      // Yüklenen belge base64 ise dosya olarak kaydet
      let savedDocumentUrl = documentUrl || null;
      if (documentUrl && documentUrl.length > 500) {
        savedDocumentUrl = await saveSignatureFile(documentUrl, `belge_${name}`);
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
        },
      });

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

    // İmza base64 ise dosya olarak kaydet
    let savedSignatureUrl2 = signatureUrl || null;
    if (signatureUrl && signatureUrl.length > 500) {
      savedSignatureUrl2 = await saveSignatureFile(signatureUrl, name);
    }

    // Yüklenen belge base64 ise dosya olarak kaydet
    let savedDocumentUrl2 = documentUrl || null;
    if (documentUrl && documentUrl.length > 500) {
      savedDocumentUrl2 = await saveSignatureFile(documentUrl, `belge_${name}`);
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
      },
    });

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
