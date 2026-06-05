export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { ShoppingBag, TrendingUp, DollarSign, Package, Search } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { OrderSearch } from "./OrderSearch";

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, firstName: true, lastName: true, email: true } },
      plan: { select: { name: true, price: true } },
    },
  });

  const completedOrders = orders.filter((o) => o.status === "COMPLETED" || o.status === "MANUAL");
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2"><ShoppingBag className="w-6 h-6 text-pink-400" /> Siparişler & Gelir</h2>
        <p className="text-text-secondary text-sm mt-1">{orders.length} sipariş kaydı</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-text-secondary text-xs">Toplam Sipariş</p><p className="text-2xl font-bold mt-1">{orders.length}</p></div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center"><Package className="w-5 h-5 text-white" /></div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-text-secondary text-xs">Tamamlanan</p><p className="text-2xl font-bold mt-1">{completedOrders.length}</p></div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-white" /></div>
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-text-secondary text-xs">Toplam Gelir</p><p className="text-2xl font-bold mt-1 text-accent">₺{totalRevenue.toLocaleString("tr-TR")}</p></div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center"><DollarSign className="w-5 h-5 text-white" /></div>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <OrderSearch orders={JSON.parse(JSON.stringify(orders))} />
      </div>
    </div>
  );
}
