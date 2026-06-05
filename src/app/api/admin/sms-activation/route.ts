import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — Tüm SMS aktivasyon talepleri + STK bilgisiyle
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const activations = await prisma.sTKSmsActivation.findMany({
    include: { stk: { select: { id: true, name: true, slug: true, type: true, email: true, phone: true, smsCredits: true } } },
    orderBy: { requestedAt: "desc" },
  });

  // Süresi dolmuşları otomatik askıya al
  const now = new Date();
  for (const a of activations) {
    if (a.status === "APPROVED" && a.expiresAt && new Date(a.expiresAt) < now) {
      await prisma.sTKSmsActivation.update({
        where: { id: a.id },
        data: { status: "SUSPENDED", suspendedAt: now, suspendReason: "Süre doldu (otomatik)" },
      });
      a.status = "SUSPENDED";
      a.suspendedAt = now;
      a.suspendReason = "Süre doldu (otomatik)";
    }
  }

  return NextResponse.json({ success: true, data: activations });
}

// POST — Yeni aktivasyon oluştur (admin tarafından direkt onay)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id: string; role: string } | undefined;
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { stkId, expiresAt } = await req.json();
  if (!stkId) return NextResponse.json({ error: "stkId gerekli" }, { status: 400 });

  const existing = await prisma.sTKSmsActivation.findUnique({ where: { stkId } });
  if (existing) {
    // Zaten var — güncelle
    await prisma.sTKSmsActivation.update({
      where: { id: existing.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        suspendedAt: null,
        suspendReason: null,
        rejectedAt: null,
        rejectReason: null,
      },
    });
    return NextResponse.json({ success: true, message: "SMS izni güncellendi" });
  }

  await prisma.sTKSmsActivation.create({
    data: {
      stkId,
      status: "APPROVED",
      approvedAt: new Date(),
      approvedBy: user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json({ success: true, message: "SMS izni verildi" });
}

// PATCH — Onayla / Reddet / Askıya Al / Süre Güncelle
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id: string; role: string } | undefined;
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { id, stkId, action, rejectReason, suspendReason, expiresAt } = await req.json();
  
  // id veya stkId ile bul
  let activation;
  if (id) {
    activation = await prisma.sTKSmsActivation.findUnique({ where: { id } });
  } else if (stkId) {
    activation = await prisma.sTKSmsActivation.findUnique({ where: { stkId } });
  }
  
  if (!activation) return NextResponse.json({ error: "Aktivasyon bulunamadı" }, { status: 404 });

  if (action === "APPROVE") {
    await prisma.sTKSmsActivation.update({
      where: { id: activation.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : activation.expiresAt,
        suspendedAt: null,
        suspendReason: null,
      },
    });
    return NextResponse.json({ success: true, message: "SMS servisi onaylandı" });
  }
  
  if (action === "REJECT") {
    await prisma.sTKSmsActivation.update({
      where: { id: activation.id },
      data: { status: "REJECTED", rejectedAt: new Date(), rejectReason: rejectReason || "Belgeler yetersiz" },
    });
    return NextResponse.json({ success: true, message: "SMS talebi reddedildi" });
  }
  
  if (action === "SUSPEND") {
    await prisma.sTKSmsActivation.update({
      where: { id: activation.id },
      data: { status: "SUSPENDED", suspendedAt: new Date(), suspendReason: suspendReason || "Yönetim tarafından askıya alındı" },
    });
    return NextResponse.json({ success: true, message: "SMS servisi askıya alındı" });
  }

  if (action === "UPDATE_EXPIRY") {
    await prisma.sTKSmsActivation.update({
      where: { id: activation.id },
      data: { expiresAt: expiresAt ? new Date(expiresAt) : null },
    });
    return NextResponse.json({ success: true, message: expiresAt ? "Süre güncellendi" : "Süresiz yapıldı" });
  }

  return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
}
