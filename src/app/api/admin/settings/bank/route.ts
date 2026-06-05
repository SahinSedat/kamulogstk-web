import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BANK_KEYS = ["bankName", "bankIban", "bankAccountHolder", "paymentDescription", "commissionRate"] as const;

async function getBankSettings() {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: [...BANK_KEYS] } },
  });
  const result: Record<string, string> = {};
  for (const k of BANK_KEYS) {
    result[k] = settings.find(s => s.key === k)?.value || "";
  }
  return result;
}

// GET — Banka ayarlarını getir (STK panelden de çağrılabilir)
export async function GET() {
  const settings = await getBankSettings();
  return NextResponse.json({ success: true, data: settings });
}

// PATCH — Banka ayarlarını güncelle (sadece ADMIN)
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  for (const key of BANK_KEYS) {
    if (body[key] !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(body[key]) },
        create: { key, value: String(body[key]) },
      });
    }
  }

  return NextResponse.json({ success: true, message: "✅ Banka ayarları güncellendi!" });
}
