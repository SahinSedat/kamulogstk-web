import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * PATCH /api/admin/forum/topics/featured
 * Body: { topicId, isFeatured }
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN","MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }
  const { topicId, isFeatured } = await req.json();
  if (!topicId) return NextResponse.json({ error: "topicId gerekli" }, { status: 400 });

  const updated = await prisma.forumTopic.update({
    where: { id: topicId },
    data: { isFeatured: Boolean(isFeatured) },
  });
  return NextResponse.json({ success: true, data: updated });
}
