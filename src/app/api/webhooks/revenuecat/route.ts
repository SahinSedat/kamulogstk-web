import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSystemSetting } from "@/lib/systemSettings";
import { logStoreTransaction } from "@/lib/subscription-helpers";
import { sendOrderConfirmationEmail, sendJetonPurchaseEmail, createNotification } from "@/lib/services/notificationService";
import crypto from "crypto";
import { createAdminNotification } from "@/lib/services/adminNotificationService";

function generateOrderNumber(): string {
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  return `KMLG-${rand}`;
}

/**
 * GET /api/webhooks/revenuecat
 * Webhook durumu + son loglar (admin icin)
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ status: "ok", message: "RevenueCat webhook endpoint aktif" });
  }

  const recentLogs = await prisma.adminLog.findMany({
    where: { action: "REVENUECAT_WEBHOOK" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, action: true, targetType: true, targetId: true, details: true, createdAt: true },
  });

  return NextResponse.json({
    status: "ok",
    message: "RevenueCat webhook endpoint aktif",
    timestamp: new Date().toISOString(),
    recentWebhooks: recentLogs,
  });
}

/**
 * POST /api/webhooks/revenuecat
 * RevenueCat Server-to-Server Webhook
 *
 * Desteklenen Urun Tipleri:
 * 1. Becayis Premium (Subscription) -> isPremium + Subscription tablosu
 * 2. Kariyer Premium (Subscription) -> isCareerPremium + careerAiTokens
 * 3. Danışman Jeton (Consumable)    -> credits arttır
 */
