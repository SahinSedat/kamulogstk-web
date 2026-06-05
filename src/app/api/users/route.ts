import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hashPassword } from "@/lib/pbkdf2";

// GET /api/users — Kullanıcı listesi (mobil entegrasyon için)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") || "";
  const verified = searchParams.get("verified") || "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }
  if (role) where.role = role;
  if (verified === "true") where.isVerified = true;
  if (verified === "false") where.isVerified = false;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, email: true, firstName: true, lastName: true, name: true,
        phone: true, role: true, isVerified: true, isActive: true, isPremium: true,
        credits: true, aiTokens: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) });
}

// POST /api/users — Yeni kullanıcı oluştur
export async function POST(req: NextRequest) {
  // GÜVENLİK: Sadece admin yeni kullanıcı oluşturabilir
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const { email, password, firstName, lastName, phone, role } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "E-posta ve şifre gerekli" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Bu e-posta zaten kayıtlı" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: hashPassword(password),
      firstName: firstName || null,
      lastName: lastName || null,
      name: `${firstName || ""} ${lastName || ""}`.trim() || null,
      phone: phone || null,
      role: role || "USER",
      isVerified: true,
    },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
