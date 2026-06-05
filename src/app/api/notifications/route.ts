import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { firebaseMessaging } from "@/lib/firebase/firebaseAdmin";

/**
 * GET /api/notifications
 * Giriş yapan kullanıcının bildirimlerini getirir + okunmamış sayı.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth) {
      return NextResponse.json({ error: "Yetkilendirme gerekli.", reauth: true }, { status: 401 });
    }
    const parts = auth.split(" ");
    const token = parts.length === 2 ? parts[1] : auth;

    let userId = "";
    const user = await prisma.user.findUnique({ where: { id: token }, select: { id: true } });
    if (user) {
      userId = user.id;
    } else {
      const phoneHeader = req.headers.get("x-user-phone");
      if (phoneHeader) {
        const phoneUser = await prisma.user.findFirst({
          where: { OR: [{ phone: phoneHeader }, { phoneNumber: phoneHeader }] },
          select: { id: true },
        });
        if (phoneUser) userId = phoneUser.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı.", reauth: true }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type") || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId };
    if (type) where.type = type;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return NextResponse.json({
      notifications, total, unreadCount, page, limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[notifications] GET Hata:", error);
    return NextResponse.json({ error: "Bildirimler alınırken hata oluştu." }, { status: 500 });
  }
}

// ── Ortak FCM Konfigürasyonu ─────────────────────────────────
function buildAndroidConfig(_imageUrl?: string) {
  return {
    priority: "high" as const,
    notification: {
      channelId: "kamulog_notifications",
      sound: "default",
    },
  };
}

function buildApnsConfig(_imageUrl?: string) {
  return {
    headers: {
      "apns-priority": "10",
      "apns-push-type": "alert",
    },
    payload: {
      aps: {
        sound: "default",
        badge: 1,
        "content-available": 1,
      },
    },
  };
}

// Stale token temizleme
async function cleanupStaleToken(token: string) {
  try {
    await prisma.user.updateMany({
      where: { fcmToken: token },
      data: { fcmToken: null },
    });
    console.log(`[FCM] 🗑️ Geçersiz token temizlendi: ${token.substring(0, 20)}...`);
  } catch (e) {
    console.error("[FCM] Token temizleme hatası:", e);
  }
}

function isStaleTokenError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  const staleErrorCodes = [
    "messaging/registration-token-not-registered",
    "messaging/invalid-registration-token",
    "messaging/invalid-argument",
  ];
  return staleErrorCodes.includes(err.code || "") ||
    (err.message || "").includes("not a valid FCM registration token") ||
    (err.message || "").includes("Requested entity was not found");
}

/**
 * Arka planda FCM push gönderimi.
 * Bu fonksiyon await EDİLMEZ — response döndükten sonra arka planda çalışır.
 * Next.js'in waitUntil benzeri bir pattern ile çağrılır.
 */
async function sendFcmPushInBackground(
  tokens: string[],
  fcmNotification: { title: string; body: string },
  fcmData: Record<string, string>,
  androidConfig: ReturnType<typeof buildAndroidConfig>,
  apnsConfig: ReturnType<typeof buildApnsConfig>,
) {
  if (!firebaseMessaging || tokens.length === 0) return;

  const MICRO_BATCH = 5;  // VPS ag limiti icin kucuk gruplar
  const DELAY_MS = 300;   // Gruplar arasi bekleme (ms)
  let successTotal = 0;
  let failTotal = 0;

  try {
    for (let i = 0; i < tokens.length; i += MICRO_BATCH) {
      const batch = tokens.slice(i, i + MICRO_BATCH);
      try {
        const batchResponse = await firebaseMessaging.sendEachForMulticast({
          tokens: batch,
          notification: fcmNotification,
          data: fcmData,
          android: androidConfig,
          apns: apnsConfig,
        });

        successTotal += batchResponse.successCount;
        failTotal += batchResponse.failureCount;

        // Basarisiz token temizligi
        if (batchResponse.failureCount > 0) {
          for (let idx = 0; idx < batchResponse.responses.length; idx++) {
            const resp = batchResponse.responses[idx];
            if (!resp.success) {
              const errCode = resp.error?.code || "UNKNOWN";
              console.error(`[FCM] Token[${i + idx}] hata: ${errCode}`);
              if (isStaleTokenError(resp.error)) {
                cleanupStaleToken(batch[idx]).catch(() => {});
              }
            }
          }
        }
      } catch (batchErr) {
        console.error(`[FCM] Micro-batch hatasi:`, batchErr);
      }

      // VPS ag yogunlugunu onlemek icin kisa bekleme
      if (i + MICRO_BATCH < tokens.length) {
        await new Promise(r => setTimeout(r, DELAY_MS));
      }
    }
    console.log(`[FCM] Toplu push tamamlandi: ${successTotal} basarili, ${failTotal} basarisiz / ${tokens.length} toplam`);
  } catch (err) {
    console.error("[FCM] Background push hatasi:", err);
  }
}

