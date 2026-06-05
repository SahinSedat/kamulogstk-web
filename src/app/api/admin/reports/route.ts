import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/reports — Tüm şikayetleri listele (admin)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "MODERATOR"].includes(session.user?.role as string)) {
            return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
        }
        const reports = await prisma.report.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                reporter: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        phoneNumber: true,
                    },
                },
                reportedAd: {
                    select: {
                        id: true,
                        title: true,
                        currentCity: true,
                        targetCity: true,
                        branch: true,
                        status: true,
                        adNumber: true,
                        isPremium: true,
                        owner: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true,
                                phoneNumber: true,
                                avatarUrl: true,
                                isPremium: true,
                                isActive: true,
                                accountFrozen: true,
                                city: true,
                                employmentType: true,
                                createdAt: true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json({ reports });
    } catch (error: unknown) {
        console.error("Admin reports GET error:", error);
        return NextResponse.json(
            { error: "Şikayetler yüklenemedi." },
            { status: 500 }
        );
    }
}

// PATCH /api/admin/reports — Şikayet durumunu güncelle
export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { reportId, status } = body;

        if (!reportId || !status) {
            return NextResponse.json(
                { error: "reportId ve status gerekli." },
                { status: 400 }
            );
        }

        const validStatuses = ["pending", "reviewed", "resolved", "dismissed"];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: `Geçersiz durum. Geçerli: ${validStatuses.join(", ")}` },
                { status: 400 }
            );
        }

        const updated = await prisma.report.update({
            where: { id: reportId },
            data: { status },
        });

        return NextResponse.json({
            message: "Şikayet durumu güncellendi.",
            report: updated,
        });
    } catch (error: unknown) {
        console.error("Admin reports PATCH error:", error);
        return NextResponse.json(
            { error: "Şikayet güncellenemedi." },
            { status: 500 }
        );
    }
}
