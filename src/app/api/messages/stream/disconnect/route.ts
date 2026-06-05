import { NextRequest, NextResponse } from "next/server";
import {
    connectedUsers,
    disconnectTimers,
    emitPresence,
} from "@/lib/eventEmitter";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/messages/stream/disconnect
 * Body: { userId: "..." }
 *
 * Flutter arka plana geçtiğinde açıkça disconnect çağrısı yapar.
 * connectedUsers'dan çıkar + isOnline: false + lastSeen: now() + broadcast offline
 */
export async function POST(req: NextRequest) {
    try {
        const { userId } = await req.json();

        if (!userId || typeof userId !== "string") {
            return NextResponse.json(
                { error: "userId gerekli" },
                { status: 400 }
            );
        }

        // Bekleyen timer varsa iptal et
        if (disconnectTimers.has(userId)) {
            clearTimeout(disconnectTimers.get(userId));
            disconnectTimers.delete(userId);
        }

        // Kullanıcıyı online listesinden çıkar
        connectedUsers.delete(userId);

        const lastSeenDate = new Date();

        // DB güncelle
        await prisma.user
            .update({
                where: { id: userId },
                data: {
                    isOnline: false,
                    lastSeen: lastSeenDate,
                },
            })
            .catch(() => { });

        // Herkese offline presence event'i yayınla
        emitPresence({
            type: "presence",
            userId,
            status: "offline",
            timestamp: lastSeenDate.toISOString(),
            lastSeen: lastSeenDate.toISOString(),
        });

        return NextResponse.json({
            success: true,
            message: "Kullanıcı offline olarak işaretlendi",
            lastSeen: lastSeenDate.toISOString(),
        });
    } catch (error) {
        console.error("Disconnect error:", error);
        return NextResponse.json(
            { error: "Disconnect işlemi başarısız" },
            { status: 500 }
        );
    }
}
