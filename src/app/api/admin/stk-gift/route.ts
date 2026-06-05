import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — STK listesi + kota bilgileri
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const stkId = req.nextUrl.searchParams.get("stkId");

  if (stkId) {
    // Tek STK detay
    const stk = await prisma.sTKOrganization.findUnique({
      where: { id: stkId },
      select: {
        id: true, name: true, slug: true,
        smsCredits: true, whatsappCredits: true, pushCredits: true, emailCredits: true,
        isFeatured: true, featuredUntil: true,
        hasCustomWaBot: true, waBotUntil: true, waBotStatus: true,
        stkLicenseUntil: true,
      },
    });
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });
    return NextResponse.json({ success: true, data: stk });
  }

  // Tüm STK'lar
  const stks = await prisma.sTKOrganization.findMany({
    select: { id: true, name: true, slug: true, type: true, smsCredits: true, whatsappCredits: true, pushCredits: true, emailCredits: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ success: true, data: stks });
}

// PUT — Kota güncelle (artır/azalt/sıfırla/ayarla)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = await req.json();
  const { stkId, operation, fields } = body;
  // operation: "add" | "subtract" | "set" | "reset"
  // fields: { smsCredits?: number, whatsappCredits?: number, pushCredits?: number, emailCredits?: number, waBotDays?: number, featuredDays?: number }

  if (!stkId || !operation) {
    return NextResponse.json({ error: "stkId ve operation gerekli" }, { status: 400 });
  }

  const stk = await prisma.sTKOrganization.findUnique({ where: { id: stkId } });
  if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

  const updateData: Record<string, unknown> = {};

  const creditFields = ["smsCredits", "whatsappCredits", "pushCredits", "emailCredits"] as const;

  for (const field of creditFields) {
    if (fields[field] !== undefined && fields[field] !== "" && fields[field] !== null) {
      const val = parseInt(String(fields[field])) || 0;
      if (operation === "add") updateData[field] = Math.max(0, (stk[field] || 0) + val);
      else if (operation === "subtract") updateData[field] = Math.max(0, (stk[field] || 0) - val);
      else if (operation === "set") updateData[field] = Math.max(0, val);
      else if (operation === "reset") updateData[field] = 0;
    }
  }

  if (operation === "reset" && Object.keys(fields).length === 0) {
    // Reset all
    updateData.smsCredits = 0;
    updateData.whatsappCredits = 0;
    updateData.pushCredits = 0;
    updateData.emailCredits = 0;
  }

  // WA Bot days
  if (fields.waBotDays) {
    const days = parseInt(String(fields.waBotDays)) || 0;
    if (days > 0) {
      const now = new Date();
      const currentEnd = stk.waBotUntil && new Date(stk.waBotUntil) > now ? new Date(stk.waBotUntil) : now;
      if (operation === "add") {
        currentEnd.setDate(currentEnd.getDate() + days);
        updateData.waBotUntil = currentEnd;
        updateData.hasCustomWaBot = true;
        updateData.waBotStatus = "ACTIVE";
      } else if (operation === "set") {
        const d = new Date(); d.setDate(d.getDate() + days);
        updateData.waBotUntil = d;
        updateData.hasCustomWaBot = true;
        updateData.waBotStatus = "ACTIVE";
      } else if (operation === "reset") {
        updateData.waBotUntil = null;
        updateData.hasCustomWaBot = false;
        updateData.waBotStatus = "NONE";
      }
    }
  }

  // Featured days
  if (fields.featuredDays) {
    const days = parseInt(String(fields.featuredDays)) || 0;
    if (days > 0) {
      const now = new Date();
      const currentEnd = stk.featuredUntil && new Date(stk.featuredUntil) > now ? new Date(stk.featuredUntil) : now;
      if (operation === "add") {
        currentEnd.setDate(currentEnd.getDate() + days);
        updateData.featuredUntil = currentEnd;
        updateData.isFeatured = true;
      } else if (operation === "set") {
        const d = new Date(); d.setDate(d.getDate() + days);
        updateData.featuredUntil = d;
        updateData.isFeatured = true;
      } else if (operation === "reset") {
        updateData.featuredUntil = null;
        updateData.isFeatured = false;
      }
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const updated = await prisma.sTKOrganization.update({
    where: { id: stkId },
    data: updateData,
    select: {
      id: true, name: true,
      smsCredits: true, whatsappCredits: true, pushCredits: true, emailCredits: true,
      isFeatured: true, featuredUntil: true, hasCustomWaBot: true, waBotUntil: true,
    },
  });

  return NextResponse.json({ success: true, data: updated, message: "Kota güncellendi" });
}

// POST — Hediye paketi gönder
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = await req.json();
  const { stkId, giftType, title, message, fields, packageId } = body;

  if (!stkId) return NextResponse.json({ error: "STK seçilmedi" }, { status: 400 });

  const stk = await prisma.sTKOrganization.findUnique({ where: { id: stkId }, select: { id: true, name: true } });
  if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

  // Apply credits immediately
  const updateData: Record<string, unknown> = {};
  const giftDetails: Record<string, unknown> = {};

  if (fields) {
    if (fields.smsCredits) { updateData.smsCredits = { increment: parseInt(fields.smsCredits) || 0 }; giftDetails.smsCredits = parseInt(fields.smsCredits); }
    if (fields.whatsappCredits) { updateData.whatsappCredits = { increment: parseInt(fields.whatsappCredits) || 0 }; giftDetails.whatsappCredits = parseInt(fields.whatsappCredits); }
    if (fields.pushCredits) { updateData.pushCredits = { increment: parseInt(fields.pushCredits) || 0 }; giftDetails.pushCredits = parseInt(fields.pushCredits); }
    if (fields.emailCredits) { updateData.emailCredits = { increment: parseInt(fields.emailCredits) || 0 }; giftDetails.emailCredits = parseInt(fields.emailCredits); }
    if (fields.waBotDays) {
      const days = parseInt(fields.waBotDays) || 0;
      const now = new Date();
      const d = new Date(now.getTime() + days * 86400000);
      updateData.waBotUntil = d; updateData.hasCustomWaBot = true; updateData.waBotStatus = "ACTIVE";
      giftDetails.waBotDays = days;
    }
    if (fields.featuredDays) {
      const days = parseInt(fields.featuredDays) || 0;
      const d = new Date(Date.now() + days * 86400000);
      updateData.featuredUntil = d; updateData.isFeatured = true;
      giftDetails.featuredDays = days;
    }
  }

  if (packageId) {
    const pkg = await prisma.sTKPackage.findUnique({ where: { id: packageId } });
    if (pkg) {
      if (pkg.smsAmount > 0) { updateData.smsCredits = { increment: pkg.smsAmount }; giftDetails.smsCredits = (giftDetails.smsCredits as number || 0) + pkg.smsAmount; }
      if (pkg.whatsappAmount > 0) { updateData.whatsappCredits = { increment: pkg.whatsappAmount }; giftDetails.whatsappCredits = (giftDetails.whatsappCredits as number || 0) + pkg.whatsappAmount; }
      if (pkg.pushAmount > 0) { updateData.pushCredits = { increment: pkg.pushAmount }; giftDetails.pushCredits = (giftDetails.pushCredits as number || 0) + pkg.pushAmount; }
      if (pkg.emailAmount > 0) { updateData.emailCredits = { increment: pkg.emailAmount }; giftDetails.emailCredits = (giftDetails.emailCredits as number || 0) + pkg.emailAmount; }
      giftDetails.packageName = pkg.name;
      giftDetails.packageType = pkg.type;
    }
  }

  // Update STK
  if (Object.keys(updateData).length > 0) {
    await prisma.sTKOrganization.update({ where: { id: stkId }, data: updateData });
  }

  // Create gift notification
  await prisma.sTKGiftNotification.create({
    data: {
      stkId,
      title: title || "Yönetim Hediyesi",
      message: message || "Kamulog yönetimi tarafından size bir hediye gönderildi!",
      giftType: giftType || "CUSTOM",
      giftDetails: giftDetails as object,
    },
  });

  return NextResponse.json({ success: true, message: `${stk.name} için hediye gönderildi!` });
}
