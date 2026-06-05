import { createAdminNotification } from "@/lib/services/adminNotificationService";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRadarMatches, type RadarListing } from "@/lib/radarMatcher";

/**
 * resolveUser — Authorization: Token <userId> header'dan kullanıcıyı çözer.
 */
async function resolveUser(req: NextRequest | Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const parts = auth.split(" ");
  const token = parts.length === 2 ? parts[1] : auth;
  if (!token) return null;

  let user = await prisma.user.findUnique({
    where: { id: token },
    select: { id: true, credits: true, isPremium: true },
  });
  if (user) return user;

  const phoneHeader = req.headers.get("x-user-phone");
  if (phoneHeader) {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: phoneHeader },
          { phoneNumber: phoneHeader },
        ],
      },
      select: { id: true, credits: true, isPremium: true },
    });
    if (user) return user;
  }
  return null;
}

/**
 * generateAdNumber — Benzersiz ilan numarası üretir: BCY-XXXXXX
 */
function generateAdNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `BCY-${code}`;
}

// GET /api/becayis — Becayiş listesi (Admin panel + Mobil)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") || "";
  const city = searchParams.get("city") || "";
  const currentCity = searchParams.get("currentCity") || "";
  const targetCity = searchParams.get("targetCity") || "";
  const search = searchParams.get("search") || "";
  const adNumber = searchParams.get("adNumber") || "";
  const isPremium = searchParams.get("isPremium");
  const role = searchParams.get("role") || "";
  const bakanlik = searchParams.get("bakanlik") || "";
  const istihdamTuru = searchParams.get("istihdamTuru") || "";
  const unvan = searchParams.get("unvan") || "";
  const atamaYontemi = searchParams.get("atamaYontemi") || "";
  const institution = searchParams.get("institution") || "";
  const sort = searchParams.get("sort") || "desc"; // desc (Yeniden Eskiye) | asc (Eskiden Yeniye)
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [];

  if (status) conditions.push({ status });
  if (role) {
    if (role === "memur") {
      // Memur modülünde hem memur hem sözleşmeli ilanları göster
      conditions.push({ role: { in: ["memur", "sozlesmeli"] } });
    } else {
      conditions.push({ role });
    }
  }
  if (institution) conditions.push({ institutionId: institution });
  if (adNumber) conditions.push({ adNumber: { contains: adNumber, mode: "insensitive" } });
  if (isPremium === "true") conditions.push({ isPremium: true });
  if (isPremium === "false") conditions.push({ isPremium: false });

  // ── Akıllı Filtreler (Mobil) ──
  // currentCity: İlanın mevcut şehrine göre filtrele
  if (currentCity) {
    conditions.push({ currentCity: { contains: currentCity, mode: "insensitive" } });
  }
  // targetCity: İlanın hedef şehrine göre filtrele
  if (targetCity) {
    conditions.push({ targetCity: { contains: targetCity, mode: "insensitive" } });
  }
  // bakanlik: İlandaki bakanlık alanına göre filtrele
  if (bakanlik) {
    conditions.push({ bakanlik: { contains: bakanlik, mode: "insensitive" } });
  }
  // istihdamTuru: Önce ilanın kendi alanı, yoksa owner'ınki
  if (istihdamTuru) {
    conditions.push({
      OR: [
        { istihdamTuru: { contains: istihdamTuru, mode: "insensitive" } },
        { owner: { istihdamTuru: { contains: istihdamTuru, mode: "insensitive" } } },
      ],
    });
  }
  // unvan: İlandaki veya owner'daki unvan
  if (unvan) {
    conditions.push({
      OR: [
        { unvan: { contains: unvan, mode: "insensitive" } },
        { branch: { contains: unvan, mode: "insensitive" } },
        { owner: { unvan: { contains: unvan, mode: "insensitive" } } },
      ],
    });
  }
  if (atamaYontemi) conditions.push({ assignmentMethod: { contains: atamaYontemi, mode: "insensitive" } });

  // Geriye uyumlu: city parametresi (hem currentCity hem targetCity'de arar)
  if (city) {
    conditions.push({
      OR: [
        { currentCity: { contains: city, mode: "insensitive" } },
        { targetCity: { contains: city, mode: "insensitive" } },
      ],
    });
  }
  const urgent = searchParams.get("urgent");

  // Unified search: adNumber, title, branch, owner name/email/phone
  if (search) {
    conditions.push({
      OR: [
        { adNumber: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        { branch: { contains: search, mode: "insensitive" } },
        { currentCity: { contains: search, mode: "insensitive" } },
        { targetCity: { contains: search, mode: "insensitive" } },
        { owner: { firstName: { contains: search, mode: "insensitive" } } },
        { owner: { lastName: { contains: search, mode: "insensitive" } } },
        { owner: { email: { contains: search, mode: "insensitive" } } },
        { owner: { phone: { contains: search, mode: "insensitive" } } },
        { owner: { phoneNumber: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  // ── Acil İlan Filtresi (Mobil vitrin için — süre bazlı)
  if (urgent === "true") {
    conditions.push({ isUrgent: true, urgentUntil: { gte: new Date() } });
  }

  const where = conditions.length > 0 ? { AND: conditions } : {};

  // ── Sıralama: Acil ilanlar EN ÜSTTE, sonra boosted, sonra tarih
  const sortDir = sort === "asc" ? "asc" as const : "desc" as const;
  // Sıralama: Öne çıkan (boosted) > Premium > Tarih
  // Not: Acil ilanlar ana feed sıralamasını etkilemez (ayrı vitrin)
  const orderBy: any[] = [
    { boostedUntil: { sort: "desc", nulls: "last" } },     // Öne çıkan ilanlar en üstte
    { isPremium: "desc" },                                  // Premium ilanlar sonra
    { createdAt: sortDir },                                // Son olarak tarih sıralaması
  ];

  const [listings, total] = await Promise.all([
    prisma.becayisListing.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, phoneNumber: true, avatarUrl: true, isPremium: true, premiumUntil: true, bakanlik: true, kurum: true, unvan: true, istihdamTuru: true, atamaUsulu: true } },
        institution: { select: { id: true, name: true } },
      },
    }),
    prisma.becayisListing.count({ where }),
  ]);

  // avatarUrl'leri tam URL'ye çevir (Flutter için)
  const BASE_URL = "https://kamulog.net";
  const resolved = listings.map((l: any) => ({
    ...l,
    owner: l.owner ? {
      ...l.owner,
      avatarUrl: l.owner.avatarUrl
        ? (l.owner.avatarUrl.startsWith("http") ? l.owner.avatarUrl : `${BASE_URL}${l.owner.avatarUrl}`)
        : null,
    } : l.owner,
  }));

  return NextResponse.json({ listings: resolved, total, page, totalPages: Math.ceil(total / limit) });
}

// POST /api/becayis — Yeni ilan oluştur (Zorunlu Profil Tabanlı)
// İstemci SADECE title, description, targetCity (opsiyonel fallback) ve isGeneratedByKamulogAI gönderir.
// Tüm çalışma bilgileri kullanıcının profilinden çekilir.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, targetCity: bodyTargetCity, role: bodyRole, isGeneratedByKamulogAI } = body;

  // AUTH: Token'dan kullanıcıyı çöz
  const authUser = await resolveUser(req);
  if (!authUser) {
    return NextResponse.json({ error: "Yetkilendirme gerekli.", reauth: true }, { status: 401 });
  }
  const ownerId = authUser.id;

  if (!title) {
    return NextResponse.json({ error: "İlan başlığı zorunludur." }, { status: 400 });
  }

  try {
    // ── 1. Kullanıcının profil bilgilerini veritabanından çek
    const userProfile = await prisma.user.findUnique({
      where: { id: ownerId },
      select: {
        isPremium: true,
        city: true,
        istihdamTuru: true,
        aiExtractedEmploymentType: true,
        bakanlik: true,
        kurum: true,
        unvan: true,
        atamaUsulu: true,
        targetCities: true,
      },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }

    // ── 2. ZORUNLU PROFİL KONTROLÜ (Guard Clause)
    // Mevcut şehir zorunlu + en az bakanlik veya unvan dolu olmalı
    const employmentType = userProfile.istihdamTuru || userProfile.aiExtractedEmploymentType;
    const hasCity = !!userProfile.city;
    const hasWorkInfo = !!(userProfile.bakanlik || userProfile.unvan || employmentType);

    if (!hasCity || !hasWorkInfo) {
      return NextResponse.json({
        error: "İlan verebilmek için Profil → Becayiş & AI Profil bölümünden bilgilerinizi doldurun.",
        missingFields: { city: !hasCity, workInfo: !hasWorkInfo },
      }, { status: 400 });
    }

    // ── 3. Hedef şehri belirle: Body (AI/form) > Profil sırasıyla
    let targetCity = "";
    // Önce body'den gelen targetCity kullan (AI taslağı veya kullanıcının formda seçtiği)
    if (bodyTargetCity) {
      targetCity = bodyTargetCity;
    } else if (userProfile.targetCities) {
      // Fallback: profildeki targetCities
      try {
        const parsed = JSON.parse(userProfile.targetCities);
        targetCity = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : userProfile.targetCities;
      } catch {
        const parts = userProfile.targetCities.split(",").map((s: string) => s.trim()).filter(Boolean);
        targetCity = parts[0] || "";
      }
    }

    if (!targetCity) {
      return NextResponse.json({
        error: "Hedef şehir bilgisi bulunamadı. Lütfen profilinizde veya ilan formunda gitmek istediğiniz şehri belirtin.",
      }, { status: 400 });
    }

    // ── 4. İstihdam türünü role alanına dönüştür
    const roleMap: Record<string, string> = {
      "Memur": "memur",
      "4/A Kadrolu Memur": "memur",
      "Sürekli İşçi": "isci",
      "Geçici İşçi": "isci",
      "4/D İşçi": "isci",
      "Sözleşmeli": "sozlesmeli",
      "4/B Sözleşmeli Personel": "sozlesmeli",
      "Özel Sektör": "memur",
      "İş Arayan": "memur",
    };
    // Önce client'tan gelen role'u kullan, yoksa istihdamTürü'nden map'le
    const role = bodyRole || roleMap[employmentType!] || "isci";

    // ── 5. Kurum eşleştirmesi (varsa Institution tablosundan bul)
    let institutionId: string | null = null;
    if (userProfile.bakanlik) {
      const inst = await prisma.institution.findFirst({
        where: { name: { contains: userProfile.bakanlik, mode: "insensitive" } },
      });
      if (inst) institutionId = inst.id;
    }

    // ── 6. İlan Kotası Kontrolü: Plan'daki listingQuota'ya göre kontrol
    // Aktif abonelik varsa plan kotasını oku, yoksa varsayılan (Standart plan)
    let listingQuota = 1; // Varsayılan
    const activeSub = await prisma.subscription.findFirst({
      where: { userId: ownerId, status: "active", endsAt: { gte: new Date() } },
      select: { plan: { select: { listingQuota: true } } },
    });
    if (activeSub?.plan) {
      listingQuota = activeSub.plan.listingQuota;
    } else {
      // Aktif abonelik yoksa Standart (default) planın kotasını oku
      const defaultPlan = await prisma.subscriptionPlan.findFirst({
        where: { isDefault: true },
        select: { listingQuota: true },
      });
      if (defaultPlan) listingQuota = defaultPlan.listingQuota;
    }

    const activeListingCount = await prisma.becayisListing.count({
      where: {
        ownerId,
        status: { in: ['pending', 'approved', 'published', 'active'] },
      },
    });

    if (activeListingCount >= listingQuota) {
      return NextResponse.json(
        { error: `İlan hakkınız doldu. Planınızda ${listingQuota} ilan hakkı var, ${activeListingCount} aktif ilanınız bulunmaktadır.`, listingQuota, activeListingCount },
        { status: 429 }
      );
    }

    // ── 7. İlan Oluştur (Profil verileriyle)
    const slug = `${title.toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, "-").replace(/-+/g, "-")}-${Date.now().toString(36)}`;

    let adNumberVal = generateAdNumber();
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await prisma.becayisListing.findUnique({ where: { adNumber: adNumberVal } });
      if (!exists) break;
      adNumberVal = generateAdNumber();
    }

    // ── Institution adını User.bakanlik'a otomatik eşle ──
    // İlan verirken seçilen bakanlık, kullanıcı profilinde yoksa yazılır.
    let institutionName: string | null = null;
    if (institutionId) {
      const inst = await prisma.institution.findUnique({ where: { id: institutionId } });
      if (inst) institutionName = inst.name;
    }
    // Profilde bakanlik boşsa, institution'dan doldur
    const finalBakanlik = userProfile.bakanlik || institutionName || null;

    // Kullanıcı profilini güncellenecek alanlar (jeton düşürülmüyor)
    const userSyncData: Record<string, unknown> = {};
    // bakanlik boşsa → institution'dan doldur
    if (!userProfile.bakanlik && institutionName) {
      userSyncData.bakanlik = institutionName;
    }
    // istihdamTuru boşsa → employmentType'tan doldur
    if (!userProfile.istihdamTuru && employmentType) {
      userSyncData.istihdamTuru = employmentType;
    }

    const hasSyncData = Object.keys(userSyncData).length > 0;

    const txOps: any[] = [
      prisma.becayisListing.create({
        data: {
          ownerId,
          title,
          role,
          institutionId,
          branch: userProfile.unvan!,
          currentCity: userProfile.city!,
          targetCity,
          assignmentMethod: userProfile.atamaUsulu || null,
          description: description || "",
          slug,
          status: "pending",
          adNumber: adNumberVal,
          isGeneratedByKamulogAI: isGeneratedByKamulogAI === true,
          // 5 Temel Çalışma Bilgisi
          istihdamTuru: employmentType,
          bakanlik: finalBakanlik,
          kurum: userProfile.kurum || null,
          unvan: userProfile.unvan || null,
          atamaUsulu: userProfile.atamaUsulu || null,
        },
      }),
    ];

    if (hasSyncData) {
      txOps.push(
        prisma.user.update({
          where: { id: ownerId },
          data: userSyncData,
        })
      );
    }

    const [listing] = await prisma.$transaction(txOps);

    // ── 9. Eşleşme Algoritması: Karşılıklı becayiş araması
    try {
      const matchWhere: Record<string, unknown> = {
        currentCity: targetCity,
        targetCity: userProfile.city,
        role,
        status: { in: ['approved', 'published', 'active'] },
        ownerId: { not: ownerId },
      };
      if (institutionId) {
        matchWhere.institutionId = institutionId;
      }

      const matches = await prisma.becayisListing.findMany({
        where: matchWhere,
        select: {
          id: true,
          ownerId: true,
          title: true,
          currentCity: true,
          targetCity: true,
          owner: { select: { firstName: true, lastName: true } },
        },
        take: 10,
      });

      if (matches.length > 0) {
        const notifications = [];

        for (const match of matches) {
          notifications.push({
            userId: ownerId,
            title: '🎯 Becayiş Eşleşmesi Bulundu!',
            message: `Harika haber! ${userProfile.city} → ${targetCity} rotası için sizinle aynı şartlarda bir becayiş adayı bulundu. İlana göz atın ve mesaj gönderin.`,
            type: 'BECAYIS_MATCH' as const,
            payload: { route: `/becayis/detail/${match.id}`, matchedListingId: match.id, matchedUserId: match.ownerId },
          });

          notifications.push({
            userId: match.ownerId,
            title: '🎯 Becayiş Eşleşmesi Bulundu!',
            message: `Harika haber! ${match.currentCity} → ${match.targetCity} rotası için sizinle aynı şartlarda yeni bir becayiş adayı bulundu. İlana göz atın ve mesaj gönderin.`,
            type: 'BECAYIS_MATCH' as const,
            payload: { route: `/becayis/detail/${listing.id}`, matchedListingId: listing.id, matchedUserId: ownerId },
          });
        }

        await prisma.notification.createMany({ data: notifications });
      }
    } catch (matchError) {
      console.error('Becayis matching error (non-blocking):', matchError);
    }

    // ── 10. Kamulog Radar: Nöbetçi Algoritma (asenkron, bloklamıyor)
    try {
      const radarListing: RadarListing = {
        id: listing.id,
        ownerId,
        title,
        currentCity: userProfile.city!,
        targetCity,
        istihdamTuru: employmentType || null,
        kurum: userProfile.kurum || null,
        unvan: userProfile.unvan || null,
        bakanlik: finalBakanlik || null,
        adNumber: adNumberVal,
      };
      // Fire-and-forget — yanıtı bekleme
      checkRadarMatches(radarListing).catch(err =>
        console.error('[Radar] Nöbetçi hatası (non-blocking):', err)
      );
    } catch (radarError) {
      console.error('[Radar] Nöbetçi başlatma hatası:', radarError);
    }

    // Admin bildirim (sessiz)
    createAdminNotification({
      type: "AD_NEW_BECAYIS",
      title: "Yeni Becayis Ilani",
      message: listing.title ? listing.title + " ilani verildi." : "Yeni bir becayis ilani verildi.",
      userId: ownerId || undefined,
      senderName: undefined, // owner name listing icerisinde olmayabilir
      relatedId: listing.id || undefined,
      details: (listing.currentCity || "") + " -> " + (listing.targetCity || "") + " Becayis Ilani",
    }).catch(() => {});

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    console.error("Becayis create error:", error);
    return NextResponse.json({ error: "İlan oluşturulurken bir hata oluştu" }, { status: 500 });
  }
}

