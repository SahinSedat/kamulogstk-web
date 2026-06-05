import { prisma } from "@/lib/prisma";
import { NotificationType, Prisma } from "@prisma/client";
import { firebaseMessaging } from "@/lib/firebase/firebaseAdmin";
import nodemailer from "nodemailer";
import { sendDynamicWaMessage } from "@/lib/whatsappSender";

/**
 * Merkezi Bildirim Servisi
 * In-App bildirim + Firebase Push Notification
 *
 * ÖNEMLİ: Push bildirimler uygulama kapalı (terminated) olsa bile gider.
 * Bunun için:
 *  1. notification + data payload birlikte gönderilir
 *  2. Android: priority "high" + channelId (Flutter tarafında oluşturulmalı)
 *  3. iOS: content-available + mutable-content + apns-priority "10"
 */

// ── Ortak FCM Konfigürasyonu ──────────────────────────────────
// Sadeleştirilmiş payload — android.notification içine ikon/kanal
// KOYMUYORUZ çünkü OS arka planda bu alanları reddedebiliyor.
// Sadece priority: "high" ile cihazı derin uykudan uyandırıyoruz.
function buildAndroidConfig(_imageUrl?: string) {
    return {
        priority: "high" as const,
        notification: {
            channelId: "kamulog_notifications",
            sound: "default",
            defaultSound: true,
            defaultVibrateTimings: true,
            defaultLightSettings: true,
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

// ── Stale Token Temizleme ─────────────────────────────────────
// FCM geçersiz token hatası verdiğinde DB'den sil
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

// ═══════════════════════════════════════════════════════════════
// Tekil Bildirim Oluşturma
// ═══════════════════════════════════════════════════════════════

interface CreateNotificationParams {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    payload?: Prisma.InputJsonValue;
}

/**
 * Yeni bildirim oluştur (DB'ye kaydet + FCM Push gönder)
 */
export async function createNotification({
    userId,
    title,
    message,
    type = "SYSTEM",
    payload,
}: CreateNotificationParams) {
    // 1. In-App bildirim → DB'ye kaydet
    const notification = await prisma.notification.create({
        data: {
            userId,
            title,
            message,
            type,
            payload: payload ?? undefined,
        },
    });

    // 2. FCM Push Notification → Arka planda (fire-and-forget) gönder
    // NOT: await EDİLMEZ — in-app bildirim hemen döner, push arka planda gider
    (async () => {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { fcmToken: true },
            });

            if (user?.fcmToken && firebaseMessaging) {
                const payloadData: Record<string, string> = {
                    notificationId: notification.id,
                    type,
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                    title: title,
                    body: message,
                };

                if (payload && typeof payload === "object" && !Array.isArray(payload)) {
                    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
                        payloadData[key] = String(value);
                    }
                }

                try {
                    await firebaseMessaging.send({
                        token: user.fcmToken,
                        notification: {
                            title: title,
                            body: message,
                        },
                        data: { ...payloadData, title, body: message },
                        android: {
                            priority: "high" as const,
                            notification: {
                                channelId: "kamulog_notifications",
                                icon: "ic_notification",
                                color: "#0891B2",
                                sound: "default",
                            },
                        },
                        apns: {
                            headers: {
                                "apns-priority": "10",
                                "apns-push-type": "alert",
                            },
                            payload: {
                                aps: {
                                    "content-available": 1,
                                    sound: "default",
                                    badge: 1,
                                },
                            },
                        },
                    });
                    console.log(`[FCM] ✅ Push gönderildi → userId: ${userId}`);
                } catch (sendError) {
                    if (isStaleTokenError(sendError)) {
                        await cleanupStaleToken(user.fcmToken);
                    } else {
                        console.error(`[FCM] ❌ Push gönderilemedi → userId: ${userId}:`, sendError);
                    }
                }
            }
        } catch (fcmError) {
            console.error(`[FCM] ❌ Push işlemi hatası → userId: ${userId}:`, fcmError);
        }
    })().catch(() => {});

    console.log(`[Notification] ✅ Bildirim oluşturuldu → userId: ${userId}, type: ${type}, title: ${title}`);
    return notification;
}

