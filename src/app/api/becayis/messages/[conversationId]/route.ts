import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitMessageStatus } from "@/lib/eventEmitter";

// GET /api/becayis/messages/[conversationId]?userId=xxx&otherId=yyy&listingId=zzz
// Belirli konuşmanın mesajlarını getir (polling için)
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId");
    const otherId = searchParams.get("otherId");
    const listingId = searchParams.get("listingId");

    if (!userId || !otherId || !listingId) {
        return NextResponse.json(
            { error: "userId, otherId ve listingId gereklidir" },
            { status: 400 }
        );
    }

    try {
        // İki kullanıcı arasındaki belirli ilana ait mesajları getir
        const messages = await prisma.becayisMessage.findMany({
            where: {
                listingId,
                OR: [
                    { senderId: userId, receiverId: otherId },
                    { senderId: otherId, receiverId: userId },
                ],
            },
            orderBy: { createdAt: "asc" },
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

        // Karşı taraftan gelen okunmamış mesajları okundu olarak işaretle
        const updatedResult = await prisma.becayisMessage.updateMany({
            where: {
                listingId,
                senderId: otherId,
                receiverId: userId,
                isRead: false,
            },
            data: {
                isRead: true,
                status: "READ",
            },
        });

        // ── SSE Event: Gönderene "okundu" bildir ──
        if (updatedResult.count > 0) {
            try {
                const readMsgIds = messages
                    .filter(
                        (m) =>
                            m.senderId === otherId &&
                            m.receiverId === userId &&
                            !m.isRead
                    )
                    .map((m) => m.id);

                emitMessageStatus(otherId, {
                    type: "message_read",
                    messageIds: readMsgIds,
                    userId,
                    receiverId: otherId,
                    listingId,
                    timestamp: new Date().toISOString(),
                });
            } catch {
                console.error("SSE becayis read event hatası");
            }
        }

        return NextResponse.json({ messages });
    } catch (error) {
        console.error("Becayis conversation error:", error);
        return NextResponse.json(
            { error: "Mesajlar yüklenemedi" },
            { status: 500 }
        );
    }
}

// PATCH /api/becayis/messages/[conversationId] — Okundu bilgisi güncelle
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    const body = await req.json();
    const { userId, otherId, listingId, status = "READ" } = body;

    if (!userId || !otherId || !listingId) {
        return NextResponse.json(
            { error: "userId, otherId ve listingId gerekli" },
            { status: 400 }
        );
    }

    if (!["DELIVERED", "READ"].includes(status)) {
        return NextResponse.json(
            { error: "status DELIVERED veya READ olmalı" },
            { status: 400 }
        );
    }

    try {
        // Karşı tarafın gönderdiği mesajları güncelle
        const updateData: Record<string, unknown> = { status };
        if (status === "READ") {
            updateData.isRead = true;
        }

        const updatedMessages = await prisma.becayisMessage.updateMany({
            where: {
                listingId,
                senderId: otherId,
                receiverId: userId,
                status:
                    status === "READ" ? { in: ["SENT", "DELIVERED"] } : "SENT",
            },
            data: updateData,
        });

        // ── SSE Event: Gönderene bildir ──
        if (updatedMessages.count > 0) {
            try {
                const updatedMsgIds = await prisma.becayisMessage.findMany({
                    where: {
                        listingId,
                        senderId: otherId,
                        receiverId: userId,
                        status,
                    },
                    select: { id: true },
                    orderBy: { createdAt: "desc" },
                    take: 50,
                });

                emitMessageStatus(otherId, {
                    type:
                        status === "READ" ? "message_read" : "message_delivered",
                    messageIds: updatedMsgIds.map((m) => m.id),
                    userId,
                    receiverId: otherId,
                    listingId,
                    timestamp: new Date().toISOString(),
                });
            } catch {
                console.error("SSE becayis status event hatası");
            }
        }

        return NextResponse.json({
            success: true,
            updatedCount: updatedMessages.count,
            status,
        });
    } catch (error) {
        console.error("Becayis mark as read error:", error);
        return NextResponse.json(
            { error: "Durum güncellenemedi" },
            { status: 500 }
        );
    }
}

// DELETE /api/becayis/messages/[conversationId]
// Bu route'ta conversationId aslında messageId olarak da kullanılır (soft-delete)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    try {
        const { conversationId: messageId } = await params;

        if (!messageId) {
            return NextResponse.json(
                { error: "messageId gerekli" },
                { status: 400 }
            );
        }

        const message = await prisma.becayisMessage.findUnique({
            where: { id: messageId },
            select: { id: true, isDeletedByUser: true },
        });

        if (!message) {
            return NextResponse.json(
                { error: "Mesaj bulunamadı" },
                { status: 404 }
            );
        }

        if (message.isDeletedByUser) {
            return NextResponse.json({
                success: true,
                message: "Mesaj zaten silinmiş",
            });
        }

        await prisma.becayisMessage.update({
            where: { id: messageId },
            data: { isDeletedByUser: true },
        });

        return NextResponse.json({
            success: true,
            message: "Mesaj silindi",
            messageId,
        });
    } catch (error) {
        console.error("Becayis message delete error:", error);
        return NextResponse.json(
            { error: "Mesaj silinemedi" },
            { status: 500 }
        );
    }
}
