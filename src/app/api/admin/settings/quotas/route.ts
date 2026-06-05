import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

const QUOTA_KEYS = ["defaultSmsQuota", "defaultPushQuota", "defaultWhatsappQuota", "defaultEmailQuota"] as const;

// Key-value SystemSetting tablosundan kota değerlerini oku
async function getQuotas() {
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: [...QUOTA_KEYS] } },
  });
  const result: Record<string, number> = {};
  for (const k of QUOTA_KEYS) {
    const found = settings.find(s => s.key === k);
    result[k] = found ? parseInt(found.value) || 0 : 0;
  }
  return result;
}

// Key-value SystemSetting tablosuna kota değerlerini yaz
async function setQuotas(data: Record<string, number>) {
  for (const [key, value] of Object.entries(data)) {
    if (QUOTA_KEYS.includes(key as typeof QUOTA_KEYS[number])) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
  }
}

// GET — Mevcut varsayılan kotaları getir
export async function GET() {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quotas = await getQuotas();
  return NextResponse.json({ success: true, data: quotas });
}

// PATCH — Varsayılan kotaları güncelle
export async function PATCH(req: Request) {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, number> = {};
  for (const k of QUOTA_KEYS) {
    if (body[k] !== undefined) data[k] = parseInt(body[k]) || 0;
  }

  await setQuotas(data);
  return NextResponse.json({ success: true, data, message: "✅ Varsayılan kotalar güncellendi!" });
}

// POST — Mevcut tüm STK'lara hoşgeldin kotalarını dağıt
export async function POST() {
  const session = await checkAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quotas = await getQuotas();
  const stkCount = await prisma.sTKOrganization.count();

  if (stkCount === 0) {
    return NextResponse.json({ success: true, message: "Sistemde STK bulunamadı.", updated: 0 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};
  if (quotas.defaultSmsQuota > 0) updateData.smsCredits = { increment: quotas.defaultSmsQuota };
  if (quotas.defaultPushQuota > 0) updateData.pushCredits = { increment: quotas.defaultPushQuota };
  if (quotas.defaultWhatsappQuota > 0) updateData.whatsappCredits = { increment: quotas.defaultWhatsappQuota };
  if (quotas.defaultEmailQuota > 0) updateData.emailCredits = { increment: quotas.defaultEmailQuota };

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ success: false, error: "Tüm kotalar 0 — dağıtılacak bir şey yok." }, { status: 400 });
  }

  await prisma.sTKOrganization.updateMany({ data: updateData });

  console.log(`[Quotas] 🎁 ${stkCount} STK'ya hoşgeldin kotası dağıtıldı: SMS:${quotas.defaultSmsQuota}, Push:${quotas.defaultPushQuota}, WA:${quotas.defaultWhatsappQuota}, Email:${quotas.defaultEmailQuota}`);

  return NextResponse.json({
    success: true,
    message: `🎁 ${stkCount} STK'ya hoşgeldin kotası başarıyla yüklendi!`,
    updated: stkCount,
    quotas,
  });
}
