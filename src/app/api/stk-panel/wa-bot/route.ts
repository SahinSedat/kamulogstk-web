import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagerSTK } from "@/lib/helpers/getManagerSTK";

// GET — WA Bot durumunu + QR kodunu getir
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stkRef = await getManagerSTK(user.id);
    if (!stkRef) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const stk = await prisma.sTKOrganization.findUnique({
      where: { id: stkRef.id },
      select: {
        id: true,
        name: true,
        hasCustomWaBot: true,
        waBotStatus: true,
        waBotPhone: true,
        waBotQrCode: true,
        waBotAutoReply: true,
        botContactPhone: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        hasCustomWaBot: stk?.hasCustomWaBot || false,
        waBotStatus: stk?.waBotStatus || "INACTIVE",
        waBotPhone: stk?.waBotPhone || null,
        waBotQrCode: stk?.waBotQrCode || null,
        waBotAutoReply: stk?.waBotAutoReply || "",
        botContactPhone: stk?.botContactPhone || "",
        stkName: stk?.name || "",
      },
    });
  } catch (error) {
    console.error("[WA Bot GET]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// PATCH — Otomatik yanıt metnini güncelle
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stkRef = await getManagerSTK(user.id);
    if (!stkRef) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const body = await request.json();
    const { waBotAutoReply, botContactPhone } = body;

    const updateData: Record<string, string | null> = {};
    if (typeof waBotAutoReply === "string") updateData.waBotAutoReply = waBotAutoReply.trim() || null;
    if (typeof botContactPhone === "string") updateData.botContactPhone = botContactPhone.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Güncellenecek veri yok" }, { status: 400 });
    }

    await prisma.sTKOrganization.update({
      where: { id: stkRef.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, message: "Otomatik yanıt güncellendi!" });
  } catch (error) {
    console.error("[WA Bot PATCH]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
