import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/admin/forum/categories
 * Forum kategorilerini order'a göre sıralı getir
 */
export async function GET() {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  const categories = await prisma.forumCategory.findMany({
    // Admin panelde tum kategoriler gosterilir (aktif+pasif)
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ success: true, data: categories, count: categories.length });
}

/**
 * POST /api/admin/forum/categories
 * Yeni forum kategorisi ekle
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
    const { name, description, icon, color } = body;

    if (!name) {
      return NextResponse.json({ error: "name alanı zorunludur." }, { status: 400 });
    }

    let slug = slugify(name);

    // Slug çakışması kontrolü
    const existing = await prisma.forumCategory.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Sıra numarasını otomatik belirle (en sona ekle)
    const maxOrder = await prisma.forumCategory.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? 0) + 1;

    const category = await prisma.forumCategory.create({
      data: {
        name,
        slug,
        description: description || null,
        icon: icon || null,
        color: color || null,
        order: nextOrder,
      },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Bu isimde bir kategori zaten mevcut." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/forum/categories?id=xxx
 * Forum kategorisi güncelle
 */
export async function PATCH(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id parametresi gerekli" }, { status: 400 });

    const body = await req.json();
    const { name, description, icon, color, isActive, order } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      updateData.name = name;
      updateData.slug = slugify(name);
    }
    if (description !== undefined) updateData.description = description || null;
    if (icon !== undefined) updateData.icon = icon || null;
    if (color !== undefined) updateData.color = color || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (order !== undefined) updateData.order = order;

    const updated = await prisma.forumCategory.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Kategori bulunamadı." }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/forum/categories?id=xxx
 * Forum kategorisi sil (altında konu varsa engelle)
 */
export async function DELETE(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id parametresi gerekli" }, { status: 400 });

    // Cascade: önce konulara ait postları, sonra konuları, sonra kategoriyi sil
    const topics = await prisma.forumTopic.findMany({ where: { categoryId: id }, select: { id: true } });
    const topicIds = topics.map(t => t.id);

    if (topicIds.length > 0) {
      // Konulara ait tüm post'ları sil
      await prisma.forumPost.deleteMany({ where: { topicId: { in: topicIds } } });
      // Konuları sil
      await prisma.forumTopic.deleteMany({ where: { categoryId: id } });
    }

    await prisma.forumCategory.delete({ where: { id } });
    return NextResponse.json({ success: true, message: `Kategori ve ${topicIds.length} konu silindi.` });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Kategori bulunamadı." }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
