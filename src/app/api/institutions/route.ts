import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/institutions — Kurumları tüm alt kurumları ile birlikte döndür
export async function GET() {
  const institutions = await prisma.institution.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: {
      subInstitutions: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, institutionId: true },
      },
    },
  });
  return NextResponse.json(institutions);
}

// POST /api/institutions
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, order } = body;

  if (!name) {
    return NextResponse.json({ error: "Kurum adı gerekli" }, { status: 400 });
  }

  const existing = await prisma.institution.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "Bu kurum zaten mevcut" }, { status: 409 });
  }

  const institution = await prisma.institution.create({
    data: { name, order: order || 0 },
  });
  return NextResponse.json(institution, { status: 201 });
}
