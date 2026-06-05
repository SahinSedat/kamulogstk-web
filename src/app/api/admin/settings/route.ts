import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/settings — Tüm sistem ayarlarını getir (Admin yetkili)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
            return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
        }

        const settings = await prisma.systemSetting.findMany({
            orderBy: { key: "asc" },
        });

        // key-value map olarak da dön (kolay erişim)
        const settingsMap: Record<string, string> = {};
        for (const s of settings) {
            settingsMap[s.key] = s.value;
        }

        return NextResponse.json({ settings, settingsMap });
    } catch (error) {
        console.error("Admin Settings GET error:", error);
        return NextResponse.json({ error: "Ayarlar yüklenemedi" }, { status: 500 });
    }
}

// PUT /api/admin/settings — Ayar upsert (Admin yetkili)
// Body: { key: "DEFAULT_WELCOME_CREDITS", value: "2" }
// veya toplu: { settings: [{ key: "...", value: "..." }, ...] }
export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
            return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
        }

        const body = await req.json();

        // Toplu güncelleme desteği
        if (body.settings && Array.isArray(body.settings)) {
            const results = [];
            for (const item of body.settings) {
                if (!item.key || item.value === undefined) continue;
                const setting = await prisma.systemSetting.upsert({
                    where: { key: item.key },
                    create: { key: item.key, value: String(item.value) },
                    update: { value: String(item.value) },
                });
                results.push(setting);
            }
            return NextResponse.json({ success: true, updated: results.length, settings: results });
        }

        // Tekli güncelleme
        const { key, value } = body;
        if (!key || value === undefined) {
            return NextResponse.json({ error: "key ve value gerekli" }, { status: 400 });
        }

        const setting = await prisma.systemSetting.upsert({
            where: { key },
            create: { key, value: String(value) },
            update: { value: String(value) },
        });

        return NextResponse.json({ success: true, setting });
    } catch (error) {
        console.error("Admin Settings PUT error:", error);
        return NextResponse.json({ error: "Ayar güncellenemedi" }, { status: 500 });
    }
}
