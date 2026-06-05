"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Trash2, CheckSquare, Square, ChevronLeft, ChevronRight, Coins, X } from "lucide-react";

interface JetonOrder {
  id: string;
  orderNumber: string;
  amount: number;
  status: string;
  notes: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    credits: number;
  } | null;
}

export default function JetonOrdersManager() {
  const [orders, setOrders] = useState<JetonOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/jeton-orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Jeton siparişleri yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
    setSelectedIds(new Set());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map(o => o.id)));
    }
  };

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`${ids.length} sipariş silinecek. Emin misiniz?`)) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/jeton-orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedIds(new Set());
        await fetchOrders();
      } else {
        alert(data.error || "Silme hatası");
      }
    } catch {
      alert("Silme hatası");
    } finally {
      setDeleting(false);
    }
  };

  const parseJetonFromNotes = (notes: string | null): string => {
    if (!notes) return "—";
    const match = notes.match(/(\d+)\s*(Jeton|Danış)/i);
    return match ? match[1] : "—";
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("tr-TR", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4 mt-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500 text-white">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              Jeton Satın Alma Geçmişi
            </h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {total} sipariş bulundu
            </p>
          </div>
        </div>

        {/* Toplu Sil */}
        {selectedIds.size > 0 && (
          <button
            onClick={() => handleDelete(Array.from(selectedIds))}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Siliniyor..." : `${selectedIds.size} Seçili Sil`}
          </button>
        )}
      </div>

      {/* Arama */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="İsim, e-posta, telefon veya sipariş no ile arayın..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm outline-none"
            style={{ border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
          />
          {searchInput && (
            <button onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: "var(--primary)" }}
        >
          Ara
        </button>
      </div>

      {/* Tablo */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2" style={{ borderColor: "var(--primary)" }} />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Coins className="w-10 h-10 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {search ? "Arama sonucu bulunamadı." : "Henüz jeton siparişi yok."}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                <th className="px-3 py-2.5 w-10">
                  <button onClick={toggleSelectAll} className="flex items-center justify-center">
                    {selectedIds.size === orders.length ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                    )}
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 font-semibold" style={{ color: "var(--text-muted)" }}>Kullanıcı</th>
                <th className="text-center px-3 py-2.5 font-semibold" style={{ color: "var(--text-muted)" }}>Jeton</th>
                <th className="text-center px-3 py-2.5 font-semibold" style={{ color: "var(--text-muted)" }}>Mevcut Bakiye</th>
                <th className="text-center px-3 py-2.5 font-semibold" style={{ color: "var(--text-muted)" }}>Tutar</th>
                <th className="text-left px-3 py-2.5 font-semibold" style={{ color: "var(--text-muted)" }}>Sipariş No</th>
                <th className="text-left px-3 py-2.5 font-semibold" style={{ color: "var(--text-muted)" }}>Tarih</th>
                <th className="text-center px-3 py-2.5 font-semibold" style={{ color: "var(--text-muted)" }}>Durum</th>
                <th className="px-3 py-2.5 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr
                  key={order.id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--border)", background: selectedIds.has(order.id) ? "rgba(99,102,241,0.04)" : undefined }}
                >
                  <td className="px-3 py-2.5">
                    <button onClick={() => toggleSelect(order.id)} className="flex items-center justify-center">
                      {selectedIds.has(order.id) ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                        {order.user?.name || "—"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {order.user?.email || order.user?.phone || "—"}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="font-bold text-indigo-600">💎 {parseJetonFromNotes(order.notes)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="font-semibold text-emerald-600">{order.user?.credits ?? 0}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {order.amount > 0 ? `${order.amount} ₺` : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                      {order.orderNumber}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {formatDate(order.createdAt)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      order.status === "COMPLETED" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                    }`}>
                      {order.status === "COMPLETED" ? "✅" : "⏳"} {order.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => handleDelete([order.id])}
                      className="p-1.5 rounded-lg transition hover:bg-red-50"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Sayfa {page} / {totalPages} ({total} kayıt)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              <ChevronLeft className="w-3 h-3" /> Önceki
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-30"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              Sonraki <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
