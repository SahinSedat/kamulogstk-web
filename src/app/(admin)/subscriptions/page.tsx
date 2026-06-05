export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { CreditCard, Users, TrendingUp, Package, Crown, XCircle, Target, Gem } from "lucide-react";
import { PremiumUserSearch, SubscriptionSearch, PlanManager, CancellationSearch } from "./PremiumUserSearch";
import CareerSubscriptionSearch from "./CareerSubscriptionSearch";
import SubscriptionTabs from "./SubscriptionTabs";

export default async function SubscriptionsPage() {
  const [plans, subscriptions, totalRevenue, cancelledSubscriptions] = await Promise.all([
    prisma.subscriptionPlan.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { subscriptions: true } } },
    }),
    prisma.subscription.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, firstName: true, lastName: true, email: true } },
        plan: { select: { name: true, price: true } },
      },
    }),
    prisma.order.count(),
    prisma.subscription.findMany({
      where: { status: "cancelled" },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true, name: true, firstName: true, lastName: true,
            email: true, phone: true, phoneNumber: true,
            tcKimlik: true, premiumUntil: true,
          },
        },
        plan: { select: { name: true, price: true, interval: true } },
      },
    }),
  ]);

  const premiumUsers = await prisma.user.findMany({
    where: { isPremium: true },
    orderBy: { premiumUntil: "desc" },
    select: {
      id: true, firstName: true, lastName: true, name: true, email: true,
      phone: true, phoneNumber: true, isPremium: true, premiumUntil: true,
      subscriptionTier: true, aiTokens: true, credits: true, createdAt: true,
    },
  });

  // Kariyer Premium kullanıcıları
  const careerPremiumUsers = await prisma.user.findMany({
    where: { isCareerPremium: true },
    orderBy: { careerPremiumUntil: "desc" },
    select: {
      id: true, firstName: true, lastName: true, name: true, email: true,
      phone: true, phoneNumber: true, isCareerPremium: true, careerPremiumUntil: true,
      careerAiTokens: true, createdAt: true,
    },
  });

  // Kariyer siparişleri
  const careerOrders = await prisma.order.findMany({
    where: { OR: [{ notes: { contains: "KARIYER" } }, { notes: { contains: "KARİYER" } }, { notes: { contains: "kariyer" } }] },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, name: true, firstName: true, lastName: true, email: true } },
    },
  });

  // Jeton siparişleri
  const jetonOrders = await prisma.order.findMany({
    where: { orderType: "JETON" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, firstName: true, lastName: true, email: true, consultantJetons: true } },
    },
  });

  // İptal edilen aboneliklere ait order numaralarını bul
  const cancelledUserIds = [...new Set(cancelledSubscriptions.map(s => s.userId))];
  const cancelledPlanIds = [...new Set(cancelledSubscriptions.map(s => s.planId))];
  const relatedOrders = cancelledUserIds.length > 0
    ? await prisma.order.findMany({
        where: {
          userId: { in: cancelledUserIds },
          planId: { in: cancelledPlanIds },
        },
        orderBy: { createdAt: "desc" },
        select: { userId: true, planId: true, orderNumber: true },
      })
    : [];

  const activeCount = subscriptions.filter((s) => s.status === "active").length;
  const totalPremium = premiumUsers.length;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentPremium = premiumUsers.filter(u => u.premiumUntil && new Date(u.premiumUntil) > thirtyDaysAgo).length;
  const cancelledCount = cancelledSubscriptions.length;
  const jetonCount = jetonOrders.length;
  const careerCount = careerPremiumUsers.length;

  // Serialize dates
  const serializedCareerUsers = careerPremiumUsers.map(u => ({
    ...u,
    careerPremiumUntil: u.careerPremiumUntil?.toISOString() || null,
    createdAt: u.createdAt.toISOString(),
  }));

  const serializedCareerOrders = careerOrders.map(o => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    user: o.user,
  }));

  const serializedJetonOrders = jetonOrders.map(o => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    user: o.user,
  }));

  const serializedUsers = premiumUsers.map(u => ({
    ...u,
    premiumUntil: u.premiumUntil?.toISOString() || null,
    createdAt: u.createdAt.toISOString(),
  }));

  const serializedSubs = subscriptions.map(s => ({
    ...s,
    endsAt: s.endsAt.toISOString(),
    startedAt: s.startedAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
  }));

  const serializedPlans = plans.map(p => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  }));

  const serializedCancellations = cancelledSubscriptions.map(s => {
    const order = relatedOrders.find(o => o.userId === s.userId && o.planId === s.planId) || null;
    return {
      ...s,
      endsAt: s.endsAt.toISOString(),
      startedAt: s.startedAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      user: {
        ...s.user,
        premiumUntil: s.user.premiumUntil?.toISOString() || null,
      },
      order: order ? { orderNumber: order.orderNumber } : null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="w-6 h-6 text-primary" /> Abonelik & Premium Yönetimi</h2>
          <p className="text-text-secondary text-sm mt-1">{plans.length} plan · {totalPremium} premium · {activeCount} aktif abonelik · {careerCount} kariyer · {jetonCount} jeton</p>
        </div>
      </div>

      {/* Stats — 6 kart */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-text-secondary text-xs">Toplam Plan</p><p className="text-2xl font-bold mt-1">{plans.length}</p></div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center"><Package className="w-5 h-5 text-white" /></div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-text-secondary text-xs">👑 Premium</p><p className="text-2xl font-bold mt-1">{totalPremium}</p></div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center"><Crown className="w-5 h-5 text-white" /></div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-text-secondary text-xs">Son 30 Gün</p><p className="text-2xl font-bold mt-1">{recentPremium}</p></div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center"><Users className="w-5 h-5 text-white" /></div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-text-secondary text-xs">🎯 Kariyer</p><p className="text-2xl font-bold mt-1">{careerCount}</p></div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-400 flex items-center justify-center"><Target className="w-5 h-5 text-white" /></div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-text-secondary text-xs">💎 Jeton</p><p className="text-2xl font-bold mt-1">{jetonCount}</p></div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-400 flex items-center justify-center"><Gem className="w-5 h-5 text-white" /></div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-text-secondary text-xs">🚫 İptal</p><p className="text-2xl font-bold mt-1">{cancelledCount}</p></div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-400 flex items-center justify-center"><XCircle className="w-5 h-5 text-white" /></div>
          </div>
        </div>
      </div>

      <SubscriptionTabs
        premiumUsersContent={
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-semibold">Premium Kullanıcılar ({totalPremium})</h3>
            </div>
            <PremiumUserSearch users={serializedUsers} />
          </div>
        }
        becayisSubscriptionsContent={
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
              <span className="text-lg">🤝</span>
              <h3 className="text-lg font-semibold">Becayiş Abonelikleri ({activeCount})</h3>
            </div>
            <SubscriptionSearch subscriptions={serializedSubs} plans={serializedPlans} />
          </div>
        }
        careerSubscriptionsContent={
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <h3 className="text-lg font-semibold">Kariyer Premium Abonelikleri ({careerCount})</h3>
            </div>
            <CareerSubscriptionSearch users={serializedCareerUsers} orders={serializedCareerOrders} />
          </div>
        }
        jetonPurchasesContent={
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
              <Gem className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold">Jeton Satın Alımları ({jetonCount})</h3>
            </div>
            <div className="p-4">
              {serializedJetonOrders.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Henüz jeton satın alımı yok.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left px-4 py-3 text-text-secondary font-medium">Kullanıcı</th>
                        <th className="text-left px-4 py-3 text-text-secondary font-medium">Sipariş No</th>
                        <th className="text-left px-4 py-3 text-text-secondary font-medium">Detay</th>
                        <th className="text-left px-4 py-3 text-text-secondary font-medium">Bakiye</th>
                        <th className="text-left px-4 py-3 text-text-secondary font-medium">Durum</th>
                        <th className="text-left px-4 py-3 text-text-secondary font-medium">Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serializedJetonOrders.map((order) => {
                        const userName = order.user?.firstName && order.user?.lastName
                          ? `${order.user.firstName} ${order.user.lastName}`
                          : order.user?.name || "Bilinmeyen";
                        return (
                          <tr key={order.id} className="border-b border-white/5 hover:bg-white/3">
                            <td className="px-4 py-3">
                              <div className="font-medium">{userName}</div>
                              <div className="text-xs text-text-secondary">{order.user?.email}</div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{order.orderNumber}</td>
                            <td className="px-4 py-3 text-xs">{order.notes}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-400">
                                💎 {order.user?.consultantJetons ?? 0}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                order.status === "COMPLETED" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                              }`}>
                                {order.status === "COMPLETED" ? "✅ Tamamlandı" : order.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-text-secondary">
                              {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        }
        plansContent={
          <div className="glass-card overflow-hidden">
            <PlanManager plans={serializedPlans} />
          </div>
        }
        cancellationsContent={
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-semibold">İptal Başvuruları ({cancelledCount})</h3>
            </div>
            <CancellationSearch cancellations={serializedCancellations} />
          </div>
        }
      />
    </div>
  );
}
