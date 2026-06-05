import { prisma } from "@/lib/prisma";

/**
 * Kamulog Radar — Simetrik Becayiş Eşleşme Algoritması
 * 
 * Kurallar:
 * 1. İstihdam Türü BİREBİR eşleşmeli
 * 2. Şehirler ÇAPRAZ eşleşmeli (Kullanıcı.city ↔ İlan.targetCity VE Kullanıcı.targetCities ↔ İlan.currentCity)
 * 3. Kurum benzer olmalı (contains)
 * 4. Unvan benzer olmalı (contains)
 */

export interface RadarUserProfile {
  id: string;
  istihdamTuru: string | null;
  city: string | null;
  targetCities: string | null;
  kurum: string | null;
  unvan: string | null;
  bakanlik: string | null;
}

export interface RadarListing {
  id: string;
  ownerId: string;
  title: string;
  currentCity: string;
  targetCity: string;
  istihdamTuru: string | null;
  kurum: string | null;
  unvan: string | null;
  bakanlik: string | null;
  adNumber: string | null;
  owner?: {
    firstName: string | null;
    lastName: string | null;
  };
}

export interface RadarMatch {
  listingId: string;
  listingTitle: string;
  adNumber: string | null;
  currentCity: string;
  targetCity: string;
  ownerName: string;
  matchScore: number; // 0-100 arası eşleşme skoru
  matchDetails: string[];
}

/**
 * Kullanıcının targetCities'ini parse eder
 */
function parseTargetCities(targetCities: string | null): string[] {
  if (!targetCities) return [];
  try {
    const parsed = JSON.parse(targetCities);
    if (Array.isArray(parsed)) return parsed.map((c: string) => c.trim().toLowerCase());
    return [targetCities.trim().toLowerCase()];
  } catch {
    return targetCities.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  }
}

/**
 * Simetrik eşleşme kontrolü — tek ilan vs tek kullanıcı
 */
export function checkSymmetricMatch(
  profile: RadarUserProfile,
  listing: RadarListing
): RadarMatch | null {
  const matchDetails: string[] = [];
  let score = 0;

  // 1. İstihdam Türü BİREBİR eşleşmeli (zorunlu)
  if (!profile.istihdamTuru || !listing.istihdamTuru) return null;
  if (profile.istihdamTuru.toLowerCase().trim() !== listing.istihdamTuru.toLowerCase().trim()) return null;
  matchDetails.push(`İstihdam: ${profile.istihdamTuru}`);
  score += 30;

  // 2. Çapraz şehir eşleşmesi (zorunlu)
  const userCity = profile.city?.toLowerCase().trim();
  const userTargets = parseTargetCities(profile.targetCities);
  const listCity = listing.currentCity.toLowerCase().trim();
  const listTarget = listing.targetCity.toLowerCase().trim();

  if (!userCity || userTargets.length === 0) return null;

  // Çapraz: Kullanıcı.city === İlan.targetCity AND İlan.currentCity in Kullanıcı.targetCities
  const cityMatch = userCity === listTarget && userTargets.includes(listCity);
  if (!cityMatch) return null;
  matchDetails.push(`Şehir: ${userCity} ↔ ${listCity}`);
  score += 30;

  // 3. Kurum benzerliği (opsiyonel ama skorlama)
  if (profile.kurum && listing.kurum) {
    const pKurum = profile.kurum.toLowerCase().trim();
    const lKurum = listing.kurum.toLowerCase().trim();
    if (pKurum.includes(lKurum) || lKurum.includes(pKurum)) {
      matchDetails.push(`Kurum: ${listing.kurum}`);
      score += 20;
    }
  } else if (profile.bakanlik && listing.bakanlik) {
    const pBak = profile.bakanlik.toLowerCase().trim();
    const lBak = listing.bakanlik.toLowerCase().trim();
    if (pBak.includes(lBak) || lBak.includes(pBak)) {
      matchDetails.push(`Bakanlık: ${listing.bakanlik}`);
      score += 15;
    }
  }

  // 4. Unvan benzerliği (opsiyonel ama skorlama)
  if (profile.unvan && listing.unvan) {
    const pUnvan = profile.unvan.toLowerCase().trim();
    const lUnvan = listing.unvan.toLowerCase().trim();
    if (pUnvan.includes(lUnvan) || lUnvan.includes(pUnvan)) {
      matchDetails.push(`Unvan: ${listing.unvan}`);
      score += 20;
    }
  }

  // Kendi ilanıyla eşleşmeyi engelle
  if (listing.ownerId === profile.id) return null;

  const ownerName = listing.owner
    ? `${listing.owner.firstName || ""} ${listing.owner.lastName || ""}`.trim()
    : "Bilinmeyen";

  return {
    listingId: listing.id,
    listingTitle: listing.title,
    adNumber: listing.adNumber,
    currentCity: listing.currentCity,
    targetCity: listing.targetCity,
    ownerName,
    matchScore: Math.min(score, 100),
    matchDetails,
  };
}

