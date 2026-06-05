import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/public/documents/[slug]
 * Public endpoint — kimlik doğrulama gerektirmez.
 * privacy-policy veya terms-of-service slug'ı ile çağrılır.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const doc = await prisma.appDocument.findUnique({
      where: { slug },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Belge bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      title: doc.title,
      content: doc.content,
      updatedAt: doc.updatedAt,
    });
  } catch (error) {
    console.error("Public document fetch error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
