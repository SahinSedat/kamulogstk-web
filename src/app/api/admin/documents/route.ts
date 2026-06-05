import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/admin/documents
 * Admin — tüm AppDocument'ları listeler.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    let documents = await prisma.appDocument.findMany({
      orderBy: { slug: "asc" },
    });

    // Eksik yasal belgeleri otomatik oluştur
    const requiredSlugs = [
      { slug: "privacy-policy", title: "Gizlilik Politikası" },
      { slug: "terms-of-service", title: "Kullanıcı Sözleşmesi" },
      { slug: "mesafeli-satis-sozlesmesi", title: "Mesafeli Satış Sözleşmesi" },
      { slug: "kvkk", title: "KVKK Aydınlatma Metni" },
    ];
    const existingSlugs = documents.map((d) => d.slug);
    const missingSlugs = requiredSlugs.filter((r) => !existingSlugs.includes(r.slug));
    if (missingSlugs.length > 0) {
      await Promise.all(
        missingSlugs.map((m) =>
          prisma.appDocument.create({
            data: { slug: m.slug, title: m.title, content: "" },
          })
        )
      );
      documents = await prisma.appDocument.findMany({ orderBy: { slug: "asc" } });
    }

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Admin documents list error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/documents
 * Admin — bir AppDocument'ı günceller.
 * Body: { id, title, content }
 */
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    const body = await req.json();
    const { id, title, content } = body;

    if (!id) {
      return NextResponse.json({ error: "Belge ID gerekli." }, { status: 400 });
    }

    const updated = await prisma.appDocument.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
      },
    });

    return NextResponse.json({ success: true, document: updated });
  } catch (error) {
    console.error("Admin document update error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
