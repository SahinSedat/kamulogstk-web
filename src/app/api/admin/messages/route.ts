import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/messages — Tüm mesajları, istatistikleri ve konuşmaları getir
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (
            !session ||
            !["ADMIN", "MODERATOR"].includes(session.user?.role as string)
        ) {
            return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
        }

        const { searchParams } = req.nextUrl;
        const tab = searchParams.get("tab") || "consultant"; // consultant | becayis | complaints
        const search = searchParams.get("search") || "";
        const filter = searchParams.get("filter") || "all"; // all | filtered | unread
        const page = parseInt(searchParams.get("page") || "1");
        const limit = 30;

        // ─── İstatistikler ──────────────────────────────────────
        const [
            totalConversations,
            totalMessages,
            filteredMessages,
            totalBecayisConversations,
            totalBecayisMessages,
            filteredBecayisMessages,
            todayMessages,
            todayBecayisMessages,
        ] = await Promise.all([
            prisma.conversation.count(),
            prisma.message.count(),
            prisma.message.count({ where: { isFiltered: true } }),
            prisma.becayisMessage
                .findMany({
                    select: { senderId: true, receiverId: true, listingId: true },
                    distinct: ["senderId", "receiverId", "listingId"],
                })
                .then((r) => r.length),
            prisma.becayisMessage.count(),
            prisma.becayisMessage.count({ where: { isFiltered: true } }),
            prisma.message.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
            prisma.becayisMessage.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            }),
        ]);

        // Şikayet sayısı
        const [complaintsTotal, complaintsPending] = await Promise.all([
            prisma.adminLog.count({ where: { action: "MESSAGE_REPORT" } }),
            prisma.adminLog.count({ where: { action: "MESSAGE_REPORT", details: { contains: '"status":"pending"' } } }).catch(() => prisma.adminLog.count({ where: { action: "MESSAGE_REPORT" } })),
        ]);

        const stats = {
            consultant: {
                conversations: totalConversations,
                messages: totalMessages,
                filtered: filteredMessages,
                today: todayMessages,
            },
            becayis: {
                conversations: totalBecayisConversations,
                messages: totalBecayisMessages,
                filtered: filteredBecayisMessages,
                today: todayBecayisMessages,
            },
            complaints: {
                total: complaintsTotal,
                pending: complaintsPending,
            },
        };

        // ─── Mesaj Şikayetleri ────────────────────────────────────
        if (tab === "complaints") {
            const complaints = await prisma.adminLog.findMany({
                where: {
                    action: "MESSAGE_REPORT",
                    ...(search ? {
                        OR: [
                            { details: { contains: search, mode: "insensitive" as const } },
                            { targetId: { contains: search, mode: "insensitive" as const } },
                        ],
                    } : {}),
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            });

            // Kullanıcı bilgilerini çek
            const userIds = new Set<string>();
            for (const c of complaints) {
                if (c.adminId) userIds.add(c.adminId);
                if (c.targetId) userIds.add(c.targetId);
            }

            const users = await prisma.user.findMany({
                where: { id: { in: Array.from(userIds) } },
                select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, phone: true },
            });
            const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

            const enrichedComplaints = complaints.map((c) => {
                let parsed: Record<string, unknown> = {};
                try { parsed = JSON.parse(c.details || "{}"); } catch { /* ignore */ }
                return {
                    id: c.id,
                    reporterId: c.adminId,
                    targetUserId: c.targetId,
                    reason: parsed.reason || "Bilinmiyor",
                    messageId: parsed.messageId || null,
                    status: (parsed.status as string) || "pending",
                    createdAt: c.createdAt.toISOString(),
                    reporter: userMap[c.adminId] || null,
                    target: userMap[c.targetId || ""] || null,
                };
            });

            return NextResponse.json({ stats, complaints: enrichedComplaints });
        }

        // ─── Danışman Konuşmaları ────────────────────────────────
        if (tab === "consultant") {
            const where: Record<string, unknown> = {};

            if (search) {
                where.OR = [
                    { user: { firstName: { contains: search, mode: "insensitive" } } },
                    { user: { lastName: { contains: search, mode: "insensitive" } } },
                    { user: { email: { contains: search, mode: "insensitive" } } },
                    { consultant: { name: { contains: search, mode: "insensitive" } } },
                ];
            }

            if (filter === "unread") {
                where.unreadCount = { gt: 0 };
            }

            const conversations = await prisma.conversation.findMany({
                where,
                orderBy: { lastMessageAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            avatarUrl: true,
                            phone: true,
                            phoneNumber: true,
                            role: true,
                            isActive: true,
                            accountFrozen: true,
                            isPremium: true,
                        },
                    },
                    consultant: {
                        select: {
                            id: true,
                            name: true,
                            avatarUrl: true,
                            isOnline: true,
                            category: true,
                        },
                    },
                    messages: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                        select: { isFiltered: true, status: true },
                    },
                },
            });

            // Filtrelenen mesajlar filtresi
            const filteredConversations =
                filter === "filtered"
                    ? conversations.filter((c) => c.messages[0]?.isFiltered)
                    : conversations;

            return NextResponse.json({
                stats,
                conversations: filteredConversations,
                tab: "consultant",
            });
        }

        // ─── Becayiş Konuşmaları (gruplu) ──────────────────────────
        if (tab === "becayis") {
            const whereConditions: Record<string, unknown> = {};

            if (search) {
                whereConditions.OR = [
                    { sender: { firstName: { contains: search, mode: "insensitive" } } },
                    { sender: { lastName: { contains: search, mode: "insensitive" } } },
                    { receiver: { firstName: { contains: search, mode: "insensitive" } } },
                    { receiver: { lastName: { contains: search, mode: "insensitive" } } },
                    { listing: { title: { contains: search, mode: "insensitive" } } },
                ];
            }

            if (filter === "filtered") {
                whereConditions.isFiltered = true;
            }
            if (filter === "unread") {
                whereConditions.isRead = false;
            }

            // Tüm mesajları çek ve JS tarafında grupla
            const allBecayis = await prisma.becayisMessage.findMany({
                where: whereConditions,
                orderBy: { createdAt: "desc" },
                include: {
                    sender: {
                        select: {
                            id: true, firstName: true, lastName: true,
                            avatarUrl: true, email: true, phone: true,
                            phoneNumber: true, isPremium: true, isActive: true, accountFrozen: true,
                        },
                    },
                    receiver: {
                        select: {
                            id: true, firstName: true, lastName: true,
                            avatarUrl: true, email: true,
                        },
                    },
                    listing: {
                        select: {
                            id: true, title: true, currentCity: true,
                            targetCity: true, adNumber: true, status: true,
                        },
                    },
                },
            });

            // Konuşmaları grupla: iki kullanıcı + ilan bazında
            const groupMap = new Map<string, {
                senderId: string;
                receiverId: string;
                listingId: string;
                sender: typeof allBecayis[0]["sender"];
                receiver: typeof allBecayis[0]["receiver"];
                listing: typeof allBecayis[0]["listing"];
                lastMessage: string;
                lastMessageAt: string;
                messageCount: number;
                unreadCount: number;
                hasFiltered: boolean;
            }>();

            for (const msg of allBecayis) {
                // Normalize key: always sort sender/receiver IDs so both directions map to same group
                const ids = [msg.senderId, msg.receiverId].sort();
                const key = `${ids[0]}_${ids[1]}_${msg.listingId}`;

                if (!groupMap.has(key)) {
                    groupMap.set(key, {
                        senderId: msg.senderId,
                        receiverId: msg.receiverId,
                        listingId: msg.listingId,
                        sender: msg.sender,
                        receiver: msg.receiver,
                        listing: msg.listing,
                        lastMessage: msg.content,
                        lastMessageAt: msg.createdAt.toISOString(),
                        messageCount: 0,
                        unreadCount: 0,
                        hasFiltered: false,
                    });
                }

                const group = groupMap.get(key)!;
                group.messageCount++;
                if (!msg.isRead) group.unreadCount++;
                if (msg.isFiltered) group.hasFiltered = true;
            }

            const becayisConversations = Array.from(groupMap.values());

            // Sayfalama
            const paged = becayisConversations.slice((page - 1) * limit, page * limit);

            return NextResponse.json({
                stats,
                becayisConversations: paged,
                totalBecayisConversations: becayisConversations.length,
                tab: "becayis",
            });
        }

        // ─── Konuşma Detayı (mesajları getir) ────────────────────
        if (tab === "conversation-detail") {
            const conversationId = searchParams.get("conversationId");
            if (!conversationId) {
                return NextResponse.json(
                    { error: "conversationId gerekli" },
                    { status: 400 }
                );
            }

            const messages = await prisma.message.findMany({
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
                            avatarUrl: true,
                        },
                    },
                },
            });

            return NextResponse.json({ messages, tab: "conversation-detail" });
        }

        // ─── Becayiş Konuşma Detayı ──────────────────────────────
        if (tab === "becayis-detail") {
            const senderId = searchParams.get("senderId");
            const receiverId = searchParams.get("receiverId");
            const listingId = searchParams.get("listingId");

            if (!senderId || !receiverId || !listingId) {
                return NextResponse.json(
                    { error: "senderId, receiverId, listingId gerekli" },
                    { status: 400 }
                );
            }

            const messages = await prisma.becayisMessage.findMany({
                where: {
                    listingId,
                    OR: [
                        { senderId, receiverId },
                        { senderId: receiverId, receiverId: senderId },
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

            return NextResponse.json({
                messages,
                tab: "becayis-detail",
            });
        }

        return NextResponse.json({ error: "Geçersiz tab" }, { status: 400 });
    } catch (error) {
        console.error("Admin messages error:", error);
        return NextResponse.json(
            { error: "Mesajlar yüklenemedi" },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/messages — Mesaj sil (admin yetki)
// Desteklenen modlar:
//   { messageId, type }                                    → tekil mesaj sil
//   { action: "delete-conversation", conversationId }      → tüm konuşmayı sil
//   { action: "delete-becayis-thread", senderId, receiverId, listingId } → becayiş thread sil
//   { action: "delete-all-user-messages", userId }         → kullanıcının TÜM mesajlarını sil
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.role !== "ADMIN") {
            return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
        }

        const body = await req.json();
        const { action } = body;

        // ─── Tüm konuşmayı sil (mesajlar + conversation kaydı) ───
        if (action === "delete-conversation") {
            const { conversationId } = body;
            if (!conversationId) {
                return NextResponse.json({ error: "conversationId gerekli" }, { status: 400 });
            }

            const deleted = await prisma.$transaction(async (tx) => {
                const count = await tx.message.deleteMany({ where: { conversationId } });
                await tx.conversation.delete({ where: { id: conversationId } });
                return count.count;
            });

            return NextResponse.json({ success: true, deletedMessages: deleted });
        }

        // ─── Becayiş thread sil ───────────────────────────────────
        if (action === "delete-becayis-thread") {
            const { senderId, receiverId, listingId } = body;
            if (!senderId || !receiverId || !listingId) {
                return NextResponse.json({ error: "senderId, receiverId, listingId gerekli" }, { status: 400 });
            }

            const deleted = await prisma.becayisMessage.deleteMany({
                where: {
                    listingId,
                    OR: [
                        { senderId, receiverId },
                        { senderId: receiverId, receiverId: senderId },
                    ],
                },
            });

            return NextResponse.json({ success: true, deletedMessages: deleted.count });
        }

        // ─── Kullanıcının TÜM mesajlarını sil (her iki tablodan) ──
        if (action === "delete-all-user-messages") {
            const { userId } = body;
            if (!userId) {
                return NextResponse.json({ error: "userId gerekli" }, { status: 400 });
            }

            const result = await prisma.$transaction(async (tx) => {
                // 1. Kullanıcının gönderdiği tüm mesajları sil (Message tablosu)
                const deletedMessages = await tx.message.deleteMany({
                    where: { senderId: userId },
                });

                // 2. Kullanıcının ait olduğu konuşmalardaki tüm mesajları sil
                const userConversations = await tx.conversation.findMany({
                    where: { userId },
                    select: { id: true },
                });
                const convIds = userConversations.map((c) => c.id);

                let deletedConvMessages = 0;
                if (convIds.length > 0) {
                    const r = await tx.message.deleteMany({
                        where: { conversationId: { in: convIds } },
                    });
                    deletedConvMessages = r.count;
                }

                // 3. Konuşma kayıtlarını sil
                const deletedConversations = await tx.conversation.deleteMany({
                    where: { userId },
                });

                // 4. Becayiş mesajlarını sil (gönderici veya alıcı olarak)
                const deletedBecayis = await tx.becayisMessage.deleteMany({
                    where: {
                        OR: [{ senderId: userId }, { receiverId: userId }],
                    },
                });

                return {
                    messages: deletedMessages.count + deletedConvMessages,
                    conversations: deletedConversations.count,
                    becayisMessages: deletedBecayis.count,
                };
            });

            return NextResponse.json({ success: true, deleted: result });
        }

        // ─── Tekil mesaj sil (eski davranış) ──────────────────────
        const { messageId, type } = body;
        if (!messageId) {
            return NextResponse.json({ error: "messageId gerekli" }, { status: 400 });
        }

        if (type === "becayis") {
            await prisma.becayisMessage.delete({ where: { id: messageId } });
        } else {
            await prisma.message.delete({ where: { id: messageId } });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Admin message delete error:", error);
        return NextResponse.json(
            { error: "Mesaj silinemedi" },
            { status: 500 }
        );
    }
}
