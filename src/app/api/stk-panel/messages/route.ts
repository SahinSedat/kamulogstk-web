import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// GET /api/stk-panel/messages — Kredi bakiyeleri + kampanya geçmişi
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stkRef = await getManagerSTK(user.id);
    if (!stkRef) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const stk = await prisma.sTKOrganization.findUnique({ where: { id: stkRef.id } });
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

    // Kampanya geçmişi
    const campaigns = await prisma.sTKMessageCampaign.findMany({
      where: { stkId: stk.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Toplam üye sayısı (hedef kitle)
    const memberCount = await prisma.member.count({
      where: { stkId: stk.id, status: "ACTIVE" },
    });

    return NextResponse.json({
      success: true,
      credits: {
        sms: (stk as any).smsCredits || 0,
        whatsapp: (stk as any).whatsappCredits || 0,
        email: (stk as any).emailCredits || 0,
        push: (stk as any).pushCredits || 0,
      },
      memberCount,
      campaigns,
    });
  } catch (error) {
    console.error("[STK Messages GET]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST /api/stk-panel/messages — Yeni mesaj/kampanya gönder
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stkRef = await getManagerSTK(user.id);
    if (!stkRef) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const stk = await prisma.sTKOrganization.findUnique({ where: { id: stkRef.id } });
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

    const body = await request.json();
    const { title, content, channel, targetAudience } = body;

    if (!title || !content || !channel) {
      return NextResponse.json({ error: "Başlık, İçerik ve Kanal zorunludur" }, { status: 400 });
    }

    // Hedef üye sayısını hesapla
    const whereClause: Record<string, unknown> = { stkId: stk.id };
    if (targetAudience === "ACTIVE") {
      whereClause.status = "ACTIVE";
    } else if (targetAudience === "APPLIED") {
      whereClause.status = "APPLIED";
    }
    // "ALL" ise filtre yok

    const targetCount = await prisma.member.count({ where: whereClause });

    if (targetCount === 0) {
      return NextResponse.json({ error: "Hedef kitlede üye bulunamadı" }, { status: 400 });
    }

    // Kredi kontrolü
    const currentCredits = channel === "SMS" ? (stk.smsCredits ?? 0)
      : channel === "PUSH" ? (stk.pushCredits ?? 0)
      : channel === "WHATSAPP" ? (stk.whatsappCredits ?? 0)
      : (stk.emailCredits ?? 0);

    const creditField = channel === "SMS" ? "smsCredits"
      : channel === "PUSH" ? "pushCredits"
      : channel === "WHATSAPP" ? "whatsappCredits"
      : "emailCredits" as const;

    if (currentCredits < targetCount) {
      return NextResponse.json({
        error: `Yetersiz ${channel} kredisi! Mevcut: ${currentCredits}, Gerekli: ${targetCount}`,
        creditNeeded: targetCount,
        creditAvailable: currentCredits,
      }, { status: 400 });
    }

    // Krediyi düş
    await prisma.sTKOrganization.update({
      where: { id: stk.id },
      data: { [creditField]: { decrement: targetCount } },
    });

    // Kampanya kaydı oluştur
    const campaign = await prisma.sTKMessageCampaign.create({
      data: {
        id: `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        stkId: stk.id,
        title,
        content,
        channel: channel as "SMS" | "PUSH" | "WHATSAPP" | "EMAIL",
        targetAudience: targetAudience || "ALL",
        targetCount,
        status: "SENT",
      },
    });

    // ── WhatsApp Kanal Yönlendirmesi: STK'nın kendi botu üzerinden gönder ──
    if (channel === "WHATSAPP" && (stk as any).hasCustomWaBot && (stk as any).waBotStatus === "CONNECTED") {
      const memberWhere: any = { stkId: stk.id, phone: { not: null } };
      if (targetAudience === "ACTIVE") memberWhere.status = "ACTIVE";
      else if (targetAudience === "APPLIED") memberWhere.status = "APPLIED";
      const members = await prisma.member.findMany({
        where: memberWhere,
        select: { phone: true, name: true, surname: true },
        take: targetCount,
      });

      let sentCount = 0;
      const orgName = stk.name || "Derneğimiz";
      for (const m of members) {
        if (!m.phone) continue;
        try {
          const msg = `*${orgName}:*\n\n📢 *${title}*\n\n${content}`;
          const res = await fetch(`${process.env.STK_BOT_URL || "http://localhost:3102"}/send-message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stkId: stk.id, phone: m.phone, message: msg }),
          });
          if (res.ok) sentCount++;
        } catch { /* individual failure, continue */ }
      }
      console.log(`[Messages] 📲 WA Bot: ${orgName} → ${sentCount}/${members.length} mesaj gönderildi`);
    }

    return NextResponse.json({
      success: true,
      data: campaign,
      message: `${targetCount} kişiye ${channel} bildirimi gönderildi. ${currentCredits - targetCount} kredi kaldı.`,
    }, { status: 201 });
  } catch (error) {
    console.error("[STK Messages POST]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
