# KamulogSTK — STK Yönetim Platformu Tanıtım Prompt'u

## Proje Bağlamı ve Teknoloji Yığını

Bu proje, **KamulogSTK** isimli bağımsız bir **Sivil Toplum Kuruluşları (STK) Yönetim Paneli**dir. Sendika, dernek, vakıf gibi STK'ların üyelik, aidat, yönetim kurulu kararları, genel kurul, belge ve iletişim süreçlerini tek platformdan yönetebildiği **multi-tenant SaaS** mimarisiyle tasarlanmıştır.

**Teknoloji Yığını:**
- **Framework:** Next.js 16.1.1 (App Router) + React 19
- **Stil:** Tailwind CSS v4 + Radix UI (shadcn/ui bileşenleri)
- **Veritabanı & ORM:** PostgreSQL + Prisma 5
- **Yetkilendirme:** JWT (jose) + Custom middleware — Cookie tabanlı (`auth-token`)
- **Auth:** NextAuth v5 beta (next-auth@5.0.0-beta.30) + bcryptjs
- **PDF:** jsPDF + jsPDF-AutoTable (belge üretimi)
- **Validasyon:** Zod v4
- **Gerçek Zamanlı:** Socket.io (mesajlaşma)
- **Harita/Konum:** Google Places API
- **Icon Seti:** Lucide React + Radix Icons
- **UI Bileşenleri:** Radix UI (Dialog, Select, Tabs, Toast, Popover, Dropdown, Switch, Checkbox, Avatar, Tooltip, Separator, Label)
- **Tema:** next-themes (dark/light mode)

**Dizin Yapısı:**
```
src/
├── app/
│   ├── admin/              ← Platform yönetici (ADMIN) sayfaları
│   │   ├── dashboard/
│   │   ├── stk-applications/  ← STK başvuru onay/red
│   │   ├── stk-management/    ← Aktif STK'ları yönet
│   │   ├── uyeler/            ← Platform kullanıcıları
│   │   ├── odemeler/          ← Ödeme takibi
│   │   ├── packages/          ← Paket yönetimi
│   │   ├── paketler/          ← Paket tanımları
│   │   ├── domain-talepleri/  ← Domain/web sitesi talepleri
│   │   └── logs/              ← Denetim logları
│   ├── stk/                ← STK yöneticisi (STK_MANAGER) sayfaları
│   │   ├── anasayfa/          ← Dashboard
│   │   ├── uyeler/            ← Üye yönetimi
│   │   ├── basvurular/        ← Üyelik başvuruları
│   │   ├── istifa-yonetimi/   ← İstifa talepleri
│   │   ├── yonetim-kurulu/    ← YK üyeleri
│   │   ├── kararlar/          ← YK kararları
│   │   ├── genel-kurul/       ← Genel kurul yönetimi
│   │   ├── odemeler/          ← Aidat/ödeme takibi
│   │   ├── muhasebe/          ← Muhasebe
│   │   ├── aidat-planlari/    ← Aidat planları
│   │   ├── dokumanlar/        ← Belge paylaşımı
│   │   ├── mesajlar/          ← Üyelere mesaj gönderimi
│   │   ├── domain-talebi/     ← Domain talebi
│   │   ├── dernek-profili/    ← STK profil bilgileri
│   │   ├── profil/            ← Yönetici profili
│   │   ├── ayarlar/           ← STK ayarları
│   │   └── analizler/         ← İstihbarat & Analiz
│   │       ├── pazar-payi/
│   │       ├── rakipler/
│   │       ├── bolgesel-harita/
│   │       └── tahminler/
│   ├── api/
│   │   ├── admin/          ← Admin API'leri
│   │   ├── auth/           ← Login/Register/Logout/Me
│   │   ├── stk/            ← STK Manager API'leri
│   │   ├── public/         ← Herkese açık API'ler
│   │   └── locations/      ← Konum arama
│   ├── giris/              ← Login sayfası
│   ├── kayit/              ← Register sayfası
│   ├── uyegirisi/          ← Mobil yönlendirme
│   ├── hakkimizda/         ← Landing: Hakkımızda
│   ├── iletisim/           ← Landing: İletişim
│   ├── fiyatlandirma/      ← Landing: Fiyatlandırma
│   ├── haber/              ← Landing: Haberler
│   ├── gizlilik-politikasi/
│   ├── kullanim-sartlari/
│   └── kvkk/
├── components/
│   ├── layout/             ← Sidebar, Header, Navbar
│   └── ui/                 ← shadcn/ui bileşenleri
├── hooks/                  ← Custom React hooks
├── lib/                    ← Prisma client, utils
├── types/                  ← TypeScript tipleri
└── middleware.ts           ← JWT auth + role-based routing
```

