export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Shield, Calendar, Coins, CheckCircle, XCircle, MapPin, Building2, Briefcase, FileText, Hash, Landmark } from "lucide-react";
import { formatDateTime, getRoleBadge } from "@/lib/utils";
import { VerifyButton, DeleteUserButton, EditUserModal } from "@/components/ui/UserActions";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      cvs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  }) as any;
  if (!user) return notFound();

  const userCv = user.cvs?.[0] || null;

  const role = getRoleBadge(user.role);
  const displayName = user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "Anonim";

  // Employment type label
  const empLabels: Record<string, string> = {
    memur: "👔 Memur",
    isci: "👷 İşçi",
    ozel_sektor: "Özel Sektör",
    sozlesmeli: "📝 Sözleşmeli",
    is_arayan: "İş Arayan",
    kamuMemur: "👔 Kamu Memur",
    kamuIsci: "👷 Kamu İşçi",
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/users" className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `https://kamulog.net${user.avatarUrl}`}
            alt={displayName}
            className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
            {displayName[0]?.toUpperCase() || "?"}
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold">{displayName}</h2>
          <p className="text-text-secondary text-sm">{user.email && !user.email.endsWith('@kamulog.net') ? user.email : 'E-posta yok'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profile Card */}
        <div className="glass-card p-6 md:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Profil Bilgileri</h3>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={<Mail className="w-4 h-4" />} label="E-posta" value={user.email && !user.email.endsWith('@kamulog.net') ? user.email : 'Belirtilmemiş'} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Telefon" value={user.phone || "Belirtilmemiş"} />
            <InfoRow icon={<Shield className="w-4 h-4" />} label="Rol" value={role.label} badge={role.color} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Kayıt Tarihi" value={formatDateTime(user.createdAt)} />
            <InfoRow
              icon={user.isVerified ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
              label="Doğrulama" value={user.isVerified ? "Doğrulanmış" : "Doğrulanmamış"}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="glass-card p-6 space-y-3">
          <h3 className="text-lg font-semibold mb-2">İşlemler</h3>
          <EditUserModal user={{
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            role: user.role,
            city: user.city,
            district: user.district,
            tcKimlik: user.tcKimlik,
            address: user.address,
            postalCode: user.postalCode,
            istihdamTuru: user.istihdamTuru,
            bakanlik: user.bakanlik,
            kurum: user.kurum,
            unvan: user.unvan,
            atamaUsulu: user.atamaUsulu,
            title: user.title,
            yearsWorking: user.yearsWorking,
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
            subscriptionTier: user.subscriptionTier,
          }} />
          <VerifyButton userId={user.id} isVerified={user.isVerified} />
          <div className="pt-2 border-t border-white/5">
            <DeleteUserButton userId={user.id} />
          </div>
        </div>
      </div>

      {/* Kişisel Bilgiler */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Kişisel & Çalışma Bilgileri</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoRow icon={<Hash className="w-4 h-4" />} label="TC Kimlik" value={user.tcKimlik || "Belirtilmemiş"} />
          <InfoRow icon={<MapPin className="w-4 h-4" />} label="İl" value={user.city || "Belirtilmemiş"} />
          <InfoRow icon={<MapPin className="w-4 h-4" />} label="İlçe" value={user.district || "Belirtilmemiş"} />
          <InfoRow icon={<MapPin className="w-4 h-4" />} label="Adres" value={user.address || "Belirtilmemiş"} />
          <InfoRow icon={<FileText className="w-4 h-4" />} label="Posta Kodu" value={user.postalCode || "Belirtilmemiş"} />
          <InfoRow icon={<Briefcase className="w-4 h-4" />} label="İstihdam Türü" value={user.istihdamTuru || "Belirtilmemiş"} />
          <InfoRow icon={<Landmark className="w-4 h-4" />} label="Bakanlık" value={user.bakanlik || "Belirtilmemiş"} />
          <InfoRow icon={<Building2 className="w-4 h-4" />} label="Kurum" value={user.kurum || "Belirtilmemiş"} />
          <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Ünvan" value={user.unvan || "Belirtilmemiş"} />
          <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Atama Usulü" value={user.atamaUsulu || "Belirtilmemiş"} />
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="Kıdem (Yıl)" value={user.yearsWorking != null ? String(user.yearsWorking) : "Belirtilmemiş"} />
          <InfoRow icon={<Briefcase className="w-4 h-4" />} label="İş Arıyor" value={user.isAriyor ? "Evet" : "Hayır"} />
        </div>
      </div>

      {/* Sözleşme & Doğrulama Durumu */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Sözleşme & Doğrulama</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatusChip label="E-posta Doğrulama" active={user.emailVerified != null} />
          <StatusChip label="Telefon Doğrulama" active={user.phoneVerified} />
          <StatusChip label="Kullanıcı Sözleşmesi" active={user.userAgreementAccepted} />
          <StatusChip label="KVKK Onayı" active={user.kvkkAccepted} />
        </div>
      </div>

      {/* Becayiş AI Profil */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>✨</span> Becayiş AI Profil
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoRow icon={<MapPin className="w-4 h-4" />} label="Hedef Şehir" value={user.targetCities || "Belirtilmemiş"} />
          <StatusChip label="Becayiş Arıyor" active={user.isLookingForBecayis ?? false} />
          <StatusChip label="AI ile Dolduruldu" active={user.isWorkInfoGeneratedByAI ?? false} />
        </div>
        {user.aiGeneratedBecayisText && (
          <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-text-muted mb-2">AI Oluşturulan Profil:</p>
            <pre className="text-sm whitespace-pre-wrap text-text-secondary">{user.aiGeneratedBecayisText}</pre>
          </div>
        )}
        {!user.aiGeneratedBecayisText && (
          <div className="mt-3 p-3 rounded-xl bg-yellow-500/10 text-yellow-400 text-sm">
            Kullanıcı henüz Becayiş AI profilini oluşturmamış.
          </div>
        )}
      </div>

      {/* CV Bilgisi */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" /> CV Bilgisi
        </h3>
        {userCv ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoRow icon={<FileText className="w-4 h-4" />} label="CV Başlığı" value={userCv.title || "CV"} />
              <InfoRow icon={<Calendar className="w-4 h-4" />} label="Oluşturma" value={formatDateTime(userCv.createdAt)} />
              <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Şablon" value={userCv.template === "ai_generated" ? "🤖 AI Oluşturma" : "📄 Manuel Yükleme"} />
              <InfoRow icon={<Calendar className="w-4 h-4" />} label="Son Güncelleme" value={formatDateTime(userCv.updatedAt)} />
            </div>
            {userCv.pdfPath && (
              <div className="flex gap-3 mt-3">
                <a
                  href={`/uploads/cvs/${userCv.pdfPath.split('/').pop()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 text-sm font-semibold hover:bg-blue-500/30 transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" /> PDF Görüntüle
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-yellow-500/10 text-yellow-400 text-sm">
            Bu kullanıcı henüz CV yüklememiş veya oluşturmamış.
          </div>
        )}
      </div>

      {/* Abonelik & Jeton Durumu */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Abonelik Durumu</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`px-4 py-3 rounded-xl text-center ${user.isPremium ? "bg-accent/20" : "bg-white/5"}`}>
            <p className="text-xs text-text-muted mb-1">Üyelik</p>
            <p className={`text-sm font-semibold ${user.isPremium ? "text-accent" : "text-text-muted"}`}>
              {user.isPremium ? "👑 Premium" : "Standart"}
            </p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-white/5 text-center">
            <p className="text-xs text-text-muted mb-1">Plan</p>
            <p className="text-sm font-semibold">{user.subscriptionTier || "Standart"}</p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-amber-500/10 text-center">
            <p className="text-xs text-text-muted mb-1">Jeton</p>
            <p className="text-sm font-semibold text-amber-400">{user.credits}</p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-amber-600/15 text-center border border-amber-500/20">
            <p className="text-xs text-amber-300 mb-1">🎫 Danışman Jetonu</p>
            <p className="text-lg font-bold text-amber-400">{user.consultantJetons ?? 0}</p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-cyan-500/10 text-center">
            <p className="text-xs text-text-muted mb-1">AI Token</p>
            <p className="text-sm font-semibold text-cyan-400">{user.aiTokens}</p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-purple-500/10 text-center">
            <p className="text-xs text-text-muted mb-1">Kariyer Token</p>
            <p className="text-sm font-semibold text-purple-400">{user.careerAiTokens ?? 0}</p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-emerald-500/10 text-center">
            <p className="text-xs text-text-muted mb-1">Kariyer Premium</p>
            <p className="text-sm font-semibold text-emerald-400">{user.isCareerPremium ? "✓ Aktif" : "✗"}</p>
          </div>
        </div>
        {user.premiumUntil && (
          <p className="text-xs text-text-muted mt-3">Premium Bitiş: {formatDateTime(user.premiumUntil)}</p>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, badge }: { icon: React.ReactNode; label: string; value: string; badge?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-text-muted">{icon}</div>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        {badge ? <span className={`text-xs px-2 py-0.5 rounded-full ${badge}`}>{value}</span> : <p className="text-sm">{value}</p>}
      </div>
    </div>
  );
}

function StatusChip({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${active ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
      {active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {label}
    </div>
  );
}
