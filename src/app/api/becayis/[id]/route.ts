import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * resolveUser — Flutter "Authorization: Token <userId>" header'ından kullanıcıyı çözer.
 * Önce ID ile arar, bulamazsa phone fallback yapar.
 */
async function resolveUser(req: NextRequest | Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;

  const parts = auth.split(" ");
  const token = parts.length === 2 ? parts[1] : auth;
  if (!token) return null;

  let user = await prisma.user.findUnique({ where: { id: token } });
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
    });
    if (user) return user;
  }

  return null;
}

// ── İlan güncelleme için izin verilen alanlar (güvenlik whitelist)
const ALLOWED_PATCH_FIELDS = [
  "title",
  "role",
  "branch",
  "currentCity",
  "targetCity",
  "institutionId",
  "assignmentMethod",
  "description",
  "istihdamTuru",
  "bakanlik",
  "kurum",
  "unvan",
  "atamaUsulu",
];

// GET /api/becayis/[id] — İlan detayı
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listing = await prisma.becayisListing.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          isPremium: true,
          // email ASLA public endpoint'te döndürülmez
        },
      },
      institution: { select: { id: true, name: true } },
    },
  });
  if (!listing)
    return NextResponse.json(
      { error: "İlan bulunamadı" },
      { status: 404 }
    );
  // Görüntüleme sayısını artır (async, yanıtı beklemez)
  prisma.becayisListing.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => { });

  // avatarUrl'yi tam URL'ye çevir (Flutter için)
  const BASE_URL = "https://kamulog.net";
  const resolved = {
    ...listing,
    owner: listing.owner ? {
      ...listing.owner,
      avatarUrl: listing.owner.avatarUrl
        ? (listing.owner.avatarUrl.startsWith("http") ? listing.owner.avatarUrl : `${BASE_URL}${listing.owner.avatarUrl}`)
        : null,
    } : listing.owner,
  };

  return NextResponse.json(resolved);
}

// PATCH /api/becayis/[id] — İlan düzenleme talebi (Admin onayına gider)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Auth doğrulama
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Yetkilendirme gerekli.", reauth: true },
        { status: 401 }
      );
    }

    // 2. İlanı bul
    const listing = await prisma.becayisListing.findUnique({
      where: { id },
      select: { ownerId: true, status: true, pendingChanges: true },
    });
    if (!listing) {
      return NextResponse.json(
        { error: "İlan bulunamadı" },
        { status: 404 }
      );
    }

    // 3. Sahiplik kontrolü — sadece ilan sahibi düzenleyebilir
    if (listing.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Bu ilanı düzenleme yetkiniz yok." },
        { status: 403 }
      );
    }

    // 4. Zaten düzenleme onayı bekliyor mu?
    if (listing.status === "pending_edit") {
      return NextResponse.json(
        { error: "Bu ilan için zaten bir düzenleme talebi beklemede. Admin onayını bekleyin." },
        { status: 409 }
      );
    }

    // 5. Body'den sadece izin verilen alanları al
    const body = await req.json();
    const safeData: Record<string, string> = {};
    for (const field of ALLOWED_PATCH_FIELDS) {
      if (body[field] !== undefined) {
        safeData[field] = body[field];
      }
    }

    if (Object.keys(safeData).length === 0) {
      return NextResponse.json(
        { error: "Güncellenecek alan bulunamadı" },
        { status: 400 }
      );
    }

    // 6. Değişiklikleri pendingChanges'e kaydet, status → pending_edit
    const previousStatus = listing.status;
    const pendingPayload = JSON.parse(JSON.stringify({
      changes: safeData,
      previousStatus,
      requestedAt: new Date().toISOString(),
      requestedBy: user.id,
    }));

    const updated = await prisma.becayisListing.update({
      where: { id },
      data: {
        pendingChanges: pendingPayload,
        status: "pending_edit",
      },
    });

    return NextResponse.json({
      ...updated,
      message: "Düzenleme talebiniz admin onayına gönderildi.",
    });
  } catch (error) {
    console.error("Becayis PATCH error:", error);
    return NextResponse.json(
      { error: "Güncelleme sırasında hata oluştu" },
      { status: 500 }
    );
  }
}

// DELETE /api/becayis/[id] — İlanı yayından kaldır (AUTH + SAHİPLİK KONTROLÜ)
// Soft-delete: status → "removed" olarak güncellenir, gerekçe log'a yazılır.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Auth doğrulama
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Yetkilendirme gerekli.", reauth: true },
        { status: 401 }
      );
    }

    // 2. İlanı bul
    const listing = await prisma.becayisListing.findUnique({
      where: { id },
      select: { ownerId: true, title: true, currentCity: true, targetCity: true },
    });
    if (!listing) {
      return NextResponse.json(
        { error: "İlan bulunamadı" },
        { status: 404 }
      );
    }

    // 3. Sahiplik kontrolü
    if (listing.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Bu ilanı kaldırma yetkiniz yok." },
        { status: 403 }
      );
    }

    // 4. Gerekçeyi al
    let reason = "Belirtilmemiş";
    try {
      const body = await req.json();
      if (body.reason) reason = body.reason;
    } catch {
      // Body yoksa varsayılan gerekçe kullanılır
    }

    // 5. Soft-delete: status → removed + gerekçeyi kaydet
    await prisma.becayisListing.update({
      where: { id },
      data: {
        status: "removed",
        removalReason: reason,
      },
    });

    // 6. Kaldırma gerekçesini log'a da kaydet
    await prisma.whatsAppLog.create({
      data: {
        phoneNumber: user.id,
        message: `İlan kaldırıldı — "${listing.title}" (${listing.currentCity}→${listing.targetCity}). Gerekçe: ${reason}`,
        messageType: "LISTING_REMOVAL_LOG",
        status: "COMPLETED",
      },
    });

    return NextResponse.json({
      success: true,
      message: "İlan yayından kaldırıldı.",
    });
  } catch (error) {
    console.error("Becayis DELETE error:", error);
    return NextResponse.json(
      { error: "Kaldırma sırasında hata oluştu" },
      { status: 500 }
    );
  }
}