// ═══════════════════════════════════════════════════════════════
// Toplu Bildirim Gönderimi
// ═══════════════════════════════════════════════════════════════

/**
 * Toplu bildirim gönder (birden fazla kullanıcıya)
 * In-App + FCM Push (her birine ayrı ayrı)
 */
export async function createBulkNotifications(
    userIds: string[],
    title: string,
    message: string,
    type: NotificationType = "SYSTEM",
    payload?: Prisma.InputJsonValue
) {
    // 1. Toplu in-app kayıt
    const data = userIds.map((userId) => ({
        userId,
        title,
        message,
        type,
        payload: payload ?? undefined,
    }));
    const result = await prisma.notification.createMany({ data });

    // 2. FCM Push — arka planda (fire-and-forget) gönder
    (async () => {
        try {
            const users = await prisma.user.findMany({
                where: { id: { in: userIds }, fcmToken: { not: null } },
                select: { id: true, fcmToken: true },
            });

            if (users.length > 0 && firebaseMessaging) {
                const tokens = users.map((u) => u.fcmToken!).filter(Boolean);

                if (tokens.length > 0) {
                    const payloadData: Record<string, string> = {
                        type,
                        click_action: "FLUTTER_NOTIFICATION_CLICK",
                    };
                    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
                        for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
                            payloadData[key] = String(value);
                        }
                    }

                    for (let i = 0; i < tokens.length; i += 500) {
                        const batch = tokens.slice(i, i + 500);
                        try {
                            const batchResponse = await firebaseMessaging.sendEachForMulticast({
                                tokens: batch,
                                notification: { title, body: message },
                                data: payloadData,
                                android: buildAndroidConfig(),
                                apns: buildApnsConfig(),
                            });

                            if (batchResponse.failureCount > 0) {
                                for (let idx = 0; idx < batchResponse.responses.length; idx++) {
                                    if (!batchResponse.responses[idx].success && isStaleTokenError(batchResponse.responses[idx].error)) {
                                        cleanupStaleToken(batch[idx]).catch(() => {});
                                    }
                                }
                            }
                            console.log(`[FCM] Toplu push batch → ${batchResponse.successCount} başarılı, ${batchResponse.failureCount} başarısız`);
                        } catch (batchErr) {
                            console.error(`[FCM] Toplu push batch hatası:`, batchErr);
                        }
                    }
                    console.log(`[FCM] Toplu push → ${tokens.length} cihaza gönderildi`);
                }
            }
        } catch (fcmError) {
            console.error("[FCM] Toplu push hatası:", fcmError);
        }
    })().catch(() => {});

    return result;
}

/**
 * Kullanıcının okunmamış bildirim sayısını getir
 */
export async function getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
        where: { userId, isRead: false },
    });
}

// ─── Transaktönel E-posta Servisi (iletisim@kamulogstk.net) ────────

/**
 * Transactional e-posta transporter.
 * SMTP_TX_ prefix'li env vars kullanır — mevcut SMTP_ (doğrulama maili) ayarlarına dokunmaz.
 */
function getTxTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_TX_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_TX_PORT || "587"),
        secure: false,
        auth: {
            user: process.env.SMTP_TX_USER,
            pass: process.env.SMTP_TX_PASS,
        },
    });
}

const TX_FROM = process.env.SMTP_TX_FROM || "Kamulog <iletisim@kamulogstk.net>";

/**
 * Premium eşleşme talebi → E-posta bildirimi (Gerçek SMTP)
 */
