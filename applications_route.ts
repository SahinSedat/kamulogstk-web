import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-compat";
import { authOptions } from "@/lib/auth-compat";
import { prisma } from "@/lib/prisma";
import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import { sendSTKApprovalNotification, sendSTKRejectionNotification } from "@/lib/services/notificationService";

// GET — Gelen başvuruları listele
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

    const applications = await prisma.sTKApplication.findMany({
      where: { stkId: stk.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, tcKimlik: true, phone: true, email: true,
        status: true, membershipStatus: true, createdAt: true,
        receiptUrl: true, contractUrl: true, birthDate: true,
        message: true, registrationSource: true, rejectionReason: true,
      },
    });

    return NextResponse.json({ success: true, data: applications });
  } catch (error) {
    console.error("[STK APPLICATIONS GET]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// PATCH — Başvuru onayla / reddet
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

    const { applicationId, action, rejectionReason } = await req.json();
    if (!applicationId || !action) {
      return NextResponse.json({ error: "applicationId ve action gerekli" }, { status: 400 });
    }

    const app = await prisma.sTKApplication.findFirst({
      where: { id: applicationId, stkId: stk.id },
    });
    if (!app) return NextResponse.json({ error: "Başvuru bulunamadı" }, { status: 404 });

    if (action === "APPROVE") {
      // Başvuruyu onayla
      await prisma.sTKApplication.update({
        where: { id: applicationId },
        data: { status: "APPROVED", membershipStatus: "ACTIVE", approvedAt: new Date() },
      });

      // Member tablosuna ekle (eğer zaten yoksa)
      const existingMember = await prisma.member.findFirst({
        where: { stkId: stk.id, tcKimlik: app.tcKimlik },
      });

      if (!existingMember) {
        const nameParts = app.name.split(" ");
        const surname = nameParts.length > 1 ? nameParts.pop() || "" : "";
        const firstName = nameParts.join(" ") || app.name;

        const memberCount = await prisma.member.count({ where: { stkId: stk.id } });

        await prisma.member.create({
          data: {
            stkId: stk.id,
            name: firstName,
            surname: surname,
            tcKimlik: app.tcKimlik,
            phone: app.phone,
            email: app.email,
            status: "ACTIVE",
            category: "STANDARD",
            memberNumber: String(memberCount + 1).padStart(4, "0"),
            joinDate: new Date(),
            registrationSource: app.registrationSource || "WEBSITE",
            userId: app.userId || null,
            birthDate: (app as any).birthDate || null,
          },
        });
      }

      // Bildirim gönder (e-posta + WhatsApp + push)
      sendSTKApprovalNotification({
        userId: app.userId || undefined,
        applicantName: app.name,
        applicantEmail: app.email,
        applicantPhone: app.phone,
        stkName: stk.name,
        stkId: stk.id,
      }).catch((e: any) => console.error("[STK Panel approve notify] hata:", e));

      return NextResponse.json({ success: true, message: "Başvuru onaylandı ve üye kaydı oluşturuldu" });
    } else if (action === "REJECT") {
      await prisma.sTKApplication.update({
        where: { id: applicationId },
        data: { status: "REJECTED", rejectionReason: rejectionReason || "Reddedildi" },
      });
      // Red bildirimi gönder
      sendSTKRejectionNotification({
        applicantName: app.name,
        applicantEmail: app.email,
        applicantPhone: app.phone,
        stkName: stk.name,
        userId: app.userId || undefined,
        stkId: stk.id,
        rejectionReason: rejectionReason,
      }).catch((e: any) => console.error("[STK Panel reject notify] hata:", e));

      return NextResponse.json({ success: true, message: "Başvuru reddedildi" });
    }

    return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
  } catch (error) {
    console.error("[STK APPLICATIONS PATCH]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
