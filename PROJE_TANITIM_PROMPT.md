# Kamulog Super App — Web Yönetim Paneli Tanıtım Prompt'u

## Proje Bağlamı ve Teknoloji Yığını

Bu proje, **Kamulog** isimli bir "Super App" platformunun **web tabanlı Admin Yönetim Paneli**dir. Platform, kamu çalışanlarına (memur, işçi, sözleşmeli personel) yönelik kapsamlı hizmetler sunar: becayiş (tayin değişimi), kariyer danışmanlığı, maaş hesaplama, haber/duyuru, toplu iş sözleşmesi (TİS) arşivi ve profesyonel danışmanlık.

**Teknoloji Yığını:**
- **Framework:** Next.js 16.1.6 (App Router) + React 19
- **Stil:** Tailwind CSS v4 + CSS Custom Properties (dark theme)
- **Veritabanı & ORM:** PostgreSQL + Prisma 6
- **Yetkilendirme:** NextAuth v4 (`next-auth@4.24.13`) — rol tabanlı (ADMIN, MODERATOR, CONSULTANT, USER)
- **AI Entegrasyonu:** OpenAI API (kariyer danışmanlığı, CV analizi)
- **Mesajlaşma:** @whiskeysockets/baileys (WhatsApp entegrasyonu)
- **Icon Seti:** Lucide React
- **PDF:** @react-pdf/renderer, pdf-parse
- **Sunucu:** Ubuntu VPS (91.151.95.75:3100), PM2 ile çalışır
- **Repo:** GitHub — `SahinSedat/kamulogWebYonetim`

**Dizin Yapısı:**
```
src/
├── app/
│   ├── (admin)/          ← Tüm admin sayfaları (layout ile sarılı)
│   │   ├── dashboard/
│   │   ├── users/        ← Kullanıcı yönetimi (liste + detay [id])
│   │   ├── consultants/  ← Danışman yönetim modülü (4 sekmeli)
│   │   ├── content/      ← Haberler/Duyurular + Canlı piyasa verileri
│   │   ├── becayis/      ← Becayiş (tayin değişimi) ilanları
│   │   ├── career/       ← Kariyer modülü
│   │   ├── messages/     ← Mesajlaşma
│   │   ├── notifications/
│   │   ├── orders/       ← Siparişler
│   │   ├── subscriptions/← Abonelik yönetimi
│   │   ├── tis/          ← TİS (Toplu İş Sözleşmesi) arşivi
│   │   ├── maas-hesaplama/ ← Maaş hesaplama
│   │   ├── requests/     ← Talepler
│   │   ├── stk/          ← STK & Forum
│   │   ├── logs/         ← Sistem logları
│   │   └── settings/     ← Ayarlar
│   ├── api/
│   │   ├── admin/        ← Admin API'leri (news, upload, consultant-management)
│   │   ├── auth/         ← NextAuth endpoint
│   │   ├── becayis/      ← Becayiş API
│   │   ├── consultants/  ← Danışman API
│   │   ├── conversations/
│   │   ├── kariyer/      ← Kariyer modülü API
│   │   ├── market-data/  ← Canlı döviz/BTC/BIST API
│   │   ├── public/       ← Mobil uygulama için public API'ler
│   │   ├── users/        ← Kullanıcı CRUD API
│   │   ├── tis/          ← TİS API
│   │   └── ...
│   └── login/
├── actions/              ← Server Actions (users.ts, consultants.ts)
├── components/
│   ├── layout/           ← Sidebar.tsx, Header vb.
│   └── ui/               ← UserActions, ConsultantActions, CreateUserModal vb.
├── lib/
│   ├── prisma.ts         ← Prisma client singleton
│   ├── auth.ts           ← NextAuth config
│   └── utils.ts          ← Yardımcı fonksiyonlar
└── prisma/
    └── schema.prisma     ← 37 model, PostgreSQL
```

## Prisma Veritabanı Modelleri (37 Model)

**Temel Modeller:**
- `User` — Kullanıcı (rolle: ADMIN/MODERATOR/CONSULTANT/USER, credits, aiTokens, isPremium, employmentType: isci/memur/sozlesmeli)
- `Institution` — Kurum bilgileri
- `BecayisListing` — Becayiş (tayin değişimi) ilanları

**Danışmanlık Sistemi:**
- `Consultant` — Danışman profili (category: hukuki/idari/mali/kariyer/psikolojik/diger, sessionFeeJeton, iban, isOnline, isFeatured, rating)
- `ServicePackage` — Danışman hizmet paketleri
- `Conversation` — Danışman-kullanıcı sohbetleri
- `Message` — Sohbet mesajları
- `Review` — Danışman değerlendirmeleri
- `ConsultationRequest` — Danışmanlık talepleri
- `ConsultantApplication` — Danışman başvuruları (pending/approved/rejected)
- `ConsultantPayout` — Danışman hakediş/ödeme (dönemsel, jeton → TL)
- `SystemSetting` — Sistem ayarları (jeton_rate, commission_rate)

**Kariyer Modülü:**
- `KariyerSubscription`, `CV`, `CVAnalysis`, `ChatSession`, `UsageRecord`
- `JobListing` — İş ilanları
- `KariyerConsultant`, `KariyerChatRoom`, `KariyerChatMessage`, `KariyerConsultantRating`

**Finans:**
- `Order` — Siparişler
- `SubscriptionPlan`, `Subscription` — Abonelik planları
- `SalesRecord` — Satış kayıtları
- `Coupon` — Kuponlar

