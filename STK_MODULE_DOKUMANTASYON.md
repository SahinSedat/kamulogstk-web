# 🏛️ Kamulog STK Modülü — Tam Teknik Dokümantasyon

> **Amaç:** Yeni sunucuya STK yönetim paneli kurulumu için gerekli tüm parametreler, API endpoint'leri, veritabanı şeması ve mobil-backend haberleşme detayları.

---

## 1. VERİTABANI ŞEMASI (Prisma)

### 1.1 Enum Tanımları

```prisma
enum OrganizationType {
  SENDIKA
  DERNEK
  VAKIF
  KONFEDERASYON
  MESLEK_ODASI
  DIGER
}

enum OrganizationStatus {
  PENDING
  ACTIVE
  SUSPENDED
  INACTIVE
}

enum NotificationChannel {
  PUSH
  WHATSAPP
  EMAIL
}

enum TargetAudience {
  ALL_MEMBERS
  OVERDUE_DUES
  UPCOMING_DUES
  INDIVIDUAL
  CUSTOM
}
```

### 1.2 STKOrganization (Ana Kuruluş)

```prisma
model STKOrganization {
  id                         String             @id @default(cuid())
  name                       String
  slug                       String             @unique
  type                       OrganizationType
  status                     OrganizationStatus @default(PENDING)
  description                String             @db.Text
  logo                       String?
  website                    String?
  email                      String?
  phone                      String?
  city                       String
  district                   String?
  address                    String?            @db.Text
  registrationNumber         String?
  taxNumber                  String?
  foundedAt                  DateTime?
  memberCount                Int                @default(0)
  topicCount                 Int                @default(0)
  iban                       String?
  acceptsDonation            Boolean            @default(false)
  acceptsDues                Boolean            @default(false)
  paymentNote                String?            @db.Text
  bankAccountName            String?
  donationNote               String?            @db.Text
  duesNote                   String?            @db.Text
  annualDuesNote             String?            @db.Text
  monthlyDuesAmount          String?
  annualDuesAmount           String?
  acceptsAnnualDues          Boolean            @default(false)
  requiresMembershipForFinance Boolean          @default(true)
  showMemberCount            Boolean            @default(false)
  isConsentActive            Boolean            @default(false)
  consentText                String?            @db.Text
  contractPdfUrl             String?
  isApplicationEnabled       Boolean            @default(true)
  isFeatured                 Boolean            @default(false)
  // Relations
  announcements              STKAnnouncement[]
  activities                 STKActivity[]
  applications               STKApplication[]
  campaigns                  NotificationCampaign[]
  createdAt                  DateTime           @default(now())
  updatedAt                  DateTime           @updatedAt
  @@index([type])
  @@index([status])
  @@index([city])
  @@index([slug])
}
```

### 1.3 STKActivity (Faaliyetler — Mobil'de görünen)

```prisma
model STKActivity {
  id          String           @id @default(cuid())
  stkId       String
  stk         STKOrganization  @relation(fields: [stkId], references: [id], onDelete: Cascade)
  title       String
  content     String           @db.Text
  imageUrl    String?
  isPublished Boolean          @default(true)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  @@index([stkId])
  @@index([createdAt])
}
```

### 1.4 STKAnnouncement (Duyurular — ayrı tablo)

```prisma
model STKAnnouncement {
  id          String           @id @default(cuid())
  stkId       String
  stk         STKOrganization  @relation(...)
  title       String
  content     String           @db.Text
  category    String?
  imageUrl    String?
  isPublished Boolean          @default(false)
  publishedAt DateTime?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  @@index([stkId])
  @@index([publishedAt])
}
```

### 1.5 STKApplication (Üyelik Başvuruları)

```prisma
model STKApplication {
  id               String           @id @default(cuid())
  stkId            String
  stk              STKOrganization  @relation(...)
  userId           String?          // Mobil kullanıcı ID
  name             String
  tcKimlik         String
  phone            String
  email            String
  status           String           @default("PENDING")
  // Değerler: PENDING, APPROVED, REJECTED, RESIGNED, RESIGN_PENDING
  approvedAt       DateTime?
  nextDuesDate     DateTime?
  consentGiven     Boolean          @default(false)
  signatureType    String?          // "DRAWN" veya "SCANNED"
  signatureUrl     String?          @db.Text
  documentUrl      String?          @db.Text
  membershipStatus String           @default("PENDING")
  // Değerler: PENDING, ACTIVE, SUSPENDED, EXPIRED
  startDate        DateTime?
  expiryDate       DateTime?
  payments         STKPaymentReport[]
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
  @@index([stkId])
  @@index([tcKimlik])
  @@index([status])
  @@index([membershipStatus])
}
```

