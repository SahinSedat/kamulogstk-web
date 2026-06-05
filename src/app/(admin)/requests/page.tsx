"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, User, Clock, CheckCircle, XCircle, AlertCircle, Loader2, Filter } from "lucide-react";

interface ConsultantRequest {
  id: string;
  userId: string;
  consultantId: string;
  packageId: string;
  description: string;
  aiBriefing: string | null;
  status: string;
  createdAt: string;
  user: { id: string; name: string | null; firstName: string | null; lastName: string | null; email: string | null; avatarUrl: string | null };
  consultant: { id: string; name: string; avatarUrl: string | null; title: string | null } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
};

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  completed: "Tamamlandı",
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<ConsultantRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (filter !== "all") params.set("status", filter);
      const res = await fetch(`/api/admin/requests?${params}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (e) {
      console.error("Talepler yüklenemedi:", e);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const updateStatus = async (requestId: string, status: string) => {
    try {
      await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status }),
      });
      fetchRequests();
    } catch (e) {
      console.error("Durum güncellenemedi:", e);
    }
  };

  const getUserName = (user: ConsultantRequest["user"]) => {
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    return user.name || user.email || "Bilinmeyen";
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-7 h-7 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-800">Danışman Talepleri</h1>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">Tümü</option>
            <option value="pending">Beklemede</option>
            <option value="approved">Onaylandı</option>
            <option value="rejected">Reddedildi</option>
            <option value="completed">Tamamlandı</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Henüz danışman talebi yok.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Talep Eden</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Danışman</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">İçerik / Konu</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tarih</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Durum</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-sm font-bold">
                        {getUserName(r.user).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{getUserName(r.user)}</p>
                        <p className="text-xs text-gray-400">{r.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{r.consultant?.name || "—"}</p>
                        {r.consultant?.title && (
                          <p className="text-xs text-gray-400">{r.consultant.title}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600 max-w-xs truncate" title={r.description}>
                      {r.description || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(r.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[r.status] || "bg-gray-100 text-gray-600"}`}>
                      {statusLabels[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.status === "pending" && (
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => updateStatus(r.id, "approved")} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Onayla">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => updateStatus(r.id, "rejected")} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Reddet">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {r.status !== "pending" && (
                      <AlertCircle className="w-4 h-4 text-gray-300 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">← Önceki</button>
              <span className="text-sm text-gray-500">Sayfa {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">Sonraki →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
