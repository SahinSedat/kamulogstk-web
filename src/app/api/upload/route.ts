import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_SIZE = 75 * 1024 * 1024; // 75MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = (formData.get("type") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Dosya boyutu 75MB'ı aşamaz" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    const allowed = [".pdf", ".jpg", ".jpeg", ".png", ".docx", ".webp"];
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: `Desteklenmeyen dosya formatı: ${ext}. İzin verilen: ${allowed.join(", ")}` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", type);
    
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    const url = `/uploads/${type}/${filename}`;
    return NextResponse.json({ success: true, url, filename, size: file.size });
  } catch (error: any) {
    console.error("[Upload API]:", error);
    return NextResponse.json({ error: "Dosya yüklenirken hata oluştu" }, { status: 500 });
  }
}
