"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { filterContent } from "@/lib/utils/contentFilter";
import { emitNewMessage, emitMessageStatus } from "@/lib/eventEmitter";

export async function sendMessage(
    conversationId: string,
    senderId: string,
    text: string,
    type: "TEXT" | "IMAGE" | "FILE" | "PDF" = "TEXT"
) {
    // ── İçerik filtreleme ──
    const { filteredText, wasFiltered } = filterContent(text);

    const message = await prisma.message.create({
        data: {
            conversationId,
            senderId,
            text: filteredText,
            type,
            status: "SENT",
            isFiltered: wasFiltered,
        },
    });

    await prisma.conversation.update({
        where: { id: conversationId },
        data: {
            lastMessage: filteredText.slice(0, 100),
            lastMessageAt: new Date(),
            unreadCount: { increment: 1 },
        },
    });

    // ── SSE Event ──
    try {
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: { userId: true, consultant: { select: { userId: true } } },
        });

        if (conversation) {
            const targetUserId =
                conversation.userId === senderId
                    ? conversation.consultant?.userId
                    : conversation.userId;

            if (targetUserId) {
                emitNewMessage(targetUserId, {
                    type: "new_message",
                    conversationId,
                    messageId: message.id,
                    senderId,
                    text: filteredText,
                    messageType: type,
                    timestamp: message.createdAt.toISOString(),
                });
            }
        }
    } catch {
        // SSE event hatası mesaj gönderimini engellememeli
    }

    revalidatePath("/messages");
    return { success: true, isFiltered: wasFiltered };
}

export async function markAsRead(conversationId: string, userId?: string) {
    // Tüm SENT ve DELIVERED mesajları READ yap
    const updatedMessages = await prisma.message.updateMany({
        where: {
            conversationId,
            status: { in: ["SENT", "DELIVERED"] },
            ...(userId ? { senderId: { not: userId } } : {}),
        },
        data: { status: "READ" },
    });

    await prisma.conversation.update({
        where: { id: conversationId },
        data: { unreadCount: 0 },
    });

    // ── SSE Event: Gönderene bildir ──
    if (updatedMessages.count > 0 && userId) {
        try {
            const conversation = await prisma.conversation.findUnique({
                where: { id: conversationId },
                select: { userId: true, consultant: { select: { userId: true } } },
            });

            if (conversation) {
                const targetUserId =
                    conversation.userId === userId
                        ? conversation.consultant?.userId
                        : conversation.userId;

                if (targetUserId) {
                    const readMsgIds = await prisma.message.findMany({
                        where: {
                            conversationId,
                            senderId: targetUserId,
                            status: "READ",
                        },
                        select: { id: true },
                        orderBy: { createdAt: "desc" },
                        take: 50,
                    });

                    emitMessageStatus(targetUserId, {
                        type: "message_read",
                        conversationId,
                        messageIds: readMsgIds.map((m) => m.id),
                        userId,
                        timestamp: new Date().toISOString(),
                    });
                }
            }
        } catch {
            // SSE event hatası
        }
    }

    revalidatePath("/messages");
    return { success: true };
}

export async function markAsDelivered(conversationId: string, userId: string) {
    const updatedMessages = await prisma.message.updateMany({
        where: {
            conversationId,
            status: "SENT",
            senderId: { not: userId },
        },
        data: { status: "DELIVERED" },
    });

    // ── SSE Event: Gönderene "iletildi" bildir ──
    if (updatedMessages.count > 0) {
        try {
            const conversation = await prisma.conversation.findUnique({
                where: { id: conversationId },
                select: { userId: true, consultant: { select: { userId: true } } },
            });

            if (conversation) {
                const targetUserId =
                    conversation.userId === userId
                        ? conversation.consultant?.userId
                        : conversation.userId;

                if (targetUserId) {
                    const deliveredMsgIds = await prisma.message.findMany({
                        where: {
                            conversationId,
                            senderId: targetUserId,
                            status: "DELIVERED",
                        },
                        select: { id: true },
                        orderBy: { createdAt: "desc" },
                        take: 50,
                    });

                    emitMessageStatus(targetUserId, {
                        type: "message_delivered",
                        conversationId,
                        messageIds: deliveredMsgIds.map((m) => m.id),
                        userId,
                        timestamp: new Date().toISOString(),
                    });
                }
            }
        } catch {
            // SSE event hatası
        }
    }

    return { success: true };
}

export async function getConversationMessages(conversationId: string) {
    return prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                },
            },
        },
    });
}
