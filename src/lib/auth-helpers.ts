import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_dev_secret_change_me";
const JWT_EXPIRY = "30d"; // 30 gün

// ─── JWT Token Oluşturma ────────────────────────────────────
export function signToken(userId: string): string {
    return jwt.sign({ sub: userId, iat: Math.floor(Date.now() / 1000) }, JWT_SECRET, {
        expiresIn: JWT_EXPIRY,
    });
}

// ─── JWT Token Doğrulama ────────────────────────────────────
export function verifyToken(token: string): { sub: string } | null {
    try {
        const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
        return payload;
    } catch {
        return null;
    }
}

// ─── Kullanıcı Çözümleme (Geriye Uyumlu) ───────────────────
/**
 * Authorization header'dan kullanıcıyı çözer.
 * Önce JWT doğrulaması dener, başarısız olursa userId olarak dener.
 * En son x-user-phone fallback kullanır.
 *
 * Desteklenen formatlar:
 *   - Authorization: Bearer <jwt>    (yeni)
 *   - Authorization: Token <jwt>     (yeni - Flutter uyumlu)
 *   - Authorization: Token <userId>  (eski - geriye uyumlu)
 */
export async function resolveUser(req: Request | { headers: { get(name: string): string | null } }) {
    const auth = req.headers.get("authorization");
    if (!auth) return null;

    const parts = auth.split(" ");
    const token = parts.length > 1 ? parts[1] : parts[0];
    if (!token) return null;

    // 1. JWT doğrulaması dene
    const jwtPayload = verifyToken(token);
    if (jwtPayload?.sub) {
        const user = await prisma.user.findUnique({ where: { id: jwtPayload.sub } });
        if (user) return user;
    }

    // 2. Eski yöntem: doğrudan userId olarak dene (geriye uyumlu)
    const userById = await prisma.user.findUnique({ where: { id: token } });
    if (userById) return userById;

    // 3. Son çare: x-user-phone header'ı ile dene
    const phone = req.headers.get("x-user-phone");
    if (phone) {
        const userByPhone = await prisma.user.findFirst({
            where: { OR: [{ phone }, { phoneNumber: phone }] },
        });
        if (userByPhone) return userByPhone;
    }

    return null;
}
