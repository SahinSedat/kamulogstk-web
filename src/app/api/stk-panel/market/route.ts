import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagerSTK } from "@/lib/helpers/getManagerSTK";

// GET — Aktif paketleri + STK güncel kredilerini getir
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stkRef = await getManagerSTK(user.id);
    if (!stkRef) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const [stk, packages, myRequests] = await Promise.all([
      prisma.sTKOrganization.findUnique({
        where: { id: stkRef.id },
        select: {
          id: true, name: true, smsCredits: true, whatsappCredits: true,
          pushCredits: true, emailCredits: true, isFeatured: true, featuredUntil: true,
          hasCustomWaBot: true, waBotUntil: true, waBotStatus: true, iban: true,
        },
      }),
      prisma.sTKPackage.findMany({
        where: { isActive: true },
        orderBy: { price: "asc" },
      }),
      prisma.sTKPurchaseRequest.findMany({
        where: { stkId: stkRef.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { package: { select: { name: true, type: true, whatsappBotDays: true, featuredDays: true, durationLabel: true, smsAmount: true, whatsappAmount: true, pushAmount: true, emailAmount: true } } },
      }),
    ]);

    // Banka ayarlarını da getir
    const bankSettings = await prisma.systemSetting.findMany({
      where: { key: { in: ["bankName", "bankIban", "bankAccountHolder", "paymentDescription"] } },
    });
    const bank: Record<string, string> = {};
    for (const s of bankSettings) bank[s.key] = s.value;

    return NextResponse.json({
      success: true,
      credits: {
        sms: stk?.smsCredits || 0,
        whatsapp: stk?.whatsappCredits || 0,
        push: stk?.pushCredits || 0,
        email: stk?.emailCredits || 0,
      },
      featured: { active: stk?.isFeatured || false, until: stk?.featuredUntil },
      waBot: { active: stk?.hasCustomWaBot || false, until: stk?.waBotUntil, status: stk?.waBotStatus || "INACTIVE" },
      packages,
      requests: myRequests,
      bank,
    });
  } catch (error) {
    console.error("[STK Market GET]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST — Satın alma talebi oluştur
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stkRef = await getManagerSTK(user.id);
    if (!stkRef) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const body = await req.json();
    const { packageId, receiptNo, receiptFileUrl } = body;

    if (!packageId || !receiptNo) {
      return NextResponse.json({ error: "Paket ve dekont numarası zorunlu" }, { status: 400 });
    }

    // Paket kontrolü
    const pkg = await prisma.sTKPackage.findUnique({ where: { id: packageId } });
    if (!pkg || !pkg.isActive) {
      return NextResponse.json({ error: "Paket bulunamadı veya aktif değil" }, { status: 404 });
    }

    // Aynı dekont no ile bekleyen talep var mı?
    const existingRequest = await prisma.sTKPurchaseRequest.findFirst({
      where: { stkId: stkRef.id, receiptNo, status: "PENDING" },
    });
    if (existingRequest) {
      return NextResponse.json({ error: "Bu dekont numarası ile zaten bekleyen bir talebiniz var" }, { status: 400 });
    }

    // STK adını al
    const stkOrg = await prisma.sTKOrganization.findUnique({ where: { id: stkRef.id }, select: { name: true } });

    const request = await prisma.sTKPurchaseRequest.create({
      data: {
        stkId: stkRef.id,
        packageId,
        receiptNo,
        receiptFileUrl: receiptFileUrl || null,
        amount: pkg.price,
        status: "PENDING",
      },
      include: { package: { select: { name: true } } },
    });

    // Admin bildirimi oluştur
    try {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map(a => ({
            userId: a.id,
            title: "💳 Yeni Satın Alım Talebi!",
            message: `${stkOrg?.name || "STK"} - "${pkg.name}" paketi için ${pkg.price.toLocaleString("tr-TR")} ₺ ödeme onayı bekliyor. Dekont No: ${receiptNo}`,
            type: "SYSTEM",
          })),
        });
      }
    } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      data: request,
      message: `✅ "${pkg.name}" paketi için talebiniz oluşturuldu. Admin onayından sonra kredileriniz yüklenecektir.`,
    });
  } catch (error) {
    console.error("[STK Market POST]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
