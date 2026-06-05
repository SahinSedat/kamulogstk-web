import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/users/search?q=email_or_phone_or_name
 * Admin panelden kullanıcı arama (bildirim gönderme + danışman ekleme için)
 * Birden fazla sonuç döndürür (max 10)
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q || q.length < 2) {
    return NextResponse.json({ error: "En az 2 karakter girin" }, { status: 400 });
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { name: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
      ],
      isActive: true,
      accountDeleted: false,
    },
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      fcmToken: true,
    },
    take: 10,
    orderBy: { name: "asc" },
  });

  // fcmToken bilgisini sadece var/yok olarak döndür (güvenlik)
  const safeUsers = users.map(u => ({
    ...u,
    hasFcmToken: !!u.fcmToken,
    fcmToken: undefined,
  }));

  // Geriye uyumluluk: tek sonuç da döndür
  return NextResponse.json({ 
    user: safeUsers[0] || null, 
    users: safeUsers 
  });
}
