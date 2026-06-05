import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/services/notificationService";

/**
 * Kullanıcı profil bilgilerini token (userId) ile getir veya güncelle.
 * Flutter uygulaması Header'da `Authorization: Token <userId>` gönderir.
 *
 * Ek güvenlik: Token mevcut kullanıcıya eşleşmezse, phone/email ile ara.
 */

async function resolveUser(req: Request) {
    const auth = req.headers.get("authorization");
    if (!auth) return null;

    const parts = auth.split(" ");
    const token = parts.length === 2 ? parts[1] : auth;
    if (!token) return null;

    // 1. Önce ID ile bul
    let user = await prisma.user.findUnique({ where: { id: token } });
    if (user) return user;

    // 2. ID bulunamazsa — token eski/geçersiz olabilir
    // Phone header'dan geldiğinde phone ile ara
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

const USER_SELECT = {
    id: true,
    name: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    phoneNumber: true,
    avatarUrl: true,
    role: true,
    isVerified: true,
    isActive: true,
    accountFrozen: true,
    accountDeleted: true,
    subscriptionTier: true,
    istihdamTuru: true,
    title: true,
    credits: true, consultantJetons: true,
    aiTokens: true,
    isPremium: true, isCareerPremium: true, careerPremiumUntil: true, careerAiTokens: true,
    premiumUntil: true,
    tcKimlik: true,
    city: true,
    district: true,
    address: true,
    postalCode: true,
    yearsWorking: true, isAriyor: true,
    bakanlik: true,
    kurum: true,
    unvan: true,
    atamaUsulu: true,
    subInstitutionId: true,
    isWorkInfoGeneratedByAI: true,
    isLookingForBecayis: true,
    targetCities: true,
    aiGeneratedBecayisText: true,
    alternativeCities: true,
    emailVerified: true,
    phoneVerified: true,
    kvkkAccepted: true,
    userAgreementAccepted: true,
    notifEmail: true,
    notifWhatsapp: true,
    notifPush: true,
    notifSms: true,
    lastLoginMethod: true,
    lastEmailChangeDate: true,
    lastPhoneChangeDate: true,
    createdAt: true,
    updatedAt: true,
};

// ── GET — Tüm profil bilgilerini döndür ──
export async function GET(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json(
                { error: "Kullanıcı bulunamadı.", reauth: true },
                { status: 404 }
            );
        }

        // Detaylı profil bilgilerini yeniden çek (select ile)
        const profile = await prisma.user.findUnique({
            where: { id: user.id },
            select: USER_SELECT,
        });

        if (!profile) {
            return NextResponse.json(
                { error: "Kullanıcı bulunamadı.", reauth: true },
                { status: 404 }
            );
        }

        // ── isPremium oto-senkronizasyon ──
        // Aktif abonelik varsa ama isPremium false ise düzelt
        let resolvedIsPremium = profile.isPremium;
        if (!profile.isPremium) {
            const activeSub = await prisma.subscription.findFirst({
                where: {
                    userId: user.id,
                    status: "active",
                    endsAt: { gte: new Date() },
                },
                select: { id: true },
            });
            if (activeSub) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { isPremium: true },
                });
                resolvedIsPremium = true;
                console.log(`[Profile] isPremium auto-sync → true (userId: ${user.id})`);
            }
        }

        // ── isConsultant kontrolü ──
        // Admin panelinden danışman/uzman olarak atanmış mı?
        const consultantRecord = await prisma.consultant.findFirst({
            where: { userId: user.id, isActive: true },
            select: { id: true },
        });
        const isConsultant = !!consultantRecord;

        const responseData = {
            ...profile,
            isPremium: resolvedIsPremium,
            isConsultant,
            emailVerified: profile.emailVerified != null,
            phone: profile.phone || profile.phoneNumber,
        };

        return NextResponse.json({ user: responseData, token: profile.id });
    } catch (error) {
        console.error("Profile GET error:", error);
        return NextResponse.json(
            { error: "Sunucu hatası" },
            { status: 500 }
        );
    }
}

// ── PUT — Profil bilgilerini güncelle ──

// İstihdam türünden role'e dönüştür
function istihdamToRole(istihdamTuru: string): string {
    const lower = istihdamTuru.toLowerCase().trim();
    if (lower.includes("işçi") || lower.includes("isci") || lower.includes("4/d")) {
        return "isci";
    }
    if (lower.includes("sözleşmeli") || lower.includes("sozlesmeli") || lower.includes("4/b")) {
        return "sozlesmeli";
    }
    if (lower.includes("memur") || lower.includes("4/a") || lower.includes("kadrolu")) {
        return "memur";
    }
    return "isci"; // default
}

