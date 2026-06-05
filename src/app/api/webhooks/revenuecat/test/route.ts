import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/webhooks/revenuecat/test
 * Admin-only test endpoint — RevenueCat webhook'unu simüle eder.
 * Body: { userId: string }
 * 
 * Bu endpoint gerçek bir satın alım oluşturur (test amaçlı).
 * Sadece ADMIN oturumu ile çalışır.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz — sadece admin" }, { status: 403 });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId gerekli" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, isPremium: true },
    });

    if (!user) {
      return NextResponse.json({ error: `Kullanıcı bulunamadı: ${userId}` }, { status: 404 });
    }

    // Simüle edilmiş webhook payload — gerçek RevenueCat formatında
    const testPayload = {
      api_version: "1.0",
      event: {
        type: "INITIAL_PURCHASE",
        app_user_id: userId,
        original_app_user_id: userId,
        aliases: [userId],
        product_id: "test_product",
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
        price_in_purchased_currency: 99,
        currency: "TRY",
        store: "TEST",
      },
    };

    // Gerçek webhook endpoint'ine iç istek gönder
    const webhookUrl = `${req.nextUrl.origin}/api/webhooks/revenuecat`;
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret ? { Authorization: `Bearer ${webhookSecret}` } : {}),
      },
      body: JSON.stringify(testPayload),
    });

    const result = await response.json();

    return NextResponse.json({
      testResult: response.ok ? "✅ BAŞARILI" : "❌ BAŞARISIZ",
      statusCode: response.status,
      webhookResponse: result,
      testPayload,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Test hatası", details: errMsg }, { status: 500 });
  }
}

/**
 * GET /api/webhooks/revenuecat/test
 * Son webhook loglarını gösterir (AdminLog tablosundan)
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const logs = await prisma.adminLog.findMany({
    where: { action: "REVENUECAT_WEBHOOK" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    total: logs.length,
    logs,
  });
}
