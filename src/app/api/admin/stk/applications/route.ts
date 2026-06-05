import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSTKApprovalNotification, sendSTKRejectionNotification, sendSTKResignationNotification } from "@/lib/services/notificationService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/admin/stk/applications
 * Tüm STK başvurularını listele
 */
export async function GET(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR", "STK_MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  const stkId = req.nextUrl.searchParams.get("stkId");
  const status = req.nextUrl.searchParams.get("status");

  const where: any = { status: { not: "DELETED" } };
  if (stkId) where.stkId = stkId;
  if (status) where.status = status;

  const applications = await prisma.sTKApplication.findMany({
    where,
    include: { stk: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: applications });
}

/**
 * PATCH /api/admin/stk/applications?id=xxx
 * Başvuruyu onayla, reddet veya istifayı onayla
 */
export async function PATCH(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR", "STK_MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

    const body = await req.json();
    const { status, membershipStatus, expiryDate } = body;

    // membershipStatus güncellemesi (ayrı işlem)
    if (membershipStatus && !status) {
      const app = await prisma.sTKApplication.update({
        where: { id },
        data: {
          membershipStatus,
          ...(expiryDate ? { expiryDate: new Date(expiryDate) } : {}),
        },
        include: { stk: { select: { id: true, name: true } } },
      });
      return NextResponse.json({ success: true, data: app });
    }

    if (!status || !["PENDING", "APPROVED", "REJECTED", "RESIGNED", "RESIGN_PENDING"].includes(status)) {
      return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
    }

    const updateData: any = { status };
    if (body.rejectionReason && status === "REJECTED") updateData.rejectionReason = body.rejectionReason;

    // Onaylandıysa approvedAt + membershipStatus + startDate kaydet
    if (status === "APPROVED") {
      updateData.approvedAt = new Date();
      updateData.membershipStatus = "ACTIVE";
      updateData.startDate = new Date();
    }

    const app = await prisma.sTKApplication.update({
      where: { id },
      data: updateData,
      include: { stk: { select: { id: true, name: true } } },
    });

    // Onaylandıysa STK üye sayısını artır + Member tablosuna ekle + bildirim gönder
    if (status === "APPROVED") {
      await prisma.sTKOrganization.update({
        where: { id: app.stkId },
        data: { memberCount: { increment: 1 } },
      });

      // ═══ Member tablosuna kayıt ekle (STK yönetim paneli bu tablodan okuyor) ═══
      try {
        const orConditions: any[] = [];
        if (app.tcKimlik) orConditions.push({ tcKimlik: app.tcKimlik });
        if (app.userId) orConditions.push({ userId: app.userId });
        const existingMember = orConditions.length > 0
          ? await prisma.member.findFirst({ where: { stkId: app.stkId, OR: orConditions } })
          : null;
        if (!existingMember) {
          const nameParts = app.name.split(" ");
          const surname = nameParts.length > 1 ? nameParts.pop() || "" : "";
          const firstName = nameParts.join(" ") || app.name;
          const memberCount = await prisma.member.count({ where: { stkId: app.stkId } });
          await prisma.member.create({
            data: {
              stkId: app.stkId,
              name: firstName,
              surname: surname,
              tcKimlik: app.tcKimlik || "",
              phone: app.phone,
              email: app.email,
              status: "ACTIVE",
              category: "STANDARD",
              memberNumber: String(memberCount + 1).padStart(4, "0"),
              joinDate: new Date(),
              registrationSource: app.registrationSource || "WEBSITE",
              userId: app.userId || null,
            },
          });
          console.log("[Admin STK] Member kaydı oluşturuldu:", app.name);
        }
      } catch (memberErr) {
        console.error("[Admin STK] Member oluşturma hatası:", memberErr);
      }
      sendSTKApprovalNotification({
        userId: app.userId || undefined,
        applicantName: app.name,
        applicantEmail: app.email,
        applicantPhone: app.phone,
        stkName: app.stk.name,
        stkId: app.stkId,
      }).catch((e) => console.error("[STK approve notify] hata:", e));
    }

    // Reddedildiyse bildirim gönder
    if (status === "REJECTED") {
      sendSTKRejectionNotification({
        userId: app.userId || undefined,
        applicantName: app.name,
        applicantEmail: app.email,
        applicantPhone: app.phone,
        stkName: app.stk.name,
        stkId: app.stkId,
        rejectionReason: body.rejectionReason || undefined,
      }).catch((e) => console.error("[STK reject notify] hata:", e));
    }

    // İstifa onaylandıysa üye sayısını azalt + bildirim gönder
    if (status === "RESIGNED") {
      await prisma.sTKOrganization.update({
        where: { id: app.stkId },
        data: { memberCount: { decrement: 1 } },
      });
      sendSTKResignationNotification({
        userId: app.userId || undefined,
        applicantName: app.name,
        applicantEmail: app.email,
        applicantPhone: app.phone,
        stkName: app.stk.name,
        stkId: app.stkId,
      }).catch((e) => console.error("[STK resign notify] hata:", e));
    }

    return NextResponse.json({ success: true, data: app });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/stk/applications
 * Toplu işlem
 */
export async function POST(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR", "STK_MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { ids, status } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids dizisi gerekli" }, { status: 400 });
    }
    if (!status || !["APPROVED", "REJECTED", "RESIGNED"].includes(status)) {
      return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
    }

    const apps = await prisma.sTKApplication.findMany({
      where: { id: { in: ids } },
      include: { stk: { select: { id: true, name: true } } },
    });

    let processed = 0;

    for (const app of apps) {
      const updateData: any = { status };
      if (status === "APPROVED") {
        updateData.approvedAt = new Date();
        updateData.membershipStatus = "ACTIVE";
        updateData.startDate = new Date();
      }

      await prisma.sTKApplication.update({
        where: { id: app.id },
        data: updateData,
      });

      if (status === "APPROVED") {
        await prisma.sTKOrganization.update({ where: { id: app.stkId }, data: { memberCount: { increment: 1 } } });
        sendSTKApprovalNotification({ userId: app.userId || undefined, applicantName: app.name, applicantEmail: app.email, applicantPhone: app.phone, stkName: app.stk.name, stkId: app.stkId }).catch(() => {});
      }
      if (status === "REJECTED") {
        sendSTKRejectionNotification({ userId: app.userId || undefined, applicantName: app.name, applicantEmail: app.email, applicantPhone: app.phone, stkName: app.stk.name, stkId: app.stkId, rejectionReason: body.rejectionReason || undefined }).catch(() => {});
      }
      if (status === "RESIGNED") {
        await prisma.sTKOrganization.update({ where: { id: app.stkId }, data: { memberCount: { decrement: 1 } } });
        sendSTKResignationNotification({ userId: app.userId || undefined, applicantName: app.name, applicantEmail: app.email, applicantPhone: app.phone, stkName: app.stk.name, stkId: app.stkId }).catch(() => {});
      }
      processed++;
    }

    return NextResponse.json({ success: true, processed, status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/stk/applications
 * Toplu silme
 */
export async function DELETE(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR", "STK_MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    // 🔒 SADECE SUPER_ADMIN silebilir — STK yöneticileri silme yapamaz
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string } | undefined;
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Silme işlemi yalnızca sistem yöneticisi tarafından yapılabilir" }, { status: 403 });
    }

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids dizisi gerekli" }, { status: 400 });
    }

    // Onaylanmış başvuruları bul — memberCount'u düşürmek için
    const approvedApps = await prisma.sTKApplication.findMany({
      where: { id: { in: ids }, status: "APPROVED" },
      select: { stkId: true },
    });

    // Başvuruları soft-delete yap (cascade silmesini engelle — ödemeler korunsun)
    const result = await prisma.sTKApplication.updateMany({
      where: { id: { in: ids } },
      data: { status: "DELETED", membershipStatus: "DELETED" },
    });

    // Onaylanmış olanların STK'larının memberCount'unu azalt
    const stkCounts: Record<string, number> = {};
    for (const app of approvedApps) {
      stkCounts[app.stkId] = (stkCounts[app.stkId] || 0) + 1;
    }
    for (const [stkId, count] of Object.entries(stkCounts)) {
      await prisma.sTKOrganization.update({
        where: { id: stkId },
        data: { memberCount: { decrement: count } },
      });
    }

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