export async function POST(req: NextRequest) {
  let rawBody = "";

  try {
    // 1. Webhook secret dogrulama
    const authHeader = req.headers.get("authorization");
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[RevenueCat] REVENUECAT_WEBHOOK_SECRET tanimli degil!");
      return NextResponse.json({ error: "Webhook yapilandirilmamis" }, { status: 503 });
    }

    if (authHeader !== `Bearer ${webhookSecret}`) {
      console.warn("[RevenueCat] Gecersiz webhook token");
      await logWebhook("AUTH_FAILED", "none", null, `Auth: ${authHeader?.substring(0, 30) || "yok"}`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    rawBody = await req.text();
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      await logWebhook("PARSE_ERROR", "none", null, `Parse hata: ${rawBody.substring(0, 200)}`);
      return NextResponse.json({ error: "Gecersiz JSON" }, { status: 400 });
    }

    const event = body?.event;
    if (!event) {
      return NextResponse.json({ error: "Event bulunamadi" }, { status: 400 });
    }

    const {
      type,
      app_user_id,
      original_app_user_id,
      aliases,
      expiration_at_ms,
      product_id,
      price_in_purchased_currency,
      currency,
      store,
      transaction_id,
      environment,
    } = event;

    // ── DEBUG: Her webhook isteğinin tam body'sini logla ──
    const envLabel = environment || "PRODUCTION";
    console.log(
      `[RevenueCat] ══════════════════════════════════════════\n` +
      `[RevenueCat] 📥 WEBHOOK ALINDI\n` +
      `[RevenueCat]   Olay: ${type}\n` +
      `[RevenueCat]   Ortam: ${envLabel}\n` +
      `[RevenueCat]   app_user_id: ${app_user_id}\n` +
      `[RevenueCat]   original_app_user_id: ${original_app_user_id}\n` +
      `[RevenueCat]   aliases: ${JSON.stringify(aliases)}\n` +
      `[RevenueCat]   product_id: ${product_id}\n` +
      `[RevenueCat]   store: ${store}\n` +
      `[RevenueCat]   transaction_id: ${transaction_id}\n` +
      `[RevenueCat]   price: ${price_in_purchased_currency} ${currency}\n` +
      `[RevenueCat]   RAW BODY: ${rawBody.substring(0, 1500)}\n` +
      `[RevenueCat] ══════════════════════════════════════════`
    );

    // ── SANDBOX/TEST ortamı — bilinçli olarak İŞLENİYOR ──
    // NOT: Test alımlarının da veritabanına işlenmesi için
    // sandbox event'leri REDDEDİLMEZ.
    if (envLabel === "SANDBOX") {
      console.log(`[RevenueCat] 🧪 SANDBOX ortamı tespit edildi — event NORMAL işlenecek (test alımı kabul ediliyor)`);
    }

    // 2. Kullaniciyi bul
    const user = await resolveWebhookUser(app_user_id, original_app_user_id, aliases);

    if (!user) {
      const detail = `Kullanici bulunamadi. app_user_id: ${app_user_id}, original: ${original_app_user_id}, aliases: ${JSON.stringify(aliases)}`;
      console.warn(`[RevenueCat] ❌ ${detail}`);
      await logWebhook("USER_NOT_FOUND", type, app_user_id, detail);
      return NextResponse.json({ error: "Kullanici bulunamadi" }, { status: 404 });
    }

    console.log(`[RevenueCat] ✅ Kullanici bulundu: ${user.id} (${user.email})`);

    // 3. Urun tipini belirle
    const productType = classifyProduct(product_id || "");
    const amount = price_in_purchased_currency || 0;

    console.log(`[RevenueCat] 📦 Ürün sınıflandırması: productId="${product_id}" → type=${productType}`);

    // 4. Olay tipine gore islem
    const purchaseEvents = ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"];
    const cancelEvents = ["CANCELLATION", "EXPIRATION", "BILLING_ISSUE"];

    if (purchaseEvents.includes(type) && productType !== "JETON") {
      // ── ABONELİK SATIN ALIMI / YENİLEME ──
      if (productType === "CAREER_PREMIUM") {
        await handleCareerPremiumPurchase(user, product_id, expiration_at_ms, amount, currency, store, type);
      } else {
        await handleBecayisPremiumPurchase(user, product_id, expiration_at_ms, amount, currency, store, type);
      }

      await logStoreTransaction({
        userId: user.id,
        store: store || "UNKNOWN",
        productId: product_id || "unknown",
        transactionId: transaction_id,
        type: "SUBSCRIPTION",
        amount,
        currency: currency || "TRY",
        rawPayload: rawBody.substring(0, 2000),
      });

    } else if (type === "NON_RENEWING_PURCHASE" && productType !== "JETON") {
      // ── TEK SEFERLİK (LİFETIME) SATIN ALIM ──
      // NON_RENEWING_PURCHASE: Kariyer ömür boyu veya Becayiş lifetime
      // Bu event JETON DEĞİL, abonelik/premium handler'a yönlendir
      console.log(`[RevenueCat] 🏷️ NON_RENEWING_PURCHASE → ${productType} (lifetime/tek seferlik)`);

      if (productType === "CAREER_PREMIUM") {
        await handleCareerPremiumPurchase(user, product_id, expiration_at_ms, amount, currency, store, type);
      } else {
        await handleBecayisPremiumPurchase(user, product_id, expiration_at_ms, amount, currency, store, type);
      }

      await logStoreTransaction({
        userId: user.id,
        store: store || "UNKNOWN",
        productId: product_id || "unknown",
        transactionId: transaction_id,
        type: "SUBSCRIPTION", // NON_RENEWING_PURCHASE → lifetime abonelik
        amount,
        currency: currency || "TRY",
        rawPayload: rawBody.substring(0, 2000),
      });

    } else if (type === "NON_RENEWING_PURCHASE" && productType === "JETON") {
      // ── JETON (CONSUMABLE) SATIN ALIMI ──
      console.log(`[RevenueCat] 💎 NON_RENEWING_PURCHASE → JETON`);
      await handleJetonPurchase(user, product_id, amount, currency, store, type);

      await logStoreTransaction({
        userId: user.id,
        store: store || "UNKNOWN",
        productId: product_id || "unknown",
        transactionId: transaction_id,
        type: "CONSUMABLE",
        amount,
        currency: currency || "TRY",
        rawPayload: rawBody.substring(0, 2000),
      });

    } else if (productType === "JETON") {
      // ── Diğer jeton event'leri ──
      console.log(`[RevenueCat] 💎 Jeton event: ${type}`);
      await handleJetonPurchase(user, product_id, amount, currency, store, type);

      await logStoreTransaction({
        userId: user.id,
        store: store || "UNKNOWN",
        productId: product_id || "unknown",
        transactionId: transaction_id,
        type: "CONSUMABLE",
        amount,
        currency: currency || "TRY",
        rawPayload: rawBody.substring(0, 2000),
      });

    } else if (cancelEvents.includes(type)) {
      // ── İPTAL / SÜRE DOLUMU ──
      if (productType === "CAREER_PREMIUM") {
        await handleCareerPremiumCancel(user, type);
      } else {
        await handleBecayisPremiumCancel(user, type);
      }

    } else {
      console.log(`[RevenueCat] ⚠️ İşlenmeyen olay: ${type} | product: ${product_id} | env: ${envLabel}`);
      await logWebhook("UNHANDLED_EVENT", type, user.id, `İşlenmeyen: ${type} | product: ${product_id} | env: ${envLabel}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[RevenueCat] Webhook hatasi:", errMsg);
    try {
      await logWebhook("ERROR", "unknown", null, `Hata: ${errMsg} | Body: ${rawBody.substring(0, 300)}`);
    } catch { /* sessizce gec */ }
    return NextResponse.json({ error: "Sunucu hatasi", details: errMsg }, { status: 500 });
  }
}

// ========== URUN TIPI SINIFLANDIRMA ==========

type ProductType = "BECAYIS_PREMIUM" | "CAREER_PREMIUM" | "JETON";

function classifyProduct(productId: string): ProductType {
  const pid = productId.toLowerCase();
  if (pid.includes("career") || pid.includes("kariyer")) return "CAREER_PREMIUM";
  if (pid.includes("jeton") || pid.includes("credit") || pid.includes("token")) return "JETON";
  return "BECAYIS_PREMIUM";
}

// ========== KULLANICI COZUMLEME ==========

async function resolveWebhookUser(
  appUserId?: string,
  originalAppUserId?: string,
  aliases?: string[]
) {
  const candidateIds: string[] = [];
  if (appUserId) candidateIds.push(appUserId);
  if (originalAppUserId && originalAppUserId !== appUserId) candidateIds.push(originalAppUserId);
  if (Array.isArray(aliases)) {
    for (const alias of aliases) {
      if (alias && !candidateIds.includes(alias)) candidateIds.push(alias);
    }
  }

  const dbCandidates = candidateIds.filter((id) => !id.startsWith("$RCAnonymousID:"));

  for (const id of dbCandidates) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isPremium: true, isCareerPremium: true, email: true, credits: true, consultantJetons: true },
    });
    if (user) return user;
  }

  // Email ile de dene
  if (appUserId?.includes("@")) {
    const user = await prisma.user.findUnique({
      where: { email: appUserId },
      select: { id: true, isPremium: true, isCareerPremium: true, email: true, credits: true, consultantJetons: true },
    });
    if (user) return user;
  }

  return null;
}

// ========== BECAYIS PREMIUM ==========

async function handleBecayisPremiumPurchase(
  user: { id: string; email: string | null },
  productId: string | undefined,
  expirationMs: number | undefined,
  amount: number,
  currency: string | undefined,
  store: string | undefined,
  eventType: string
) {
  const premiumUntil = expirationMs
    ? new Date(expirationMs)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const aiQuotaStr = await getSystemSetting("PREMIUM_AI_QUOTA", "5");
  const aiQuota = parseInt(aiQuotaStr, 10) || 5;

  let plan = null;
  if (productId) {
    plan = await prisma.subscriptionPlan.findFirst({
      where: { OR: [{ appleProductId: productId }, { googleProductId: productId }] },
    });
  }
  if (!plan) {
    plan = await prisma.subscriptionPlan.findFirst({ where: { isActive: true }, orderBy: { order: "asc" } });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        isPremium: true,
        premiumUntil,
        subscriptionTier: plan?.name || "pro",
        aiTokens: aiQuota,
      },
    });

    if (plan) {
      // Mevcut aktif aboneliği güncelle veya yeni oluştur (mükerrer kayıt önleme)
      const existingSub = await tx.subscription.findFirst({
        where: { userId: user.id, status: "active" },
      });
      if (existingSub) {
        await tx.subscription.update({
          where: { id: existingSub.id },
          data: {
            planId: plan.id,
            store: store || "UNKNOWN",
            productId: productId || null,
            endsAt: premiumUntil,
          },
        });
      } else {
        await tx.subscription.create({
          data: {
            userId: user.id,
            planId: plan.id,
            status: "active",
            store: store || "UNKNOWN",
            productId: productId || null,
            endsAt: premiumUntil,
          },
        });
      }
    }

    await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: user.id,
        planId: plan?.id || null,
        amount,
        status: "COMPLETED",
        invoiceStatus: "UNSENT",
        notes: `RevenueCat ${eventType} | ${store || "unknown"} | ${productId || ""} | ${currency || "TRY"}`,
      },
    });
  });

  const logMsg = `Becayis Premium AKTIF - ${user.email} | plan: ${plan?.name || "fallback"} | bitis: ${premiumUntil.toISOString()}`;
  console.log(`[RevenueCat] ${logMsg}`);
  await logWebhook("PURCHASE_SUCCESS", eventType, user.id, logMsg);

  // Admin bildirim (sessiz)
  createAdminNotification({
    type: "SUBSCRIPTION_BECAYIS",
    title: "Yeni Becayis Aboneligi",
    message: (user.email || "Kullanici") + " Becayis Premium aktivasyonu yapti.",
    userId: user.id,
    senderName: user.email || "Bilinmeyen",
    relatedId: productId || undefined,
    details: (plan?.name || "Premium") + " plani - " + amount + " TL - " + store + " uzerinden",
    metadata: { productId: productId, amount: amount, store: store },
  }).catch(() => {});

  // E-posta + Push bildirim
  if (user.email) {
    sendOrderConfirmationEmail({
      recipientEmail: user.email,
      recipientName: (user.email || "anonim").split("@")[0],
      planName: plan?.name || "Premium",
      amount,
      orderNumber: `KMLG-${Date.now().toString(36).toUpperCase().slice(0, 6)}`,
      endsAt: premiumUntil,
    }).catch(() => {});
  }
  createNotification({
    userId: user.id,
    title: "👑 Premium Abonelik Aktif!",
    message: `${plan?.name || "Premium"} planınız başarıyla aktif edildi.`,
    type: "SYSTEM",
    payload: { category: "premium_activated" },
  }).catch(() => {});
}

async function handleBecayisPremiumCancel(
  user: { id: string; email: string | null },
  eventType: string
) {
  await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({
      where: { userId: user.id, status: "active" },
      data: { status: "cancelled" },
    });
    await tx.user.update({
      where: { id: user.id },
      data: { isPremium: false, subscriptionTier: "basic" },
    });
  });

  const logMsg = `Becayis Premium IPTAL - ${user.email} | olay: ${eventType}`;
  console.log(`[RevenueCat] ${logMsg}`);
  await logWebhook("CANCEL_SUCCESS", eventType, user.id, logMsg);
}

// ========== KARIYER PREMIUM ==========

async function handleCareerPremiumPurchase(
  user: { id: string; email: string | null },
  productId: string | undefined,
  expirationMs: number | undefined,
  amount: number,
  currency: string | undefined,
  store: string | undefined,
  eventType: string
) {
  // Ömür boyu plan: NON_RENEWING_PURCHASE geldiğinde expirationMs genellikle null olur
  // Bu durumda çok uzak bir tarih atıyoruz (2099) → mobilde "Sınırsız" gösterilir
  const isLifetime = eventType === "NON_RENEWING_PURCHASE" || !expirationMs;
  const premiumUntil = isLifetime
    ? new Date("2099-12-31T23:59:59Z")
    : new Date(expirationMs!);

  let plan = null;
  if (productId) {
    plan = await prisma.careerSubscriptionPlan.findFirst({
      where: { OR: [{ appleProductId: productId }, { googleProductId: productId }] },
    });
  }
  if (!plan) {
    plan = await prisma.careerSubscriptionPlan.findFirst({ where: { isActive: true }, orderBy: { price: "asc" } });
  }

  const tokenBonus = plan?.aiTokens || 100;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        isCareerPremium: true,
        careerPremiumUntil: premiumUntil,
        careerAiTokens: { increment: tokenBonus },
      },
    });

    await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId: user.id,
        amount,
        status: "COMPLETED",
        notes: `[KARIYER] RevenueCat ${eventType} | ${store} | ${productId || ""} | Token: ${tokenBonus}`,
      },
    });
  });

  const logMsg = `Kariyer Premium AKTIF - ${user.email} | plan: ${plan?.name || "fallback"} | token: ${tokenBonus}`;
  console.log(`[RevenueCat] ${logMsg}`);
  await logWebhook("CAREER_PURCHASE_SUCCESS", eventType, user.id, logMsg);

  // E-posta + Push bildirim
  if (user.email) {
    sendOrderConfirmationEmail({
      recipientEmail: user.email,
      recipientName: (user.email || "anonim").split("@")[0],
      planName: `Kariyer ${plan?.name || "Premium"}`,
      amount,
      orderNumber: `KMLG-${Date.now().toString(36).toUpperCase().slice(0, 6)}`,
      endsAt: premiumUntil,
    }).catch(() => {});
  }
  createNotification({
    userId: user.id,
    title: "🎯 Kariyer Premium Aktif!",
    message: `Kariyer Premium planınız aktif edildi. Ömür boyu erişim hakkınız başladı.`,
    type: "SYSTEM",
    payload: { category: "career_premium_activated" },
  }).catch(() => {});
}

async function handleCareerPremiumCancel(
  user: { id: string; email: string | null },
  eventType: string
) {
  await prisma.user.update({
    where: { id: user.id },
    data: { isCareerPremium: false },
  });

  const logMsg = `Kariyer Premium IPTAL - ${user.email} | olay: ${eventType}`;
  console.log(`[RevenueCat] ${logMsg}`);
  await logWebhook("CAREER_CANCEL", eventType, user.id, logMsg);
}

// ========== DANISМАН JETON (CONSUMABLE) ==========

async function handleJetonPurchase(
  user: { id: string; email: string | null },
  productId: string | undefined,
  amount: number,
  currency: string | undefined,
  store: string | undefined,
  eventType: string
) {
  let jetons = 0;
  let packageName = "Jeton Paketi";

  if (productId) {
    const pkg = await prisma.creditPackage.findFirst({
      where: { OR: [{ appleProductId: productId }, { googleProductId: productId }] },
    });
    if (pkg) {
      jetons = pkg.jetons;
      packageName = pkg.name;
    }
  }

  // Paket bulunamazsa product_id'den sayi cikar
  if (jetons === 0 && productId) {
    const match = productId.match(/(\d+)/);
    if (match) jetons = parseInt(match[1], 10) || 0;
  }

  if (jetons <= 0) {
    console.warn(`[RevenueCat] Jeton miktari belirlenemedi - productId: ${productId}`);
    await logWebhook("JETON_AMOUNT_UNKNOWN", eventType, user.id, `productId: ${productId}`);
    return;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { credits: { increment: jetons } },
    select: { credits: true },
  });

  const orderNumber = `JTN-${Date.now().toString(36).toUpperCase()}`;
  await prisma.order.create({
    data: {
      orderNumber,
      userId: user.id,
      amount,
      status: "COMPLETED",
      orderType: "JETON",
      notes: `${jetons} Danisман Jetonu | RevenueCat ${eventType} | ${store} | ${productId}`,
    },
  });

  const logMsg = `Jeton AKTIF - ${user.email} | ${jetons} jeton eklendi | Toplam: ${updated.credits} | ${packageName}`;
  console.log(`[RevenueCat] ${logMsg}`);
  await logWebhook("JETON_PURCHASE_SUCCESS", eventType, user.id, logMsg);

  // Admin bildirim (sessiz)
  createAdminNotification({
    type: "PURCHASE_TOKEN",
    title: "Jeton Satisi",
    message: (user.email || "Kullanici") + " " + jetons + " jeton satin aldi.",
    userId: user.id,
    senderName: user.email || "Bilinmeyen",
    relatedId: orderNumber || undefined,
    details: packageName + " - " + jetons + " jeton - " + amount + " TL - " + store,
    metadata: { productId: productId, amount: amount, store: store, jetons: jetons },
  }).catch(() => {});

  // E-posta + Push bildirim
  if (user.email) {
    sendJetonPurchaseEmail({
      recipientEmail: user.email,
      recipientName: (user.email || "anonim").split("@")[0],
      jetonCount: jetons,
      totalJetons: updated.credits,
      amount,
      orderNumber,
    }).catch(() => {});
  }
  createNotification({
    userId: user.id,
    title: "💎 Jeton Yüklendi!",
    message: `${jetons} jeton hesabınıza eklendi. Toplam: ${updated.credits} jeton.`,
    type: "SYSTEM",
    payload: { category: "jeton_purchased", jetonCount: jetons },
  }).catch(() => {});
}

// ========== WEBHOOK LOGLAMA ==========

async function logWebhook(action: string, eventType: string, userId: string | null, details: string) {
  try {
    let adminId = userId;
    if (!adminId) {
      const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
      adminId = admin?.id || null;
    }
    if (!adminId) return;

    await prisma.adminLog.create({
      data: {
        adminId,
        action: "REVENUECAT_WEBHOOK",
        targetType: `${action}:${eventType}`,
        targetId: userId,
        details: details.substring(0, 1000),
      },
    });
  } catch (e) {
    console.error("[RevenueCat] AdminLog hatasi:", e);
  }
}
