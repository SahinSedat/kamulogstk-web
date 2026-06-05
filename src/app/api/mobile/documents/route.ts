import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [tisDocuments, tisFiles] = await Promise.all([
      prisma.tISDocument.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.tISFile.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      tisDocuments,
      tisFiles,
      total: tisDocuments.length + tisFiles.length,
    });
  } catch (error: any) {
    console.error("[mobile/documents] Hata:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
