import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const stk = await prisma.sTKOrganization.findUnique({
      where: { slug },
      include: {
        STKBoardMember: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!stk) {
      return NextResponse.json({ error: "STK not found" }, { status: 404 });
    }

    if (stk.status !== "ACTIVE") {
      return NextResponse.json({ error: "Inactive STK" }, { status: 403 });
    }

    // Mobil için sadeleştirilmiş model döndür
    const members = stk.STKBoardMember.map(m => ({
      id: m.id,
      name: m.name,
      role: m.title || 'Üye',
      photoUrl: m.photoUrl ? (m.photoUrl.startsWith('/') ? `https://kamulogstk.net${m.photoUrl}` : m.photoUrl) : null,
    }));

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    console.error("Mobile Board fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
