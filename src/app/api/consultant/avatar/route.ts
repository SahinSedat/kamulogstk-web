import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const userId = formData.get("userId") as string;
        const file = formData.get("avatar") as File;

        if (!userId) return NextResponse.json({ error: "userId gerekli" }, { status: 400 });
        if (!file) return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });

        // Consultant kontrolü
        const consultant = await prisma.consultant.findFirst({ where: { userId } });
        if (!consultant) return NextResponse.json({ error: "Danışman bulunamadı" }, { status: 404 });

        // Dosya boyutu kontrolü (5MB max)
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        if (buffer.length > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "Dosya boyutu 5MB'ı aşamaz" }, { status: 400 });
        }

        // Dosya uzantısı kontrolü
        const ext = path.extname(file.name).toLowerCase();
        if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
            return NextResponse.json({ error: "Sadece JPG, PNG veya WebP formatı destekleniyor" }, { status: 400 });
        }

        // Dosyayı kaydet
        const filename = `consultant-${consultant.id}-${Date.now()}${ext}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads", "consultants");
        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), buffer);

        const avatarUrl = `/uploads/consultants/${filename}`;

        // Veritabanı güncelle
        await prisma.consultant.update({
            where: { id: consultant.id },
            data: { avatarUrl },
        });

        return NextResponse.json({ success: true, avatarUrl });
    } catch (error) {
        console.error("Consultant avatar upload hatası:", error);
        return NextResponse.json({ error: "Yükleme başarısız" }, { status: 500 });
    }
}
