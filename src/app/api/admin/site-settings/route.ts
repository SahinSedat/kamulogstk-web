import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/admin/site-settings — Anahtar-değer ayarını güncelle
export async function POST(req: NextRequest) {
  const { key, value } = await req.json();
  if (!key || value === undefined) {
    return NextResponse.json({ error: "key ve value gerekli" }, { status: 400 });
  }

  const setting = await prisma.siteSettings.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });

  return NextResponse.json(setting);
}

// GET /api/admin/site-settings?key=xxx — Tek ayar oku
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    const all = await prisma.siteSettings.findMany({ orderBy: { key: "asc" } });
    return NextResponse.json(all);
  }
  const setting = await prisma.siteSettings.findUnique({ where: { key } });
  return NextResponse.json(setting || { key, value: null });
}