export async function sendPremiumMatchEmail(params: {
    recipientEmail: string;
    recipientName: string;
    senderName: string;
    listingTitle: string;
    messageText: string;
}) {
    try {
        const transporter = getTxTransporter();
        await transporter.sendMail({
            from: TX_FROM,
            to: params.recipientEmail,
            subject: `🤝 Yeni Becayiş Talebi — ${params.senderName}`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                    <div style="background:linear-gradient(135deg,#0891B2,#06B6D4);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
                        <h1 style="color:#fff;margin:0;font-size:20px;">🤝 Yeni Becayiş Talebi</h1>
                    </div>
                    <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
                        <p style="color:#374151;font-size:15px;line-height:1.6;">
                            Merhaba <strong>${params.recipientName}</strong>,
                        </p>
                        <p style="color:#374151;font-size:15px;line-height:1.6;">
                            <strong>${params.senderName}</strong>, "<em>${params.listingTitle}</em>" ilanınıza becayiş talebi gönderdi.
                        </p>
                        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
                            <p style="color:#6b7280;font-size:12px;margin:0 0 4px;">Mesaj:</p>
                            <p style="color:#1f2937;font-size:14px;margin:0;">${params.messageText}</p>
                        </div>
                        <p style="color:#6b7280;font-size:13px;">
                            Kamulog uygulamasından talebi inceleyip yanıtlayabilirsiniz.
                        </p>
                        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
                        <p style="color:#9ca3af;font-size:11px;text-align:center;">
                            Bu e-posta Kamulog tarafından otomatik gönderilmiştir.<br>
                            <a href="https://kamulog.net" style="color:#0891B2;">kamulog.net</a>
                        </p>
                    </div>
                </div>
            `,
        });
        console.log(`[Email] ✅ Becayiş talebi maili gönderildi → ${params.recipientEmail}`);
    } catch (e) {
        console.error(`[Email] ❌ Becayiş talebi maili hata → ${params.recipientEmail}:`, e);
    }
}

/**
 * Premium eşleşme talebi → WhatsApp bildirimi (Gerçek Bot API)
 */
export async function sendPremiumMatchWhatsApp(params: {
    recipientPhone: string;
    recipientName: string;
    senderName: string;
    listingTitle: string;
    messageText: string;
}) {
    try {
        const message =
            `🤝 *Yeni Becayiş Talebi*\n\n` +
            `Merhaba ${params.recipientName},\n` +
            `*${params.senderName}* "${params.listingTitle}" ilanınıza becayiş talebi gönderdi.\n\n` +
            `💬 Mesaj: ${params.messageText}\n\n` +
            `Kamulog uygulamasından yanıtlayabilirsiniz.`;

        const result = await sendDynamicWaMessage(params.recipientPhone, message);

        if (result.sent) {
            console.log(`[WhatsApp] ✅ Becayiş talebi mesajı gönderildi → ${params.recipientPhone}`);
        } else {
            console.warn(`[WhatsApp] ⚠️ Gönderilemedi → ${params.recipientPhone}`);
        }
    } catch (e) {
        console.error(`[WhatsApp] ❌ Becayiş talebi mesajı hata → ${params.recipientPhone}:`, e);
    }
}

/**
 * Sipariş / Abonelik onay e-postası
 */
export async function sendOrderConfirmationEmail(params: {
    recipientEmail: string;
    recipientName: string;
    planName: string;
    amount: number;
    orderNumber: string;
    endsAt: Date;
}) {
    try {
        const transporter = getTxTransporter();
        const endDate = params.endsAt.toLocaleDateString("tr-TR", {
            day: "numeric", month: "long", year: "numeric",
        });

        await transporter.sendMail({
            from: TX_FROM,
            to: params.recipientEmail,
            subject: `✅ Abonelik Onayı — ${params.planName}`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                    <div style="background:linear-gradient(135deg,#7C3AED,#F59E0B);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
                        <h1 style="color:#fff;margin:0;font-size:20px;">👑 Premium Abonelik Onayı</h1>
                    </div>
                    <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
                        <p style="color:#374151;font-size:15px;line-height:1.6;">
                            Merhaba <strong>${params.recipientName}</strong>,
                        </p>
                        <p style="color:#374151;font-size:15px;line-height:1.6;">
                            Premium aboneliğiniz başarıyla aktif edildi! 🎉
                        </p>
                        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
                            <table style="width:100%;border-collapse:collapse;">
                                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Sipariş No</td><td style="padding:8px 0;color:#1f2937;font-size:13px;font-weight:bold;text-align:right;">${params.orderNumber}</td></tr>
                                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Plan</td><td style="padding:8px 0;color:#1f2937;font-size:13px;font-weight:bold;text-align:right;">${params.planName}</td></tr>
                                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Tutar</td><td style="padding:8px 0;color:#059669;font-size:13px;font-weight:bold;text-align:right;">${params.amount} ₺</td></tr>
                                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Bitiş Tarihi</td><td style="padding:8px 0;color:#1f2937;font-size:13px;font-weight:bold;text-align:right;">${endDate}</td></tr>
                            </table>
                        </div>
                        <p style="color:#6b7280;font-size:13px;">
                            Premium özelliklerin keyfini çıkarın — AI ile becayiş eşleştirme, öne çıkarma ve daha fazlası!
                        </p>
                        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
                        <p style="color:#9ca3af;font-size:11px;text-align:center;">
                            Bu e-posta Kamulog tarafından otomatik gönderilmiştir.<br>
                            <a href="https://kamulog.net" style="color:#7C3AED;">kamulog.net</a>
                        </p>
                    </div>
                </div>
            `,
        });
        console.log(`[Email] ✅ Sipariş onay maili gönderildi → ${params.recipientEmail} | ${params.orderNumber}`);
    } catch (e) {
        console.error(`[Email] ❌ Sipariş onay maili hata:`, e);
    }
}

