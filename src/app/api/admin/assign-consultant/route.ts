import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST — Admin bir kullanıcıyı danışman olarak atar
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ success: false, error: "Bu işlem için admin yetkisi gerekli." }, { status: 403 });
        }

        const body = await request.json();
        const { userId, name, title, category, bio, specializations } = body;

        if (!userId || !name || !title || !category) {
            return NextResponse.json({
                success: false,
                error: "userId, name, title ve category zorunludur.",
            }, { status: 400 });
        }

        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
            return NextResponse.json({ success: false, error: "Kullanıcı bulunamadı." }, { status: 404 });
        }

        const existingConsultant = await prisma.consultant.findFirst({
            where: { userId },
        });

        if (existingConsultant) {
            return NextResponse.json({
                success: false,
                error: "Bu kullanıcı zaten danışman olarak atanmış.",
            }, { status: 409 });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { role: "CONSULTANT" },
        });

        const consultant = await prisma.consultant.create({
            data: {
                userId,
                name,
                title,
                category,
                bio: bio || "",
                specializations: specializations || [],
                isActive: true,
            },
        });

        return NextResponse.json({
            success: true,
            consultant,
            message: `${name} başarıyla danışman olarak atandı.`,
        }, { status: 201 });

    } catch (error: any) {
        console.error("Assign consultant error:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Sunucu hatası.",
        }, { status: 500 });
    }
}

// GET — Tüm danışmanları listele (admin)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ success: false, error: "Admin yetkisi gerekli." }, { status: 403 });
        }

        const consultants = await prisma.consultant.findMany({
            include: {
                _count: { select: { reviews: true, consultantConversations: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ success: true, consultants });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
