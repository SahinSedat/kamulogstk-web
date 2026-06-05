import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

// GET — Tüm satın alım taleplerini getir
export async function GET(req: NextRequest) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status) where.status = status;

  const requests = await prisma.sTKPurchaseRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      stk: { select: { id: true, name: true, slug: true, logo: true, smsCredits: true, whatsappCredits: true, pushCredits: true, emailCredits: true, isFeatured: true, featuredUntil: true } },
      package: true,
    },
  });

  return NextResponse.json({ success: true, data: requests });
}

// PATCH — Talebi onayla veya reddet
export async function PATCH(req: NextRequest) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, action, reviewNote } = body;

  if (!id || !action) return NextResponse.json({ error: "id ve action gerekli" }, { status: 400 });
  if (!["APPROVED", "REJECTED"].includes(action)) return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });

  const request = await prisma.sTKPurchaseRequest.findUnique({
    where: { id },
    include: { package: true },
  });

  if (!request) return NextResponse.json({ error: "Talep bulunamadı" }, { status: 404 });
  if (request.status !== "PENDING") return NextResponse.json({ error: "Bu talep zaten işlenmiş" }, { status: 400 });

  // Talebi güncelle
  await prisma.sTKPurchaseRequest.update({
    where: { id },
    data: {
      status: action,
      reviewNote: reviewNote || null,
      reviewedAt: new Date(),
      reviewedBy: (session.user as { id: string }).id,
    },
  });

  // Onaylanan talep: kredi yükle + öne çıkarma + bot kilidi
  if (action === "APPROVED") {
    const pkg = request.package;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (pkg.smsAmount > 0) updateData.smsCredits = { increment: pkg.smsAmount };
    if (pkg.whatsappAmount > 0) updateData.whatsappCredits = { increment: pkg.whatsappAmount };
    if (pkg.pushAmount > 0) updateData.pushCredits = { increment: pkg.pushAmount };
    if (pkg.emailAmount > 0) updateData.emailCredits = { increment: pkg.emailAmount };

    // Öne çıkarma
    if (pkg.featuredDays > 0) {
      const now = new Date();
      const stk = await prisma.sTKOrganization.findUnique({
        where: { id: request.stkId },
        select: { featuredUntil: true },
      });
      const baseDate = stk?.featuredUntil && stk.featuredUntil > now ? stk.featuredUntil : now;
      updateData.isFeatured = true;
      updateData.featuredUntil = new Date(baseDate.getTime() + pkg.featuredDays * 24 * 60 * 60 * 1000);
    }

    // WhatsApp Bot süresi (whatsappBotDays > 0 olan tüm paketler)
    if (pkg.whatsappBotDays > 0) {
      const now = new Date();
      const stk = await prisma.sTKOrganization.findUnique({
        where: { id: request.stkId },
        select: { waBotUntil: true },
      });
      const baseDate = stk?.waBotUntil && stk.waBotUntil > now ? stk.waBotUntil : now;
      updateData.hasCustomWaBot = true;
      updateData.waBotStatus = "PENDING_QR";
      updateData.waBotUntil = new Date(baseDate.getTime() + pkg.whatsappBotDays * 24 * 60 * 60 * 1000);
    }

    // WA_BOT paketi: WhatsApp Bot kilidini aç (whatsappBotDays yoksa 30 gün varsayılan)
    if (pkg.type === "WA_BOT" && !pkg.whatsappBotDays) {
      updateData.hasCustomWaBot = true;
      updateData.waBotStatus = "PENDING_QR";
      updateData.waBotUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    // FULL_LICENSE paketi: Her şeyi aç + devasa kota
    if (pkg.type === "FULL_LICENSE") {
      if (!updateData.hasCustomWaBot) {
        updateData.hasCustomWaBot = true;
        updateData.waBotStatus = "PENDING_QR";
        updateData.waBotUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }
      if (!updateData.isFeatured) {
        updateData.isFeatured = true;
        updateData.featuredUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.sTKOrganization.update({
        where: { id: request.stkId },
        data: updateData,
      });
    }

    console.log(`[Sales] ✅ Talep onaylandı: ${request.stkId} → Paket: ${pkg.name} (Tip:${pkg.type}, SMS:${pkg.smsAmount}, WA:${pkg.whatsappAmount}, Push:${pkg.pushAmount}, Email:${pkg.emailAmount}, Featured:${pkg.featuredDays}gün)`);
  }

  return NextResponse.json({
    success: true,
    message: action === "APPROVED" ? "✅ Talep onaylandı, krediler yüklendi!" : "❌ Talep reddedildi.",
  });
}
