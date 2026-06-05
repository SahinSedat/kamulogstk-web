import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-compat";
import { authOptions } from "@/lib/auth-compat";
import { prisma } from "@/lib/prisma";


// GET /api/stk-panel/profile — Dernek bilgileri + belgeler
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const organization = await prisma.sTKOrganization.findUnique({
      where: { id: stk.id },
      include: {
        STKDocument: { orderBy: { createdAt: "desc" } },
      },
    });

    // Gerçek üye sayısı (APPROVED başvurular + aktif üyeler)
    const approvedCount = await prisma.sTKApplication.count({ where: { stkId: stk.id, status: "APPROVED" } });
    const activeMembers = await prisma.member.count({ where: { stkId: stk.id, status: { not: "SUSPENDED" } } });
    const realMemberCount = approvedCount + activeMembers;

    // ═══ SELF-HEALING: STKOrganization.memberCount senkronizasyonu ═══
    // Mobil uygulama bu alanı okuyor — her zaman doğru olmalı
    if (organization && (organization as any).memberCount !== realMemberCount) {
      try {
        await prisma.sTKOrganization.update({ where: { id: stk.id }, data: { memberCount: realMemberCount } });
      } catch {}
    }

    // Profil doluluk oranı hesapla
    const org = organization as any;
    const fields = ["email","phone","website","city","district","address","description","iban","bankAccountName","taxNumber","kepAddress","mersisNo","registrationNumber","logo","consentText","contractPdfUrl","branchesPublic","activitiesPublic","decisionsPublic","chatPublic","chatDisabledForMembers","showSocialOnMobile"];
    const filled = fields.filter(f => org?.[f] && String(org[f]).trim() !== "").length;
    const docCount = org?.STKDocument?.length || 0;
    const profileCompletion = Math.min(100, Math.round(((filled + Math.min(docCount, 3)) / (fields.length + 3)) * 100));

    // Logo URL absolute
    const orgData = { ...organization } as any;
    if (orgData.logo && orgData.logo.startsWith("/")) {
      orgData.logo = `https://kamulogstk.net${orgData.logo}`;
    }
    return NextResponse.json({ success: true, data: { ...orgData, memberCount: realMemberCount, profileCompletion } });
  } catch (error) {
    console.error("[STK Profile GET]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// PATCH /api/stk-panel/profile — Dernek bilgilerini güncelle
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string; email?: string; name?: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const body = await request.json();
    const stringFields = ["email", "phone", "website", "city", "district", "address", "description", "kepAddress", "mersisNo", "trademarkNo", "taxNumber", "taxOffice", "registryDecisionNo", "registrationNumber", "iban", "bankAccountName", "paymentNote", "donationNote", "duesNote", "annualDuesNote", "monthlyDuesAmount", "annualDuesAmount", "consentText", "contractPdfUrl", "logo", "registrationNo", "facebookUrl", "twitterUrl", "instagramUrl", "youtubeUrl", "whatsappGroupUrl", "telegramUrl"];
    const boolFields = ["acceptsDonation", "acceptsDues", "acceptsAnnualDues", "requiresMembershipForFinance", "showMemberCount", "isConsentActive", "isApplicationEnabled", "isFeatured","branchesPublic","activitiesPublic","decisionsPublic","chatPublic","chatDisabledForMembers","showFacebookOnMobile","showInstagramOnMobile","showTwitterOnMobile","showYoutubeOnMobile","showTelegramOnMobile","showWhatsappOnMobile","showWebsiteOnMobile","boardPublic"];
    const updateData: Record<string, any> = {};

    for (const key of stringFields) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }
    // whatsappLinks JSON — çoklu WhatsApp grup/kanal desteği
    if (body.whatsappLinks !== undefined) updateData.whatsappLinks = body.whatsappLinks;
    for (const key of boolFields) {
      if (body[key] !== undefined) updateData[key] = Boolean(body[key]);
    }

    const updated = await prisma.sTKOrganization.update({
      where: { id: stk.id },
      data: updateData,
    });

    // ═══ AUDIT LOG ═══
    try {
      const changedFields = Object.keys(updateData).join(", ");
      await prisma.auditLog.create({ data: { action: "UPDATE_PROFILE" as any, entityType: "STKOrganization", entityId: stk.id, userId: user.id, userEmail: user.email || "", userName: user.name || "", description: `Profil güncellendi: ${changedFields}`, stkId: stk.id } });
    } catch {}

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[STK Profile PATCH]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST /api/stk-panel/profile — Yeni belge ekle
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
    const { title, fileUrl, fileType } = body;

    if (!title || !fileUrl) {
      return NextResponse.json({ error: "Başlık ve dosya URL'si zorunludur" }, { status: 400 });
    }

    const doc = await prisma.sTKDocument.create({
      data: {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        stkId: stk.id,
        title,
        fileUrl,
        fileType: fileType || "PDF",
        updatedAt: new Date(),
      },
    });

    // ═══ AUDIT LOG ═══
    try { await prisma.auditLog.create({ data: { action: "ADD_DOCUMENT" as any, entityType: "STKDocument", entityId: doc.id, userId: user.id, userEmail: user.email || "", userName: user.name || "", description: `Belge eklendi: ${title}`, stkId: stk.id } }); } catch {}

    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error) {
    console.error("[STK Profile POST]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE /api/stk-panel/profile?docId=xxx — Belge sil
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string; email?: string; name?: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const docId = request.nextUrl.searchParams.get("docId");
    if (!docId) return NextResponse.json({ error: "docId gerekli" }, { status: 400 });

    // Belgenin bu STK'ya ait olduğunu doğrula
    const doc = await prisma.sTKDocument.findFirst({ where: { id: docId, stkId: stk.id } });
    if (!doc) return NextResponse.json({ error: "Belge bulunamadı" }, { status: 404 });

    await prisma.sTKDocument.delete({ where: { id: docId } });

    // ═══ AUDIT LOG ═══
    try { await prisma.auditLog.create({ data: { action: "DELETE_DOCUMENT" as any, entityType: "STKDocument", entityId: docId, userId: user.id, userEmail: user.email || "", userName: user.name || "", description: `Belge silindi: ${doc.title}`, stkId: stk.id } }); } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[STK Profile DELETE]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
