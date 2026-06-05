import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/notifications/mark-read
 * Kullanıcının bildirimlerini okundu olarak işaretle.
 * Body: { notificationId?: string } — boşsa TÜM bildirimleri okundu yapar.
 */
export async function PATCH(req: NextRequest) {
    try {
        // ── Auth
        const auth = req.headers.get("authorization");
        if (!auth) {
            return NextResponse.json({ error: "Yetkilendirme gerekli.", reauth: true }, { status: 401 });
        }
        const parts = auth.split(" ");
        const token = parts.length === 2 ? parts[1] : auth;

        let userId = "";
        const user = await prisma.user.findUnique({ where: { id: token }, select: { id: true } });
        if (user) {
            userId = user.id;
        } else {
            const phoneHeader = req.headers.get("x-user-phone");
            if (phoneHeader) {
                const phoneUser = await prisma.user.findFirst({
                    where: { OR: [{ phone: phoneHeader }, { phoneNumber: phoneHeader }] },
                    select: { id: true },
                });
                if (phoneUser) userId = phoneUser.id;
            }
        }

        if (!userId) {
            return NextResponse.json({ error: "Kullanıcı bulunamadı.", reauth: true }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { notificationId } = body as { notificationId?: string };

        if (notificationId) {
            // Tek bildirim okundu
            await prisma.notification.updateMany({
                where: { id: notificationId, userId },
                data: { isRead: true },
            });

            return NextResponse.json({ success: true, message: "Bildirim okundu olarak işaretlendi." });
        } else {
            // Tüm bildirimler okundu
            const result = await prisma.notification.updateMany({
                where: { userId, isRead: false },
                data: { isRead: true },
            });

            return NextResponse.json({
                success: true,
                message: `${result.count} bildirim okundu olarak işaretlendi.`,
                count: result.count,
            });
        }
    } catch (error) {
        console.error("[notifications/mark-read] Hata:", error);
        return NextResponse.json({ error: "Bildirim işaretlenirken hata oluştu." }, { status: 500 });
    }
}
