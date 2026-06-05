"use client";

import { useState, useMemo } from "react";
import { Search, Trash2, Loader2, CheckSquare, Square, XSquare } from "lucide-react";
import { useRouter } from "next/navigation";

interface OrderItem {
  id: string;
  orderNumber: string;
  amount: number;
  status: string;
  invoiceStatus: string;
  notes: string | null;
  createdAt: string;
  user: { id: string; name: string | null; firstName: string | null; lastName: string | null; email: string | null };
  plan: { name: string; price: number } | null;
}

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; color: string }> = {
    COMPLETED: { label: "Tamamlandı", color: "bg-green-500/20 text-green-400" },
    MANUAL: { label: "Manuel", color: "bg-blue-500/20 text-blue-400" },
    PENDING: { label: "Beklemede", color: "bg-yellow-500/20 text-yellow-400" },
    CANCELLED: { label: "İptal", color: "bg-red-500/20 text-red-400" },
    REFUNDED: { label: "İade", color: "bg-purple-500/20 text-purple-400" },
  };
  return map[status] || { label: status, color: "bg-gray-500/20 text-gray-400" };
};

const invoiceBadge = (status: string) => {
  const map: Record<string, { label: string; color: string }> = {
    UNSENT: { label: "Gönderilmedi", color: "bg-gray-500/20 text-gray-400" },
    SENT: { label: "Gönderildi", color: "bg-green-500/20 text-green-400" },
    PENDING: { label: "Hazırlanıyor", color: "bg-yellow-500/20 text-yellow-400" },
  };
  return map[status] || { label: status, color: "bg-gray-500/20 text-gray-400" };
};

export function OrderSearch({ orders }: { orders: OrderItem[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    if (!query.trim()) return orders;
    const q = query.toLowerCase().trim();
    return orders.filter((o) => {
      const userName = [o.user.name, o.user.firstName, o.user.lastName].filter(Boolean).join(" ").toLowerCase();
      const email = (o.user.email || "").toLowerCase();
      return o.orderNumber.toLowerCase().includes(q) || userName.includes(q) || email.includes(q);
    });
  }, [orders, query]);

  const allSelected = filtered.length > 0 && filtered.every((o) => selected.has(o.id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((o) => o.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleDeleteOne = async (id: string) => {
    if (!confirm("Bu siparişi silmek istediğinize emin misiniz?")) return;
    setDeleteLoading(id);
    try {
      await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_orders", ids: [id] }),
      });
      router.refresh();
    } catch (e) { console.error(e); }
    finally { setDeleteLoading(null); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Seçili ${selected.size} siparişi silmek istediğinize emin misiniz?`)) return;
    setBulkLoading(true);
    try {
      await fetch("/api/admin/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_orders", ids: Array.from(selected) }),
      });
      setSelected(new Set());
      router.refresh();
    } catch (e) { console.error(e); }
    finally { setBulkLoading(false); }
  };

  return (
    <>
      <div className="px-6 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder="Sipariş no, e-posta veya isim ile ara..." value={query} onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl"
            style={{ background: "var(--bg-muted)", color: "var(--text)", border: "1px solid var(--border)" }}
          />
        </div>
        {query && <p className="text-xs ml-3" style={{ color: "var(--text-muted)" }}>{filtered.length} sonuç</p>}
      </div>

      {/* Bulk Action Bar */}
      {someSelected && (
        <div className="px-6 py-2.5 flex items-center gap-3" style={{ background: "rgba(239,68,68,0.08)", borderBottom: "1px solid var(--border)" }}>
          <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{selected.size} seçili</span>
          <button onClick={handleBulkDelete} disabled={bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50">
            {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Toplu Sil
          </button>
          <button onClick={() => setSelected(new Set())} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-text-muted hover:bg-white/10 transition-colors">
            <XSquare className="w-3.5 h-3.5" /> Seçimi Kaldır
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-white/5">
            <th className="text-left px-4 py-3 w-10">
              <button onClick={toggleAll} className="transition-colors">
                {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-text-muted" />}
              </button>
            </th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Sipariş No</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Kullanıcı</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Plan</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Tutar</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Durum</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Fatura</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Tarih</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">İşlem</th>
          </tr></thead>
          <tbody>
            {filtered.map((order) => {
              const st = statusBadge(order.status);
              const inv = invoiceBadge(order.invoiceStatus);
              const userName = order.user.name || `${order.user.firstName || ""} ${order.user.lastName || ""}`.trim() || order.user.email || "Anonim";
              const isChecked = selected.has(order.id);
              const isDeleting = deleteLoading === order.id;
              return (
                <tr key={order.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] ${isChecked ? "bg-primary/5" : ""}`}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleOne(order.id)} className="transition-colors">
                      {isChecked ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-text-muted" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-mono font-medium" style={{ color: "var(--primary)" }}>{order.orderNumber}</p>
                    {order.notes && <p className="text-[10px] text-text-muted mt-0.5">{order.notes.slice(0, 40)}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{userName}</td>
                  <td className="px-4 py-3 text-sm text-text-secondary">
                    {(order as any).orderType === "JETON"
                      ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">💎 Jeton</span>
                      : order.plan?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-accent">₺{order.amount}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span></td>
                  <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full ${inv.color}`}>{inv.label}</span></td>
                  <td className="px-4 py-3 text-xs text-text-muted">{new Date(order.createdAt).toLocaleDateString("tr-TR")}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDeleteOne(order.id)} disabled={isDeleting}
                      className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50" title="Sil">
                      {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-text-muted">{query ? "Aramayla eşleşen sipariş bulunamadı." : "Henüz sipariş bulunmuyor."}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
