import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/settings?key=becayis_listing_cost
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key")
  if (!key) {
    const all = await prisma.systemSetting.findMany()
    return NextResponse.json(all)
  }
  const setting = await prisma.systemSetting.findUnique({ where: { key } })
  return NextResponse.json(setting || { key, value: null })
}

// POST /api/settings — update setting
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const key = body.key
    const value = body.value
    if (!key || value === undefined) {
      return NextResponse.json({ error: "key ve value gerekli" }, { status: 400 })
    }
    const setting = await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    })
    return NextResponse.json(setting)
  } catch (error) {
    console.error("Settings API error:", error)
    return NextResponse.json({ error: "Ayar güncellenemedi" }, { status: 500 })
  }
}