## Kullanıcı Rolleri ve Yetkilendirme

| Rol | Açıklama | Erişim |
|-----|----------|--------|
| `ADMIN` | Platform yöneticisi | `/admin/*`, `/api/admin/*`, tüm rotalar |
| `STK_MANAGER` | STK kurucu/yöneticisi | `/stk/*`, `/api/stk/*` |
| `CITIZEN` | Vatandaş (üye adayı) | `/uyegirisi` → mobil yönlendirme |

**Auth Mekanizması:**
- JWT token cookie (`auth-token`) ile saklanır
- Middleware: `jose` ile token doğrulama
- Header injection: `x-user-id`, `x-user-role`, `x-stk-id`
- STK API'leri: Header'dan `x-stk-id` alarak multi-tenant filtreleme

## Prisma Veritabanı Modelleri (40+ Model)

### Kullanıcı & Auth
- `User` — Platform kullanıcısı (role: ADMIN/STK_MANAGER/CITIZEN, bildirim tercihleri, STK yetkili bilgisi)
- `Session` — JWT session kaydı (token, userAgent, ipAddress)

### STK Kuruluş Yönetimi
- `STK` — Ana STK kaydı (name, slug, type, status, iletişim, adres, tüzük, managerId→User)
- `STKApplication` — STK platform başvurusu (belgeler, inceleme notları)
- `STKSector` — STK-Sektör ilişkisi (many-to-many)
- `STKRole` — STK içi rol ve yetki tanımları (permissions JSON)

### Yönetim Kurulu
- `BoardMember` — YK üyeleri (position: PRESIDENT/VICE_PRESIDENT/SECRETARY/TREASURER/MEMBER/AUDITOR, imza yetkisi)
- `BoardDecision` — YK kararları (karar no, tarih, konu, belge, status: DRAFT/FINALIZED)
- `DecisionMember` — Karar-üye ilişkisi (MEMBERSHIP_ACCEPT, RESIGNATION_ACCEPT, EXPULSION, OTHER)

### Üyelik Yönetimi
- `Member` — STK üyesi (memberNumber, tcKimlik, status, category: ASIL/FAHRI/ONURSAL/KURUMSAL/GENCLIK/GONULLU, kayıt kaynağı, ıslak imza, KVKK)
- `MembershipApplication` — Üyelik başvurusu (form, belgeler, YK karar bilgisi)
- `MemberNote` — Yönetici notları (sadece yönetim görür)
- `ApplicationHistory` — Başvuru geçmişi logları
- `ResignationHistory` — İstifa geçmişi logları

### Finans & Aidat
- `Package` — Platform paketleri (aylık/yıllık fiyat, üye limiti, özellikler)
- `DuesPlan` — Aidat planları (MONTHLY/QUARTERLY/BIANNUAL/YEARLY/CUSTOM, tutar)
- `DuesDiscount` — Aidat affı/indirimi (FORGIVENESS/DISCOUNT/DEFERMENT)
- `PaymentAccount` — Ödeme hesapları (BANK_ACCOUNT/IBAN, banka bilgileri)
- `Payment` — Ödemeler (type: DUES/DONATION/REGISTRATION, status: PENDING/CONFIRMED/REJECTED/CANCELLED/REFUNDED, periyot, makbuz)

### İletişim & Bildirim
- `MessageCampaign` — Mesaj kampanyaları (SMS/PUSH/EMAIL, hedef kitle: ALL_ACTIVE/DUES_PAID/DUES_UNPAID/CUSTOM, zamanlanmış gönderim, admin kontrolü)
- `MessageRecipient` — Kampanya alıcıları (gönderim durumu)
- `MemberNotification` — Üye bildirimleri (INFO/WARNING/DUES/ANNOUNCEMENT, tekil veya toplu)
- `Notification` — Sistem bildirimleri

### Belge & Doküman
- `Document` — Paylaşılan belgeler (ANNOUNCEMENT/DOCUMENT/INFORMATION, dosya bilgileri, yayın durumu)
- `DocumentTemplate` — Belge şablonları (UYEBELGESI/AIDAT_MAKBUZU/IHTAR/GENEL_YAZI/DAVET/VEKALETNAME/TUTANAK)

