import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — Haber listesi
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "MODERATOR"].includes((session.user as any).role)) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category") || "";
        const status = searchParams.get("status") || "";

        const where: any = {};
        if (category) where.category = category;
        if (status) where.status = status;

        const news = await prisma.news.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ news });
    } catch (error) {
        console.error("Haber listesi hatası:", error);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

// POST — Yeni haber oluştur
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "MODERATOR"].includes((session.user as any).role)) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
        }

        const body = await request.json();
        const { title, content, summary, category, imageUrl, status } = body;

        if (!title || !content || !category) {
            return NextResponse.json({ error: "Başlık, içerik ve kategori gerekli" }, { status: 400 });
        }

        const news = await prisma.news.create({
            data: { title, content, summary, category, imageUrl, status: status || "draft" },
        });

        return NextResponse.json({ success: true, news });
    } catch (error) {
        console.error("Haber oluşturma hatası:", error);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

// PATCH — Haber güncelle
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "MODERATOR"].includes((session.user as any).role)) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
        }

        const body = await request.json();
        const { id, ...data } = body;
        if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

        const news = await prisma.news.update({ where: { id }, data });
        return NextResponse.json({ success: true, news });
    } catch (error) {
        console.error("Haber güncelleme hatası:", error);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

// DELETE — Haber sil
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

        await prisma.news.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Haber silme hatası:", error);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}
