import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUser } from "@/lib/auth-helpers";

/**
 * POST /api/me/settings/deactivate
 * Hesap dondurma (Soft Delete).
 * Oturum açmış kullanıcının hesabını deaktive eder.
 */
export async function POST(req: Request) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = body.reason || null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isDeactivated: true,
        deactivatedAt: new Date(),
        deactivationReason: reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Hesabınız donduruldu. Tekrar giriş yaptığınızda otomatik olarak aktifleştirilecektir.",
    });
  } catch (error) {
    console.error("Deactivate error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