### Genel Kurul
- `GeneralAssembly` — Genel kurul (OLAGAN/OLAGANUSTU, tarih, konum, yeter sayı, tutanak)
- `AssemblyAgendaItem` — Gündem maddeleri
- `AssemblyAttendee` — Katılımcılar (IN_PERSON/BY_PROXY, onay durumu: PENDING/ACCEPTED/REJECTED)
- `AssemblyProxy` — Vekaletnameler (veren→alan, belge, onay)

### İstihbarat & Analiz
- `Sector` — İş kolları/sektörler (kod, toplam çalışan, kaynak)
- `SectorRegionalData` — İl bazlı sektör verileri
- `Competitor` — Rakip STK verileri (anonimleştirilmiş)
- `MonthlySnapshot` — Aylık istatistik snapshot'ı (üyelik, finansal, il dağılımı)
- `UserInterest` — Kullanıcı ilgi alanları (User-Sector many-to-many)

### Domain & Web Sitesi
- `DomainRequest` — Domain/web sitesi talepleri (status: PENDING/PROCESSING/COMPLETED/CANCELLED)

### Sistem
- `AuditLog` — Denetim logları (33 farklı aksiyon, önceki/yeni değerler, IP, user-agent)
- `Archive` — Yıl bazlı arşivleme (MEMBER/PAYMENT/DECISION/ASSEMBLY/DOCUMENT, snapshot, kilit)

## API Endpoint'leri