### 1.6 STKPaymentReport (Aidat/Ödeme Bildirimi)

```prisma
model STKPaymentReport {
  id            String         @id @default(cuid())
  applicationId String
  application   STKApplication @relation(...)
  amount        Float
  paymentType   String         @default("MONTHLY") // MONTHLY, ANNUAL, DONATION
  paymentDate   DateTime
  receiptUrl    String?        @db.Text   // Dekont görseli
  note          String?
  status        String         @default("PENDING") // PENDING, APPROVED, REJECTED
  reviewedAt    DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  @@index([applicationId])
  @@index([status])
}
```

### 1.7 NotificationCampaign (Bildirim Kampanyaları)

```prisma
model NotificationCampaign {
  id        String               @id @default(cuid())
  title     String
  content   String               @db.Text
  channels  NotificationChannel[]
  audience  TargetAudience       @default(ALL_MEMBERS)
  stkId     String?
  stk       STKOrganization?     @relation(...)
  status    String               @default("SENT")
  sentCount Int                  @default(0)
  createdAt DateTime             @default(now())
  updatedAt DateTime             @updatedAt
  @@index([stkId])
  @@index([createdAt])
}
```

---

## 2. ADMİN API ENDPOINT'LERİ

### 2.1 STK Kuruluş Yönetimi
**Dosya:** `src/app/api/admin/stk/organizations/route.ts`

| Method | Endpoint | Açıklama | Parametreler |
|--------|----------|----------|-------------|
| `GET` | `/api/admin/stk/organizations` | STK listesi | `?type=SENDIKA&status=ACTIVE` |
| `POST` | `/api/admin/stk/organizations` | Yeni STK ekle | Body: `{name, type, city, description, ...tüm alanlar}` |
| `PATCH` | `/api/admin/stk/organizations?id=xxx` | STK güncelle | Body: güncellenecek alanlar |
| `DELETE` | `/api/admin/stk/organizations?id=xxx` | STK sil | — |

### 2.2 Başvuru Yönetimi
**Dosya:** `src/app/api/admin/stk/applications/route.ts`

| Method | Endpoint | Açıklama | Detay |
|--------|----------|----------|-------|
| `GET` | `/api/admin/stk/applications` | Başvuru listesi | `?stkId=xxx&status=PENDING` |
| `PATCH` | `/api/admin/stk/applications?id=xxx` | Tekil onay/red | Body: `{status: "APPROVED"}` |
| `POST` | `/api/admin/stk/applications` | Toplu işlem | Body: `{ids: [...], status: "APPROVED"}` |
| `DELETE` | `/api/admin/stk/applications` | Toplu silme | Body: `{ids: [...]}` |

**Onay süreci:** `APPROVED` → membershipStatus=ACTIVE, startDate=now, memberCount++  
**Red süreci:** `REJECTED` → bildirim gönder  
**İstifa:** `RESIGNED` → memberCount--, bildirim gönder

### 2.3 Ödeme Yönetimi
**Dosya:** `src/app/api/admin/stk/payments/route.ts`

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/admin/stk/payments` | Ödeme listesi (`?stkId=xxx&status=PENDING`) |
| `PATCH` | `/api/admin/stk/payments?id=xxx` | Ödeme onay/red + süre uzatma |

**Onay mantığı:** `APPROVED` → expiryDate += durationDays (varsayılan 30 gün), membershipStatus=ACTIVE

### 2.4 Faaliyet Yönetimi (STK Activities)
**Dosya:** `src/app/api/admin/stk-activities/route.ts` *(sunucuda mevcut)*

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/admin/stk-activities` | Faaliyetleri listele (`?stkId=xxx`) |
| `POST` | `/api/admin/stk-activities` | Faaliyet ekle + bildirim gönder |
| `DELETE` | `/api/admin/stk-activities?id=xxx` | Faaliyet sil |

**POST Body:**
```json
{
  "stkId": "cuid",
  "title": "Faaliyet Başlığı",
  "content": "İçerik metni",
  "imageUrl": "https://...",
  "sendPush": true,
  "sendEmail": true,
  "sendWhatsapp": true
}
```

