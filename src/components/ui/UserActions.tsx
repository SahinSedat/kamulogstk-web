"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleVerification, updateCredits, deleteUser, updateUser } from "@/actions/users";
import { CheckCircle, XCircle, Coins, Trash2, Edit, Save, X, Loader2 } from "lucide-react";

export function VerifyButton({ userId, isVerified }: { userId: string; isVerified: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => {
        await toggleVerification(userId);
        router.refresh();
      })}
      className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-colors ${isVerified
        ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
        : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
        }`}
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : isVerified ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
      {isVerified ? "Doğrulamayı Kaldır" : "Doğrula"}
    </button>
  );
}

export function CreditManager({ userId, currentCredits }: { userId: string; currentCredits: number }) {
  const [amount, setAmount] = useState(10);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
          className="w-20 text-center text-sm !py-1.5"
          min={1}
        />
        <button
          disabled={pending}
          onClick={() => startTransition(async () => { await updateCredits(userId, amount); router.refresh(); })}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs hover:bg-green-500/20 transition-colors"
        >
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Coins className="w-3 h-3" />} Ekle
        </button>
        <button
          disabled={pending}
          onClick={() => startTransition(async () => { await updateCredits(userId, -amount); router.refresh(); })}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors"
        >
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Coins className="w-3 h-3" />} Çıkar
        </button>
      </div>
      <p className="text-xs text-text-muted text-center">Mevcut: {currentCredits} jeton</p>
    </div>
  );
}

export function DeleteUserButton({ userId }: { userId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (confirm) {
    return (
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => startTransition(async () => {
            await deleteUser(userId);
            router.push("/users");
            router.refresh();
          })}
          className="flex-1 px-3 py-2 rounded-xl bg-red-500 text-white text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Evet, Sil
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="flex-1 px-3 py-2 rounded-xl bg-white/5 text-text-secondary text-sm hover:bg-white/10 transition-colors"
        >
          İptal
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
    >
      <Trash2 className="w-4 h-4" /> Kullanıcıyı Sil
    </button>
  );
}

interface EditableUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  role: string;
  city: string | null;
  district: string | null;
  tcKimlik: string | null;
  address: string | null;
  postalCode: string | null;
  istihdamTuru: string | null;
  bakanlik: string | null;
  kurum: string | null;
  unvan: string | null;
  atamaUsulu: string | null;
  title: string | null;
  yearsWorking: number | null;
  phoneVerified: boolean;
  kvkkAccepted: boolean;
  userAgreementAccepted: boolean;
  // Abonelik alanları
  credits: number;
  aiTokens: number;
  careerAiTokens: number;
  consultantJetons: number;
  isPremium: boolean;
  isCareerPremium: boolean;
  subscriptionTier: string | null;
}

export function EditUserModal({ user }: { user: EditableUser }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email,
    phone: user.phone || "",
    role: user.role,
    city: user.city || "",
    district: user.district || "",
    tcKimlik: user.tcKimlik || "",
    address: user.address || "",
    postalCode: user.postalCode || "",
    istihdamTuru: user.istihdamTuru || "",
    bakanlik: user.bakanlik || "",
    kurum: user.kurum || "",
    unvan: user.unvan || "",
    atamaUsulu: user.atamaUsulu || "",
    title: user.title || "",
    yearsWorking: user.yearsWorking ?? 0,
    phoneVerified: user.phoneVerified,
    kvkkAccepted: user.kvkkAccepted,
    userAgreementAccepted: user.userAgreementAccepted,
    // Abonelik
    credits: user.credits ?? 0,
    aiTokens: user.aiTokens ?? 0,
    careerAiTokens: user.careerAiTokens ?? 0,
    consultantJetons: user.consultantJetons ?? 0,
    isPremium: user.isPremium ?? false,
    isCareerPremium: user.isCareerPremium ?? false,
    subscriptionTier: user.subscriptionTier || "",
  });
  const router = useRouter();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors"
      >
        <Edit className="w-4 h-4" /> Düzenle
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
      <div className="glass-card p-6 w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Kullanıcı Düzenle</h3>
          <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          {/* Temel Bilgiler */}
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Temel Bilgiler</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">Ad</label>
              <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-text-muted">Soyad</label>
              <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full text-sm mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">E-posta</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-text-muted">Telefon</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full text-sm mt-1" placeholder="+90 5XX XXX XX XX" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">TC Kimlik</label>
              <input value={form.tcKimlik} onChange={(e) => setForm({ ...form, tcKimlik: e.target.value })} className="w-full text-sm mt-1" maxLength={11} placeholder="11 haneli" />
            </div>
            <div>
              <label className="text-xs text-text-muted">Rol</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full text-sm mt-1">
                <option value="USER">Kullanıcı</option>
                <option value="CONSULTANT">Danışman</option>
                <option value="MODERATOR">Moderatör</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>

          {/* Adres Bilgileri */}
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide pt-2 border-t border-white/5">Adres Bilgileri</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">İl</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-text-muted">İlçe</label>
              <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="w-full text-sm mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">Adres</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs text-text-muted">Posta Kodu</label>
              <input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="w-full text-sm mt-1" />
            </div>
          </div>

          {/* Çalışma Bilgileri */}
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide pt-2 border-t border-white/5">Çalışma Bilgileri</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">İstihdam Türü</label>
              <select value={form.istihdamTuru} onChange={(e) => setForm({ ...form, istihdamTuru: e.target.value })} className="w-full text-sm mt-1">
                <option value="">Seçiniz</option>
                <option value="Memur">👔 Memur</option>
                <option value="Sürekli İşçi">👷 Sürekli İşçi</option>
                <option value="Sözleşmeli">📝 Sözleşmeli</option>
                <option value="Özel Sektör">Özel Sektör</option>
                <option value="İş Arayan">İş Arayan</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted">Bakanlık</label>
              <input value={form.bakanlik} onChange={(e) => setForm({ ...form, bakanlik: e.target.value })} className="w-full text-sm mt-1" placeholder="Örn: Sağlık Bakanlığı" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">Kurum</label>
              <input value={form.kurum} onChange={(e) => setForm({ ...form, kurum: e.target.value })} className="w-full text-sm mt-1" placeholder="Örn: X Devlet Hastanesi" />
            </div>
            <div>
              <label className="text-xs text-text-muted">Ünvan</label>
              <input value={form.unvan} onChange={(e) => setForm({ ...form, unvan: e.target.value })} className="w-full text-sm mt-1" placeholder="Örn: VHKİ" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">Atama Usulü</label>
              <select value={form.atamaUsulu} onChange={(e) => setForm({ ...form, atamaUsulu: e.target.value })} className="w-full text-sm mt-1">
                <option value="">Seçiniz</option>
                <option value="Merkezi">Merkezi</option>
                <option value="Mahalli">Mahalli</option>
                <option value="696 KHK">696 KHK</option>
                <option value="İŞKUR">İŞKUR</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted">Kıdem (Yıl)</label>
              <input type="number" value={form.yearsWorking} onChange={(e) => setForm({ ...form, yearsWorking: parseInt(e.target.value) || 0 })} className="w-full text-sm mt-1" min={0} />
            </div>
          </div>

          {/* Abonelik & Jeton Yönetimi */}
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide pt-2 border-t border-white/5">Abonelik & Jeton Yönetimi</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">Jeton (Credits)</label>
              <input type="number" value={form.credits} onChange={(e) => setForm({ ...form, credits: parseInt(e.target.value) || 0 })} className="w-full text-sm mt-1" min={0} />
            </div>
            <div>
              <label className="text-xs text-amber-400 font-semibold">🎫 Danışman Jetonu</label>
              <input type="number" value={form.consultantJetons} onChange={(e) => setForm({ ...form, consultantJetons: parseInt(e.target.value) || 0 })} className="w-full text-sm mt-1 !border-amber-500/30" min={0} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted">AI Token</label>
              <input type="number" value={form.aiTokens} onChange={(e) => setForm({ ...form, aiTokens: parseInt(e.target.value) || 0 })} className="w-full text-sm mt-1" min={0} />
            </div>
            <div>
              <label className="text-xs text-text-muted">Kariyer AI Token</label>
              <input type="number" value={form.careerAiTokens} onChange={(e) => setForm({ ...form, careerAiTokens: parseInt(e.target.value) || 0 })} className="w-full text-sm mt-1" min={0} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-text-muted">Abonelik Planı</label>
              <select value={form.subscriptionTier} onChange={(e) => setForm({ ...form, subscriptionTier: e.target.value })} className="w-full text-sm mt-1">
                <option value="">Standart (Ücretsiz)</option>
                <option value="premium">Premium</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm mt-4">
              <input type="checkbox" checked={form.isPremium} onChange={(e) => setForm({ ...form, isPremium: e.target.checked })} className="rounded" />
              Premium Aktif
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm mt-4">
              <input type="checkbox" checked={form.isCareerPremium} onChange={(e) => setForm({ ...form, isCareerPremium: e.target.checked })} className="rounded" />
              Kariyer Premium
            </label>
          </div>

          {/* Sözleşme & Doğrulama */}
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide pt-2 border-t border-white/5">Sözleşme & Doğrulama</p>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.phoneVerified} onChange={(e) => setForm({ ...form, phoneVerified: e.target.checked })} className="rounded" />
              Telefon Doğrulandı
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.kvkkAccepted} onChange={(e) => setForm({ ...form, kvkkAccepted: e.target.checked })} className="rounded" />
              KVKK Onayı
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.userAgreementAccepted} onChange={(e) => setForm({ ...form, userAgreementAccepted: e.target.checked })} className="rounded" />
              Kullanıcı Sözleşmesi
            </label>
          </div>

          <button
            disabled={pending}
            onClick={() => startTransition(async () => {
              await updateUser(user.id, {
                firstName: form.firstName || undefined,
                lastName: form.lastName || undefined,
                name: `${form.firstName} ${form.lastName}`.trim() || undefined,
                email: form.email,
                phone: form.phone || undefined,
                role: form.role,
                city: form.city || undefined,
                district: form.district || undefined,
                tcKimlik: form.tcKimlik || undefined,
                address: form.address || undefined,
                postalCode: form.postalCode || undefined,
                istihdamTuru: form.istihdamTuru || undefined,
                bakanlik: form.bakanlik || undefined,
                kurum: form.kurum || undefined,
                unvan: form.unvan || undefined,
                atamaUsulu: form.atamaUsulu || undefined,
                title: form.title || undefined,
                yearsWorking: form.yearsWorking || undefined,
                phoneVerified: form.phoneVerified,
                kvkkAccepted: form.kvkkAccepted,
                userAgreementAccepted: form.userAgreementAccepted,
                // Abonelik
                credits: form.credits,
                aiTokens: form.aiTokens,
                careerAiTokens: form.careerAiTokens,
                consultantJetons: form.consultantJetons,
                isPremium: form.isPremium,
                isCareerPremium: form.isCareerPremium,
                subscriptionTier: form.subscriptionTier || undefined,
              });
              setOpen(false);
              router.refresh();
            })}
            className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
