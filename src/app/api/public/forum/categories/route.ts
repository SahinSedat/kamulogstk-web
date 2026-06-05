import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/forum/categories
 * Aktif forum kategorilerini sıralı getir (mobil vitrin)
 */
export async function GET() {
  const categories = await prisma.forumCategory.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      color: true,
      order: true,
      topicCount: true,
      postCount: true,
    },
  });

  return NextResponse.json({ success: true, data: categories });
}