**Bildirim akışı:** Faaliyet kaydedilir → Aktif üyeler bulunur → Push/Email/WhatsApp paralel gönderilir

### 2.5 Bildirim Kampanyaları
**Dosya:** `src/app/api/admin/stk-campaigns/route.ts`

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/admin/stk-campaigns` | Kampanya geçmişi |
| `POST` | `/api/admin/stk-campaigns` | Toplu veya münferit bildirim gönder |

**Toplu POST Body:**
```json
{
  "title": "Bildirim Başlığı",
  "content": "Mesaj içeriği",
  "channels": ["PUSH", "EMAIL", "WHATSAPP"],
  "audience": "ALL_MEMBERS",
  "stkId": "opsiyonel-stk-id"
}
```

**Münferit POST Body:**
```json
{
  "title": "...",
  "content": "...",
  "channels": ["WHATSAPP", "EMAIL"],
  "individualMode": true,
  "recipientPhone": "905xxxxxxxxx",
  "recipientEmail": "user@mail.com"
}
```

---

## 3. PUBLIC (MOBİL) API ENDPOINT'LERİ

> **Base URL:** `https://kamulog.net`  
> Mobil uygulama bu endpoint'leri kullanır. Auth gerektirmez (UI tarafında kontrol edilir).

### 3.1 STK Listeleme & Detay

| Method | Endpoint | Açıklama | Response Key |
|--------|----------|----------|-------------|
| `GET` | `/api/public/stk` | Aktif STK listesi | `{success, data: [...], count}` |
| `GET` | `/api/public/stk?featured=true` | Öne çıkan STK'lar (max 6) | `{success, data: [...]}` |
| `GET` | `/api/public/stk/{slug}` | STK detay (tüm alanlar) | `{success, data: {...}}` |

### 3.2 Üyelik İşlemleri

| Method | Endpoint | Açıklama | Body/Params |
|--------|----------|----------|-------------|
| `GET` | `/api/public/stk/{slug}/membership?userId=xxx` | Üyelik durumu | — |
| `POST` | `/api/public/stk/{slug}/apply` | Başvuru yap | `{name, tcKimlik, phone, email, userId, consentGiven, signatureType, signatureUrl, documentUrl}` |
| `POST` | `/api/public/stk/{slug}/resign` | İstifa talebi | `{userId}` |
| `POST` | `/api/public/stk/{slug}/send-contract` | Sözleşme PDF e-posta | `{email}` |

**Membership Response:**
```json
{
  "success": true,
  "data": {
    "status": "APPROVED",
    "isMember": true,
    "isPending": false,
    "isResignPending": false,
    "isResigned": false,
    "applicationId": "cuid",
    "approvedAt": "ISO-8601"
  }
}
```

### 3.3 Ödeme Bildirimi

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/api/public/stk/{slug}/payment` | Aidat/bağış bildirimi |

**Body:**
```json
{
  "applicationId": "cuid",
  "amount": 150.0,
  "paymentType": "MONTHLY",
  "paymentDate": "2026-05-10T00:00:00Z",
  "receiptUrl": "base64-veya-url",
  "note": "Mayıs aidatı"
}
```

### 3.4 Faaliyetler & Duyurular

| Method | Endpoint | Açıklama | Response Key |
|--------|----------|----------|-------------|
| `GET` | `/api/public/stk/{slug}/activities` | **Faaliyetler** (STKActivity tablosu) | `{success, activities: [...]}` |
| `GET` | `/api/public/stk/{slug}/announcements` | Duyurular (STKAnnouncement tablosu) | `{success, data: [...]}` |

> [!IMPORTANT]
> **activities** → `STKActivity` tablosu, admin `/stk-activities` sayfasından eklenir  
> **announcements** → `STKAnnouncement` tablosu (farklı tablo!)

### 3.5 Topluluk Profili

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/api/public/me/community?userId=xxx` | Kullanıcı topluluk geçmişi (konular + başvurular) |

---

## 4. ADMİN PANEL SAYFALARI

| Sayfa | Rota | Dosya | İçerik |
|-------|------|-------|--------|
| STK Yönetimi | `/stk` | `(admin)/stk/page.tsx` | 4 tab: STK Dizini, Başvurular, Forum Kategorileri, Forum Konuları |
| Faaliyet Yönetimi | `/stk-activities` | `(admin)/stk-activities/page.tsx` | Faaliyet ekle/sil + Push/Email/WhatsApp bildirim |
| Ödeme Yönetimi | `/stk-payments` | `(admin)/stk-payments/page.tsx` | Aidat/bağış onay-red |
| Kampanya Yönetimi | `/stk-campaigns` | `(admin)/stk-campaigns/page.tsx` | Toplu/münferit bildirim gönderimi |

