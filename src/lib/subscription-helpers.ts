import { prisma } from "@/lib/prisma";

/**
 * Kullanıcının Becayiş Premium durumunu kontrol eder.
 * Subscription tablosunda aktif kayıt + endsAt > now kontrolü.
 * Admin panelden verilen premium'lar da User.isPremium ile kontrol edilir.
 */
export async function isUserPremium(userId: string): Promise<boolean> {
  // 1. Subscription tablosunda aktif kayıt var mı?
  const activeSubscription = await prisma.subscription.findFirst({
    where: { userId, status: "active", endsAt: { gt: new Date() } },
  });
  if (activeSubscription) return true;

  // 2. Admin panelden verilen premium (premiumUntil kontrolü)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true, premiumUntil: true },
  });
  if (!user) return false;

  // premiumUntil geçmişse isPremium'ı false yap
  if (user.isPremium && user.premiumUntil && user.premiumUntil < new Date()) {
    await prisma.user.update({
      where: { id: userId },
      data: { isPremium: false, subscriptionTier: null },
    });
    return false;
  }

  return user.isPremium;
}

/**
 * Kullanıcının Kariyer Premium durumunu kontrol eder.
 */
export async function isUserCareerPremium(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isCareerPremium: true, careerPremiumUntil: true },
  });
  if (!user) return false;

  // careerPremiumUntil geçmişse isCareerPremium'ı false yap
  if (user.isCareerPremium && user.careerPremiumUntil && user.careerPremiumUntil < new Date()) {
    await prisma.user.update({
      where: { id: userId },
      data: { isCareerPremium: false },
    });
    return false;
  }

  return user.isCareerPremium === true;
}

/**
 * Mağaza satın alma işlemini StoreTransaction tablosuna loglar.
 */
export async function logStoreTransaction(data: {
  userId: string;
  store: string;
  productId: string;
  transactionId?: string;
  type: "SUBSCRIPTION" | "CONSUMABLE";
  amount?: number;
  currency?: string;
  rawPayload?: string;
}) {
  try {
    await prisma.storeTransaction.create({
      data: {
        userId: data.userId,
        store: data.store,
        productId: data.productId,
        transactionId: data.transactionId || null,
        type: data.type,
        amount: data.amount || 0,
        currency: data.currency || "TRY",
        rawPayload: data.rawPayload?.substring(0, 2000) || null,
      },
    });
  } catch (e) {
    // transactionId unique constraint ihlali olabilir — sessizce geç
    console.error("[StoreTransaction] Log hatası:", e);
  }
}
