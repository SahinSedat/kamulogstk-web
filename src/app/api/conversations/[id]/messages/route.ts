import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { filterContent } from "@/lib/utils/contentFilter";
import { emitNewMessage } from "@/lib/eventEmitter";

// GET /api/conversations/[id]/messages
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // 🛡️ GÜVENLİK: Auth kontrolü — sadece konuşma tarafları erişebilir
    const authHeader = req.headers.get("authorization") || "";
    const authUserId = req.headers.get("x-user-id") || authHeader.replace(/^(Bearer|Token)\s+/i, "");

    // Conversation meta bilgileri
    const conversation = await prisma.conversation.findUnique({
        where: { id },
        select: {
            isEnded: true,
            userId: true,
            consultantId: true,
            consultant: { select: { userId: true } },
        },
    });

    // 🛡️ Conversation tarafı doğrulama
    if (conversation && authUserId) {
        const isOwner = conversation.userId === authUserId;
        const isConsultant = conversation.consultant?.userId === authUserId;
        if (!isOwner && !isConsultant) {
            console.warn(`[Messages] 🚫 Yetkisiz erişim: auth=${authUserId} conv.userId=${conversation.userId}`);
            return NextResponse.json({ error: "Bu konuşmaya erişim yetkiniz yok" }, { status: 403 });
        }
    }

    // Bu görüşme için puan verilmiş mi?
    const existingReview = conversation ? await prisma.review.findUnique({
        where: { conversationId: id },
        select: { id: true },
    }) : null;

    const messages = await prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: "asc" },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    avatarUrl: true,
                },
            },
        },
    });

    return NextResponse.json({
        messages,
        isEnded: conversation?.isEnded ?? false,
        consultantId: conversation?.consultantId ?? null,
        consultantUserId: conversation?.consultant?.userId ?? null,
        conversationUserId: conversation?.userId ?? null,
        hasRated: !!existingReview,
    });
}

// POST /api/conversations/[id]/messages — Mesaj gönder (filtrelenmiş + jeton)
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await req.json();
    const { senderId, text, type = "TEXT" } = body;

    if (!senderId || !text) {
        return NextResponse.json(
            { error: "senderId ve text gerekli" },
            { status: 400 }
        );
    }

    // ── Conversation bilgisi al — danışman konuşması mı? ──
    const conversation = await prisma.conversation.findUnique({
        where: { id },
        select: {
            userId: true,
            consultantId: true,
            consultant: {
                select: {
                    id: true,
                    userId: true,
                    costPerMessage: true,
                    maxMessagesPerSession: true,
                },
            },
        },
    });

    if (!conversation) {
        return NextResponse.json({ error: "Konuşma bulunamadı" }, { status: 404 });
    }

    // ── Danışman konuşmasında jeton kontrolü ──
    const isConsultantChat = !!conversation.consultantId && !!conversation.consultant;
    const isUserSender = conversation.userId === senderId;

    if (isConsultantChat && isUserSender && conversation.consultant) {
        const cost = conversation.consultant.costPerMessage;
        const maxMsgs = conversation.consultant.maxMessagesPerSession;

        // Mesaj sınırı kontrolü
        const userMsgCount = await prisma.message.count({
            where: { conversationId: id, senderId },
        });
        if (maxMsgs > 0 && userMsgCount >= maxMsgs) {
            return NextResponse.json(
                { error: `Bu oturumda maksimum ${maxMsgs} mesaj gönderebilirsiniz.`, code: "MAX_MESSAGES" },
                { status: 403 }
            );
        }

        // Jeton bakiye kontrolü
        if (cost > 0) {
            const user = await prisma.user.findUnique({
                where: { id: senderId },
                select: { credits: true },
            });
            if (!user || user.credits < cost) {
                return NextResponse.json(
                    { error: `Yetersiz jeton. Gerekli: ${cost}, Mevcut: ${user?.credits ?? 0}`, code: "INSUFFICIENT_CREDITS" },
                    { status: 402 }
                );
            }

            // Atomik: kullanıcıdan düş, danışmana ekle
            await prisma.$transaction([
                prisma.user.update({
                    where: { id: senderId },
                    data: { credits: { decrement: cost } },
                }),
                prisma.consultant.update({
                    where: { id: conversation.consultant.id },
                    data: { consultantCredits: { increment: cost } },
                }),
            ]);
        }
    }

    // ── İçerik filtreleme ──
    const { filteredText, wasFiltered } = filterContent(text);

    const message = await prisma.message.create({
        data: {
            conversationId: id,
            senderId,
            text: filteredText,
            type,
            status: "SENT",
            isFiltered: wasFiltered,
        },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true,
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                },
            },
        },
    });

    // Conversation güncelle
    await prisma.conversation.update({
        where: { id },
        data: {
            lastMessage: filteredText.slice(0, 100),
            lastMessageAt: new Date(),
            unreadCount: { increment: 1 },
        },
    });

    // ── SSE Event: Karşı tarafa bildir ──
    try {
        if (conversation) {
            const targetUserId =
                conversation.userId === senderId
                    ? conversation.consultant?.userId
                    : conversation.userId;

            if (targetUserId) {
                emitNewMessage(targetUserId, {
                    type: "new_message",
                    conversationId: id,
                    messageId: message.id,
                    senderId,
                    text: filteredText,
                    messageType: type,
                    timestamp: message.createdAt.toISOString(),
                });
            }
        }
    } catch {
        console.error("SSE event emit hatası");
    }

    return NextResponse.json(message, { status: 201 });
}