### Sidebar Navigasyonu
`src/components/layout/Sidebar.tsx` dosyasında STK menü öğeleri tanımlı.

---

## 5. FLUTTER MOBİL ENTEGRASYONU

### 5.1 Veri Modelleri

| Model | Dosya | Alanlar |
|-------|-------|---------|
| `STKModel` | `community/data/models/stk_model.dart` | id, name, slug, type, logo, city, memberCount, description, email, phone, website, iban, bankAccountName, paymentNote, donationNote, duesNote, annualDuesNote, acceptsDonation, acceptsDues, acceptsAnnualDues, requiresMembershipForFinance, showMemberCount, monthlyDuesAmount, annualDuesAmount, isConsentActive, consentText, contractPdfUrl, isApplicationEnabled, isFeatured |
| `STKApplicationModel` | `community/data/models/stk_application_model.dart` | id, stkId, userId, name, tcKimlik, phone, email, status, membershipStatus, startDate, expiryDate, approvedAt, nextDuesDate, createdAt, stkName, stkSlug, stkType, stkLogo |
| `STKAnnouncementModel` | `community/data/models/stk_announcement_model.dart` | Duyuru modeli |

### 5.2 Repository Metotları
**Dosya:** `community/data/repositories/community_repository.dart`

| Metot | API Endpoint | Açıklama |
|-------|-------------|----------|
| `getStks()` | `GET /api/public/stk` | STK listesi |
| `getFeaturedStks()` | `GET /api/public/stk?featured=true` | Öne çıkan STK'lar |
| `getStkDetail(slug)` | `GET /api/public/stk/{slug}` | STK detay |
| `getStkAnnouncements(slug)` | `GET /api/public/stk/{slug}/announcements` | Duyurular |
| `applyForStkMembership(...)` | `POST /api/public/stk/{slug}/apply` | Başvuru |
| `sendContractEmail(slug, email)` | `POST /api/public/stk/{slug}/send-contract` | Sözleşme mail |
| `resignFromStk(slug, userId)` | `POST /api/public/stk/{slug}/resign` | İstifa |
| `reportPayment(...)` | `POST /api/public/stk/{slug}/payment` | Ödeme bildirimi |
| `getMembershipStatus(slug, userId)` | `GET /api/public/stk/{slug}/membership` | Üyelik durumu |
| `getMyCommunityHistory(userId)` | `GET /api/public/me/community` | Topluluk geçmişi |

### 5.3 Mobil Ekranlar

