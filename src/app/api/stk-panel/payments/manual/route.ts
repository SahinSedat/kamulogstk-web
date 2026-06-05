import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER")
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

    const body = await request.json();
    const { memberId, paymentType, amount, paymentDate, description } = body;

    if (!memberId || !paymentType || !amount)
      return NextResponse.json({ error: "Üye, tür ve tutar zorunludur" }, { status: 400 });

    // Üye bu STK'ya ait mi kontrol et
    const member = await prisma.member.findFirst({
      where: { id: memberId, stkId: stk.id },
      select: { id: true, name: true, surname: true },
    });
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    // Kategori belirleme
    const categoryMap: Record<string, string> = {
      MONTHLY_DUES: "MEMBERSHIP_FEES",
      ANNUAL_DUES: "MEMBERSHIP_FEES",
      DONATION: "DONATION",
    };
    const category = categoryMap[paymentType] || "OTHER";
    const typeLabel = paymentType === "MONTHLY_DUES" ? "Aylık Aidat" : paymentType === "ANNUAL_DUES" ? "Yıllık Aidat" : "Bağış";

    // Finans kaydı oluştur
    await prisma.sTKFinanceRecord.create({
      data: {
        stkId: stk.id,
        type: "INCOME",
        amount: parseFloat(amount),
        description: `Manuel Tahsilat: ${typeLabel} - ${member.name} ${member.surname}${description ? ` (${description})` : ""}`,
        date: paymentDate ? new Date(paymentDate) : new Date(),
        category: category as never,
        memberId,
      },
    });

    // Aidat ise premiumUntil güncelle
    if (paymentType === "MONTHLY_DUES" || paymentType === "ANNUAL_DUES") {
      const now = new Date();
      const current = await prisma.member.findUnique({ where: { id: memberId }, select: { premiumUntil: true } });
      const base = current?.premiumUntil && current.premiumUntil > now ? current.premiumUntil : now;
      const months = paymentType === "ANNUAL_DUES" ? 12 : 1;
      const newDate = new Date(base);
      newDate.setMonth(newDate.getMonth() + months);

      await prisma.member.update({
        where: { id: memberId },
        data: { premiumUntil: newDate, status: "ACTIVE" },
      });
    }

    return NextResponse.json({ success: true, message: `${typeLabel} başarıyla kaydedildi` });
  } catch (e) {
    console.error("[ManualPayment POST]:", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