// PATCH /api/becayis — Admin: Toplu ilan işlemleri (expire/reactivate)
export async function PATCH(req: NextRequest) {
  try {
    let action = 'expire';
    try {
      const body = await req.json();
      action = body.action || 'expire';
    } catch { /* no body = default expire */ }

    if (action === 'reactivate') {
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 30);

      const result = await prisma.becayisListing.updateMany({
        where: { status: 'expired' },
        data: {
          status: 'published',
          approvedAt: new Date(),
          expiresAt: newExpiresAt,
          isExpiringNotified: false,
          isExpiredNotified: false,
        },
      });
      return NextResponse.json({
        message: `${result.count} ilan yeniden yayına alındı (30 gün eklendi).`,
        count: result.count,
      });
    }

    // Default: expire — expiresAt geçmiş ilanları expire yap
    const now = new Date();

    // expiresAt ile
    const result1 = await prisma.becayisListing.updateMany({
      where: {
        expiresAt: { lt: now },
        status: { in: ['published', 'approved', 'active'] },
      },
      data: { status: 'expired', isExpiredNotified: true },
    });

    // Fallback: expiresAt olmayan eski ilanlar
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result2 = await prisma.becayisListing.updateMany({
      where: {
        expiresAt: null,
        approvedAt: { lt: thirtyDaysAgo },
        isPremium: false,
        status: { in: ['published', 'approved', 'active'] },
      },
      data: { status: 'expired' },
    });

    return NextResponse.json({
      message: `${result1.count + result2.count} ilan pasife alındı.`,
      count: result1.count + result2.count,
    });
  } catch (error) {
    console.error('Becayis bulk action error:', error);
    return NextResponse.json({ error: 'İşlem sırasında hata oluştu' }, { status: 500 });
  }
}
