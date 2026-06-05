"use client";
import { useState } from "react";
import { Building2, XCircle } from "lucide-react";
import AssignSTKModal from "./AssignSTKModal";

export default function AssignSTKButton({ userId, userName, currentRole }: { userId: string; userName: string; currentRole?: string }) {
  const [showModal, setShowModal] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const isSTKManager = currentRole === "STK_MANAGER";

  const handleRevoke = async () => {
    if (!confirm("Bu kullanıcının STK yetkisini kaldırmak istediğinize emin misiniz?")) return;
    setRevoking(true);
    try {
      const res = await fetch("/api/admin/assign-stk", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) { alert("STK yetkisi kaldırıldı! Sayfa yenilenecek."); window.location.reload(); }
      else { alert(data.error || "Hata oluştu"); }
    } catch { alert("Sunucu hatası"); }
    setRevoking(false);
  };

  return (
    <>
      {isSTKManager ? (
        <button onClick={handleRevoke} disabled={revoking} title="STK Yetkisini Kaldır"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition disabled:opacity-50">
          <XCircle className="w-3 h-3" /> {revoking ? "..." : "Kaldır"}
        </button>
      ) : (
        <button onClick={() => setShowModal(true)} title="STK Yetkisi Ver"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition">
          <Building2 className="w-3 h-3" /> STK
        </button>
      )}
      {showModal && <AssignSTKModal userId={userId} userName={userName} onClose={() => setShowModal(false)} />}
    </>
  );
}