/**
 * POST /api/notifications
 * Admin panelden bildirim gönderir.
 * 
 * AKIŞ:
 *  1. In-app bildirimleri DB'ye kaydet (hızlı)
 *  2. Response'u HEMEN döndür
 *  3. FCM push'ı arka planda gönder (fire-and-forget)
 */
export async function POST(req: NextRequest) {
  try {
    // ── Admin Yetki Kontrolü
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Yetkilendirme gerekli." }, { status: 401 });
    }

    const body = await req.json();
    const { title, message, targetToken, targetUserId, topic, route, premiumFilters, imageUrl } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "Başlık ve mesaj zorunludur." }, { status: 400 });
    }

    const fcmNotification = { title, body: message };
    const fcmData: Record<string, string> = {
      click_action: "FLUTTER_NOTIFICATION_CLICK",
      route: route || "/",
      title: title,
      body: message,
      ...(imageUrl ? { imageUrl } : {}),
    };
    const androidConfig = buildAndroidConfig(imageUrl);
    const apnsConfig = buildApnsConfig(imageUrl);
    const dbPayload = { ...(route ? { route } : {}), ...(imageUrl ? { imageUrl } : {}) };
    const hasDbPayload = Object.keys(dbPayload).length > 0 ? dbPayload : undefined;

    // ── 🎯 Kişiye özel gönder (userId bazlı — Keskin Nişancı)
    if (targetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, fcmToken: true },
      });
      if (!targetUser) {
        return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
      }

      // In-app bildirim kaydı
      await prisma.notification.create({
        data: { userId: targetUser.id, title, message, type: "SYSTEM", payload: hasDbPayload },
      });

      // FCM push — token varsa gönder
      if (targetUser.fcmToken && firebaseMessaging) {
        sendFcmPushInBackground(
          [targetUser.fcmToken], fcmNotification, fcmData, androidConfig, apnsConfig
        ).catch(err => console.error("[FCM] Kişiye özel push hatası:", err));
      }

      console.log(`[FCM Admin] 🎯 Kişiye özel bildirim → ${targetUser.name} (ID: ${targetUser.id})`);
      return NextResponse.json({ 
        success: true, 
        messageId: "user-targeted",
        stats: { targetUsers: 1, totalTokens: targetUser.fcmToken ? 1 : 0, userName: targetUser.name }
      });
    }

        // ── Tekil kullanıcıya gönder (token bazlı)
    if (targetToken) {
      // Token'a ait kullanıcıya in-app bildirim kaydı oluştur
      try {
        const tokenUser = await prisma.user.findFirst({
          where: { fcmToken: targetToken },
          select: { id: true },
        });
        if (tokenUser) {
          await prisma.notification.create({
            data: { userId: tokenUser.id, title, message, type: "SYSTEM", payload: hasDbPayload },
          });
        }
      } catch (dbErr) {
        console.error("[FCM Admin] In-app bildirim kaydı hatası:", dbErr);
      }

      // FCM push arka planda gönder
      if (firebaseMessaging) {
        sendFcmPushInBackground(
          [targetToken], fcmNotification, fcmData, androidConfig, apnsConfig
        ).catch(err => console.error("[FCM] Background send error:", err));
      }

      return NextResponse.json({ success: true, messageId: "push-queued" });
    }

    // ── 💎 Premium Kesişimli Filtreleme
    if (premiumFilters && typeof premiumFilters === "object") {
      const premiumWhere: Record<string, unknown> = {
        isActive: true,
        accountDeleted: false,
      };
      if (premiumFilters.kurum) premiumWhere.bakanlik = premiumFilters.kurum;
      if (premiumFilters.istihdam) premiumWhere.istihdamTuru = premiumFilters.istihdam;

      // Token'ları çek
      const usersWithTokens = await prisma.user.findMany({
        where: { ...premiumWhere, fcmToken: { not: null } },
        select: { fcmToken: true },
      });
      const tokens = usersWithTokens.map((u) => u.fcmToken!).filter((t) => t && t.length > 10);

      // In-app bildirim kaydı (hızlı — bu await edilir)
      let targetCount = 0;
      try {
        const allTargetUsers = await prisma.user.findMany({
          where: premiumWhere,
          select: { id: true },
        });
        targetCount = allTargetUsers.length;
        if (targetCount > 0) {
          await prisma.notification.createMany({
            data: allTargetUsers.map((u) => ({
              userId: u.id, title, message, type: "SYSTEM" as const, payload: hasDbPayload,
            })),
          });
        }
      } catch (dbErr) {
        console.error("[FCM Admin] Premium in-app hatası:", dbErr);
      }

      // FCM push arka planda gönder (fire-and-forget)
      if (firebaseMessaging && tokens.length > 0) {
        sendFcmPushInBackground(tokens, fcmNotification, fcmData, androidConfig, apnsConfig)
          .catch(err => console.error("[FCM] Background send error:", err));
      }

      return NextResponse.json({
        success: true,
        stats: { totalTokens: tokens.length, targetUsers: targetCount, message: "Push arka planda gönderiliyor" },
      });
    }

    // ── Toplu gönderim (topic bazlı)
    if (topic) {
      let extraFilter: Record<string, unknown> = {};
      if (topic.startsWith("kurum:")) {
        extraFilter = { bakanlik: topic.replace("kurum:", "") };
      } else if (topic.startsWith("istihdam:")) {
        extraFilter = { istihdamTuru: topic.replace("istihdam:", "") };
      }

      // Token'lı kullanıcıları çek
      const usersWithTokens = await prisma.user.findMany({
        where: {
          fcmToken: { not: null },
          isActive: true,
          accountDeleted: false,
          ...extraFilter,
        },
        select: { fcmToken: true },
      });
      const tokens = usersWithTokens.map((u) => u.fcmToken!).filter((t) => t && t.length > 10);

      // In-app bildirim kaydı (hızlı — bu await edilir)
      let targetCount = 0;
      try {
        const allTargetUsers = await prisma.user.findMany({
          where: { isActive: true, accountDeleted: false, ...extraFilter },
          select: { id: true },
        });
        targetCount = allTargetUsers.length;
        if (targetCount > 0) {
          await prisma.notification.createMany({
            data: allTargetUsers.map((u) => ({
              userId: u.id, title, message, type: "SYSTEM" as const, payload: hasDbPayload,
            })),
          });
        }
        console.log(`[FCM Admin] ${targetCount} kullanıcıya in-app bildirim kaydedildi (topic: ${topic})`);
      } catch (dbErr) {
        console.error("[FCM Admin] Toplu in-app bildirim hatası:", dbErr);
      }

      // FCM push arka planda gönder (fire-and-forget — TIMEOUT önlenir)
      if (firebaseMessaging && tokens.length > 0) {
        sendFcmPushInBackground(tokens, fcmNotification, fcmData, androidConfig, apnsConfig)
          .catch(err => console.error("[FCM] Background send error:", err));
      }

      console.log(`[FCM Admin] Toplu push → ${tokens.length} cihaz hedeflendi (arka planda gönderilecek)`);

      return NextResponse.json({
        success: true,
        stats: {
          totalTokens: tokens.length,
          targetUsers: targetCount,
          message: `${targetCount} kullanıcıya in-app bildirim kaydedildi, ${tokens.length} cihaza push arka planda gönderiliyor`,
        },
      });
    }

    return NextResponse.json({ error: "Hedef belirtilmedi! Token veya Topic gerekli." }, { status: 400 });
  } catch (error) {
    console.error("[FCM Admin] Push hatası:", error);
    const errMsg = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth) {
      return NextResponse.json({ error: "Yetkilendirme gerekli.", reauth: true }, { status: 401 });
    }
    const parts = auth.split(" ");
    const token = parts.length === 2 ? parts[1] : auth;

    let userId = "";
    const user = await prisma.user.findUnique({ where: { id: token }, select: { id: true } });
    if (user) {
      userId = user.id;
    } else {
      const phoneHeader = req.headers.get("x-user-phone");
      if (phoneHeader) {
        const phoneUser = await prisma.user.findFirst({
          where: { OR: [{ phone: phoneHeader }, { phoneNumber: phoneHeader }] },
          select: { id: true },
        });
        if (phoneUser) userId = phoneUser.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı.", reauth: true }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { notificationId } = body as { notificationId?: string };

    if (notificationId) {
      await prisma.notification.deleteMany({ where: { id: notificationId, userId } });
    } else {
      await prisma.notification.deleteMany({ where: { userId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[notifications] DELETE Hata:", error);
    return NextResponse.json({ error: "Bildirim silinemedi." }, { status: 500 });
  }
}
