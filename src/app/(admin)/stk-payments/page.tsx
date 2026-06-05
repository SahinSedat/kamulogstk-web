"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { CreditCard, CheckCircle2, XCircle, Clock, Eye, X, Search, Filter, Download } from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  paymentType: string;
  paymentDate: string;
  receiptUrl?: string;
  note?: string;
  status: string;
  reviewedAt?: string;
  createdAt: string;
  application: {
    id: string;
    name: string;
    email: string;
    phone: string;
    tcKimlik: string;
    membershipStatus: string;
    expiryDate?: string;
    stk: { id: string; name: string; slug: string };
  };
}

interface STKOrg { id: string; name: string }

const STATUS_MAP: Record<string, { label: string; bg: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: "Bekliyor", bg: "bg-amber-100", color: "text-amber-700", icon: Clock },
  APPROVED: { label: "Onaylandı", bg: "bg-green-100", color: "text-green-700", icon: CheckCircle2 },
  REJECTED: { label: "Reddedildi", bg: "bg-red-100", color: "text-red-700", icon: XCircle },
};

const TYPE_LABELS: Record<string, string> = {
  MONTHLY: "Aylık Aidat",
  ANNUAL: "Yıllık Aidat",
  DONATION: "Bağış",
};

export default function STKPaymentsPage() {
  const { data: sess } = useSession();
  const _managedStkId = (sess?.user as any)?.managedStkId || "";
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orgs, setOrgs] = useState<STKOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStkId, setFilterStkId] = useState(_managedStkId || "");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStkId) params.set("stkId", filterStkId);
      if (filterStatus) params.set("status", filterStatus);
      const effStkId = _managedStkId || filterStkId; if (effStkId) params.set("stkId", effStkId); const r = await fetch(`/api/admin/stk/payments?${params}`);
      const d = await r.json();
      if (d.success) setPayments(d.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const loadOrgs = async () => {
    try {
      const r = await fetch("/api/admin/stk/organizations");
      const d = await r.json();
      if (d.success) setOrgs(d.data);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); loadOrgs(); }, []);
  useEffect(() => { load(); }, [filterStkId, filterStatus]);

  const handleAction = async (id: string, status: "APPROVED" | "REJECTED", durationDays?: number) => {
    if (!confirm(status === "APPROVED" ? "Ödemeyi onaylamak istediğinize emin misiniz?" : "Ödemeyi reddetmek istediğinize emin misiniz?")) return;
    setProcessing(true);
    try {
      const r = await fetch(`/api/admin/stk/payments?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, durationDays }),
      });
      const d = await r.json();
      if (d.success) {
        load();
        setDetailPayment(null);
        alert(status === "APPROVED" ? "✅ Ödeme onaylandı." : "❌ Ödeme reddedildi.");
      } else {
        alert("Hata: " + d.error);
      }
    } catch { alert("Bağlantı hatası"); }
    setProcessing(false);
  };

  const filtered = payments.filter(p => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return p.application.name.toLowerCase().includes(s) || p.application.email.toLowerCase().includes(s) || p.application.phone.includes(s);
  });

  const pendingCount = payments.filter(p => p.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="w-8 h-8" style={{ color: "var(--primary)" }} />
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>💳 STK Ödeme & Aidat Yönetimi</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Üyelerden gelen aidat ve bağış dekontlarını yönetin</p>
          </div>
        </div>
        {pendingCount > 0 && (
          <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-xl font-bold text-sm animate-pulse">
            ⏳ {pendingCount} Bekleyen Dekont
          </span>
        )}
      </div>

      {/* İstatistik */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Toplam", value: payments.length, gradient: "from-blue-500 to-blue-600" },
          { label: "Bekleyen", value: payments.filter(p => p.status === "PENDING").length, gradient: "from-amber-500 to-amber-600" },
          { label: "Onaylanan", value: payments.filter(p => p.status === "APPROVED").length, gradient: "from-green-500 to-emerald-500" },
          { label: "Toplam Tutar", value: `${payments.filter(p => p.status === "APPROVED").reduce((s, p) => s + p.amount, 0).toLocaleString("tr-TR")} ₺`, gradient: "from-purple-500 to-purple-600" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: "var(--text)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtreler */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="İsim, email veya telefon ara..." className="w-full pl-10 text-sm" />
        </div>
        <select value={filterStkId} onChange={e => setFilterStkId(e.target.value)} className="text-sm" disabled={!!_managedStkId}>
          <option value="">Tüm STK'lar</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm">
          <option value="">Tüm Durumlar</option>
          <option value="PENDING">⏳ Bekleyen</option>
          <option value="APPROVED">✅ Onaylanan</option>
          <option value="REJECTED">❌ Reddedilen</option>
        </select>
      </div>

      {/* Tablo */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="font-bold" style={{ color: "var(--text)" }}>
            <Filter className="w-4 h-4 inline mr-1" /> Dekontlar ({filtered.length})
          </h3>
        </div>
        {loading ? (
          <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
            <p style={{ color: "var(--text-muted)" }}>Henüz ödeme bildirimi yok</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr><th>Tarih</th><th>Üye</th><th>STK</th><th>Tür</th><th>Tutar</th><th>Durum</th><th>İşlem</th></tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const st = STATUS_MAP[p.status] || STATUS_MAP.PENDING;
                const Icon = st.icon;
                return (
                  <tr key={p.id}>
                    <td><span className="text-xs" style={{ color: "var(--text-muted)" }}>{new Date(p.createdAt).toLocaleDateString("tr-TR")}</span></td>
                    <td>
                      <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{p.application.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.application.phone}</p>
                    </td>
                    <td><span className="text-sm" style={{ color: "var(--text)" }}>{p.application.stk.name}</span></td>
                    <td><span className="badge badge-blue text-xs">{TYPE_LABELS[p.paymentType] || p.paymentType}</span></td>
                    <td><span className="font-bold" style={{ color: "var(--text)" }}>{p.amount.toLocaleString("tr-TR")} ₺</span></td>
                    <td>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.color}`}>
                        <Icon className="w-3 h-3" /> {st.label}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => setDetailPayment(p)} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-sm" title="Dekont Detay">
                          <Eye className="w-3.5 h-3.5" /> Dekont
                        </button>
                        {p.status === "PENDING" && (
                          <>
                            <button onClick={() => handleAction(p.id, "APPROVED", p.paymentType === "ANNUAL" ? 365 : 30)} className="p-1.5 rounded-lg hover:bg-green-100 text-green-600" title="Onayla">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleAction(p.id, "REJECTED")} className="p-1.5 rounded-lg hover:bg-red-100 text-red-600" title="Reddet">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detay Modal */}
      {detailPayment && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDetailPayment(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">💳 Dekont Detayı</h2>
              <button onClick={() => setDetailPayment(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Üye bilgileri */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase">👤 Üye</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-xs text-gray-400">Ad Soyad</p><p className="text-sm font-semibold">{detailPayment.application.name}</p></div>
                  <div><p className="text-xs text-gray-400">Telefon</p><p className="text-sm">{detailPayment.application.phone}</p></div>
                  <div><p className="text-xs text-gray-400">E-posta</p><p className="text-sm">{detailPayment.application.email}</p></div>
                  <div><p className="text-xs text-gray-400">STK</p><p className="text-sm font-semibold">{detailPayment.application.stk.name}</p></div>
                </div>
              </div>
              {/* Ödeme bilgileri */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-bold text-blue-600 uppercase">💰 Ödeme Bilgileri</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-xs text-gray-400">Tutar</p><p className="text-lg font-bold text-blue-700">{detailPayment.amount.toLocaleString("tr-TR")} ₺</p></div>
                  <div><p className="text-xs text-gray-400">Tür</p><p className="text-sm font-semibold">{TYPE_LABELS[detailPayment.paymentType] || detailPayment.paymentType}</p></div>
                  <div><p className="text-xs text-gray-400">Ödeme Tarihi</p><p className="text-sm">{new Date(detailPayment.paymentDate).toLocaleDateString("tr-TR")}</p></div>
                  <div><p className="text-xs text-gray-400">Bildirim Tarihi</p><p className="text-sm">{new Date(detailPayment.createdAt).toLocaleDateString("tr-TR")}</p></div>
                </div>
                {detailPayment.note && (
                  <div className="mt-2"><p className="text-xs text-gray-400">Not</p><p className="text-sm text-gray-700">{detailPayment.note}</p></div>
                )}
              </div>
              {/* Dekont görseli */}
              {detailPayment.receiptUrl && (<>
                <div className="flex justify-end mb-2">
                  <a href={detailPayment.receiptUrl.startsWith("/") || detailPayment.receiptUrl.startsWith("http") ? detailPayment.receiptUrl : `data:image/png;base64,${detailPayment.receiptUrl}`}
                    download="dekont.png"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                    target="_blank">
                    📥 Dekontu İndir
                  </a>
                </div>
                <div className="bg-amber-50 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-amber-600 uppercase mb-2">🧾 Dekont</h3>
                  <div className="border-2 border-amber-200 rounded-xl overflow-hidden bg-white p-2">
                    <img
                      src={detailPayment.receiptUrl.startsWith("/") || detailPayment.receiptUrl.startsWith("http") ? detailPayment.receiptUrl : `data:image/png;base64,${detailPayment.receiptUrl}`}
                      alt="Dekont" className="max-h-72 mx-auto object-contain"
                    />
                  </div>
                </div>
              </>)}
              {/* Üyelik durumu */}
              <div className="bg-indigo-50 rounded-xl p-4">
                <h3 className="text-xs font-bold text-indigo-600 uppercase mb-2">🎫 Mevcut Üyelik</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-xs text-gray-400">Durum</p><p className="text-sm font-semibold">{detailPayment.application.membershipStatus || "Belirsiz"}</p></div>
                  <div><p className="text-xs text-gray-400">Bitiş</p><p className="text-sm font-semibold">{detailPayment.application.expiryDate ? new Date(detailPayment.application.expiryDate).toLocaleDateString("tr-TR") : "Belirsiz"}</p></div>
                </div>
              </div>
            </div>
            {/* İşlem butonları */}
            {detailPayment.status === "PENDING" && (
              <div className="p-5 border-t border-gray-100 flex gap-3">
                <button onClick={() => handleAction(detailPayment.id, "REJECTED")} disabled={processing}
                  className="flex-1 py-2.5 border-2 border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50">
                  ❌ Reddet
                </button>
                <button onClick={() => handleAction(detailPayment.id, "APPROVED", detailPayment.paymentType === "ANNUAL" ? 365 : 30)} disabled={processing}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                  ✅ Onayla ({detailPayment.paymentType === "ANNUAL" ? "+365 gün" : "+30 gün"})
                </button>
              </div>
            )}
            {detailPayment.status !== "PENDING" && (
              <div className="p-5 border-t border-gray-100">
                <p className="text-center text-sm text-gray-500">
                  {detailPayment.status === "APPROVED" ? "✅ Bu ödeme onaylandı" : "❌ Bu ödeme reddedildi"}
                  {detailPayment.reviewedAt && ` • ${new Date(detailPayment.reviewedAt).toLocaleDateString("tr-TR")}`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
