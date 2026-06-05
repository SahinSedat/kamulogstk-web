import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/consultants/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const consultant = await prisma.consultant.findUnique({
    where: { id },
    include: {
      packages: true,
      reviews: { take: 10, orderBy: { createdAt: "desc" } },
      _count: { select: { reviews: true, consultantConversations: true } },
    },
  });
  if (!consultant) return NextResponse.json({ error: "Danışman bulunamadı" }, { status: 404 });
  return NextResponse.json(consultant);
}

// PATCH /api/consultants/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const consultant = await prisma.consultant.update({ where: { id }, data: body });
  return NextResponse.json(consultant);
}

// DELETE /api/consultants/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.consultant.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