/**
 * Jeton satın alım onay e-postası
 */
export async function sendJetonPurchaseEmail(params: {
    recipientEmail: string;
    recipientName: string;
    jetonCount: number;
    totalJetons: number;
    amount: number;
    orderNumber: string;
}) {
    try {
        const transporter = getTxTransporter();
        await transporter.sendMail({
            from: TX_FROM,
            to: params.recipientEmail,
            subject: `💎 ${params.jetonCount} Jeton Hesabınıza Eklendi!`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                    <div style="background:linear-gradient(135deg,#6366F1,#8B5CF6);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
                        <h1 style="color:#fff;margin:0;font-size:20px;">💎 Jeton Satın Alma Onayı</h1>
                    </div>
                    <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
                        <p style="color:#374151;font-size:15px;line-height:1.6;">
                            Merhaba <strong>${params.recipientName}</strong>,
                        </p>
                        <p style="color:#374151;font-size:15px;line-height:1.6;">
                            Jeton satın alımınız başarıyla tamamlandı! 🎉
                        </p>
                        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
                            <table style="width:100%;border-collapse:collapse;">
                                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Sipariş No</td><td style="padding:8px 0;color:#1f2937;font-size:13px;font-weight:bold;text-align:right;">${params.orderNumber}</td></tr>
                                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Eklenen Jeton</td><td style="padding:8px 0;color:#6366F1;font-size:13px;font-weight:bold;text-align:right;">+${params.jetonCount} 💎</td></tr>
                                <tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Toplam Bakiye</td><td style="padding:8px 0;color:#059669;font-size:13px;font-weight:bold;text-align:right;">${params.totalJetons} Jeton</td></tr>
                                ${params.amount > 0 ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">Tutar</td><td style="padding:8px 0;color:#1f2937;font-size:13px;font-weight:bold;text-align:right;">${params.amount} ₺</td></tr>` : ''}
                            </table>
                        </div>
                        <p style="color:#6b7280;font-size:13px;">
                            Jetonlarınızı danışman oturumlarında kullanabilirsiniz.
                        </p>
                        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
                        <p style="color:#9ca3af;font-size:11px;text-align:center;">
                            Bu e-posta Kamulog tarafından otomatik gönderilmiştir.<br>
                            <a href="https://kamulog.net" style="color:#6366F1;">kamulog.net</a>
                        </p>
                    </div>
                </div>
            `,
        });
        console.log(`[Email] ✅ Jeton onay maili → ${params.recipientEmail} | +${params.jetonCount}`);
    } catch (e) {
        console.error(`[Email] ❌ Jeton onay maili hata:`, e);
    }
}



// ═══════════════════════════════════════════════════════════════
// STK Başvuru Bildirimleri
// ═══════════════════════════════════════════════════════════════

/**
 * STK Başvuru Yapıldı — E-posta + WhatsApp + In-App Push
 */
export async function sendSTKApplicationNotification(params: {
    applicantName: string;
    applicantEmail: string;
    applicantPhone: string;
    stkName: string;
    userId?: string;
    stkId?: string;
}) {
    // In-App + Push bildirim
    console.log("[STK Push] userId:", params.userId || "YOK");
    if (params.userId) {
        try {
            await createNotification({
                userId: params.userId,
                title: "🏛️ STK Başvurusu Alındı",
                message: `${params.stkName} kuruluşuna üyelik başvurunuz başarıyla alınmıştır. Başvurunuz inceleniyor.`,
                type: "SYSTEM",
                payload: { category: "stk_application" },
            });
        } catch (e) {
            console.error("[STK Push] hata:", e);
        }
    }

    // E-posta
    try {
        const transporter = getTxTransporter();
        await transporter.sendMail({
            from: TX_FROM,
            to: params.applicantEmail,
            subject: `✅ STK Başvurunuz Alındı — ${params.stkName}`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                    <div style="background:linear-gradient(135deg,#059669,#34D399);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
                        <h1 style="color:#fff;margin:0;font-size:20px;">🏛️ STK Üyelik Başvurusu</h1>
                    </div>
                    <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
                        <p style="color:#374151;font-size:15px;line-height:1.6;">Merhaba <strong>${params.applicantName}</strong>,</p>
                        <p style="color:#374151;font-size:15px;line-height:1.6;"><strong>${params.stkName}</strong> kuruluşuna üyelik başvurunuz başarıyla alınmıştır. 🎉</p>
                        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
                            <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">📋 Başvuru Durumu</p>
                            <p style="color:#F59E0B;font-size:16px;font-weight:bold;margin:0;">⏳ İnceleniyor</p>
                        </div>
                        <p style="color:#6b7280;font-size:13px;">Başvurunuz kuruluş yetkilileri tarafından incelenecek ve sonuç size bildirilecektir.</p>
                        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
                        <p style="color:#9ca3af;font-size:11px;text-align:center;">Bu e-posta Kamulog tarafından otomatik gönderilmiştir.<br><a href="https://kamulog.net" style="color:#059669;">kamulog.net</a></p>
                    </div>
                </div>
            `,
        });
        console.log(`[STK Email] ✅ Başvuru alındı maili → ${params.applicantEmail}`);
    } catch (e) {
        console.error(`[STK Email] ❌ Başvuru maili hata:`, e);
    }

    // WhatsApp
    try {
        const message =
            `🏛️ *STK Üyelik Başvurusu Alındı*\n\n` +
            `Merhaba ${params.applicantName},\n` +
            `*${params.stkName}* kuruluşuna üyelik başvurunuz başarıyla alınmıştır.\n\n` +
            `📋 Durum: ⏳ İnceleniyor\n\n` +
            `Başvurunuz incelendiğinde size bildirilecektir.`;

        await sendDynamicWaMessage(params.applicantPhone, message, params.stkId);
        console.log(`[STK WhatsApp] ✅ Başvuru alındı mesajı → ${params.applicantPhone}`);
    } catch (e) {
        console.error(`[STK WhatsApp] ❌ Başvuru mesajı hata:`, e);
    }
}

/**
 * STK Başvuru Onaylandı — E-posta + WhatsApp + In-App Push
 */
export async function sendSTKApprovalNotification(params: {
    applicantName: string;
    applicantEmail: string;
    applicantPhone: string;
    stkName: string;
    userId?: string;
    stkId?: string;
}) {
    console.log("[STK Push] userId:", params.userId || "YOK");
    if (params.userId) {
        try {
            await createNotification({
                userId: params.userId,
                title: "🎉 STK Üyeliğiniz Onaylandı!",
                message: `${params.stkName} kuruluşuna üyelik başvurunuz onaylanmıştır. Tebrikler!`,
                type: "SYSTEM",
                payload: { category: "stk_approved" },
            });
        } catch (e) {
            console.error("[STK Push] hata:", e);
        }
    }

    try {
        const transporter = getTxTransporter();
        await transporter.sendMail({
            from: TX_FROM,
            to: params.applicantEmail,
            subject: `🎉 Başvurunuz Onaylandı — ${params.stkName}`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                    <div style="background:linear-gradient(135deg,#059669,#10B981);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
                        <h1 style="color:#fff;margin:0;font-size:20px;">🎉 Üyelik Onaylandı!</h1>
                    </div>
                    <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
                        <p style="color:#374151;font-size:15px;line-height:1.6;">Merhaba <strong>${params.applicantName}</strong>,</p>
                        <p style="color:#374151;font-size:15px;line-height:1.6;">Tebrikler! <strong>${params.stkName}</strong> kuruluşuna üyelik başvurunuz <strong style="color:#059669;">onaylanmıştır</strong>. 🎉</p>
                        <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:16px;margin:16px 0;">
                            <p style="color:#059669;font-size:16px;font-weight:bold;margin:0;text-align:center;">✅ Üyeliğiniz Aktif</p>
                        </div>
                        <p style="color:#6b7280;font-size:13px;">Artık kuruluşun tüm hizmetlerinden yararlanabilirsiniz.</p>
                        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
                        <p style="color:#9ca3af;font-size:11px;text-align:center;">Bu e-posta Kamulog tarafından otomatik gönderilmiştir.<br><a href="https://kamulog.net" style="color:#059669;">kamulog.net</a></p>
                    </div>
                </div>
            `,
        });
        console.log(`[STK Email] ✅ Onay maili → ${params.applicantEmail}`);
    } catch (e) {
        console.error(`[STK Email] ❌ Onay maili hata:`, e);
    }

    try {
        const message =
            `🎉 *STK Üyelik Başvurunuz Onaylandı!*\n\nMerhaba ${params.applicantName},\n*${params.stkName}* kuruluşuna üyelik başvurunuz ONAYLANDI. ✅\n\nArtık tüm hizmetlerden yararlanabilirsiniz.`;
        await sendDynamicWaMessage(params.applicantPhone, message, params.stkId);
        console.log(`[STK WhatsApp] ✅ Onay mesajı → ${params.applicantPhone}`);
    } catch (e) {
        console.error(`[STK WhatsApp] ❌ Onay mesajı hata:`, e);
    }
}

/**
 * STK Başvuru Reddedildi — E-posta + WhatsApp + In-App Push
 */
export async function sendSTKRejectionNotification(params: {
    applicantName: string;
    applicantEmail: string;
    applicantPhone: string;
    stkName: string;
    userId?: string;
    stkId?: string;
    rejectionReason?: string;
}) {
    console.log("[STK Push] userId:", params.userId || "YOK");
    if (params.userId) {
        try {
            await createNotification({
                userId: params.userId,
                title: "STK Başvuru Sonucu",
                message: `${params.stkName} kuruluşuna üyelik başvurunuz bu aşamada kabul edilememiştir.${params.rejectionReason ? ` Gerekçe: ${params.rejectionReason}` : ""}`,
                type: "SYSTEM",
                payload: { category: "stk_rejected" },
            });
        } catch (e) {
            console.error("[STK Push] hata:", e);
        }
    }

    try {
        const transporter = getTxTransporter();
        await transporter.sendMail({
            from: TX_FROM,
            to: params.applicantEmail,
            subject: `STK Başvuru Sonucu — ${params.stkName}`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                    <div style="background:linear-gradient(135deg,#DC2626,#F87171);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
                        <h1 style="color:#fff;margin:0;font-size:20px;">📋 Başvuru Sonucu</h1>
                    </div>
                    <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
                        <p style="color:#374151;font-size:15px;line-height:1.6;">Merhaba <strong>${params.applicantName}</strong>,</p>
                        <p style="color:#374151;font-size:15px;line-height:1.6;"><strong>${params.stkName}</strong> kuruluşuna üyelik başvurunuz değerlendirilmiş ve bu aşamada kabul edilememiştir.</p>
                        ${params.rejectionReason ? `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px;margin:16px 0;"><p style="color:#991B1B;font-size:13px;margin:0 0 4px;font-weight:bold;">📝 Red Gerekçesi:</p><p style="color:#DC2626;font-size:14px;margin:0;">${params.rejectionReason}</p></div>` : ''}
                        <p style="color:#6b7280;font-size:13px;">Detaylı bilgi için kuruluşla iletişime geçebilirsiniz.</p>
                        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
                        <p style="color:#9ca3af;font-size:11px;text-align:center;">Bu e-posta Kamulog tarafından otomatik gönderilmiştir.<br><a href="https://kamulog.net" style="color:#059669;">kamulog.net</a></p>
                    </div>
                </div>
            `,
        });
        console.log(`[STK Email] ✅ Red maili → ${params.applicantEmail}`);
    } catch (e) {
        console.error(`[STK Email] ❌ Red maili hata:`, e);
    }

    try {
        const message =
            `📋 *STK Başvuru Sonucu*\n\nMerhaba ${params.applicantName},\n*${params.stkName}* kuruluşuna üyelik başvurunuz bu aşamada kabul edilememiştir.${params.rejectionReason ? `\n\n📝 *Gerekçe:* ${params.rejectionReason}` : ''}\n\nDetaylı bilgi için kuruluşla iletişime geçebilirsiniz.`;
        await sendDynamicWaMessage(params.applicantPhone, message, params.stkId);
        console.log(`[STK WhatsApp] ✅ Red mesajı → ${params.applicantPhone}`);
    } catch (e) {
        console.error(`[STK WhatsApp] ❌ Red mesajı hata:`, e);
    }
}


// ═══════════════════════════════════════
// STK İstifa Onay Bildirimi
// ═══════════════════════════════════════
export async function sendSTKResignationNotification(params: {
    applicantName: string;
    applicantEmail: string;
    applicantPhone: string;
    stkName: string;
    userId?: string;
    stkId?: string;
}) {
    console.log("[STK Resignation] userId:", params.userId || "YOK");
    if (params.userId) {
        try {
            await createNotification({
                userId: params.userId,
                title: "STK İstifa Onayı",
                message: `${params.stkName} kuruluşundan istifa talebiniz onaylanmıştır.`,
                type: "SYSTEM",
                payload: { category: "stk_resigned" },
            });
        } catch (e) {
            console.error("[STK Resignation Push] hata:", e);
        }
    }

    try {
        const transporter = getTxTransporter();
        await transporter.sendMail({
            from: TX_FROM,
            to: params.applicantEmail,
            subject: `STK İstifa Onayı — ${params.stkName}`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                    <div style="background:linear-gradient(135deg,#6B7280,#9CA3AF);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
                        <h1 style="color:#fff;margin:0;font-size:20px;">🚪 İstifa Onayı</h1>
                    </div>
                    <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
                        <p style="color:#374151;font-size:15px;line-height:1.6;">Merhaba <strong>${params.applicantName}</strong>,</p>
                        <p style="color:#374151;font-size:15px;line-height:1.6;"><strong>${params.stkName}</strong> kuruluşundan istifa talebiniz onaylanmıştır. Üyeliğiniz sonlandırılmıştır.</p>
                        <p style="color:#6b7280;font-size:13px;">Tekrar üyelik başvurusu yapabilirsiniz.</p>
                        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
                        <p style="color:#9ca3af;font-size:11px;text-align:center;">Bu e-posta Kamulog tarafından otomatik gönderilmiştir.<br><a href="https://kamulog.net" style="color:#059669;">kamulog.net</a></p>
                    </div>
                </div>
            `,
        });
        console.log(`[STK Email] ✅ İstifa onay maili → ${params.applicantEmail}`);
    } catch (e) {
        console.error(`[STK Email] ❌ İstifa onay maili hata:`, e);
    }

    try {
        const message =
            `🚪 *STK İstifa Onayı*\n\nMerhaba ${params.applicantName},\n*${params.stkName}* kuruluşundan istifa talebiniz onaylanmıştır.\n\nÜyeliğiniz sonlandırılmıştır. Tekrar üyelik başvurusunda bulunabilirsiniz.`;
        await sendDynamicWaMessage(params.applicantPhone, message, params.stkId);
        console.log(`[STK WhatsApp] ✅ İstifa onay mesajı → ${params.applicantPhone}`);
    } catch (e) {
        console.error(`[STK WhatsApp] ❌ İstifa mesajı hata:`, e);
    }
}

/**
 * STK Aidat/Ödeme Bildirimi Alındı — E-posta + WhatsApp + In-App Push
 */
export async function sendSTKPaymentReceivedNotification(params: {
    applicantName: string;
    applicantEmail: string;
    applicantPhone: string;
    stkName: string;
    userId?: string;
    stkId?: string;
    receiptNumber?: string;
}) {
    if (params.userId) {
        try {
            await createNotification({
                userId: params.userId,
                title: "💰 Ödeme Bildiriminiz Alındı",
                message: `${params.stkName} kuruluşuna yapmış olduğunuz aidat/bağış bildiriminiz alınmıştır.`,
                type: "SYSTEM",
                payload: { category: "stk_payment_received" },
            });
        } catch (e) {
            console.error("[STK Push] hata:", e);
        }
    }

    try {
        const transporter = getTxTransporter();
        await transporter.sendMail({
            from: TX_FROM,
            to: params.applicantEmail,
            subject: `✅ Ödeme Bildiriminiz Alındı — ${params.stkName}`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                    <div style="background:linear-gradient(135deg,#0ea5e9,#38bdf8);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
                        <h1 style="color:#fff;margin:0;font-size:20px;">💰 Ödeme Bildirimi</h1>
                    </div>
                    <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
                        <p style="color:#374151;font-size:15px;line-height:1.6;">Merhaba <strong>${params.applicantName}</strong>,</p>
                        <p style="color:#374151;font-size:15px;line-height:1.6;"><strong>${params.stkName}</strong> adına yapmış olduğunuz aidat/bağış bildiriminiz başarıyla alınmıştır. 🎉</p>
                        ${params.receiptNumber ? `<p style="color:#374151;font-size:15px;line-height:1.6;"><strong>İşlem Numarası:</strong> <span style="font-family:monospace;background:#e0f2fe;padding:2px 6px;border-radius:4px;color:#0369a1;">${params.receiptNumber}</span></p>` : ''}
                        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
                            <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">📋 Bildirim Durumu</p>
                            <p style="color:#F59E0B;font-size:16px;font-weight:bold;margin:0;">⏳ İnceleniyor</p>
                        </div>
                        <p style="color:#6b7280;font-size:13px;">Bildiriminiz kuruluş yetkilileri tarafından incelenmek üzere onaya gönderilmiştir.</p>
                        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
                        <p style="color:#9ca3af;font-size:11px;text-align:center;">Bu e-posta Kamulog tarafından otomatik gönderilmiştir.<br><a href="https://kamulog.net" style="color:#0ea5e9;">kamulog.net</a></p>
                    </div>
                </div>
            `,
        });
        console.log(`[STK Email] ✅ Ödeme bildirimi alındı maili → ${params.applicantEmail}`);
    } catch (e) {
        console.error(`[STK Email] ❌ Ödeme bildirimi maili hata:`, e);
    }

    try {
        const message =
            `💰 *Ödeme Bildirimi Alındı*\n\n` +
            `Merhaba ${params.applicantName},\n` +
            `*${params.stkName}* kuruluşuna yapmış olduğunuz aidat/bağış bildiriminiz başarıyla alınmıştır.\n\n` +
            (params.receiptNumber ? `📝 *İşlem Numarası:* ${params.receiptNumber}\n\n` : '') +
            `Bildiriminiz kuruluş yetkilileri tarafından incelenmek üzere onaya gönderilmiştir. ⏳`;

        await sendDynamicWaMessage(params.applicantPhone, message, params.stkId);
        console.log(`[STK WhatsApp] ✅ Ödeme bildirimi alındı mesajı → ${params.applicantPhone}`);
    } catch (e) {
        console.error(`[STK WhatsApp] ❌ Ödeme bildirimi mesajı hata:`, e);
    }
}
