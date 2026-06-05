import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function resolveUser(req: NextRequest) {
    const auth = req.headers.get("authorization");
    if (auth) {
        const parts = auth.split(" ");
        const token = parts.length === 2 ? parts[1] : auth;
        if (token && token.length > 5) {
            return prisma.user.findUnique({
                where: { id: token },
                select: { id: true },
            });
        }
    }
    const phone = req.headers.get("x-user-phone");
    if (phone) {
        return prisma.user.findFirst({
            where: { OR: [{ phone }, { phoneNumber: phone }] },
            select: { id: true },
        });
    }
    return null;
}

// GET — Kullanıcının sınav geçmişi
export async function GET(req: NextRequest) {
    try {
        const user = await resolveUser(req);
        if (!user) return NextResponse.json({ error: "Yetkilendirme gerekli." }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
        const page = parseInt(searchParams.get("page") || "1");

        const [history, total] = await Promise.all([
            prisma.kpssExamHistory.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.kpssExamHistory.count({ where: { userId: user.id } }),
        ]);

        // İstatistik
        const stats = await prisma.kpssExamHistory.aggregate({
            where: { userId: user.id },
            _avg: { estimatedPoint: true, netScore: true },
            _max: { estimatedPoint: true },
            _count: true,
        });

        return NextResponse.json({
            history: history.map(h => ({ ...h, createdAt: h.createdAt.toISOString() })),
            total,
            page,
            totalPages: Math.ceil(total / limit),
            stats: {
                totalExams: stats._count,
                avgPoint: stats._avg.estimatedPoint ? Math.round(stats._avg.estimatedPoint * 10) / 10 : 0,
                avgNet: stats._avg.netScore ? Math.round(stats._avg.netScore * 10) / 10 : 0,
                bestPoint: stats._max.estimatedPoint ? Math.round(stats._max.estimatedPoint * 10) / 10 : 0,
            },
        });
    } catch (error) {
        console.error("KPSS history GET:", error);
        return NextResponse.json({ error: "Geçmiş yüklenemedi" }, { status: 500 });
    }
}

// POST — Sınav sonucunu kaydet
export async function POST(req: NextRequest) {
    try {
        const user = await resolveUser(req);
        if (!user) return NextResponse.json({ error: "Yetkilendirme gerekli." }, { status: 401 });

        const body = await req.json();
        const { category, totalQuestions, correct, wrong, blank, netScore, estimatedPoint, timeSpentSeconds } = body;

        if (!category || totalQuestions == null || correct == null) {
            return NextResponse.json({ error: "Eksik veri" }, { status: 400 });
        }

        const record = await prisma.kpssExamHistory.create({
            data: {
                userId: user.id,
                category,
                totalQuestions,
                correct,
                wrong,
                blank,
                netScore: netScore || 0,
                estimatedPoint: estimatedPoint || 0,
                timeSpentSeconds: timeSpentSeconds || 0,
            },
        });

        return NextResponse.json({ success: true, id: record.id });
    } catch (error) {
        console.error("KPSS history POST:", error);
        return NextResponse.json({ error: "Kayıt başarısız" }, { status: 500 });
    }
}
