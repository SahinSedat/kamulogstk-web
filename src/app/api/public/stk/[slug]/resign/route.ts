import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/public/stk/[slug]/resign
 * STK üyelikten istifa talebi — hem STKApplication hem STKResignation tablosuna yazar
 * böylece hem admin panelinde hem STK yönetim panelinde görünür.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { userId, reason } = body;

    if (!userId) {
      return NextResponse.json({ error: "Giriş yapmanız gerekmektedir." }, { status: 401 });
    }

    const stk = await prisma.sTKOrganization.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!stk) {
      return NextResponse.json({ error: "STK bulunamadı." }, { status: 404 });
    }

    // Onaylanmış başvuru var mı?
    const app = await prisma.sTKApplication.findFirst({
      where: { stkId: stk.id, userId, status: "APPROVED" },
    });

    if (!app) {
      return NextResponse.json({ error: "Bu STK'ya onaylanmış üyeliğiniz bulunmamaktadır." }, { status: 404 });
    }

    // 1) STKApplication tablosunu güncelle (Admin panel bu tablodan okuyor)
    await prisma.sTKApplication.update({
      where: { id: app.id },
      data: { status: "RESIGN_PENDING", membershipStatus: "RESIGN_PENDING" },
    });

    // 2) Member tablosunda karşılık gelen üyeyi bul
    const member = await prisma.member.findFirst({
      where: { stkId: stk.id, userId },
    });

    // 3) STKResignation tablosuna kayıt ekle (STK yönetim paneli bu tablodan okuyor)
    if (member) {
      const existingResignation = await prisma.sTKResignation.findFirst({
        where: { memberId: member.id, stkId: stk.id, status: "PENDING" },
      });

      if (!existingResignation) {
        await prisma.sTKResignation.create({
          data: {
            stkId: stk.id,
            memberId: member.id,
            reason: reason || "Mobil uygulama üzerinden istifa talebi",
            status: "PENDING",
          },
        });
      }

      // Member tablosundaki durumu da güncelle
      await prisma.member.update({
        where: { id: member.id },
        data: { status: "RESIGNATION_REQ" },
      });
    }

    return NextResponse.json({
      success: true,
      message: `${stk.name} üyeliğinden istifa talebiniz alınmıştır. Onay bekleniyor.`,
    });
  } catch (error: any) {
    console.error("[STK Resign]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
