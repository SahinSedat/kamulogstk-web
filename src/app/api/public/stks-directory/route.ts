import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const stks = await prisma.sTKOrganization.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { city: { contains: search, mode: "insensitive" } }
        ]
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        logo: true,
        city: true,
        description: true,
        annualDuesAmount: true,
        monthlyDuesAmount: true,
        registrationNumber: true,
        facebookUrl: true,
        twitterUrl: true,
        instagramUrl: true,
        whatsappGroupUrl: true,
        telegramUrl: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: stks });
  } catch (error) {
    console.error("STK Directory API Error:", error);
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
