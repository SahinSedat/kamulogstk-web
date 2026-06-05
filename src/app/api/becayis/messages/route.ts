import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { filterContent } from "@/lib/utils/contentFilter";
import { emitNewMessage } from "@/lib/eventEmitter";

// GET /api/becayis/messages?userId=xxx — Kullanıcının tüm becayiş konuşmalarını listele
export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId");

    if (!userId) {
        return NextResponse.json(
            { error: "userId gereklidir" },
            { status: 400 }
        );
    }

    try {
        const messages = await prisma.becayisMessage.findMany({
            where: {
                OR: [{ senderId: userId }, { receiverId: userId }],
            },
            orderBy: { createdAt: "desc" },
            include: {
                sender: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                    },
                },
                receiver: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                    },
                },
                listing: {
                    select: {
                        id: true,
                        title: true,
                        currentCity: true,
                        targetCity: true,
                    },
                },
            },
        });

        // Konuşmaları listingId + karşı taraf bazında grupla
        const conversationsMap = new Map<
            string,
            {
                conversationKey: string;
                listingId: string;
                listingTitle: string;
                otherUser: {
                    id: string;
                    firstName: string | null;
                    lastName: string | null;
                    avatarUrl: string | null;
                };
                lastMessage: string;
                lastMessageAt: Date;
                lastMessageStatus: string;
                unreadCount: number;
            }
        >();

        for (const msg of messages) {
            const otherUserId =
                msg.senderId === userId ? msg.receiverId : msg.senderId;
            const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
            const key = `${msg.listingId}_${[userId, otherUserId].sort().join("_")}`;

            const existing = conversationsMap.get(key);
            if (!existing) {
                conversationsMap.set(key, {
                    conversationKey: key,
                    listingId: msg.listingId,
                    listingTitle:
                        msg.listing.title ||
                        `${msg.listing.currentCity} → ${msg.listing.targetCity}`,
                    otherUser: {
                        id: otherUser.id,
                        firstName: otherUser.firstName,
                        lastName: otherUser.lastName,
                        avatarUrl: otherUser.avatarUrl,
                    },
                    lastMessage: msg.content,
                    lastMessageAt: msg.createdAt,
                    lastMessageStatus: msg.status,
                    unreadCount:
                        msg.receiverId === userId && !msg.isRead ? 1 : 0,
                });
            } else {
                if (msg.receiverId === userId && !msg.isRead) {
                    existing.unreadCount++;
                }
            }
        }

        const conversations = Array.from(conversationsMap.values()).sort(
            (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
        );

        return NextResponse.json({ conversations });
    } catch (error) {
        console.error("Becayis messages list error:", error);
        return NextResponse.json(
            { error: "Mesajlar yüklenemedi" },
            { status: 500 }
        );
    }
}

// POST /api/becayis/messages — Yeni mesaj gönder (filtrelenmiş)
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { senderId, receiverId, listingId, content } = body;

    if (!senderId || !receiverId || !listingId || !content?.trim()) {
        return NextResponse.json(
            { error: "Zorunlu alanlar eksik" },
            { status: 400 }
        );
    }

    try {
        // ── Engel kontrolü (çift yönlü) ──
        const blockExists = await prisma.blockedUser.findFirst({
            where: {
                OR: [
                    { blockerUserId: senderId, blockedUserId: receiverId },
                    { blockerUserId: receiverId, blockedUserId: senderId },
                ],
            },
        });

        if (blockExists) {
            return NextResponse.json(
                { error: "Bu kullanıcıyla mesajlaşma engellenmiştir." },
                { status: 403 }
            );
        }

        // ── İçerik filtreleme ──
        const { filteredText, wasFiltered } = filterContent(content.trim());

        const message = await prisma.becayisMessage.create({
            data: {
                senderId,
                receiverId,
                listingId,
                content: filteredText,
                status: "SENT",
                isFiltered: wasFiltered,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        // ── SSE Event: Alıcıya bildir ──
        try {
            emitNewMessage(receiverId, {
                type: "new_message",
                conversationId: `becayis_${listingId}`,
                messageId: message.id,
                senderId,
                receiverId,
                listingId,
                text: filteredText,
                messageType: "TEXT",
                timestamp: message.createdAt.toISOString(),
            });
        } catch {
            console.error("SSE becayis event hatası");
        }

        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        console.error("Becayis message send error:", error);
        return NextResponse.json(
            { error: "Mesaj gönderilemedi" },
            { status: 500 }
        );
    }
}
