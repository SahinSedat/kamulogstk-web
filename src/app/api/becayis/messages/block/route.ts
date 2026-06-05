import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/becayis/messages/block — Kullanıcıyı engelle veya engeli kaldır
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { blockerUserId, blockedUserId, action } = body;

    if (!blockerUserId || !blockedUserId) {
        return NextResponse.json(
            { error: "blockerUserId ve blockedUserId gereklidir" },
            { status: 400 }
        );
    }

    try {
        if (action === "unblock") {
            // Engeli kaldır
            await prisma.blockedUser.deleteMany({
                where: { blockerUserId, blockedUserId },
            });
            return NextResponse.json({ success: true, blocked: false });
        }

        // Engelle (upsert — zaten varsa hata vermesin)
        await prisma.blockedUser.upsert({
            where: {
                blockerUserId_blockedUserId: { blockerUserId, blockedUserId },
            },
            update: {},
            create: { blockerUserId, blockedUserId },
        });

        return NextResponse.json({ success: true, blocked: true });
    } catch (error) {
        console.error("Block user error:", error);
        return NextResponse.json(
            { error: "İşlem başarısız" },
            { status: 500 }
        );
    }
}

// GET /api/becayis/messages/block?userId=x&otherUserId=y — Engel durumunu kontrol et
export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId");
    const otherUserId = searchParams.get("otherUserId");

    if (!userId || !otherUserId) {
        return NextResponse.json(
            { error: "userId ve otherUserId gereklidir" },
            { status: 400 }
        );
    }

    try {
        // Her iki yönde engel var mı kontrol et
        const blocks = await prisma.blockedUser.findMany({
            where: {
                OR: [
                    { blockerUserId: userId, blockedUserId: otherUserId },
                    { blockerUserId: otherUserId, blockedUserId: userId },
                ],
            },
        });

        const blockedByMe = blocks.some(
            (b) => b.blockerUserId === userId && b.blockedUserId === otherUserId
        );
        const blockedByThem = blocks.some(
            (b) => b.blockerUserId === otherUserId && b.blockedUserId === userId
        );

        return NextResponse.json({
            blockedByMe,
            blockedByThem,
            isBlocked: blockedByMe || blockedByThem,
        });
    } catch (error) {
        console.error("Check block status error:", error);
        return NextResponse.json(
            { error: "Kontrol başarısız" },
            { status: 500 }
        );
    }
}