### Auth API'leri
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/api/auth/login` | Giriş (email+password → JWT cookie) |
| `POST` | `/api/auth/register` | Kayıt (STK_MANAGER olarak) |
| `POST` | `/api/auth/logout` | Çıkış (cookie temizle) |
| `GET` | `/api/auth/me` | Oturum bilgisi |

### Admin API'leri (`/api/admin/*`)
| Endpoint | Açıklama |
|----------|----------|
| `/api/admin/stks` | STK listesi/onay/red/askıya alma |
| `/api/admin/users` | Kullanıcı yönetimi |
| `/api/admin/memberships` | Üyelik yönetimi |
| `/api/admin/payments` | Ödeme takibi |
| `/api/admin/packages` | Paket yönetimi |
| `/api/admin/domain-talepleri` | Domain talepleri |

### STK Manager API'leri (`/api/stk/*`)
| Endpoint | Açıklama |
|----------|----------|
| `/api/stk/association` | STK profil bilgileri (GET/PATCH) |
| `/api/stk/association/logo` | Logo yükleme |
| `/api/stk/association/statute` | Tüzük yükleme |
| `/api/stk/members` | Üye CRUD + filtreleme |
| `/api/stk/applications` | Üyelik başvuruları |
| `/api/stk/applications/[id]` | Tekil başvuru işlemleri |
| `/api/stk/resignations` | İstifa yönetimi |
| `/api/stk/board-members` | YK üyeleri CRUD |
| `/api/stk/board-members/[id]` | Tekil YK üyesi |
| `/api/stk/decisions` | YK kararları CRUD |
| `/api/stk/decisions/[id]` | Tekil karar |
| `/api/stk/decisions/[id]/finalize` | Karar kesinleştirme |
| `/api/stk/decisions/[id]/members` | Karar-üye ilişkilendirme |
| `/api/stk/decisions/check` | Karar no kontrolü |
| `/api/stk/dues-plans` | Aidat planları |
| `/api/stk/genel-kurul` | Genel kurul CRUD |
| `/api/stk/genel-kurul/katilimci` | Katılımcı yönetimi |
| `/api/stk/genel-kurul/vekalet` | Vekaletname yönetimi |
| `/api/stk/dokumanlar` | Belge paylaşımı |
| `/api/stk/dokumanlar/[id]` | Tekil belge |
| `/api/stk/domain-talebi` | Domain talebi oluşturma |
| `/api/stk/messages` | Mesaj kampanyaları |
| `/api/stk/messages/[id]` | Tekil kampanya |
| `/api/stk/notifications` | Üye bildirimleri |
| `/api/stk/profile` | Yönetici profili |
| `/api/stk/settings` | STK ayarları |
| `/api/stk/stats` | İstatistikler |

### Public API'leri
| Endpoint | Açıklama |
|----------|----------|
| `/api/public/sectors` | Sektör listesi |
| `/api/locations/search` | Konum arama (Google Places) |

## STK Yöneticisi Sayfa Yapısı (Sidebar)

| Grup | Sayfa | Yol |
|------|-------|-----|
| ANA MENÜ | Ana Sayfa | `/stk/anasayfa` |
| ÜYELİK | Üyeler | `/stk/uyeler` |
| ÜYELİK | Başvurular | `/stk/basvurular` |
| ÜYELİK | İstifa Yönetimi | `/stk/istifa-yonetimi` |
| YÖNETİM | Yönetim Kurulu | `/stk/yonetim-kurulu` |
| YÖNETİM | Kararlar | `/stk/kararlar` |
| YÖNETİM | Genel Kurul | `/stk/genel-kurul` |
| FİNANS | Ödemeler | `/stk/odemeler` |
| FİNANS | Muhasebe | `/stk/muhasebe` |
| FİNANS | Aidat Planları | `/stk/aidat-planlari` |
| İLETİŞİM | Mesajlar | `/stk/mesajlar` |
| İLETİŞİM | Dokümanlar | `/stk/dokumanlar` |
| ANALİZ | Pazar Payı | `/stk/analizler/pazar-payi` |
| ANALİZ | Rakipler | `/stk/analizler/rakipler` |
| ANALİZ | Bölgesel Harita | `/stk/analizler/bolgesel-harita` |
| ANALİZ | Tahminler | `/stk/analizler/tahminler` |
| AYARLAR | Dernek Profili | `/stk/dernek-profili` |
| AYARLAR | Domain Talebi | `/stk/domain-talebi` |
| AYARLAR | Profil | `/stk/profil` |
| AYARLAR | Ayarlar | `/stk/ayarlar` |

## Admin Panel Sayfa Yapısı

| Sayfa | Yol | Açıklama |
|-------|-----|----------|
| Dashboard | `/admin/dashboard` | Platform genel bakış |
| STK Başvuruları | `/admin/stk-applications` | Onay/red |
| STK Yönetimi | `/admin/stk-management` | Aktif STK'ları yönet |
| Üyeler | `/admin/uyeler` | Platform kullanıcıları |
| Ödemeler | `/admin/odemeler` | Ödeme takibi |
| Paketler | `/admin/paketler` | Paket tanımları |
| Domain Talepleri | `/admin/domain-talepleri` | Domain/web sitesi talepleri |
| Loglar | `/admin/logs` | Denetim logları |

## Environment Değişkenleri

```env
# Veritabanı
DATABASE_URL="postgresql://postgres:password@localhost:5432/kamulogstk"

# JWT Secret
JWT_SECRET="production-secret-key"

# App URL
NEXT_PUBLIC_APP_URL="https://kamulogstk.net"

# Google Places API (konum arama)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY="xxx"
```

## Üyelik Durum Makinesi

```
APPLIED → PENDING (YK kararı bekleniyor)
PENDING → ACTIVE (YK onayı + karar no)
PENDING → REJECTED (YK reddi + sebep)
ACTIVE → RESIGNATION_REQ (Üye istifa talebi)
RESIGNATION_REQ → RESIGNED (YK istifayı onayladı)
RESIGNATION_REQ → ACTIVE (YK istifayı reddetti)
ACTIVE → EXPELLED (İhraç)
ACTIVE → INACTIVE (Pasif)
ACTIVE → DECEASED (Vefat)
```

## Önemli Kurallar

1. **Multi-tenant:** Her STK kendi verisini görür. `x-stk-id` header'ı middleware tarafından inject edilir.
2. **Tüm `/stk/*` API'leri** header'dan `x-stk-id` alır, sadece o STK'nın verilerini döner.
3. **Auth:** JWT cookie tabanlı, `jose` ile verify. NextAuth v5 beta entegre ama custom middleware aktif.
4. **Prisma:** `@/lib/prisma`'dan singleton import.
5. **Stil:** Tailwind CSS v4 + Radix UI/shadcn bileşenleri. Dark/light tema `next-themes` ile.
6. **Dosya yükleme:** Logo, tüzük, imza → `public/uploads/` altına kaydedilir.
7. **PDF üretimi:** jsPDF + AutoTable ile üyelik belgesi, makbuz, tutanak üretilir.
8. **AuditLog:** Tüm kritik işlemler (33 aksiyon tipi) loglanır: önceki değer, yeni değer, IP, user-agent.
9. **Build:** `prisma generate && prisma db push && next build`
10. **Deploy:** PM2 + Nginx reverse proxy
