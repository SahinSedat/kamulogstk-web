import { NextRequest } from "next/server";
import {
    messageEventEmitter,
    connectedUsers,
    disconnectTimers,
    emitPresence,
    type MessageEvent,
} from "@/lib/eventEmitter";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/messages/stream?userId=xxx
 *
 * Server-Sent Events (SSE) endpoint
 * Mobil uygulama bu endpoint'e bağlanarak anlık mesaj bildirimlerini alır.
 *
 * Eventler:
 * - connected: İlk bağlantı
 * - new_message: Yeni mesaj geldiğinde
 * - message_delivered: Mesaj iletildiğinde
 * - message_read: Mesaj okunduğunda
 * - presence: Kullanıcı online/offline olduğunda (5sn delay ile)
 * - presence_list: Mevcut online kullanıcıların listesi (bağlantı açılınca)
 * - heartbeat: Bağlantıyı canlı tutmak için (30sn)
 */

const OFFLINE_DELAY = 5000; // 5 saniye — arka plan geçişlerinde flicker önleme

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const rawUserId = searchParams.get("userId");

    if (!rawUserId) {
        return new Response(JSON.stringify({ error: "userId gerekli" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const userId: string = rawUserId;
    const encoder = new TextEncoder();
    let heartbeatInterval: ReturnType<typeof setInterval>;
    let isClosed = false;

    const stream = new ReadableStream({
        start(controller) {
            // ─── 1. Bekleyen disconnect timer varsa iptal et ──
            if (disconnectTimers.has(userId)) {
                clearTimeout(disconnectTimers.get(userId));
                disconnectTimers.delete(userId);
            }

            // ─── 2. Kullanıcıyı online olarak kaydet ─────────
            connectedUsers.add(userId);

            // DB'de isOnline güncelle (fire-and-forget)
            prisma.user
                .update({
                    where: { id: userId },
                    data: { isOnline: true },
                })
                .catch(() => { });

            // ─── 3. Bağlantı açıldı mesajı ───────────────────
            const connectMsg = `data: ${JSON.stringify({
                type: "connected",
                userId,
                timestamp: new Date().toISOString(),
            })}\n\n`;
            controller.enqueue(encoder.encode(connectMsg));

            // ─── 4. Mevcut online kullanıcı listesini gönder ─
            const presenceListMsg = `data: ${JSON.stringify({
                type: "presence_list",
                users: Array.from(connectedUsers),
                timestamp: new Date().toISOString(),
            })}\n\n`;
            controller.enqueue(encoder.encode(presenceListMsg));

            // ─── 5. Herkese online presence event'i yayınla ──
            emitPresence({
                type: "presence",
                userId,
                status: "online",
                timestamp: new Date().toISOString(),
            });

            // ─── 6. Mesaj event listener'ı ───────────────────
            const onMessage = (event: MessageEvent) => {
                if (isClosed) return;
                try {
                    const sseMsg = `data: ${JSON.stringify(event)}\n\n`;
                    controller.enqueue(encoder.encode(sseMsg));
                } catch {
                    cleanup();
                }
            };

            // Bu kullanıcıya yönelik eventleri dinle
            messageEventEmitter.on(`message:${userId}`, onMessage);

            // ─── 7. Heartbeat: 30 saniyede bir ping ──────────
            heartbeatInterval = setInterval(() => {
                if (isClosed) return;
                try {
                    const heartbeat = `data: ${JSON.stringify({
                        type: "heartbeat",
                        timestamp: new Date().toISOString(),
                    })}\n\n`;
                    controller.enqueue(encoder.encode(heartbeat));
                } catch {
                    cleanup();
                }
            }, 30000);

            // ─── 8. Cleanup (bağlantı koptuğunda) ───────────
            function cleanup() {
                if (isClosed) return;
                isClosed = true;

                // Listener'ı kaldır
                messageEventEmitter.off(`message:${userId}`, onMessage);
                clearInterval(heartbeatInterval);

                // Kullanıcıyı connected listesinden çıkar
                connectedUsers.delete(userId);

                // 5 saniye bekle — kullanıcı tekrar bağlanmazsa offline yap
                const timer = setTimeout(async () => {
                    // Kullanıcı bu sürede tekrar bağlandı mı?
                    if (!connectedUsers.has(userId)) {
                        const lastSeenDate = new Date();

                        // DB'de offline güncelle
                        await prisma.user
                            .update({
                                where: { id: userId },
                                data: {
                                    isOnline: false,
                                    lastSeen: lastSeenDate,
                                },
                            })
                            .catch(() => { });

                        // Herkese offline + lastSeen presence event'i yayınla
                        emitPresence({
                            type: "presence",
                            userId,
                            status: "offline",
                            timestamp: lastSeenDate.toISOString(),
                            lastSeen: lastSeenDate.toISOString(),
                        });
                    }
                    disconnectTimers.delete(userId);
                }, OFFLINE_DELAY);

                disconnectTimers.set(userId, timer);

                try {
                    controller.close();
                } catch {
                    // Zaten kapalı
                }
            }

            // Client bağlantıyı kapattığında
            req.signal.addEventListener("abort", cleanup);
        },

        cancel() {
            isClosed = true;
            clearInterval(heartbeatInterval);
            connectedUsers.delete(userId);
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
