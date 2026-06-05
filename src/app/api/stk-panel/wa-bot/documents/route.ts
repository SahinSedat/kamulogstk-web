import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

// Next.js body size limit — 200MB dosya yükleme
export const config = {
  api: { bodyParser: false },
};

export const maxDuration = 60; // 60 saniye timeout

// GET — STK'nın bot dosyalarını listele
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER")
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

    const docs = await prisma.sTKBotDocument.findMany({
      where: { stkId: stk.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: docs });
  } catch (e) {
    console.error("[BotDocs GET]:", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST — Yeni dosya yükle (multipart/form-data)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER")
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const file = formData.get("file") as File;

    if (!title || !description || !file)
      return NextResponse.json({ error: "Başlık, açıklama ve dosya zorunludur" }, { status: 400 });

    // 200MB limit
    if (file.size > 200 * 1024 * 1024)
      return NextResponse.json({ error: "Dosya 200MB limitini aşıyor" }, { status: 400 });

    // Dosyayı kaydet
    const uploadDir = path.join(process.cwd(), "public", "uploads", "bot-docs", stk.id);
    await mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name) || ".bin";
    const safeName = `doc_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, safeName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/bot-docs/${stk.id}/${safeName}`;

    const doc = await prisma.sTKBotDocument.create({
      data: { title, description, fileUrl, fileName: file.name, fileSize: file.size, stkId: stk.id },
    });

    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (e) {
    console.error("[BotDocs POST]:", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE — Dosya sil
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER")
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "STK bulunamadı" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

    const doc = await prisma.sTKBotDocument.findFirst({ where: { id, stkId: stk.id } });
    if (doc) {
      // Dosyayı diskten sil
      try { await unlink(path.join(process.cwd(), "public", doc.fileUrl)); } catch {}
      await prisma.sTKBotDocument.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[BotDocs DELETE]:", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
