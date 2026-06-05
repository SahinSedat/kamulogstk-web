import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/admin/stk/organizations
 * STK listesi — type ve status filtresiyle
 */
export async function GET(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR", "STK_MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  const type = req.nextUrl.searchParams.get("type");
  const status = req.nextUrl.searchParams.get("status");

  const where: any = {};
  if (type) where.type = type;
  if (status) where.status = status;

  const organizations = await prisma.sTKOrganization.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Her STK için gerçek APPROVED üye sayısını hesapla
  const data: any[] = [];
  for (const org of organizations) {
    const approvedCount = await prisma.sTKApplication.count({
      where: { stkId: org.id, status: "APPROVED" },
    });
    (org as any).memberCount = approvedCount; data.push(org);
  }

  return NextResponse.json({ success: true, data, count: data.length });
}

/**
 * POST /api/admin/stk/organizations
 * Yeni STK kuruluşu ekle
 */
export async function POST(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR", "STK_MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, type, city, description, district, email, phone, website, logo, address, registrationNumber, taxNumber, foundedAt, iban, acceptsDonation, acceptsDues, acceptsAnnualDues, paymentNote, donationNote, duesNote, annualDuesNote, requiresMembershipForFinance, showMemberCount, monthlyDuesAmount, annualDuesAmount, bankAccountName, isConsentActive, consentText, contractPdfUrl, isApplicationEnabled } = body;

    if (!name || !type || !city || !description) {
      return NextResponse.json(
        { error: "name, type, city ve description alanları zorunludur." },
        { status: 400 }
      );
    }

    let slug = slugify(name);
    const existing = await prisma.sTKOrganization.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const org = await prisma.sTKOrganization.create({
      data: {
        name, slug, type, description, city,
        district: district || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        logo: logo || null,
        address: address || null,
        registrationNumber: registrationNumber || null,
        taxNumber: taxNumber || null,
        foundedAt: foundedAt ? new Date(foundedAt) : null,
        iban: iban || null,
        acceptsDonation: acceptsDonation ?? false,
        acceptsDues: acceptsDues ?? false,
        paymentNote: paymentNote || null,
        requiresMembershipForFinance: requiresMembershipForFinance ?? true,
        showMemberCount: showMemberCount ?? false,
        acceptsAnnualDues: acceptsAnnualDues ?? false,
        donationNote: donationNote || null,
        duesNote: duesNote || null,
        annualDuesNote: annualDuesNote || null,
        monthlyDuesAmount: monthlyDuesAmount || null,
        annualDuesAmount: annualDuesAmount || null,
        bankAccountName: bankAccountName || null,
        isConsentActive: isConsentActive ?? false,
        consentText: consentText || null,
        contractPdfUrl: contractPdfUrl || null,
        isApplicationEnabled: isApplicationEnabled ?? true,
      },
    });

    // Hoşgeldin kotası ata
    try {
      const qSettings = await prisma.systemSetting.findMany({ where: { key: { in: ["defaultSmsQuota", "defaultPushQuota", "defaultWhatsappQuota", "defaultEmailQuota"] } } });
      const getQ = (k: string) => parseInt(qSettings.find(s => s.key === k)?.value || "0") || 0;
      const sms = getQ("defaultSmsQuota"), push = getQ("defaultPushQuota"), wa = getQ("defaultWhatsappQuota"), email = getQ("defaultEmailQuota");
      if (sms > 0 || push > 0 || wa > 0 || email > 0) {
        await prisma.sTKOrganization.update({
          where: { id: org.id },
          data: { smsCredits: sms, pushCredits: push, whatsappCredits: wa, emailCredits: email },
        });
        console.log(`[STK] 🎁 Hoşgeldin kotası atandı: ${org.name}`);
      }
    } catch { /* ignore */ }

    return NextResponse.json({ success: true, data: org }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/stk/organizations?id=xxx
 * STK güncelleme
 */
export async function PATCH(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR", "STK_MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id parametresi gerekli" }, { status: 400 });

    const body = await req.json();
    const { name, type, city, description, district, email, phone, website, logo, address, registrationNumber, taxNumber, foundedAt, iban, acceptsDonation, acceptsDues, acceptsAnnualDues, paymentNote, donationNote, duesNote, annualDuesNote, requiresMembershipForFinance, showMemberCount, monthlyDuesAmount, annualDuesAmount, bankAccountName, status, isConsentActive, consentText, contractPdfUrl, isApplicationEnabled, isFeatured } = body;

    const updateData: any = {};
    if (name !== undefined) { updateData.name = name; updateData.slug = slugify(name); }
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (city !== undefined) updateData.city = city;
    if (description !== undefined) updateData.description = description;
    if (district !== undefined) updateData.district = district;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (website !== undefined) updateData.website = website;
    if (logo !== undefined) updateData.logo = logo;
    if (address !== undefined) updateData.address = address;
    if (registrationNumber !== undefined) updateData.registrationNumber = registrationNumber;
    if (taxNumber !== undefined) updateData.taxNumber = taxNumber;
    if (foundedAt !== undefined) updateData.foundedAt = foundedAt ? new Date(foundedAt) : null;
    if (iban !== undefined) updateData.iban = iban;
    if (acceptsDonation !== undefined) updateData.acceptsDonation = acceptsDonation;
    if (acceptsDues !== undefined) updateData.acceptsDues = acceptsDues;
    if (paymentNote !== undefined) updateData.paymentNote = paymentNote;
    if (requiresMembershipForFinance !== undefined) updateData.requiresMembershipForFinance = requiresMembershipForFinance;
    if (showMemberCount !== undefined) updateData.showMemberCount = showMemberCount;
    if (acceptsAnnualDues !== undefined) updateData.acceptsAnnualDues = acceptsAnnualDues;
    if (donationNote !== undefined) updateData.donationNote = donationNote;
    if (duesNote !== undefined) updateData.duesNote = duesNote;
    if (annualDuesNote !== undefined) updateData.annualDuesNote = annualDuesNote;
    if (monthlyDuesAmount !== undefined) updateData.monthlyDuesAmount = monthlyDuesAmount;
    if (annualDuesAmount !== undefined) updateData.annualDuesAmount = annualDuesAmount;
    if (bankAccountName !== undefined) updateData.bankAccountName = bankAccountName;
    if (isConsentActive !== undefined) updateData.isConsentActive = isConsentActive;
    if (consentText !== undefined) updateData.consentText = consentText;
    if (contractPdfUrl !== undefined) updateData.contractPdfUrl = contractPdfUrl;
    if (isApplicationEnabled !== undefined) updateData.isApplicationEnabled = isApplicationEnabled;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (body.stkLicenseUntil !== undefined) updateData.stkLicenseUntil = body.stkLicenseUntil ? new Date(body.stkLicenseUntil) : null;
    if (body.managerId !== undefined) updateData.managerId = body.managerId || null;

    const org = await prisma.sTKOrganization.update({ where: { id }, data: updateData });

    // managerId ayarlandıysa kullanıcıyı otomatik STK_MANAGER yap + managedStkId bağla
    if (body.managerId) {
      await prisma.user.update({ where: { id: body.managerId }, data: { role: "STK_MANAGER", managedStkId: id } }).catch(() => {});
    }

    // STK onaylandığında hoşgeldin kotası yükle
    if (status === "APPROVED") {
      try {
        const qSettings = await prisma.systemSetting.findMany({ where: { key: { in: ["defaultSmsQuota", "defaultPushQuota", "defaultWhatsappQuota", "defaultEmailQuota"] } } });
        const getQ = (k: string) => parseInt(qSettings.find(s => s.key === k)?.value || "0") || 0;
        const sms = getQ("defaultSmsQuota"), push = getQ("defaultPushQuota"), wa = getQ("defaultWhatsappQuota"), email = getQ("defaultEmailQuota");
        if (sms > 0 || push > 0 || wa > 0 || email > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const incData: any = { approvedAt: new Date() };
          if (sms > 0) incData.smsCredits = { increment: sms };
          if (push > 0) incData.pushCredits = { increment: push };
          if (wa > 0) incData.whatsappCredits = { increment: wa };
          if (email > 0) incData.emailCredits = { increment: email };
          await prisma.sTKOrganization.update({ where: { id }, data: incData });
          console.log(`[STK] 🎁 Onay hoşgeldin kotası yüklendi: ${org.name}`);
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json({ success: true, data: org });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/stk/organizations?id=xxx
 */
export async function DELETE(req: NextRequest) {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR", "STK_MANAGER"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id parametresi gerekli" }, { status: 400 });
    await prisma.sTKOrganization.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
