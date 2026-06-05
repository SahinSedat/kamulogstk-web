import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * Türkçe karakterleri ASCII karşılıklarına çevirir
 */
function toAscii(str: string): string {
  const map: Record<string, string> = {
    'ğ': 'g', 'Ğ': 'G', 'ü': 'u', 'Ü': 'U',
    'ş': 's', 'Ş': 'S', 'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C',
    'â': 'a', 'Â': 'A', 'î': 'i', 'Î': 'I',
  };
  return str.replace(/[ğĞüÜşŞıİöÖçÇâÂîÎ]/g, (c) => map[c] || c);
}

/**
 * POST /api/stories/upload — Story görseli yükleme
 * FormData: file (JPG, JPEG, PNG, WEBP)
 * Returns: { fileUrl, fileName, fileSize }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Dosya seçilmedi" }, { status: 400 });
    }

    // Dosya uzantısı kontrolü
    const ext = path.extname(file.name).toLowerCase();
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    if (!allowed.includes(ext)) {
      return NextResponse.json(
        { error: `Geçersiz dosya formatı. Desteklenen: ${allowed.join(", ")}` },
        { status: 400 }
      );
    }

    // Dosya boyutu kontrolü (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Dosya boyutu 10MB'dan büyük olamaz." }, { status: 400 });
    }

    // Dosya adını ASCII-güvenli yap
    const baseName = path.basename(file.name, ext);
    const asciiName = toAscii(baseName)
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/__+/g, "_")
      .replace(/^_|_$/g, "");

    const timestamp = Date.now();
    const fileName = `${timestamp}_${asciiName}${ext}`;

    // Dizini oluştur
    const uploadDir = path.join(process.cwd(), "public", "media", "stories");
    await mkdir(uploadDir, { recursive: true });

    // Dosyayı kaydet
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // URL
    const fileUrl = `https://kamulog.net/media/stories/${fileName}`;

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: buffer.length,
    });
  } catch (error: any) {
    console.error("[stories/upload]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
