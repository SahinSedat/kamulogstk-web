import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/admin/stories
 * Tüm story'leri listele (admin)
 */
export async function GET() {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    const stories = await prisma.story.findMany({
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ success: true, data: stories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/stories
 * Yeni story oluştur
 */
export async function POST(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, imageUrl, linkUrl, order, isActive, expiresAt } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl zorunludur" },
        { status: 400 }
      );
    }

    const story = await prisma.story.create({
      data: {
        title: title || null,
        imageUrl,
        linkUrl: linkUrl || null,
        order: order ?? 0,
        isActive: isActive ?? true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json({ success: true, data: story }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/stories?id=xxx
 * Story güncelle
 */
export async function PATCH(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id)
      return NextResponse.json(
        { error: "id parametresi gerekli" },
        { status: 400 }
      );

    const body = await req.json();
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    if (body.linkUrl !== undefined) updateData.linkUrl = body.linkUrl;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.expiresAt !== undefined)
      updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    const story = await prisma.story.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: story });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/stories?id=xxx
 * Story sil
 */
export async function DELETE(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id)
      return NextResponse.json(
        { error: "id parametresi gerekli" },
        { status: 400 }
      );

    await prisma.story.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
