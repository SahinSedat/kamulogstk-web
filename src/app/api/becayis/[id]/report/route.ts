import { createAdminNotification } from "@/lib/services/adminNotificationService";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * resolveUser — Authorization: Token <userId>
 */
async function resolveUser(req: NextRequest | Request) {
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

/**
 * POST /api/becayis/[id]/report — İlan şikayeti
 *
 * Body: { reason: string }
 * Sebepler: "Uygunsuz İçerik", "Spam", "Yanıltıcı Bilgi", "Kişisel Veri İhlali", "Diğer"
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await resolveUser(req);

        if (!user) {
            return NextResponse.json(
                { error: "Yetkilendirme gerekli.", reauth: true },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { reason } = body;

        if (!reason || typeof reason !== "string" || reason.trim().length < 2) {
            return NextResponse.json(
                { error: "Şikayet sebebi gereklidir." },
                { status: 400 }
            );
        }

        // İlan var mı?
        const listing = await prisma.becayisListing.findUnique({
            where: { id },
            select: { id: true, ownerId: true },
        });

        if (!listing) {
            return NextResponse.json(
                { error: "İlan bulunamadı." },
                { status: 404 }
            );
        }

        // Kendi ilanını şikayet edemez
        if (listing.ownerId === user.id) {
            return NextResponse.json(
                { error: "Kendi ilanınızı şikayet edemezsiniz." },
                { status: 400 }
            );
        }

        // Daha önce şikayet etmiş mi?
        const existing = await prisma.report.findFirst({
            where: {
                reporterId: user.id,
                reportedAdId: id,
            },
        });

        if (existing) {
            return NextResponse.json({
                success: true,
                message: "Bu ilanı zaten şikayet ettiniz.",
                action: "already_reported",
            });
        }

        await prisma.report.create({
            data: {
                reporterId: user.id,
                reportedAdId: id,
                reason: reason.trim(),
            },
        });

        return NextResponse.json({
            success: true,
            message: "Şikayetiniz alındı. En kısa sürede incelenecek.",
            action: "reported",
        });
    } catch (error) {
        console.error("Report POST error:", error);
        return NextResponse.json(
            { error: "Şikayet gönderilirken bir hata oluştu." },
            { status: 500 }
        );
    }
}
