import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/report
 * Body: { targetUserId, reason, messageId?, reporterId? }
 *
 * Flutter'dan mesaj şikayeti göndermek için kullanılır.
 * Authorization: Token <userId> header'ı veya body'de reporterId ile çalışır.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { targetUserId, reason, messageId } = body;

        // Şikayet eden kullanıcıyı tespit et
        let reporterId = body.reporterId;
        if (!reporterId) {
            const auth = req.headers.get("authorization");
            if (auth) {
                const parts = auth.split(" ");
                reporterId = parts.length === 2 ? parts[1] : auth;
            }
        }

        if (!reporterId) {
            return NextResponse.json(
                { error: "Kimlik doğrulama gerekli" },
                { status: 401 }
            );
        }

        if (!targetUserId || !reason) {
            return NextResponse.json(
                { error: "targetUserId ve reason gerekli" },
                { status: 400 }
            );
        }

        // Kullanıcıların varlığını kontrol et
        const [reporter, target] = await Promise.all([
            prisma.user.findUnique({ where: { id: reporterId }, select: { id: true } }),
            prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } }),
        ]);

        if (!reporter) {
            return NextResponse.json(
                { error: "Şikayet eden kullanıcı bulunamadı", reauth: true },
                { status: 401 }
            );
        }

        if (!target) {
            return NextResponse.json(
                { error: "Şikayet edilen kullanıcı bulunamadı" },
                { status: 404 }
            );
        }

        // Şikayeti kaydet — MessageReport tablosu (ayrı tablo, Report tablosuyla karışmasın)
        // Eğer MessageReport tablosu yoksa, genel bir JSON log tutarız
        // Önce MessageReport tablosu var mı kontrol et
        let report;
        try {
            // Doğrudan admin reports tablosuna genel bir şikayet kaydı oluştur
            // Not: Mevcut Report modeli BecayisListing'e bağlı, bu yüzden ayrı bir yaklaşım
            report = await prisma.$queryRaw`
                INSERT INTO "Report" (id, "reporterId", "reportedAdId", reason, status, "createdAt")
                VALUES (
                    ${`msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`},
                    ${reporterId},
                    ${messageId || `user_${targetUserId}`},
                    ${`[MESAJ ŞİKAYETİ] Hedef: ${targetUserId} | Sebep: ${reason}${messageId ? ` | Mesaj ID: ${messageId}` : ""}`},
                    'pending',
                    NOW()
                )
                RETURNING id, reason, status, "createdAt"
            `;
        } catch {
            // Report tablosu farklı yapıdaysa fallback — admin log'a yaz
            report = await prisma.adminLog.create({
                data: {
                    adminId: reporterId,
                    action: "MESSAGE_REPORT",
                    targetType: "USER",
                    targetId: targetUserId,
                    details: JSON.stringify({
                        reason,
                        messageId: messageId || null,
                        reporterId,
                        targetUserId,
                        timestamp: new Date().toISOString(),
                    }),
                },
            });
        }

        console.log(`[Report] Mesaj şikayeti: ${reporterId} → ${targetUserId} | Sebep: ${reason}`);

        return NextResponse.json({
            success: true,
            message: "Şikayetiniz alındı. En kısa sürede incelenecektir.",
            reportId: typeof report === "object" && report !== null && "id" in report
                ? (report as { id: string }).id
                : Array.isArray(report) && report.length > 0
                    ? (report[0] as { id: string }).id
                    : undefined,
        });
    } catch (error) {
        console.error("Report error:", error);
        return NextResponse.json(
            { error: "Şikayet gönderilemedi" },
            { status: 500 }
        );
    }
}
