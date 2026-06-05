import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });
    
    // STKPaymentReport üzerinden ödeme raporlarını getir
    let data: any[] = [];
    try {
      data = await prisma.sTKPaymentReport.findMany({
        where: { application: { stkId: stk.id } },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { application: { select: { name: true, email: true } } },
      });
    } catch { /* tablo yoksa boş dön */ }
    
    return NextResponse.json({ success: true, data });
  } catch (e) { console.error("[STK Payments]:", e); return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 }); }
}
