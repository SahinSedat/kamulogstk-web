import bcrypt from "bcryptjs";
import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-compat";
import { authOptions } from "@/lib/auth-compat";
import { prisma } from "@/lib/prisma";


// GET /api/stk-panel/board — Yönetim kurulu üyelerini getir
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string; email?: string; name?: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const members = await prisma.sTKBoardMember.findMany({
      where: { stkId: stk.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    console.error("[STK Board GET]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST /api/stk-panel/board — Yeni kurul üyesi ekle
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string; email?: string; name?: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const body = await request.json();
    const { name, title, phone, email, tcKimlik, photoUrl } = body;

    if (!name || !title) {
      return NextResponse.json({ error: "Ad ve Unvan zorunludur" }, { status: 400 });
    }

    // ═══ DUPLICATE KONTROLÜ ═══
    const normalizedName = name.trim().toUpperCase();
    const existingBoard = await prisma.sTKBoardMember.findFirst({
      where: {
        stkId: stk.id,
        name: { equals: normalizedName, mode: 'insensitive' as any },
      },
    });
    if (existingBoard) {
      return NextResponse.json({ error: `"${name}" zaten yönetim kurulunda kayıtlı.` }, { status: 409 });
    }

    const member = await prisma.sTKBoardMember.create({
      data: {
        id: `brd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        stkId: stk.id,
        name,
        title,
        phone: phone || null,
        email: email || null,
        tcKimlik: tcKimlik || null,
        photoUrl: photoUrl || null,
        updatedAt: new Date(),
      },
    });

    // --- OTO-SENKRONİZASYON (USER & MEMBER) ---
    if (phone || email) {
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;

      // Telefon normalizasyonu: +90, 0 prefix'lerini temizle, 905XXXXXXXXX formatına çevir
      const normalizePhone = (p: string) => {
        const digits = p.replace(/\D/g, '');
        if (digits.startsWith('90') && digits.length === 12) return digits; // 905XXXXXXXXX
        if (digits.startsWith('0') && digits.length === 11) return '9' + digits; // 05XX → 905XX
        if (digits.length === 10) return '90' + digits; // 5XX → 905XX
        return digits;
      };
      const normalizedPhone = phone ? normalizePhone(phone) : null;

      let userId = null;
      // Tüm olası telefon formatlarıyla ara
      const phoneVariants = normalizedPhone ? [
        { phone: normalizedPhone },
        { phone: '+' + normalizedPhone },
        { phone: '0' + normalizedPhone.slice(2) },
      ] : [];
      const existingUser = await prisma.user.findFirst({
        where: { OR: [ ...phoneVariants, ...(email ? [{ email }] : []) ] }
      });
      
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const dummyPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);
        try {
          const newUser = await prisma.user.create({
            data: {
              phone: normalizedPhone || undefined,
              email: email || undefined,
              password: dummyPassword,
              name, firstName, lastName, role: "USER", isVerified: false
            }
          });
          userId = newUser.id;
        } catch(e) { console.error("Board sync user error", e); }
      }

      const existingMember = await prisma.member.findFirst({
        where: { stkId: stk.id, OR: [ ...(phone ? [{ phone }] : []), ...(email ? [{ email }] : []), ...(tcKimlik ? [{ tcKimlik }] : []) ] }
      });
      
      if (existingMember) {
        if (existingMember.status !== 'ACTIVE' || !existingMember.userId) {
          await prisma.member.update({
            where: { id: existingMember.id },
            data: { status: 'ACTIVE', userId: userId || existingMember.userId }
          });
        }
      } else {
        try {
          await prisma.member.create({
            data: {
              stkId: stk.id, userId: userId, name: firstName, surname: lastName,
              phone: phone || "0000000000", email: email || `no-email-${Date.now()}-${Math.random().toString(36).substring(2,7)}@kamulog.com`, tcKimlik: tcKimlik || null, status: 'ACTIVE', category: 'ASIL'
            }
          });
        } catch(e) { console.error("Board sync member error", e); }
      }
    }
    // ------------------------------------------

    
    try { await prisma.auditLog.create({ data: { action: "CREATE_BOARD_MEMBER" as any, entityType: "STKBoardMember", entityId: member.id, userId: user?.id || "", userEmail: user?.email || "", userName: user?.name || "", description: `BOARD_MEMBER oluşturuldu`, stkId: stk?.id || "" } }); } catch {}
    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (error) {
    console.error("[STK Board POST]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE /api/stk-panel/board?id=xxx — Kurul üyesi sil
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string; email?: string; name?: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

    await prisma.sTKBoardMember.delete({ where: { id } });
    
    try { await prisma.auditLog.create({ data: { action: "DELETE_BOARD_MEMBER" as any, entityType: "STKBoardMember", entityId: "deleted", userId: user?.id || "", userEmail: user?.email || "", userName: user?.name || "", description: `BOARD_MEMBER silindi`, stkId: stk?.id || "" } }); } catch {}
    return NextResponse.json({ success: true, deleted: 1 });
  } catch (error) {
    console.error("[STK Board DELETE]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// PATCH /api/stk-panel/board?id=xxx — Kurul üyesi düzenle
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string; email?: string; name?: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

    const body = await request.json();
    const updateData: any = { updatedAt: new Date() };
    if (body.name) updateData.name = body.name;
    if (body.title) updateData.title = body.title;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.photoUrl !== undefined) updateData.photoUrl = body.photoUrl || null;

    const updated = await prisma.sTKBoardMember.update({ where: { id }, data: updateData });
    
    try { await prisma.auditLog.create({ data: { action: "UPDATE_BOARD_MEMBER" as any, entityType: "STKBoardMember", entityId: updated?.id || "", userId: user?.id || "", userEmail: user?.email || "", userName: user?.name || "", description: `BOARD_MEMBER güncellendi`, stkId: stk?.id || "" } }); } catch {}
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[STK Board PATCH]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
