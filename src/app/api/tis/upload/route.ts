import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { exec } from "child_process";

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
 * POST /api/tis/upload — TIS dosyası yükleme
 * FormData: file (PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG)
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
    const allowed = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: `Geçersiz dosya formatı. Desteklenen: ${allowed.join(", ")}` }, { status: 400 });
    }

    // Dosya adını ASCII-güvenli yap (Türkçe -> ASCII, özel karakter -> _)
    const baseName = path.basename(file.name, ext);
    const asciiName = toAscii(baseName)
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/__+/g, "_")
      .replace(/^_|_$/g, "");

    const timestamp = Date.now();
    const fileName = `${timestamp}_${asciiName}${ext}`;

    // Dizini oluştur
    const uploadDir = path.join(process.cwd(), "public", "media", "tis");
    await mkdir(uploadDir, { recursive: true });

    // Dosyayı kaydet
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // PDF ise arka planda OCR uygula (scan-based PDF'ler için text layer ekler)
    if (ext === ".pdf") {
      const ocrOutput = filePath + ".ocr";
      exec(
        `ocrmypdf -l tur --skip-text --output-type pdf "${filePath}" "${ocrOutput}" && mv "${ocrOutput}" "${filePath}"`,
        { timeout: 300000 }, // 5 dakika timeout
        (err, stdout, stderr) => {
          if (err) {
            console.error(`[tis/upload] OCR hatasi (${fileName}):`, stderr || err.message);
          } else {
            console.log(`[tis/upload] ✅ OCR tamamlandi: ${fileName}`);
          }
        }
      );
      console.log(`[tis/upload] 🔄 OCR arka planda baslatildi: ${fileName}`);
    }

        // URL — dosya adı zaten ASCII, encode gerekmez
    const fileUrl = `https://kamulog.net/media/tis/${fileName}`;

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: buffer.length,
    });
  } catch (error: any) {
    console.error("[tis/upload]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