| Ekran | Dosya | Açıklama |
|-------|-------|---------|
| `CommunityScreen` | `community_screen.dart` | Ana topluluk (STK + Forum tab'ları) |
| `StkDirectoryScreen` | `stk_directory_screen.dart` | STK dizini listesi |
| `StkDetailScreen` | `stk_detail_screen.dart` | STK detay + başvuru + ödeme |
| `StkApplicationScreen` | `stk_application_screen.dart` | Başvuru formu (imza + belge) |
| `StkActivitiesScreen` | `stk_activities_screen.dart` | Faaliyet listesi |
| `MyCommunityProfileScreen` | `my_community_profile_screen.dart` | Topluluk profili |
| `PaymentReportSheet` | `payment_report_sheet.dart` | Ödeme/aidat bildirimi |

### 5.4 Faaliyetler Ekranı — Beklenen JSON Format

```dart
// GET /api/public/stk/{slug}/activities
// Beklenen response:
{
  "success": true,
  "activities": [
    {
      "id": "cuid",
      "title": "Faaliyet Başlığı",
      "content": "İçerik metni...",
      "imageUrl": "https://...",  // opsiyonel
      "createdAt": "2026-05-10T12:00:00.000Z"
    }
  ]
}
```

> [!WARNING]
> Flutter `data['activities']` key'ini bekler, `data['data']` DEĞİL!

---

## 6. BİLDİRİM SİSTEMİ

### 6.1 Bildirim Fonksiyonları
**Dosya:** `src/lib/services/notificationService.ts`

| Fonksiyon | Tetikleyici | Kanallar |
|-----------|------------|----------|
| `sendSTKApplicationNotification` | Başvuru yapıldığında | Push + Email + WhatsApp |
| `sendSTKApprovalNotification` | Başvuru onaylandığında | Push + Email + WhatsApp |
| `sendSTKRejectionNotification` | Başvuru reddedildiğinde | Push + Email + WhatsApp |
| `sendSTKResignationNotification` | İstifa onaylandığında | Push + Email + WhatsApp |
| `createNotification` | In-app bildirim | Push (FCM) |

### 6.2 Push Bildirim Yapısı (FCM)

```javascript
{
  notification: { title, body },
  data: {
    click_action: "FLUTTER_NOTIFICATION_CLICK",
    type: "STK_CAMPAIGN",
    stkSlug: "dernek-slug",
    route: "/community/stk-detail/dernek-slug"
  },
  android: { priority: "high", notification: { channelId: "kamulog_notifications" } },
  apns: { headers: { "apns-priority": "10" }, payload: { aps: { sound: "default" } } }
}
```

### 6.3 WhatsApp Bot Entegrasyonu

```
POST ${WHATSAPP_BOT_URL}/send
Body: { phone: "905xxxxxxxxx", message: "mesaj metni" }
```

---

## 7. ENVIRONMENT DEĞİŞKENLERİ

```env
# Veritabanı
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"

# SMTP (E-posta)
SMTP_TX_HOST=smtp.gmail.com
SMTP_TX_PORT=587
SMTP_TX_USER=iletisim@kamulogstk.net
SMTP_TX_PASS=uygulama-sifresi
SMTP_TX_FROM="Kamulog <iletisim@kamulogstk.net>"

# WhatsApp Bot
WHATSAPP_BOT_URL=http://localhost:3101

# Firebase (Push Bildirimleri)
# Firebase Admin SDK JSON credentials

# Site URL
SITE_URL=https://kamulog.net
NEXTAUTH_URL=https://kamulog.net

# Auth
NEXTAUTH_SECRET=xxx
```

---

## 8. DOSYA YÜKLEME (Upload)

| Tür | Dizin | Endpoint |
|-----|-------|---------|
| İmza (base64→PNG) | `public/uploads/signatures/` | `/api/public/stk/{slug}/apply` |
| Belge (base64→PNG) | `public/uploads/signatures/` | `/api/public/stk/{slug}/apply` |
| Dekont (base64→PNG) | `public/uploads/receipts/` | `/api/public/stk/{slug}/payment` |
| Sözleşme PDF | `public/uploads/contracts/` | Admin panel upload |

---

## 9. DURUM MAKİNESİ

```mermaid
stateDiagram-v2
    [*] --> PENDING: Kullanıcı başvuru yapar
    PENDING --> APPROVED: Admin onaylar
    PENDING --> REJECTED: Admin reddeder
    APPROVED --> RESIGN_PENDING: Kullanıcı istifa eder
    RESIGN_PENDING --> RESIGNED: Admin istifayı onaylar
    REJECTED --> PENDING: Kullanıcı tekrar başvurur
    RESIGNED --> PENDING: Kullanıcı tekrar başvurur
```

**Üyelik Durumu (membershipStatus):**
- `PENDING` → Onay bekliyor
- `ACTIVE` → Aktif üye (ödeme onaylandığında expiryDate uzar)
- `SUSPENDED` → Askıya alındı
- `EXPIRED` → Süresi doldu

---

## 10. ÖNEMLİ NOTLAR

> [!CAUTION]
> - `STKActivity` ve `STKAnnouncement` **FARKLI tablolardır**! Admin `/stk-activities` sayfası `STKActivity`'ye yazar.
> - Mobil faaliyetler endpoint'i `activities` key döner, duyurular `data` key döner.
> - `memberCount` alanı gerçek zamanlı hesaplanır (APPROVED başvuru sayısı), statik değer güvenilmez.
> - İmza/belge base64 olarak gelir, 500+ karakter ise dosya olarak kaydedilir.

> [!TIP]
> Yeni sunucuda kurulum sırası:
> 1. PostgreSQL + Prisma migrate
> 2. Environment variables (.env)
> 3. Firebase Admin SDK
> 4. WhatsApp Bot (opsiyonel)
> 5. SMTP yapılandırması
> 6. PM2 ile Next.js deploy
> 7. Nginx reverse proxy