export async function PUT(req: Request) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json(
                { error: "Kullanıcı bulunamadı.", reauth: true },
                { status: 404 }
            );
        }

        const body = await req.json();
        console.log("Profile PUT - user:", user.id, "fields:", Object.keys(body).join(", "));

        // Güvenli güncelleme — sadece izin verilen alanları al
        const updateData: Record<string, unknown> = {};

        // String alanlar
        const stringFields = [
            "name",
            "firstName",
            "lastName",
            "tcKimlik",
            "city",
            "district",
            "address",
            "postalCode",
            "title",
            "istihdamTuru",
            "bakanlik",
            "kurum",
            "unvan",
            "atamaUsulu",
            "subInstitutionId",
            "aiGeneratedBecayisText",
            "targetCities",
            "alternativeCities",
            // subscriptionTier, lastLoginMethod: KALDIRILDI (güvenlik)
        ];
        for (const field of stringFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        // ── employmentType → istihdamTuru otomatik eşleme ──
        // Flutter uygulaması "isci", "memur", "sozlesmeli" gönderir.
        // Bu değerleri resmi istihdamTuru formatına çevirip kaydediyoruz.
        if (body.employmentType && !updateData.istihdamTuru) {
            const empMap: Record<string, string> = {
                isci: "4/D İşçi",
                memur: "4/A Kadrolu Memur",
                sozlesmeli: "4/B Sözleşmeli Personel",
            };
            const mapped = empMap[body.employmentType];
            if (mapped) {
                updateData.istihdamTuru = mapped;
            }
            // employmentType'ı da olduğu gibi kaydet (eski uyumluluk)
            updateData.employmentType = body.employmentType;
        }

        // Integer alanlar — credits ve isPremium ASLA profil güncellemesiyle değiştirilemez
        // (sadece transaction endpoint'leri veya admin paneli üzerinden)
        if (body.yearsWorking !== undefined)
            updateData.yearsWorking = Number(body.yearsWorking);

        // Boolean alanlar — isPremium bloklandı (güvenlik)
        // phoneVerified: KALDIRILDI — sadece doğrulama endpoint'leri yazabilir (güvenlik)
        if (body.kvkkAccepted !== undefined)
            updateData.kvkkAccepted = Boolean(body.kvkkAccepted);
        if (body.userAgreementAccepted !== undefined)
            updateData.userAgreementAccepted = Boolean(body.userAgreementAccepted);
        if (body.isAriyor !== undefined)
            updateData.isAriyor = Boolean(body.isAriyor);
        if (body.isWorkInfoGeneratedByAI !== undefined)
            updateData.isWorkInfoGeneratedByAI = Boolean(body.isWorkInfoGeneratedByAI);
        if (body.isLookingForBecayis !== undefined)
            updateData.isLookingForBecayis = Boolean(body.isLookingForBecayis);
        // emailVerified: KALDIRILDI — sadece doğrulama endpoint'leri yazabilir (güvenlik)

        // DateTime alanlar
        if (body.lastEmailChangeDate) {
            updateData.lastEmailChangeDate = new Date(
                body.lastEmailChangeDate
            );
        }
        if (body.lastPhoneChangeDate) {
            updateData.lastPhoneChangeDate = new Date(
                body.lastPhoneChangeDate
            );
        }

        // ── Crowdsourcing: Yeni Alt Kurum Ekleme ──
        if (body.newSubInstitutionName && body.bakanlik) {
            // Title Case + trim
            const rawName = String(body.newSubInstitutionName).trim();
            const titleCaseName = rawName
                .split(" ")
                .map((w: string) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1).toLocaleLowerCase("tr-TR"))
                .join(" ");

            if (titleCaseName.length >= 5) {
                // Bakanlığı bul
                const parentInst = await prisma.institution.findUnique({
                    where: { name: body.bakanlik },
                });

                if (parentInst) {
                    // Aynı isimde var mı kontrol et
                    let subInst = await prisma.subInstitution.findUnique({
                        where: {
                            name_institutionId: {
                                name: titleCaseName,
                                institutionId: parentInst.id,
                            },
                        },
                    });

                    if (!subInst) {
                        // Yoksa oluştur (isApproved: false → admin onayı bekler)
                        subInst = await prisma.subInstitution.create({
                            data: {
                                name: titleCaseName,
                                institutionId: parentInst.id,
                                isApproved: false,
                            },
                        });
                        console.log(`[SubInst] Yeni alt kurum: "${titleCaseName}" (onay bekliyor)`);
                    }

                    updateData.subInstitutionId = subInst.id;
                }
            }
        }

        // TC Kimlik benzersizlik kontrolü
        if (updateData.tcKimlik) {
            const existing = await prisma.user.findFirst({
                where: {
                    tcKimlik: updateData.tcKimlik as string,
                    id: { not: user.id },
                },
            });
            if (existing) {
                return NextResponse.json(
                    {
                        error: "Bu TC Kimlik numarası başka bir hesapta kayıtlı.",
                    },
                    { status: 409 }
                );
            }
        }

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
            select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                phoneNumber: true,
                avatarUrl: true,
                credits: true, consultantJetons: true,
                isPremium: true, isCareerPremium: true, careerPremiumUntil: true, careerAiTokens: true,
                emailVerified: true,
                phoneVerified: true,
                kvkkAccepted: true,
                userAgreementAccepted: true,
    notifEmail: true,
    notifWhatsapp: true,
    notifPush: true,
    notifSms: true,
                city: true,
                district: true,
                tcKimlik: true,
                title: true,
                istihdamTuru: true,
                yearsWorking: true, isAriyor: true,
                bakanlik: true,
                kurum: true,
                unvan: true,
                atamaUsulu: true,
                subInstitutionId: true,
                isWorkInfoGeneratedByAI: true,
                isLookingForBecayis: true,
                aiGeneratedBecayisText: true,
                targetCities: true,
                alternativeCities: true,
                address: true,
                postalCode: true,
                updatedAt: true,
            },
        });

        // ── Becayiş profil alanları değiştiyse → aktif ilanları taslağa al ──
        const becayisFields = [
            "city", "istihdamTuru", "bakanlik", "kurum",
            "unvan", "atamaUsulu", "targetCities", "alternativeCities",
        ];
        const hasBecayisChange = becayisFields.some((f) => body[f] !== undefined);

        if (hasBecayisChange) {
            // İstihdam türü değiştiyse → mevcut ilanların role alanını güncelle
            if (body.istihdamTuru) {
                const newRole = istihdamToRole(body.istihdamTuru);
                await prisma.becayisListing.updateMany({
                    where: { ownerId: user.id },
                    data: { role: newRole },
                });
                console.log(
                    `[Profile] ${user.id} istihdamTuru değişti → tüm ilanlar role=${newRole}`
                );
            }

            // Kullanıcının aktif ilanlarını bul
            const activeListings = await prisma.becayisListing.findMany({
                where: {
                    ownerId: user.id,
                    status: { in: ["approved", "published", "active"] },
                },
                select: { id: true, title: true },
            });

            if (activeListings.length > 0) {
                // Tüm aktif ilanları taslağa al
                await prisma.becayisListing.updateMany({
                    where: {
                        ownerId: user.id,
                        status: { in: ["approved", "published", "active"] },
                    },
                    data: { status: "draft" },
                });

                console.log(
                    `[Profile] ${user.id} profil güncelledi → ${activeListings.length} ilan taslağa alındı`
                );

                // Bildirim gönder
                try {
                    await createNotification({
                        userId: user.id,
                        title: "📋 İlanlarınız Taslağa Alındı",
                        message:
                            "Becayiş profil bilgileriniz güncellendiği için " +
                            `${activeListings.length} adet ilanınız taslak olarak işaretlendi. ` +
                            "Lütfen ilanlarınızı kontrol edip yeniden yayına gönderin.",
                        type: "PROFILE_UPDATE",
                        payload: {
                            listingCount: activeListings.length,
                            action: "profile_updated_draft",
                        },
                    });
                    console.log(`[Profile] Bildirim gönderildi → ${user.id}`);
                } catch (notifErr) {
                    console.error(`[Profile] Bildirim gönderilemedi:`, notifErr);
                }
            }
        }

        return NextResponse.json({
            user: {
                ...updated,
                emailVerified: updated.emailVerified != null,
                phone: updated.phone || updated.phoneNumber,
            },
            token: updated.id,
        });
    } catch (error) {
        console.error("Profile PUT error:", error);
        const msg =
            error instanceof Error ? error.message : "Sunucu hatası";
        if (msg.includes("Unique constraint")) {
            return NextResponse.json(
                { error: "Bu bilgi başka bir hesapta zaten kayıtlı." },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
