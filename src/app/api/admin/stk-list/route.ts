import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const stks = await prisma.sTKOrganization.findMany({
    select: { id: true, name: true },
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ success: true, data: stks });
}
