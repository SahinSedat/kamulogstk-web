"use client";
import { useState, useEffect } from "react";
import { Building2, X, Loader2, Copy, CheckCircle2 } from "lucide-react";

interface STKOrg { id: string; name: string; }

export default function AssignSTKModal({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const [orgs, setOrgs] = useState<STKOrg[]>([]);
  const [selectedStk, setSelectedStk] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [result, setResult] = useState<{ email: string; password: string; stkName: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stk/organizations").then(r => r.json()).then(d => {
      if (d.success) setOrgs(d.data);
      setLoadingOrgs(false);
    }).catch(() => setLoadingOrgs(false));
  }, []);

  const handleAssign = async () => {
    if (!selectedStk) { setError("Lütfen bir STK seçin"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/assign-stk", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, stkId: selectedStk }),
      });
      const data = await res.json();
      if (data.success) { setResult(data.credentials); }
      else { setError(data.error || "İşlem başarısız"); }
    } catch { setError("Sunucu hatası"); }
    setLoading(false);
  };

  const copyCredentials = () => {
    if (!result) return;
    navigator.clipboard.writeText(`E-posta: ${result.email}\nŞifre: ${result.password}\nSTK: ${result.stkName}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">STK Yetkisi Ver</h2>
              <p className="text-xs text-gray-500">{userName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="p-5 space-y-4">
          {result ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-800">Atama Başarılı!</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">STK:</span><span className="font-bold">{result.stkName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">E-posta:</span><span className="font-mono font-bold">{result.email}</span></div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Şifre:</span>
                    <span className="font-mono font-bold text-lg text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{result.password}</span>
                  </div>
                </div>
              </div>
              <button onClick={copyCredentials}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
                {copied ? <><CheckCircle2 className="w-4 h-4" /> Kopyalandı!</> : <><Copy className="w-4 h-4" /> Bilgileri Kopyala</>}
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">STK Seçin *</label>
                {loadingOrgs ? (
                  <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor...</div>
                ) : (
                  <select value={selectedStk} onChange={e => setSelectedStk(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    <option value="">-- STK Seçin --</option>
                    {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                )}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <strong>⚠️ Dikkat:</strong> Bu işlem kullanıcının şifresini değiştirecek, rolünü STK_MANAGER yapacak ve seçilen STK'ya atayacaktır.
              </div>
              {error && <div className="p-2 bg-red-50 text-red-700 rounded-lg text-xs">{error}</div>}
            </>
          )}
        </div>

        <div className="p-5 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            {result ? "Kapat" : "İptal"}
          </button>
          {!result && (
            <button onClick={handleAssign} disabled={loading || !selectedStk}
              className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Yetkiyi Ver
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
