import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Admin Panel — Kullanıcı Verileri Export API
 * GET /api/admin/users/export?format=csv|json
 * 
 * Mevcut filtreleri destekler (search, role, status, avatar, profile, premium, employment, verified)
 * Her export işlemi AdminLog'a kaydedilir
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const format = sp.get("format") || "csv";
    const search = sp.get("search") || "";
    const roleFilter = sp.get("role") || "";
    const verifiedFilter = sp.get("verified") || "";
    const employmentFilter = sp.get("employment") || "";
    const premiumFilter = sp.get("premium") || "";
    const statusFilter = sp.get("status") || "";
    const avatarFilter = sp.get("avatar") || "";
    const profileFilter = sp.get("profile") || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }
    if (roleFilter) where.role = roleFilter;
    if (verifiedFilter === "true") where.isVerified = true;
    if (verifiedFilter === "false") where.isVerified = false;
    if (employmentFilter) where.istihdamTuru = { contains: employmentFilter, mode: "insensitive" };
    if (premiumFilter === "premium_becayis") where.isPremium = true;
    else if (premiumFilter === "premium_kariyer") where.isCareerPremium = true;
    else if (premiumFilter === "true") { /* all premium */ }
    else if (premiumFilter === "false") { where.isPremium = false; where.isCareerPremium = false; }
    if (statusFilter === "active") { where.isDeactivated = false; where.accountDeleted = false; where.accountFrozen = false; }
    else if (statusFilter === "deactivated") where.isDeactivated = true;
    else if (statusFilter === "deleted") where.accountDeleted = true;
    else if (statusFilter === "frozen") where.accountFrozen = true;
    if (avatarFilter === "true") where.avatarUrl = { not: null };
    else if (avatarFilter === "false") where.avatarUrl = null;
    if (profileFilter === "complete") { where.city = { not: null }; where.istihdamTuru = { not: null }; where.firstName = { not: null }; }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, email: true, firstName: true, lastName: true, name: true,
        phone: true, phoneNumber: true, role: true, isVerified: true, isActive: true,
        isPremium: true, premiumUntil: true, isCareerPremium: true, careerPremiumUntil: true,
        subscriptionTier: true, credits: true, aiTokens: true,
        istihdamTuru: true, kurum: true, bakanlik: true, unvan: true,
        city: true, district: true, avatarUrl: true,
        isDeactivated: true, deactivatedAt: true, deactivationReason: true,
        accountDeleted: true, accountDeletedAt: true,
        accountFrozen: true,
        isLookingForBecayis: true, isAriyor: true,
        notifEmail: true, notifPush: true, notifSms: true, notifWhatsapp: true,
        kvkkAccepted: true, userAgreementAccepted: true,
        createdAt: true, updatedAt: true, lastSeen: true,
        _count: { select: { becayisListings: true } },
      },
    });

    // AdminLog'a kaydet
    await prisma.adminLog.create({
      data: {
        adminId: user.id,
        action: "USER_EXPORT",
        targetType: "USER",
        details: `${users.length} kullanıcı ${format.toUpperCase()} olarak export edildi. Filtreler: ${JSON.stringify({ search, roleFilter, statusFilter, premiumFilter, avatarFilter, profileFilter })}`,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    if (format === "json") {
      return new NextResponse(JSON.stringify(users, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="kamulog-users-${new Date().toISOString().split("T")[0]}.json"`,
        },
      });
    }

    // CSV
    const headers = [
      "ID", "Ad", "Soyad", "Tam Ad", "E-posta", "Telefon", "Telefon2", "Rol",
      "Doğrulanmış", "Aktif", "Premium Becayiş", "Premium Bitiş", "Premium Kariyer", "Kariyer Bitiş",
      "Abonelik", "Kredi", "AI Token", "İstihdam Türü", "Kurum", "Bakanlık", "Ünvan",
      "Şehir", "İlçe", "Profil Resmi", "Deaktif", "Deaktif Tarihi", "Deaktif Sebebi",
      "Hesap Sildi", "Silme Tarihi", "Hesap Dondurdu",
      "Becayiş Arıyor", "Bildirim Email", "Bildirim Push", "Bildirim SMS", "Bildirim WhatsApp",
      "KVKK", "Sözleşme", "Kayıt Tarihi", "Son Güncelleme", "Son Görülme", "İlan Sayısı"
    ];

    const escCsv = (val: unknown) => {
      if (val === null || val === undefined) return "";
      const s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const rows = users.map(u => [
      u.id, u.firstName, u.lastName, u.name, u.email, u.phone, u.phoneNumber, u.role,
      u.isVerified, u.isActive, u.isPremium, u.premiumUntil, u.isCareerPremium, u.careerPremiumUntil,
      u.subscriptionTier, u.credits, u.aiTokens, u.istihdamTuru, u.kurum, u.bakanlik, u.unvan,
      u.city, u.district, u.avatarUrl ? "Var" : "Yok", u.isDeactivated, u.deactivatedAt, u.deactivationReason,
      u.accountDeleted, u.accountDeletedAt, u.accountFrozen,
      u.isLookingForBecayis || u.isAriyor, u.notifEmail, u.notifPush, u.notifSms, u.notifWhatsapp,
      u.kvkkAccepted, u.userAgreementAccepted, u.createdAt, u.updatedAt, u.lastSeen, u._count.becayisListings,
    ].map(escCsv).join(","));

    const bom = "\uFEFF"; // Excel Türkçe karakter desteği
    const csv = bom + headers.join(",") + "\n" + rows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kamulog-users-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error("[User Export]:", error);
    return NextResponse.json({ error: "Export hatası" }, { status: 500 });
  }
}
