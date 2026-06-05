import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT — STK'ya kota ekle/güncelle (admin only)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { stkId, smsCredits, whatsappCredits, pushCredits, emailCredits, waBotDays, featuredDays, mode } = body;

    if (!stkId) return NextResponse.json({ error: "stkId zorunlu" }, { status: 400 });

    const stk = await prisma.sTKOrganization.findUnique({ where: { id: stkId } });
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: any = {};

    if (mode === "set") {
      // Set mode: doğrudan değer ata
      if (smsCredits !== undefined) update.smsCredits = parseInt(smsCredits);
      if (whatsappCredits !== undefined) update.whatsappCredits = parseInt(whatsappCredits);
      if (pushCredits !== undefined) update.pushCredits = parseInt(pushCredits);
      if (emailCredits !== undefined) update.emailCredits = parseInt(emailCredits);
    } else {
      // Increment mode (default): mevcut değere ekle
      if (smsCredits) update.smsCredits = { increment: parseInt(smsCredits) };
      if (whatsappCredits) update.whatsappCredits = { increment: parseInt(whatsappCredits) };
      if (pushCredits) update.pushCredits = { increment: parseInt(pushCredits) };
      if (emailCredits) update.emailCredits = { increment: parseInt(emailCredits) };
    }

    // WA Bot süresi uzatma
    if (waBotDays && parseInt(waBotDays) > 0) {
      const days = parseInt(waBotDays);
      const currentUntil = stk.waBotUntil && new Date(stk.waBotUntil) > new Date() ? new Date(stk.waBotUntil) : new Date();
      currentUntil.setDate(currentUntil.getDate() + days);
      update.waBotUntil = currentUntil;
      update.hasCustomWaBot = true;
    }

    // Öne çıkarma süresi uzatma
    if (featuredDays && parseInt(featuredDays) > 0) {
      const days = parseInt(featuredDays);
      const currentUntil = stk.featuredUntil && new Date(stk.featuredUntil) > new Date() ? new Date(stk.featuredUntil) : new Date();
      currentUntil.setDate(currentUntil.getDate() + days);
      update.featuredUntil = currentUntil;
      update.isFeatured = true;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Güncellenecek alan belirtilmedi" }, { status: 400 });
    }

    const updated = await prisma.sTKOrganization.update({
      where: { id: stkId },
      data: update,
      select: {
        id: true, name: true, smsCredits: true, whatsappCredits: true,
        pushCredits: true, emailCredits: true, isFeatured: true,
        featuredUntil: true, hasCustomWaBot: true, waBotUntil: true,
      },
    });

    return NextResponse.json({ success: true, data: updated, message: "Kota başarıyla güncellendi" });
  } catch (error) {
    console.error("[STK Quota PUT]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// GET — STK mevcut kotalarını getir
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stkId = searchParams.get("stkId");
    if (!stkId) return NextResponse.json({ error: "stkId zorunlu" }, { status: 400 });

    const stk = await prisma.sTKOrganization.findUnique({
      where: { id: stkId },
      select: {
        id: true, name: true, smsCredits: true, whatsappCredits: true,
        pushCredits: true, emailCredits: true, isFeatured: true,
        featuredUntil: true, hasCustomWaBot: true, waBotUntil: true, waBotStatus: true,
      },
    });
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

    return NextResponse.json({ success: true, data: stk });
  } catch (error) {
    console.error("[STK Quota GET]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
