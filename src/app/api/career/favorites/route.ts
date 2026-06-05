import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Kariyer İlan Favori API — Kullanıcının favori iş ilanlarını yönetir.
 * Auth: Authorization: Token <userId>
 */

async function resolveUser(req: NextRequest) {
    const auth = req.headers.get("authorization");
    if (!auth) return null;
    const parts = auth.split(" ");
    const token = parts.length === 2 ? parts[1] : auth;
    if (!token) return null;

    let user = await prisma.user.findUnique({
        where: { id: token },
        select: { id: true },
    });
    if (user) return user;

    const phoneHeader = req.headers.get("x-user-phone");
    if (phoneHeader) {
        user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: phoneHeader },
                    { phoneNumber: phoneHeader },
                ],
            },
            select: { id: true },
        });
        if (user) return user;
    }
    return null;
}

// GET /api/career/favorites — Favori iş ilanlarını getir
export async function GET(req: NextRequest) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json(
                { error: "Yetkilendirme gerekli.", reauth: true },
                { status: 401 }
            );
        }

        const favorites = await prisma.favoriteJob.findMany({
            where: { userId: user.id },
            include: { job: true },
            orderBy: { createdAt: "desc" },
        });

        const favoriteIds = favorites.map((f) => f.jobId);
        const jobs = favorites.map((f) => f.job);

        return NextResponse.json({ favoriteIds, jobs });
    } catch (error) {
        console.error("Career Favorites GET error:", error);
        return NextResponse.json(
            { error: "Favoriler yüklenemedi" },
            { status: 500 }
        );
    }
}

// POST /api/career/favorites — Favoriye ekle
export async function POST(req: NextRequest) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json(
                { error: "Yetkilendirme gerekli.", reauth: true },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { jobId } = body;

        if (!jobId) {
            return NextResponse.json(
                { error: "jobId zorunlu" },
                { status: 400 }
            );
        }

        const job = await prisma.jobListing.findUnique({
            where: { id: jobId },
            select: { id: true },
        });
        if (!job) {
            return NextResponse.json(
                { error: "İlan bulunamadı" },
                { status: 404 }
            );
        }

        const existing = await prisma.favoriteJob.findUnique({
            where: { userId_jobId: { userId: user.id, jobId } },
        });
        if (existing) {
            return NextResponse.json({
                success: true,
                message: "Zaten favorilerde",
                action: "exists",
            });
        }

        await prisma.favoriteJob.create({
            data: { userId: user.id, jobId },
        });

        return NextResponse.json({
            success: true,
            message: "Favorilere eklendi",
            action: "added",
        });
    } catch (error) {
        console.error("Career Favorites POST error:", error);
        return NextResponse.json(
            { error: "Favorilere eklenirken hata oluştu" },
            { status: 500 }
        );
    }
}

// DELETE /api/career/favorites — Favoriden çıkar
export async function DELETE(req: NextRequest) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json(
                { error: "Yetkilendirme gerekli.", reauth: true },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const jobId = searchParams.get("jobId");

        if (!jobId) {
            return NextResponse.json(
                { error: "jobId zorunlu" },
                { status: 400 }
            );
        }

        await prisma.favoriteJob.deleteMany({
            where: { userId: user.id, jobId },
        });

        return NextResponse.json({
            success: true,
            message: "Favorilerden çıkarıldı",
            action: "removed",
        });
    } catch (error) {
        console.error("Career Favorites DELETE error:", error);
        return NextResponse.json(
            { error: "Favorilerden çıkarılırken hata oluştu" },
            { status: 500 }
        );
    }
}
