import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

const BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:3101";

// GET — Proxy bot status (returns QR, connection state, etc.)
export async function GET() {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

        const res = await fetch(`${BOT_URL}/status`, { cache: "no-store" });
        return NextResponse.json(await res.json());
    } catch {
        return NextResponse.json({ status: "disconnected", qrDataUrl: null, lastError: "Bot sunucusu çalışmıyor." });
    }
}

// POST — Proxy bot restart
export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session?.user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

        const body = await req.json();

        if (body.action === "restart") {
            const res = await fetch(`${BOT_URL}/restart`, { method: "POST" });
            return NextResponse.json(await res.json());
        }

        return NextResponse.json({ error: "Geçersiz aksiyon" }, { status: 400 });
    } catch {
        return NextResponse.json({ error: "Bot sunucusuna bağlanılamıyor." }, { status: 502 });
    }
}
