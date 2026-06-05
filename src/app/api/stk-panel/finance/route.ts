import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const records = await prisma.sTKFinanceRecord.findMany({ where: { stkId: stk.id }, orderBy: { date: "desc" }, take: 100 });
    const income = records.filter(r => r.type === "INCOME").reduce((s, r) => s + r.amount, 0);
    const expense = records.filter(r => r.type === "EXPENSE").reduce((s, r) => s + r.amount, 0);

    return NextResponse.json({ success: true, data: records, summary: { income, expense, balance: income - expense } });
  } catch (error) {
    console.error("[STK Finance GET]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const { type, category, amount, description, date } = await request.json();
    if (!type || !amount) return NextResponse.json({ error: "Tür ve Tutar zorunludur" }, { status: 400 });

    const record = await prisma.sTKFinanceRecord.create({
      data: { stkId: stk.id, type: type as "INCOME" | "EXPENSE", category: (category || "OTHER") as any, amount: Number(amount), description: description || null, date: date ? new Date(date) : new Date() },
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    console.error("[STK Finance POST]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE /api/stk-panel/finance?id=xxx — Gelir kaydı sil (sadece INCOME)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

    // Sadece gelir silinebilir — ADLİ BİLİŞİM: Tüm veriyi çek
    const record = await prisma.sTKFinanceRecord.findUnique({ where: { id } });
    if (!record || record.stkId !== stk.id) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });

    // 🛡️ ADLİ BİLİŞİM LOG — Silinen finans kaydının TÜM verisi JSON olarak yedeklenir
    try {
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      await prisma.sTKAuditLog.create({
        data: {
          stkId: stk.id,
          userId: user.id,
          action: "DELETE_FINANCE",
          entityType: "FINANCE_RECORD",
          entityId: id,
          details: record as any,
          ipAddress: ip,
        },
      });
      console.log(`[AuditLog] 🛡️ DELETE_FINANCE logged: ${record.type} ${record.amount}TL (${id}) by ${user.id}`);
    } catch (logErr) {
      console.error("[AuditLog] Log kayıt hatası:", logErr);
    }

    await prisma.sTKFinanceRecord.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: 1 });
  } catch (error) {
    console.error("[STK Finance DELETE]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// PATCH /api/stk-panel/finance?id=xxx — Gider kaydı düzenle (sadece EXPENSE)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

    const record = await prisma.sTKFinanceRecord.findUnique({ where: { id } });
    if (!record || record.stkId !== stk.id) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });

    const body = await request.json();
    const updateData: any = {};
    if (body.category) updateData.category = body.category;
    if (body.amount !== undefined) updateData.amount = Number(body.amount);
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.date) updateData.date = new Date(body.date);

    const updated = await prisma.sTKFinanceRecord.update({ where: { id }, data: updateData });

    // 🛡️ ADLİ BİLİŞİM LOG — Eski ve yeni değerler kaydedilir
    try {
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      await prisma.sTKAuditLog.create({
        data: {
          stkId: stk.id,
          userId: user.id,
          action: "UPDATE_FINANCE",
          entityType: "FINANCE_RECORD",
          entityId: id,
          details: { oldData: record as any, newData: updated as any, changes: updateData },
          ipAddress: ip,
        },
      });
    } catch (logErr) {
      console.error("[AuditLog] Log kayıt hatası:", logErr);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[STK Finance PATCH]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
