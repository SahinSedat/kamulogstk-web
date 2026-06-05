import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

// GET — Return logs and stats
export async function GET() {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
        }

        const logs = await prisma.whatsAppLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        // Stats
        const total = await prisma.whatsAppLog.count();
        const sent = await prisma.whatsAppLog.count({ where: { status: "SENT" } });
        const verified = await prisma.whatsAppLog.count({ where: { status: "VERIFIED" } });
        const failed = await prisma.whatsAppLog.count({ where: { status: "FAILED" } });

        return NextResponse.json({ logs, stats: { total, sent, verified, failed } });
    } catch (error) {
        console.error("Logs error:", error);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}
