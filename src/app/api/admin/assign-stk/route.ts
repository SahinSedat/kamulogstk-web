import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/pbkdf2";

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pass = "Kamulog-";
  for (let i = 0; i < 6; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Sadece Admin bu islemi yapabilir" }, { status: 403 });
  }

  try {
    const { userId, stkId } = await req.json();
    if (!userId || !stkId) {
      return NextResponse.json({ error: "userId ve stkId gerekli" }, { status: 400 });
    }

    const stkResult = await prisma.$queryRaw<Array<{id: string; name: string}>>`SELECT id, name FROM "STKOrganization" WHERE id = ${stkId} LIMIT 1`;
    if (!stkResult.length) return NextResponse.json({ error: "STK bulunamadi" }, { status: 404 });
    const stkName = stkResult[0].name;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } });
    if (!user) return NextResponse.json({ error: "Kullanici bulunamadi" }, { status: 404 });

    // Django uyumlu PBKDF2 hash
    const plainPassword = generatePassword();
    const hashedPassword = hashPassword(plainPassword);

    await prisma.$executeRaw`
      UPDATE "User" SET 
        role = 'STK_MANAGER', 
        password = ${hashedPassword}, 
        "managedStkId" = ${stkId},
        "updatedAt" = NOW()
      WHERE id = ${userId}
    `;

    await prisma.$executeRaw`UPDATE "STKOrganization" SET "managerId" = ${userId} WHERE id = ${stkId}`;

    return NextResponse.json({
      success: true,
      message: `${user.email} kullanicisi "${stkName}" STK yoneticisi olarak atandi`,
      credentials: { email: user.email, password: plainPassword, stkName },
    });
  } catch (error: any) {
    console.error("[ASSIGN-STK] Error:", error);
    return NextResponse.json({ error: error.message || "Sunucu hatasi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Sadece Admin bu islemi yapabilir" }, { status: 403 });
  }

  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId gerekli" }, { status: 400 });

    // Kullaniciyi normal USER'a geri cevir
    await prisma.$executeRaw`
      UPDATE "User" SET 
        role = 'USER', 
        "managedStkId" = NULL,
        "updatedAt" = NOW()
      WHERE id = ${userId}
    `;

    // STK'dan managerId'yi kaldir
    await prisma.$executeRaw`UPDATE "STKOrganization" SET "managerId" = NULL WHERE "managerId" = ${userId}`;

    return NextResponse.json({ success: true, message: "STK yetkisi kaldirildi" });
  } catch (error: any) {
    console.error("[REVOKE-STK] Error:", error);
    return NextResponse.json({ error: error.message || "Sunucu hatasi" }, { status: 500 });
  }
}
