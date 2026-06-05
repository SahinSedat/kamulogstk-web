import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function resolveUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const parts = auth.split(" ");
  const token = parts.length === 2 ? parts[1] : auth;
  if (!token) return null;
  return prisma.user.findUnique({
    where: { id: token },
    select: {
      id: true,
      notifEmail: true,
      notifWhatsapp: true,
      notifPush: true,
      notifSms: true,
    },
  });
}

// GET — Bildirim tercihlerini getir
export async function GET(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  return NextResponse.json({
    notifEmail: user.notifEmail,
    notifWhatsapp: user.notifWhatsapp,
    notifPush: user.notifPush,
    notifSms: user.notifSms,
  });
}

// PATCH — Bildirim tercihlerini güncelle
export async function PATCH(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = await req.json();
  const data: Record<string, boolean> = {};
  if (typeof body.notifEmail === "boolean") data.notifEmail = body.notifEmail;
  if (typeof body.notifWhatsapp === "boolean") data.notifWhatsapp = body.notifWhatsapp;
  if (typeof body.notifPush === "boolean") data.notifPush = body.notifPush;
  if (typeof body.notifSms === "boolean") data.notifSms = body.notifSms;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Güncellenecek tercih yok" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: {
      notifEmail: true,
      notifWhatsapp: true,
      notifPush: true,
      notifSms: true,
    },
  });

  return NextResponse.json({ success: true, ...updated });
}
