import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/marquee — Marquee ayarlarını getir
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'MODERATOR'].includes(session.user?.role || '')) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  }

  const [textSetting, enabledSetting] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { key: 'marquee_text' } }),
    prisma.siteSettings.findUnique({ where: { key: 'marquee_enabled' } }),
  ]);

  return NextResponse.json({
    text: textSetting?.value || '',
    enabled: enabledSetting?.value === 'true',
  });
}

// PUT /api/admin/marquee — Marquee ayarlarını güncelle
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'MODERATOR'].includes(session.user?.role || '')) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  }

  const body = await req.json();
  const { text, enabled } = body;

  await Promise.all([
    prisma.siteSettings.upsert({
      where: { key: 'marquee_text' },
      update: { value: text || '', updatedBy: session.user?.id },
      create: { key: 'marquee_text', value: text || '', updatedBy: session.user?.id },
    }),
    prisma.siteSettings.upsert({
      where: { key: 'marquee_enabled' },
      update: { value: String(enabled ?? false), updatedBy: session.user?.id },
      create: { key: 'marquee_enabled', value: String(enabled ?? false), updatedBy: session.user?.id },
    }),
  ]);

  // Piyasa fallback fiyatlarını kaydet
    if (body.goldPrice !== undefined) {
      await prisma.siteSettings.upsert({
        where: { key: "gold_price" },
        update: { value: String(body.goldPrice) },
        create: { key: "gold_price", value: String(body.goldPrice) },
      });
    }
    if (body.bist100Price !== undefined) {
      await prisma.siteSettings.upsert({
        where: { key: "bist100_price" },
        update: { value: String(body.bist100Price) },
        create: { key: "bist100_price", value: String(body.bist100Price) },
      });
    }

    return NextResponse.json({ success: true });
}
