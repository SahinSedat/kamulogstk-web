import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/stories
 * Aktif ve süresi dolmamış story'leri sıralı döndürür.
 */
export async function GET() {
  try {
    const now = new Date();

    const stories = await prisma.story.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        linkUrl: true,
        order: true,
      },
    });

    return NextResponse.json({ success: true, data: stories });
  } catch (error) {
    console.error("Public stories error:", error);
    return NextResponse.json({ success: true, data: [] });
  }
}
