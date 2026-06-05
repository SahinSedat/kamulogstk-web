import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !["ADMIN", "MODERATOR", "STK_MANAGER"].includes((session.user as any).role)) {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File;
        if (!file) return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const ext = path.extname(file.name) || ".jpg";
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads");

        await mkdir(uploadDir, { recursive: true });
        await writeFile(path.join(uploadDir, filename), buffer);

        return NextResponse.json({ success: true, url: `/uploads/${filename}` });
    } catch (error) {
        console.error("Upload hatası:", error);
        return NextResponse.json({ error: "Yükleme başarısız" }, { status: 500 });
    }
}
