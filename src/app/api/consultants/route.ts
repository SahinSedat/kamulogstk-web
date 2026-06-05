import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/consultants
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category") || "";
  const featured = searchParams.get("featured") || "";
  const online = searchParams.get("online") || "";

  const where: Record<string, unknown> = { isActive: true };
  if (category) where.category = category;
  if (featured === "true") where.isFeatured = true;
  if (online === "true") where.isOnline = true;

  const consultants = await prisma.consultant.findMany({
    where,
    orderBy: [{ isFeatured: "desc" }, { rating: "desc" }],
    include: {
      packages: { where: { isActive: true } },
      _count: { select: { reviews: true, consultantConversations: true } },
    },
  });

  return NextResponse.json(consultants);
}

// POST /api/consultants
export async function POST(req: NextRequest) {
  const body = await req.json();
  const consultant = await prisma.consultant.create({ data: body });
  return NextResponse.json(consultant, { status: 201 });
}
