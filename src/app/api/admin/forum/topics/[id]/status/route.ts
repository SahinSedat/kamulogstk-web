import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * PUT /api/admin/forum/topics/[id]/status
 * Konu durumunu güncelle (OPEN, LOCKED, HIDDEN, DELETED)
 */
export async function PUT(req: NextRequest, {
 params }: { params: Promise<{ id: string }> }) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!["OPEN", "LOCKED", "HIDDEN", "DELETED"].includes(status)) {
      return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
    }

    const topic = await prisma.forumTopic.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, data: topic });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
