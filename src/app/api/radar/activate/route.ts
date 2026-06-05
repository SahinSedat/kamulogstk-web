import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scanExistingListings, type RadarUserProfile } from "@/lib/radarMatcher";

/**
 * GET /api/radar/activate — Profil kontrol
 * POST /api/radar/activate — Radarı aktifleştir + ilk tarama
 */

async function resolveUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const parts = auth.split(" ");
  const token = parts.length === 2 ? parts[1] : auth;
  if (!token) return null;

  const user = await prisma.user.findUnique({
    where: { id: token },
    select: {
      id: true, isPremium: true, isRadarActive: true,
      istihdamTuru: true, city: true, targetCities: true,
      kurum: true, unvan: true, bakanlik: true,
    },
  });
  return user;
}

// GET — Profil yeterliliği kontrolü
export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: "Yetkilendirme gerekli.", reauth: true }, { status: 401 });
    }

    const missingFields: string[] = [];
    if (!user.istihdamTuru) missingFields.push("İstihdam Türü");
    if (!user.city) missingFields.push("Mevcut İl");
    if (!user.targetCities) missingFields.push("Hedef İl");

    if (missingFields.length > 0) {
      return NextResponse.json({
        ready: false,
        error: "PROFILE_INCOMPLETE",
        message: "Lütfen önce Becayiş & AI Profilinizi doldurun.",
        missingFields,
      }, { status: 400 });
    }

    return NextResponse.json({
      ready: true,
      isRadarActive: user.isRadarActive,
      profile: {
        istihdamTuru: user.istihdamTuru,
        city: user.city,
        targetCities: user.targetCities,
        kurum: user.kurum,
        unvan: user.unvan,
      },
    });
  } catch (error) {
    console.error("RADAR GET HATASI:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — Radar aktifleştir + ilk tarama
export async function POST(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json({ error: "Yetkilendirme gerekli.", reauth: true }, { status: 401 });
    }

    // Profil kontrolü
    if (!user.istihdamTuru || !user.city || !user.targetCities) {
      return NextResponse.json({
        error: "PROFILE_INCOMPLETE",
        message: "Lütfen önce Becayiş & AI Profilinizi doldurun.",
        missingFields: [
          !user.istihdamTuru && "İstihdam Türü",
          !user.city && "Mevcut İl",
          !user.targetCities && "Hedef İl",
        ].filter(Boolean),
      }, { status: 400 });
    }

    // Abonelik + plan kontrolü
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: "active",
        endsAt: { gte: new Date() },
        plan: { hasRadarFeature: true },
      } as any,
      select: { id: true, plan: { select: { name: true, radarDurationDays: true } } } as any,
    });

    if (!activeSubscription && !user.isPremium) {
      return NextResponse.json({
        error: "Kamulog Radar özelliği yalnızca premium planlarda kullanılabilir.",
        requiresPremium: true,
      }, { status: 403 });
    }

    // Radar süresini plandan al (subscription varsa plandan, yoksa default 30 gün)
    const radarDays = activeSubscription
      ? ((activeSubscription as any).plan?.radarDurationDays ?? 30)
      : 30;
    const radarExpiresAt = new Date();
    radarExpiresAt.setDate(radarExpiresAt.getDate() + radarDays);

    // Radarı aktifleştir
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isRadarActive: true,
        radarActivatedAt: new Date(),
        radarExpiresAt,
      } as any,
    });

    // İlk tarama — mevcut ilanlarla eşleşme
    const profile: RadarUserProfile = {
      id: user.id,
      istihdamTuru: user.istihdamTuru,
      city: user.city,
      targetCities: user.targetCities,
      kurum: user.kurum,
      unvan: user.unvan,
      bakanlik: user.bakanlik,
    };

    const matches = await scanExistingListings(profile);

    console.log(`[Radar] Kullanıcı ${user.id} radarı aktifleştirdi (${radarDays} gün). ${matches.length} eşleşme bulundu.`);

    return NextResponse.json({
      success: true,
      message: `Kamulog Radar ${radarDays} gün boyunca aktifleştirildi!`,
      isRadarActive: true,
      radarActivatedAt: new Date().toISOString(),
      radarExpiresAt: radarExpiresAt.toISOString(),
      radarDurationDays: radarDays,
      matches,
      matchCount: matches.length,
    });
  } catch (error) {
    console.error("RADAR POST HATASI:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