**İçerik:**
- `News` — Haberler/Duyurular (CRUD, görsel yükleme, kategori, taslak/yayında)
- `TISDocument`, `TISFile` — TİS belge arşivi
- `MediaCategory`, `Media` — Medya yönetimi
- `Notification` — Bildirimler
- `AdminLog` — Yönetici işlem logları
- `WhatsAppLog` — WhatsApp bot logları
- `CookieConsent`, `SiteSettings`

## Sidebar Menü Yapısı ve Sayfalar

| Grup | Sayfa | Yol | Roller |
|------|-------|-----|--------|
| GENEL | Dashboard | `/dashboard` | ADMIN, MOD, CONSULTANT |
| YÖNETİM | Kullanıcılar | `/users` | ADMIN, MOD |
| YÖNETİM | Danışmanlar | `/consultants` | ADMIN, MOD, CONSULTANT |
| YÖNETİM | Talepler | `/requests` | ADMIN, MOD, CONSULTANT |
| İÇERİK | Haberler/Duyurular | `/content` | ADMIN, MOD |
| İÇERİK | Becayiş | `/becayis` | ADMIN, MOD |
| İÇERİK | STK & Forum | `/stk` | ADMIN, MOD |
| İÇERİK | Kariyer | `/career` | ADMIN, MOD |
| İÇERİK | TİS & Dosyalar | `/tis` | ADMIN, MOD |
| İLETİŞİM | Mesajlar | `/messages` | ADMIN, MOD, CONSULTANT |
| İLETİŞİM | Bildirimler | `/notifications` | ADMIN, MOD |
| FİNANS | Abonelikler | `/subscriptions` | ADMIN |
| FİNANS | Siparişler | `/orders` | ADMIN, MOD |
| FİNANS | Maaş Hesaplama | `/maas-hesaplama` | ADMIN, MOD |
| SİSTEM | Loglar | `/logs` | ADMIN |
| SİSTEM | Ayarlar | `/settings` | ADMIN |

## Modül Detayları

### 1. Danışman Yönetim Modülü (`/consultants`)
4 sekmeli (tab) yapıda kapsamlı modül:
- **Aktif Danışmanlar:** Data table (foto, isim, kategori, jeton ücreti, görüşme sayısı, puan, çevrimiçi toggle, öne çıkar toggle, durum). Yeni danışman ekleme, düzenleme, profil görüntüleme, askıya alma.
- **Başvurular:** Bekleyen başvuru tablosu, onayla (sisteme ekle) / reddet (sebep ile).
- **Finans & Muhasebe:** Metrik kartları (toplam jeton, platform geliri, komisyon, ödenecek TL). Hakediş tablosu (dönem seçimi, IBAN, ödeme durumu).
- **Sistem Ayarları:** Global jeton kuru (1 Jeton = X TL), platform komisyon oranı (%).

**İş Mantığı:** Platform sanal para birimi "Jeton" kullanır. Admin jeton kurunu belirler. Danışmanlar ücretlerini jeton cinsinden belirler. Hakediş = Kazanılan Jeton × Kur − Komisyon.

### 2. Haberler & Duyurular (`/content`)
- **Canlı Piyasa Verileri:** USD/TRY, EUR/TRY, GBP/TRY, BTC/TRY, BIST 100 (5 dk auto-refresh)
- **Haber CRUD:** Oluştur/düzenle/sil/yayınla, görsel yükleme, kategori filtreleme
- **API:** `/api/market-data` (admin), `/api/public/market-data` (mobil)

### 3. Kullanıcı Yönetimi (`/users`)
- Filtreleme: rol, personel tipi, doğrulama, premium
- Detay sayfası: profil bilgileri, jeton yönetimi, doğrulama toggle, düzenleme
- Silme: Cascade delete (tüm ilişkili kayıtlar transaction ile)
- Yeni kullanıcı oluşturma (PBKDF2 hash)

### 4. Becayiş İlan Yönetimi (`/becayis`)
- Kamu çalışanlarının tayin değişimi ilanlarını yönetme
- Onay/red, durum takibi

### 5. Kariyer Modülü (`/career`)
- AI destekli CV analizi (OpenAI), iş ilanı eşleştirme
- Kariyer danışmanlığı sohbet sistemi

### 6. TİS Arşivi (`/tis`)
- Toplu İş Sözleşmesi belgelerini yönetme, PDF depolama

## Tasarım Sistemi

- **Dark theme** varsayılan, CSS custom properties ile
- Temel CSS değişkenleri: `--primary`, `--bg-card`, `--bg-sidebar`, `--bg-modal`, `--text`, `--text-secondary`, `--text-muted`, `--border`, `--bg-hover`, `--bg-active`, `--shadow-lg`
- Hazır CSS sınıfları: `.card`, `.stat-card`, `.glass-card`, `.badge`, `.badge-green`, `.badge-red`, `.badge-blue`, `.badge-yellow`, `.badge-purple`, `.gradient-primary`, `.glow-primary`, `.animate-fade-in`, `.animate-scale-in`
- Tablolar `<table>` elementleri ile, card yapısında wrapper
- Modallar: `fixed inset-0 z-50`, `backdrop-blur-sm`, `animate-scale-in`

## Önemli Kurallar

1. Tüm sayfalar `src/app/(admin)/` altında, layout ile Sidebar sarılı
2. API route'lar `src/app/api/` altında, NextAuth session kontrolü ile korunur
3. Server Actions `src/actions/` altında, `"use server"` directive ile
4. Client component'ler `"use client"` directive ile
5. Prisma client `@/lib/prisma`'dan import edilir (singleton)
6. Stil: Tailwind CSS v4 + `var(--xxx)` CSS değişkenleri birlikte kullanılır
7. İkonlar: Lucide React kütüphanesinden
8. Build komutu: `prisma generate && prisma db push && next build`
9. Deploy: Git push → SSH → `git pull && npm run build && pm2 restart kamulog-panel`
