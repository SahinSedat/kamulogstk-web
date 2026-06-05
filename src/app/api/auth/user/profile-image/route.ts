import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

/**
 * Profil fotoğrafı yükleme route.
 * Flutter `Authorization: Token <userId>` gönderir.
 */

async function resolveUser(req: Request) {
    const auth = req.headers.get("authorization");
    if (!auth) return null;

    const parts = auth.split(" ");
    const token = parts.length === 2 ? parts[1] : auth;
    if (!token) return null;

    let user = await prisma.user.findUnique({ where: { id: token } });
    if (user) return user;

    const phoneHeader = req.headers.get("x-user-phone");
    if (phoneHeader) {
        user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: phoneHeader },
                    { phoneNumber: phoneHeader },
                ],
            },
        });
        if (user) return user;
    }

    return null;
}

// POST — Profil fotoğrafı yükle (base64)
export async function POST(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json(
                { error: "Kullanıcı bulunamadı.", reauth: true },
                { status: 401 }
            );
        }

        const { imageBase64 } = await req.json();

        if (!imageBase64) {
            return NextResponse.json(
                { error: "Fotoğraf verisi gerekli." },
                { status: 400 }
            );
        }

        // Upload dizinini oluştur
        const uploadDir = path.join(
            process.cwd(),
            "public",
            "uploads",
            "profiles"
        );
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Base64'ü dosyaya kaydet
        const buffer = Buffer.from(imageBase64, "base64");
        const fileName = `${user.id}_${Date.now()}.jpg`;
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);

        // Eski fotoğrafı sil (avatarUrl'den)
        if (
            user.avatarUrl &&
            user.avatarUrl.startsWith("/uploads/profiles/")
        ) {
            const oldPath = path.join(process.cwd(), "public", user.avatarUrl);
            if (fs.existsSync(oldPath)) {
                try {
                    fs.unlinkSync(oldPath);
                } catch {
                    /* ignore */
                }
            }
        }

        // Veritabanında avatarUrl güncelle
        const publicPath = `/uploads/profiles/${fileName}`;
        await prisma.user.update({
            where: { id: user.id },
            data: { avatarUrl: publicPath },
        });

        return NextResponse.json({
            success: true,
            avatarUrl: `https://kamulog.net${publicPath}`,
            token: (await import("@/lib/auth-helpers")).signToken(user.id),
            message: "Profil fotoğrafı güncellendi.",
        });
    } catch (error: unknown) {
        const msg =
            error instanceof Error ? error.message : "Sunucu hatası";
        console.error("Profile image upload error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
