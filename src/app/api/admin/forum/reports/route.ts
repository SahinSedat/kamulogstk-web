import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN","MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const reports = await prisma.forumReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      topic: { select: { id: true, title: true, slug: true, authorName: true, authorId: true } },
      post: { select: { id: true, content: true, authorName: true, authorId: true } },
    },
  });
  // Reporter bilgilerini çek
  const reporterIds = [...new Set(reports.map(r => r.reporterId))];
  const reporters = await prisma.user.findMany({
    where: { id: { in: reporterIds } },
    select: { id: true, name: true, email: true },
  });
  const reporterMap = Object.fromEntries(reporters.map(u => [u.id, u]));

  const enriched = reports.map(r => ({
    ...r,
    reporter: reporterMap[r.reporterId] || { name: "Bilinmiyor", email: "" },
  }));
  return NextResponse.json({ success: true, data: enriched });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN","MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ error: "id ve status gerekli" }, { status: 400 });
  const updated = await prisma.forumReport.update({ where: { id }, data: { status } });
  return NextResponse.json({ success: true, data: updated });
}
