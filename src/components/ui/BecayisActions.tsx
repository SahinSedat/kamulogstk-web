"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveListing, rejectListing, deleteListing, updateListingStatus, promoteListing, demoteListing, approveEditChanges, rejectEditChanges, toggleUrgent } from "@/actions/becayis";
import { CheckCircle, XCircle, Trash2, Loader2, MoreVertical, Timer, Play, Crown, AlertTriangle } from "lucide-react";
import { useSession } from "next-auth/react";

export function ApproveButton({ listingId }: { listingId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => {
        await approveListing(listingId, (session?.user as { id?: string })?.id || "");
        router.refresh();
      })}
      className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
      title="Onayla"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
    </button>
  );
}

export function RejectButton({ listingId }: { listingId: string }) {
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (showDialog) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowDialog(false)}>
        <div className="bg-[#1e1e2e] rounded-2xl p-6 w-[420px] max-w-[90vw] shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="w-5 h-5 text-red-400" />
            <h3 className="text-base font-semibold text-white">İlanı Reddet</h3>
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Red gerekçesini yazın (opsiyonel)..."
            className="w-full h-24 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-red-500/50"
          />
          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              onClick={() => { setShowDialog(false); setReason(""); }}
              className="px-4 py-2 rounded-xl text-sm text-white/60 hover:bg-white/5"
            >
              İptal
            </button>
            <button
              disabled={pending}
              onClick={() => startTransition(async () => {
                await rejectListing(listingId, reason.trim() || undefined);
                setShowDialog(false);
                setReason("");
                router.refresh();
              })}
              className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
              Reddet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowDialog(true)}
      className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
      title="Reddet"
    >
      <XCircle className="w-4 h-4" />
    </button>
  );
}

export function DeleteListingButton({ listingId }: { listingId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (confirm) {
    return (
      <div className="flex items-center gap-1">
        <button
          disabled={pending}
          onClick={() => startTransition(async () => { await deleteListing(listingId); router.refresh(); })}
          className="p-1.5 rounded-lg bg-red-500 text-white text-xs"
        >
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Sil"}
        </button>
        <button onClick={() => setConfirm(false)} className="p-1.5 rounded-lg bg-white/10 text-xs">İptal</button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
      title="Sil"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}

export function StatusChanger({ listingId, currentStatus }: { listingId: string; currentStatus: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const statuses = [
    { value: "draft", label: "Taslak" },
    { value: "pending", label: "Onay Bekliyor" },
    { value: "published", label: "Yayında" },
    { value: "passive", label: "Pasif" },
    { value: "matched", label: "Eşleşti" },
  ].filter((s) => s.value !== currentStatus);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg bg-white/5 text-text-secondary hover:bg-white/10 transition-colors"
        title="Durum Değiştir"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 glass-card p-1 min-w-[140px] animate-scale-in">
          {statuses.map((s) => (
            <button
              key={s.value}
              disabled={pending}
              onClick={() => startTransition(async () => {
                await updateListingStatus(listingId, s.value);
                setOpen(false);
                router.refresh();
              })}
              className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-white/5 transition-colors"
            >
              {pending ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DeactivateExpiredButton() {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  const handleDeactivate = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/becayis", { method: "PATCH" });
        const data = await res.json();
        setResult(data.message || `${data.count} ilan pasife alındı.`);
        setConfirm(false);
        router.refresh();
        setTimeout(() => setResult(null), 5000);
      } catch {
        setResult("İşlem sırasında hata oluştu.");
      }
    });
  };

  if (result) {
    return (
      <span className="text-xs px-3 py-2 rounded-xl bg-green-500/10 text-green-400 font-medium animate-fade-in">
        ✅ {result}
      </span>
    );
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>30 günü geçmiş ilanlar pasife alınacak. Emin misiniz?</span>
        <button
          disabled={pending}
          onClick={handleDeactivate}
          className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium"
        >
          {pending ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
          Evet, Kapat
        </button>
        <button onClick={() => setConfirm(false)} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>
          İptal
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
    >
      <Timer className="w-4 h-4" /> Süresi Dolmuşları Kapat
    </button>
  );
}

export function ReactivateExpiredButton() {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  const handleReactivate = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/becayis", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reactivate" }),
        });
        const data = await res.json();
        setResult(data.message || `${data.count} ilan yayına alındı.`);
        setConfirm(false);
        router.refresh();
        setTimeout(() => setResult(null), 5000);
      } catch {
        setResult("İşlem sırasında hata oluştu.");
      }
    });
  };

  if (result) {
    return (
      <span className="text-xs px-3 py-2 rounded-xl bg-green-500/10 text-green-400 font-medium animate-fade-in">
        ✅ {result}
      </span>
    );
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Tüm pasif ilanlar yeniden yayına alınacak. Emin misiniz?</span>
        <button
          disabled={pending}
          onClick={handleReactivate}
          className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-medium"
        >
          {pending ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
          Evet, Yayınla
        </button>
        <button onClick={() => setConfirm(false)} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "var(--bg-muted)", color: "var(--text-secondary)" }}>
          İptal
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
    >
      <Play className="w-4 h-4" /> Pasif İlanları Yayınla
    </button>
  );
}

export function PromoteVipButton({ listingId, isPremium }: { listingId: string; isPremium: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (isPremium) {
            await demoteListing(listingId);
          } else {
            await promoteListing(listingId);
          }
          router.refresh();
        })
      }
      className={`p-1.5 rounded-lg transition-all ${isPremium ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30" : "bg-white/5 hover:bg-white/10"}`}
      title={isPremium ? "VIP Kaldır" : "VIP Yap (7 gün)"}
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className={`w-4 h-4 ${isPremium ? "text-yellow-500" : ""}`} />}
    </button>
  );
}

export function ApproveEditButton({ listingId }: { listingId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { data: session } = useSession();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => {
        await approveEditChanges(listingId, (session?.user as { id?: string })?.id || "");
        router.refresh();
      })}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors text-xs font-medium"
      title="Düzenlemeyi Onayla"
    >
      {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
      Düzenlemeyi Onayla
    </button>
  );
}

export function RejectEditButton({ listingId }: { listingId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => {
        await rejectEditChanges(listingId);
        router.refresh();
      })}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-medium"
      title="Düzenlemeyi Reddet"
    >
      {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
      Düzenlemeyi Reddet
    </button>
  );
}

export function ToggleUrgentButton({ listingId, isUrgent }: { listingId: string; isUrgent: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleUrgent(listingId);
          router.refresh();
        })
      }
      className={`p-1.5 rounded-lg transition-all ${isUrgent ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-white/5 hover:bg-white/10"}`}
      title={isUrgent ? "Acil Kaldır" : "Acil İlan Yap"}
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className={`w-4 h-4 ${isUrgent ? "text-red-500" : ""}`} />}
    </button>
  );
}
