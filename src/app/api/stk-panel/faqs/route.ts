import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — STK'nın tüm SSS kayıtlarını getir
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER")
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

    const faqs = await prisma.sTKFAQ.findMany({
      where: { stkId: stk.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: faqs });
  } catch (e) {
    console.error("[FAQs GET]:", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST — Yeni SSS ekle
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER")
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

    const body = await request.json();
    const { question, answer } = body;
    if (!question || !answer)
      return NextResponse.json({ error: "Soru ve cevap zorunludur" }, { status: 400 });

    const faq = await prisma.sTKFAQ.create({
      data: { question, answer, stkId: stk.id },
    });

    return NextResponse.json({ success: true, data: faq }, { status: 201 });
  } catch (e) {
    console.error("[FAQs POST]:", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE — SSS sil
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER")
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

    // Güvenlik: sadece kendi STK'nın SSS'ini silsin
    await prisma.sTKFAQ.deleteMany({ where: { id, stkId: stk.id } });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[FAQs DELETE]:", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