// PATCH /api/conversations/[id]/messages — Okundu bilgisi güncelle
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await req.json();
    const { userId, status = "READ" } = body;

    if (!userId) {
        return NextResponse.json(
            { error: "userId gerekli" },
            { status: 400 }
        );
    }

    // Geçerli status kontrolü
    if (!["DELIVERED", "READ"].includes(status)) {
        return NextResponse.json(
            { error: "status DELIVERED veya READ olmalı" },
            { status: 400 }
        );
    }

    // Karşı taraftan gelen mesajları güncelle
    // (userId'yi alan, yani receiverId olan mesajlar)
    const updatedMessages = await prisma.message.updateMany({
        where: {
            conversationId: id,
            senderId: { not: userId }, // Karşı tarafın gönderdiği mesajlar
            status: status === "READ" ? { in: ["SENT", "DELIVERED"] } : "SENT",
        },
        data: { status },
    });

    // Eğer READ ise unreadCount sıfırla
    if (status === "READ") {
        await prisma.conversation.update({
            where: { id },
            data: { unreadCount: 0 },
        });
    }

    // ── SSE Event: Gönderene "okundu" bildir ──
    try {
        if (updatedMessages.count > 0) {
            const conversation = await prisma.conversation.findUnique({
                where: { id },
                select: { userId: true, consultant: { select: { userId: true } } },
            });

            if (conversation) {
                const { emitMessageStatus } = await import("@/lib/eventEmitter");
                const targetUserId =
                    conversation.userId === userId
                        ? conversation.consultant?.userId
                        : conversation.userId;

                if (targetUserId) {
                    // Güncellenen mesaj ID'lerini al
                    const updatedMsgIds = await prisma.message.findMany({
                        where: { conversationId: id, senderId: targetUserId, status },
                        select: { id: true },
                        orderBy: { createdAt: "desc" },
                        take: 50,
                    });

                    emitMessageStatus(targetUserId, {
                        type: status === "READ" ? "message_read" : "message_delivered",
                        conversationId: id,
                        messageIds: updatedMsgIds.map((m) => m.id),
                        userId,
                        timestamp: new Date().toISOString(),
                    });
                }
            }
        }
    } catch {
        console.error("SSE status event hatası");
    }

    return NextResponse.json({
        success: true,
        updatedCount: updatedMessages.count,
        status,
    });
}
