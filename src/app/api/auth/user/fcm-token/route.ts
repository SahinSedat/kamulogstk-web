import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/user/fcm-token
 * Kullanıcının Firebase Cloud Messaging cihaz token'ını kaydet.
 * Body: { "token": "fcm-device-token-xyz..." }
 */
export async function POST(req: NextRequest) {
    try {
        // ── Auth
        const auth = req.headers.get("authorization");
        if (!auth) {
            return NextResponse.json({ error: "Yetkilendirme gerekli.", reauth: true }, { status: 401 });
        }
        const parts = auth.split(" ");
        const tokenVal = parts.length === 2 ? parts[1] : auth;

        // Kullanıcıyı bul
        let userId = "";
        const user = await prisma.user.findUnique({ where: { id: tokenVal }, select: { id: true } });
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

        const body = await req.json();
        const { token } = body as { token?: string };

        if (!token || typeof token !== "string" || token.length < 10) {
            return NextResponse.json({ error: "Geçerli bir FCM token gerekli." }, { status: 400 });
        }

        // FCM Token'ı kullanıcıya kaydet
        await prisma.user.update({
            where: { id: userId },
            data: { fcmToken: token },
        });

        return NextResponse.json({ success: true, message: "FCM token kaydedildi." });
    } catch (error) {
        console.error("[fcm-token] Hata:", error);
        return NextResponse.json({ error: "FCM token kaydedilirken hata oluştu." }, { status: 500 });
    }
}
