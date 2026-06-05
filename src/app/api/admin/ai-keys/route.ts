import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ─── Admin Yetki Kontrolü ───────────────────────────────
async function checkAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") return false;
  return true;
}

/**
 * GET /api/admin/ai-keys
 * Tüm API anahtarlarını listeler (anahtarlar maskelenmiş gösterilir)
 */
export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const keys = await prisma.apiKey.findMany({
    orderBy: [{ provider: "asc" }, { priority: "asc" }],
  });

  // Anahtarları maskele (ilk 8 + son 4 karakter göster)
  const masked = keys.map((k) => ({
    ...k,
    maskedKey: k.key.length > 12
      ? k.key.substring(0, 8) + "..." + k.key.substring(k.key.length - 4)
      : "****",
  }));

  return NextResponse.json({ keys: masked });
}

/**
 * POST /api/admin/ai-keys
 * Yeni API anahtarı ekler
 */
export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await req.json();
  const { provider, key, label, priority } = body;

  if (!provider || !key) {
    return NextResponse.json(
      { error: "provider ve key zorunludur" },
      { status: 400 }
    );
  }

  const created = await prisma.apiKey.create({
    data: {
      provider: provider.toUpperCase(),
      key,
      label: label || null,
      priority: priority ?? 0,
      status: "ACTIVE",
    },
  });

  return NextResponse.json({ success: true, id: created.id });
}

/**
 * PUT /api/admin/ai-keys
 * Mevcut anahtarı günceller (status, priority, label)
 */
export async function PUT(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await req.json();
  const { id, status, priority, label } = body;

  if (!id) {
    return NextResponse.json({ error: "id zorunludur" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (priority !== undefined) data.priority = priority;
  if (label !== undefined) data.label = label;

  await prisma.apiKey.update({
    where: { id },
    data,
  });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/ai-keys
 * Anahtarı siler
 */
export async function DELETE(req: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id zorunludur" }, { status: 400 });
  }

  await prisma.apiKey.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
