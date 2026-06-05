"use client";

import { useState, useMemo } from "react";
import { Search, Trash2, Target, Coins, Plus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

interface CareerUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string | null;
  isCareerPremium: boolean;
  careerPremiumUntil: string | null;
  careerAiTokens: number;
  createdAt: string;
}

interface CareerOrder {
  id: string;
  orderNumber: string;
  amount: number;
  status: string;
  notes: string | null;
  createdAt: string;
  user: { id: string; name: string | null; firstName: string | null; lastName: string | null; email: string | null };
}

export default function CareerSubscriptionSearch({ users, orders }: { users: CareerUser[]; orders: CareerOrder[] }) {
  const [query, setQuery] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [orderDeleteLoading, setOrderDeleteLoading] = useState<string | null>(null);
  const router = useRouter();

  // Manuel Kariyer Premium Ver
  const [showManual, setShowManual] = useState(false);
  const [manualSearch, setManualSearch] = useState("");
  const [manualUsers, setManualUsers] = useState<{ id: string; name: string | null; firstName: string | null; lastName: string | null; email: string | null }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualNotes, setManualNotes] = useState("");

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return users;
    const q = query.toLowerCase().trim();
    return users.filter((u) => {
      const name = [u.name, u.firstName, u.lastName].filter(Boolean).join(" ").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(q) || email.includes(q) || u.id.includes(q);
    });
  }, [users, query]);

  const filteredOrders = useMemo(() => {
    if (!query.trim()) return orders;
    const q = query.toLowerCase().trim();
    return orders.filter((o) => {
      const name = [o.user?.name, o.user?.firstName, o.user?.lastName].filter(Boolean).join(" ").toLowerCase();
      const email = (o.user?.email || "").toLowerCase();
      return name.includes(q) || email.includes(q) || o.orderNumber.toLowerCase().includes(q) || (o.notes || "").toLowerCase().includes(q);
    });
  }, [orders, query]);

  const handleDelete = async (userId: string) => {
    if (!confirm("Bu kullanıcının Kariyer Premium aboneliğini iptal etmek istediğinize emin misiniz?")) return;
    setDeleteLoading(userId);
    try {
      await fetch(`/api/admin/career/manual?userId=${userId}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      console.error(e);
    }
    setDeleteLoading(null);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Bu sipariş kaydını silmek istediğinize emin misiniz? (Kullanıcı aboneliği etkilenmez)")) return;
    setOrderDeleteLoading(orderId);
    try {
      await fetch("/api/admin/career/order-delete?orderId=" + orderId, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      console.error(e);
    }
    setOrderDeleteLoading(null);
  };

  const searchUsers = async () => {
    if (!manualSearch.trim()) return;
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(manualSearch)}&limit=10`);
      const data = await res.json();
      setManualUsers(data.users || data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualGrant = async () => {
    if (!selectedUserId) return;
    setManualLoading(true);
    try {
      const res = await fetch("/api/admin/career/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, notes: manualNotes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Hata oluştu");
      } else {
        setShowManual(false);
        setSelectedUserId("");
        setManualSearch("");
        setManualUsers([]);
        setManualNotes("");
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert("Bir hata oluştu");
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* ── Arama + Manuel Ver Butonu ── */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="E-posta, isim veya sipariş no ile ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 placeholder:text-text-secondary"
          />
        </div>
        <button
          onClick={() => setShowManual(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition font-semibold text-sm whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" /> Manuel Kariyer Premium Ver
        </button>
      </div>

      {/* ── Manuel Kariyer Premium Modal ── */}
      {showManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[#0f0e2a] border border-white/10 rounded-2xl p-6 max-w-lg w-full">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" /> Manuel Kariyer Premium Ver
            </h2>

            {/* Kullanıcı Arama */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Kullanıcı ara (isim veya e-posta)"
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 outline-none"
              />
              <button onClick={searchUsers} className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition text-sm">Ara</button>
            </div>

            {/* Kullanıcı Listesi */}
            {manualUsers.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-white/10 rounded-lg mb-3">
                {manualUsers.map((u) => {
                  const name = u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.name || "Bilinmeyen";
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-white/10 transition text-sm flex justify-between items-center ${selectedUserId === u.id ? "bg-amber-500/20 border-l-2 border-amber-500" : ""}`}
                    >
                      <span className="font-medium text-white">{name}</span>
                      <span className="text-xs text-gray-400">{u.email}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Not */}
            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-1 block">Not (opsiyonel)</label>
              <input
                type="text"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Admin tarafından manuel atandı"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 outline-none"
              />
            </div>

            {/* Bilgi */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 text-xs text-amber-300">
              ℹ️ Kariyer Premium ömür boyu olarak atanacak ve AI Token tanımlanacaktır.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowManual(false); setSelectedUserId(""); setManualSearch(""); setManualUsers([]); setManualNotes(""); }}
                className="flex-1 px-4 py-2.5 bg-white/5 text-white rounded-lg hover:bg-white/10 transition font-medium text-sm"
              >
                İptal
              </button>
              <button
                onClick={handleManualGrant}
                disabled={!selectedUserId || manualLoading}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition font-semibold text-sm disabled:opacity-50"
              >
                {manualLoading ? "İşleniyor..." : "Kariyer Premium Ver"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Aktif Aboneler ── */}
      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" /> Aktif Kariyer Premium Aboneleri ({filteredUsers.length})
        </h4>
        {filteredUsers.length === 0 ? (
          <p className="text-text-secondary text-sm text-center py-4">Sonuç bulunamadı.</p>
        ) : (
          <div className="overflow-auto rounded-lg border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left bg-white/5">
                  <th className="p-3">Kullanıcı</th>
                  <th className="p-3">Email</th>
                  <th className="p-3 text-center">AI Token</th>
                  <th className="p-3">Bitiş Tarihi</th>
                  <th className="p-3 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="p-3 font-medium">{u.firstName} {u.lastName || u.name}</td>
                    <td className="p-3 text-text-secondary">{u.email}</td>
                    <td className="p-3 text-center">
                      <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-xs font-bold">{u.careerAiTokens}</span>
                    </td>
                    <td className="p-3 text-text-secondary text-sm">
                      {u.careerPremiumUntil ? new Date(u.careerPremiumUntil).toLocaleDateString("tr-TR") : "—"}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={deleteLoading === u.id}
                        className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded text-xs font-bold transition disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {deleteLoading === u.id ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        İptal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Sipariş Geçmişi ── */}
      {filteredOrders.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Coins className="w-4 h-4 text-green-400" /> Kariyer Sipariş Geçmişi ({filteredOrders.length})
          </h4>
          <div className="overflow-auto rounded-lg border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left bg-white/5">
                  <th className="p-3">Sipariş No</th>
                  <th className="p-3">Kullanıcı</th>
                  <th className="p-3 text-right">Tutar</th>
                  <th className="p-3">Durum</th>
                  <th className="p-3">Detay</th>
                  <th className="p-3">Tarih</th>
                  <th className="p-3 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="p-3 font-mono text-amber-400 text-xs">{o.orderNumber}</td>
                    <td className="p-3 font-medium">{o.user?.firstName} {o.user?.lastName}</td>
                    <td className="p-3 text-right text-green-400 font-bold">{o.amount} ₺</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${o.status === "COMPLETED" ? "bg-green-500/20 text-green-400" : o.status === "MANUAL" ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                        {o.status === "COMPLETED" ? "Tamamlandı" : o.status === "MANUAL" ? "Manuel" : o.status}
                      </span>
                    </td>
                    <td className="p-3 text-text-secondary text-xs max-w-48 truncate">{o.notes}</td>
                    <td className="p-3 text-text-secondary text-xs">{new Date(o.createdAt).toLocaleDateString("tr-TR")}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteOrder(o.id)}
                        disabled={orderDeleteLoading === o.id}
                        className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded text-xs font-bold transition disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {orderDeleteLoading === o.id ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
