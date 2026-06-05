import { createAdminNotification } from "@/lib/services/adminNotificationService";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification, sendPremiumMatchEmail, sendPremiumMatchWhatsApp } from "@/lib/services/notificationService";
import { containsProfanity } from "@/lib/utils/profanityFilter";

/**
 * resolveUser — Authorization: Token <userId> header'dan kullanıcıyı çözer.
 */
async function resolveUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const parts = auth.split(" ");
  const token = parts.length === 2 ? parts[1] : auth;
  if (!token) return null;

  let user = await prisma.user.findUnique({
    where: { id: token },
    select: { id: true, firstName: true, lastName: true, isPremium: true, banBecayisUntil: true, banReason: true },
  });
  if (user) return user;

  const phoneHeader = req.headers.get("x-user-phone");
  if (phoneHeader) {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: phoneHeader },
          { phoneNumber: phoneHeader },
        ],
      },
      select: { id: true, firstName: true, lastName: true, isPremium: true, banBecayisUntil: true, banReason: true },
    });
    if (user) return user;
  }
  return null;
}

// POST /api/match-requests/send
// Body: { listingId, messageType: "TEMPLATE" | "CUSTOM", messageText }
export async function POST(req: NextRequest) {
  try {
    // 1. Auth doğrulama
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Yetkilendirme gerekli.", reauth: true },
        { status: 401 }
      );
    }

    // ⚖️ Becayiş Ban kontrolü (Premium üyeler muaf)
    if (!user.isPremium && user.banBecayisUntil && new Date(user.banBecayisUntil) > new Date()) {
      const until = new Date(user.banBecayisUntil).toLocaleDateString("tr-TR");
      return NextResponse.json({
        error: `Hesabınız '${user.banReason || "Kural ihlali"}' nedeniyle ${until} tarihine kadar becayiş başvurusu yapamaz.`,
        banUntil: user.banBecayisUntil,
        banReason: user.banReason,
      }, { status: 403 });
    }

    const body = await req.json();
    const { listingId, messageType, messageText } = body;

    // 2. Temel validasyon
    if (!listingId || !messageType || !messageText) {
      return NextResponse.json(
        { error: "listingId, messageType ve messageText zorunludur." },
        { status: 400 }
      );
    }

    if (!["TEMPLATE", "CUSTOM"].includes(messageType)) {
      return NextResponse.json(
        { error: "messageType 'TEMPLATE' veya 'CUSTOM' olmalı." },
        { status: 400 }
      );
    }

    // 3. İlanı bul ve sahiplik kontrolü
    const listing = await prisma.becayisListing.findUnique({
      where: { id: listingId },
      select: { id: true, ownerId: true, title: true, status: true },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "İlan bulunamadı." },
        { status: 404 }
      );
    }

    // Kendi ilanına talep atamaz
    if (listing.ownerId === user.id) {
      return NextResponse.json(
        { error: "Kendi ilanınıza becayiş talebi gönderemezsiniz." },
        { status: 403 }
      );
    }

    // 4. Aynı ilana zaten PENDING talep var mı?
    const existingRequest = await prisma.matchRequest.findFirst({
      where: {
        senderId: user.id,
        listingId,
        status: "PENDING",
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "Bu ilana zaten bekleyen bir talebiniz var." },
        { status: 409 }
      );
    }

    // 4.5. Başvuru kotası kontrolü
    const FREE_MATCH_REQUEST_LIMIT = 2;
    const sentCount = await prisma.matchRequest.count({
      where: { senderId: user.id },
    });

    if (user.isPremium) {
      // Premium: aktif aboneliğin planındaki matchRequestQuota
      const activeSub = await prisma.subscription.findFirst({
        where: { userId: user.id, status: "active" },
        orderBy: { createdAt: "desc" },
      });
      let maxRequests = 15; // fallback
      if (activeSub) {
        const plan = await prisma.subscriptionPlan.findUnique({
          where: { id: activeSub.planId },
        });
        maxRequests = (plan as Record<string, unknown>)?.matchRequestQuota as number ?? 15;
      }
      if (sentCount >= maxRequests) {
        return NextResponse.json(
          { error: `Başvuru hakkınız doldu (${maxRequests}/${maxRequests}). Abonelik planınızı yükseltin.`, quota: { used: sentCount, max: maxRequests } },
          { status: 429 }
        );
      }
    } else {
      // Ücretsiz: 2 hak
      if (sentCount >= FREE_MATCH_REQUEST_LIMIT) {
        return NextResponse.json(
          { error: `Ücretsiz başvuru hakkınız doldu (${FREE_MATCH_REQUEST_LIMIT}/${FREE_MATCH_REQUEST_LIMIT}). Premium abonelik ile daha fazla başvuru yapabilirsiniz.`, quota: { used: sentCount, max: FREE_MATCH_REQUEST_LIMIT } },
          { status: 429 }
        );
      }
    }

    // 5. CUSTOM mesaj validasyonu
    if (messageType === "CUSTOM") {
      if (messageText.length > 150) {
        return NextResponse.json(
          { error: "Özel mesaj en fazla 150 karakter olabilir." },
          { status: 400 }
        );
      }

      if (containsProfanity(messageText)) {
        return NextResponse.json(
          { error: "Mesajınız uygunsuz ifadeler içeriyor. Lütfen düzeltin." },
          { status: 400 }
        );
      }
    }

    // 6. DB'ye kaydet
    const matchRequest = await prisma.matchRequest.create({
      data: {
        senderId: user.id,
        receiverId: listing.ownerId,
        listingId,
        messageType,
        messageText,
        status: "PENDING",
      },
    });

    // 7. İlan sahibini ve bildirim tercihlerini al
    const receiver = await prisma.user.findUnique({
      where: { id: listing.ownerId },
      select: { email: true, phone: true, phoneNumber: true, firstName: true, lastName: true, name: true, notifEmail: true, notifWhatsapp: true, notifPush: true, notifSms: true },
    });
    
    if (receiver) {
      const senderName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Bir kullanıcı";
      
      // ── Bildirimleri arka planda gönder (fire-and-forget) ──
      // Response'u bekletmeden hemen dönmek için await KULLANILMAZ.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const notificationPromises: Promise<any>[] = [];

      // Push & In-App Bildirim
      if (receiver.notifPush) {
        notificationPromises.push(
          createNotification({
            userId: listing.ownerId,
            title: "🤝 Yeni Becayiş Talebi!",
            message: `${senderName}, "${listing.title}" ilanınıza becayiş talebi gönderdi.`,
            type: "BECAYIS_MATCH",
            payload: {
              matchRequestId: matchRequest.id,
              listingId,
              senderId: user.id,
              action: "new_match_request",
            },
          }).catch((e) => console.error("[MatchRequest] Push bildirim hatası:", e))
        );
      }

      // E-posta & WhatsApp (Sadece gönderen Premium ise gider)
      if (user.isPremium) {
        const receiverName = receiver.name || [receiver.firstName, receiver.lastName].filter(Boolean).join(" ") || "Kullanıcı";
        
        if (receiver.notifEmail && receiver.email) {
          notificationPromises.push(
            sendPremiumMatchEmail({
              recipientEmail: receiver.email,
              recipientName: receiverName,
              senderName,
              listingTitle: listing.title,
              messageText,
            }).catch((e) => console.error("[MatchRequest] E-posta hatası:", e))
          );
        }

        const receiverPhone = receiver.phone || receiver.phoneNumber;
        if (receiver.notifWhatsapp && receiverPhone) {
          notificationPromises.push(
            sendPremiumMatchWhatsApp({
              recipientPhone: receiverPhone,
              recipientName: receiverName,
              senderName,
              listingTitle: listing.title,
              messageText,
            }).catch((e) => console.error("[MatchRequest] WhatsApp hatası:", e))
          );
        }
      }

      // Arka planda çalıştır — response'u BEKLETMEDen
      if (notificationPromises.length > 0) {
        Promise.allSettled(notificationPromises).then((results) => {
          const failed = results.filter(r => r.status === "rejected");
          if (failed.length > 0) {
            console.warn(`[MatchRequest] ${failed.length}/${results.length} bildirim başarısız`);
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      matchRequestId: matchRequest.id,
      message: "Becayiş talebiniz başarıyla gönderildi!",
    }, { status: 201 });

  } catch (error) {
    console.error("[MatchRequest] Send error:", error);
    return NextResponse.json(
      { error: "Talep gönderilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