/**
 * Kullanıcı profilini mevcut ilanlarla tarar (İlk aktivasyon taraması)
 */
export async function scanExistingListings(profile: RadarUserProfile): Promise<RadarMatch[]> {
  // Sadece aktif ilanları tara
  const listings = await prisma.becayisListing.findMany({
    where: {
      status: { in: ["published", "approved", "active"] },
      ownerId: { not: profile.id },
    },
    select: {
      id: true, ownerId: true, title: true, currentCity: true, targetCity: true,
      istihdamTuru: true, kurum: true, unvan: true, bakanlik: true, adNumber: true,
      owner: { select: { firstName: true, lastName: true } },
    },
  });

  const matches: RadarMatch[] = [];
  for (const listing of listings) {
    const match = checkSymmetricMatch(profile, listing as RadarListing);
    if (match) matches.push(match);
  }

  // En yüksek skor önce
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Yeni ilan oluşturulduğunda radar aktif kullanıcılarla eşleştir (Nöbetçi)
 * Eşleşen kullanıcılara: In-App + FCM + Email + WhatsApp bildirim gönder
 */
export async function checkRadarMatches(listing: RadarListing): Promise<void> {
  try {
    // Radar aktif + premium + planında radar olan + süresi dolmamış kullanıcıları bul
    const radarUsers = await prisma.user.findMany({
      where: {
        isRadarActive: true,
        isPremium: true,
        id: { not: listing.ownerId }, // İlan sahibini hariç tut
        radarExpiresAt: { gte: new Date() }, // Süresi dolmamış
        subscriptions: {
          some: {
            status: "active",
            endsAt: { gte: new Date() },
            plan: { hasRadarFeature: true },
          },
        },
      },
      select: {
        id: true, istihdamTuru: true, city: true, targetCities: true,
        kurum: true, unvan: true, bakanlik: true,
        email: true, phone: true, phoneNumber: true,
        firstName: true, lastName: true, fcmToken: true,
        notifEmail: true, notifWhatsapp: true, notifPush: true, notifSms: true,
      },
    });

    console.log(`[Radar] Nöbetçi: ${radarUsers.length} aktif radar kullanıcısı kontrol ediliyor — İlan: ${listing.title}`);

    for (const user of radarUsers) {
      const match = checkSymmetricMatch(user as RadarUserProfile, listing);
      if (!match) continue;

      const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Kamulog Kullanıcısı";

      console.log(`[Radar] 🎯 EŞLEŞMESİ: ${userName} (${user.id}) için İlan "${listing.title}" — Skor: ${match.matchScore}`);

      // 1. In-App + FCM Push Bildirim
      if (user.notifPush) {
        try {
          const { createNotification } = await import("@/lib/services/notificationService");
          await createNotification({
            userId: user.id,
            title: "🎯 Radar Eşleşmesi!",
            message: `"${listing.title}" ilanı profilinizle %${match.matchScore} oranında eşleşiyor. Detayları inceleyin.`,
            type: "SYSTEM",
            payload: {
              action: "radar_match",
              listingId: listing.id,
              matchScore: match.matchScore,
              matchDetails: match.matchDetails,
            },
          });
        } catch (e) {
          console.error(`[Radar] In-App/FCM bildirim hatası — User: ${user.id}:`, e);
        }
      }

      // 2. Email Bildirim
      if (user.notifEmail && user.email && !user.email.endsWith("@kamulog.net")) {
        try {
          await sendRadarMatchEmail({
            recipientEmail: user.email,
            recipientName: userName,
            listingTitle: listing.title,
            matchScore: match.matchScore,
            matchDetails: match.matchDetails,
            listingId: listing.id,
            currentCity: listing.currentCity,
            targetCity: listing.targetCity,
          });
        } catch (e) {
          console.error(`[Radar] Email hatası — ${user.email}:`, e);
        }
      }

      // 3. WhatsApp Bildirim
      const phone = user.phone || user.phoneNumber;
      if (user.notifWhatsapp && phone) {
        try {
          await sendRadarMatchWhatsApp({
            recipientPhone: phone,
            recipientName: userName,
            listingTitle: listing.title,
            matchScore: match.matchScore,
            matchDetails: match.matchDetails,
          });
        } catch (e) {
          console.error(`[Radar] WhatsApp hatası — ${phone}:`, e);
        }
      }
    }
  } catch (error) {
    console.error("[Radar] Nöbetçi kontrol hatası:", error);
  }
}

// ─── Radar Bildirim Yardımcıları ──────────────────────────────

const BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:3101";

/**
 * Radar eşleşmesi → E-posta bildirimi (Mor temalı, Radar'a özel)
 */
async function sendRadarMatchEmail(params: {
  recipientEmail: string;
  recipientName: string;
  listingTitle: string;
  matchScore: number;
  matchDetails: string[];
  listingId: string;
  currentCity: string;
  targetCity: string;
}) {
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_TX_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_TX_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_TX_USER,
        pass: process.env.SMTP_TX_PASS,
      },
    });

    const detailsHtml = params.matchDetails
      .map(d => `<li style="color:#374151;font-size:13px;padding:2px 0;">✅ ${d}</li>`)
      .join("");

    const txFrom = process.env.SMTP_TX_FROM || "Kamulog <iletisim@kamulogstk.net>";

    await transporter.sendMail({
      from: txFrom,
      to: params.recipientEmail,
      subject: `🎯 Radar Eşleşmesi — %${params.matchScore} Uyum | ${params.listingTitle}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:linear-gradient(135deg,#7C3AED,#8B5CF6);padding:20px;border-radius:12px 12px 0 0;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:20px;">🎯 Kamulog Radar Eşleşmesi</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Profilinize uygun yeni bir ilan bulundu!</p>
          </div>
          <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p style="color:#374151;font-size:15px;line-height:1.6;">
              Merhaba <strong>${params.recipientName}</strong>,
            </p>
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="color:#7C3AED;font-size:16px;font-weight:bold;margin:0 0 8px;">
                📋 ${params.listingTitle}
              </p>
              <p style="color:#6b7280;font-size:13px;margin:0;">
                📍 ${params.currentCity} → ${params.targetCity}
              </p>
              <div style="background:#7C3AED;color:#fff;display:inline-block;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:bold;margin-top:8px;">
                %${params.matchScore} Eşleşme
              </div>
            </div>
            <p style="color:#374151;font-size:14px;font-weight:bold;margin:16px 0 8px;">Eşleşme Detayları:</p>
            <ul style="margin:0;padding-left:20px;">${detailsHtml}</ul>
            <p style="color:#6b7280;font-size:13px;margin-top:16px;">
              Kamulog uygulamasından ilan detaylarını inceleyebilirsiniz.
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
            <p style="color:#9ca3af;font-size:11px;text-align:center;">
              Bu e-posta Kamulog Radar tarafından otomatik gönderilmiştir.<br>
              <a href="https://kamulog.net" style="color:#7C3AED;">kamulog.net</a>
            </p>
          </div>
        </div>
      `,
    });
    console.log(`[Radar Email] ✅ → ${params.recipientEmail} | İlan: ${params.listingTitle}`);
  } catch (e) {
    console.error(`[Radar Email] ❌ → ${params.recipientEmail}:`, e);
  }
}

