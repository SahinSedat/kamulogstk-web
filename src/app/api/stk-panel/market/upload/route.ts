import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Desteklenmeyen dosya tipi. Sadece JPG, JPEG, PNG ve PDF kabul edilir." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Dosya boyutu 25MB'ı geçemez." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "pdf";
    const filename = `receipt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "receipts");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    const url = `/uploads/receipts/${filename}`;

    return NextResponse.json({ success: true, url, message: "✅ Dekont yüklendi!" });
  } catch (error) {
    console.error("[Receipt Upload]:", error);
    return NextResponse.json({ error: "Dosya yükleme hatası" }, { status: 500 });
  }
}
