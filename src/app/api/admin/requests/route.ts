import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/admin/requests — Danışman talep listesi
export async function GET(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status && status !== "all") where.status = status;

  const [requests, total] = await Promise.all([
    prisma.consultationRequest.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.consultationRequest.count({ where }),
  ]);

  // Danışman bilgisini ayrıca çek
  const enriched = await Promise.all(
    requests.map(async (r) => {
      const consultant = await prisma.consultant.findUnique({
        where: { id: r.consultantId },
        select: { id: true, name: true, avatarUrl: true, title: true },
      });
      return { ...r, consultant };
    })
  );

  return NextResponse.json({
    success: true,
    data: enriched,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// PATCH /api/admin/requests — Talep durumunu güncelle
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { requestId, status } = await req.json();
  if (!requestId || !status) {
    return NextResponse.json({ error: "requestId ve status gerekli" }, { status: 400 });
  }

  const updated = await prisma.consultationRequest.update({
    where: { id: requestId },
    data: { status },
  });

  return NextResponse.json({ success: true, data: updated });
}