/**
 * Radar eşleşmesi → WhatsApp bildirimi
 */
async function sendRadarMatchWhatsApp(params: {
  recipientPhone: string;
  recipientName: string;
  listingTitle: string;
  matchScore: number;
  matchDetails: string[];
}) {
  try {
    const message =
      `🎯 *Kamulog Radar Eşleşmesi!*\n\n` +
      `Merhaba ${params.recipientName},\n` +
      `Profilinize uygun yeni bir becayiş ilanı bulundu.\n\n` +
      `📋 *${params.listingTitle}*\n` +
      `📊 Eşleşme: %${params.matchScore}\n\n` +
      `✅ ${params.matchDetails.join("\n✅ ")}\n\n` +
      `Kamulog uygulamasından detayları inceleyebilirsiniz.`;

    const res = await fetch(`${BOT_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: params.recipientPhone, message }),
    });
    const data = await res.json();

    if (data.sent) {
      console.log(`[Radar WhatsApp] ✅ → ${params.recipientPhone}`);
    } else {
      console.warn(`[Radar WhatsApp] ⚠️ Gönderilemedi → ${params.recipientPhone}`);
    }
  } catch (e) {
    console.error(`[Radar WhatsApp] ❌ → ${params.recipientPhone}:`, e);
  }
}

