/**
 * Kamulog Multi-Tenant WhatsApp Bot Motor v2.0
 * ═══════════════════════════════════════════════
 * - hasCustomWaBot=true olan STK'ları tarar
 * - Her STK için bağımsız Baileys bağlantısı açar
 * - QR kodunu DB'ye yazar (STK panelinde gösterilir)
 * - Bağlanınca status=CONNECTED, gelen mesajlara otomatik yanıt verir
 * - 30 saniyede bir yeni STK'ları kontrol eder
 * - CRON: Her sabah 09:00'da aidat süresi dolan üyelere WhatsApp hatırlatması
 *
 * PM2 ile çalıştır: pm2 start wa-bot-service/index.js --name wa-bot-motor
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  downloadContentFromMessage,
} = require("@whiskeysockets/baileys");
const QRCode = require("qrcode");
const { PrismaClient } = require("../node_modules/@prisma/client");
const pino = require("pino");
const path = require("path");
const fs = require("fs");
const cron = require("node-cron");
const express = require("express");
const cors = require("cors");

const prisma = new PrismaClient();
const logger = pino({ level: "silent" });

// ═══════════════════════════════════════════════════════════
// EXPRESS API — Dış bildirim yönlendirmesi (port 3102)
// ═══════════════════════════════════════════════════════════
const app = express();
app.use(cors());
app.use(express.json());

// POST /send-message — Next.js kampanya/bildirimlerini STK'nın kendi botundan gönder
app.post("/send-message", async (req, res) => {
  try {
    const { stkId, phone, message } = req.body;
    if (!stkId || !phone || !message) return res.status(400).json({ error: "stkId, phone, message gerekli" });

    const botEntry = activeBots.get(stkId);
    if (!botEntry || botEntry.status !== "connected" || !botEntry.sock) {
      return res.status(400).json({ error: "Bot aktif değil", status: botEntry?.status || "not_found" });
    }

    const cleaned = phone.replace(/[\s\-\+]/g, "");
    const jid = cleaned.startsWith("90") ? cleaned + "@s.whatsapp.net" : "90" + cleaned + "@s.whatsapp.net";

    // Kota kontrolü
    const hasQuota = await checkAndDeductQuota(stkId);
    if (!hasQuota) return res.status(402).json({ error: "WhatsApp kotası tükenmiş", quotaExhausted: true });

    await botEntry.sock.sendMessage(jid, { text: message });
    console.log(`[API] ✉️ STK ${stkId} → ${cleaned}: Mesaj gönderildi (kota -1)`);
    res.json({ success: true });
  } catch (e) {
    console.error("[API] Gönderim hatası:", e.message);
    res.status(500).json({ error: "Gönderim hatası: " + e.message });
  }
});

// GET /status — Aktif botların durumu
app.get("/status", (req, res) => {
  const bots = Array.from(activeBots.entries()).map(([id, b]) => ({ stkId: id, status: b.status }));
  res.json({ success: true, activeBots: bots.length, bots });
});

// GET /status/:stkId — Tek bot durumu
app.get("/status/:stkId", (req, res) => {
  const bot = activeBots.get(req.params.stkId);
  res.json({ success: true, active: !!bot, status: bot?.status || "not_found" });
});

app.listen(3102, () => {
  console.log("[API] 🚀 Express API dinliyor: http://localhost:3102");
});

// Her STK için aktif bot bağlantıları: Map<stkId, { sock, status }>
const activeBots = new Map();

// Konuşma durum yönetimi (State Machine): Map<"stkId:phone", state>
const userStates = new Map();

// Geçici kayıt hafızası: TC ve Email'i state'ler arası taşımak için
// Map<"stkId:corePhone", { tc, email, name }>
const tempRegistrationData = new Map();

// ═══ JID → Gerçek Telefon Eşleme Cache (Kalıcı) ═══
// Non-TR WhatsApp JID'lerini gerçek telefon numaralarına eşler
const JID_CACHE_FILE = path.join(__dirname, 'jid-phone-cache.json');
let jidPhoneCache = {};
try { jidPhoneCache = JSON.parse(fs.readFileSync(JID_CACHE_FILE, 'utf8')); } catch {}
function saveJidMapping(stkId, jid, realPhone) {
  const key = `${stkId}:${jid}`;
  if (jidPhoneCache[key] === realPhone) return; // değişmedi
  jidPhoneCache[key] = realPhone;
  try { fs.writeFileSync(JID_CACHE_FILE, JSON.stringify(jidPhoneCache), 'utf8'); } catch {}
}
function getJidPhone(stkId, jid) {
  return jidPhoneCache[`${stkId}:${jid}`] || null;
}

// ═══ KVKK Onam Cache (Kalıcı) ═══
// Kullanıcının KVKK onayını verip vermediğini takip eder
const KVKK_CACHE_FILE = path.join(__dirname, 'kvkk-consent-cache.json');
let kvkkConsentCache = {};
try { kvkkConsentCache = JSON.parse(fs.readFileSync(KVKK_CACHE_FILE, 'utf8')); } catch {}
function hasKvkkConsent(stkId, jid) {
  return !!kvkkConsentCache[`${stkId}:${jid}`];
}
function saveKvkkConsent(stkId, jid) {
  const key = `${stkId}:${jid}`;
  if (kvkkConsentCache[key]) return;
  kvkkConsentCache[key] = Date.now();
  try { fs.writeFileSync(KVKK_CACHE_FILE, JSON.stringify(kvkkConsentCache), 'utf8'); } catch {}
}

// ═══════════════════════════════════════════════════════════
// URL ÇÖZÜMLEME — relative path'i tam URL'e çevir
// ═══════════════════════════════════════════════════════════
function resolveFullUrl(urlOrPath) {
  if (!urlOrPath) return null;
  if (urlOrPath.startsWith("http")) return urlOrPath;
  return `https://kamulog.net${urlOrPath.startsWith("/") ? "" : "/"}${urlOrPath}`;
}

// ═══════════════════════════════════════════════════════════
// SÖZLEŞME BULUCU — STK izole, önce doküman havuzu sonra org field
// ═══════════════════════════════════════════════════════════
async function findContractUrl(stkId, orgContractPdfUrl) {
  try {
    // 1. Önce STKBotDocument tablosunda "sözleşme" ara (stkId izole!)
    const doc = await prisma.sTKBotDocument.findFirst({
      where: {
        stkId, // ÇOK KRİTİK: Multi-tenant izolasyon!
        OR: [
          { title: { contains: "sözleşme", mode: "insensitive" } },
          { title: { contains: "sozlesme", mode: "insensitive" } },
          { title: { contains: "sözlesme", mode: "insensitive" } },
          { description: { contains: "sözleşme", mode: "insensitive" } },
        ],
      },
      select: { fileUrl: true, title: true, fileName: true },
    });
    if (doc?.fileUrl) {
      return { url: resolveFullUrl(doc.fileUrl), title: doc.title, fileName: doc.fileName };
    }
  } catch (e) {
    console.error(`[BOT] Sözleşme arama hatası:`, e.message);
  }
  // 2. Fallback: STK profildeki contractPdfUrl
  if (orgContractPdfUrl) {
    return { url: resolveFullUrl(orgContractPdfUrl), title: "Üyelik Sözleşmesi", fileName: "Uyelik_Sozlesmesi.pdf" };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// KOTA KONTROL VE DÜŞÜM FONKSİYONU
// ═══════════════════════════════════════════════════════════
async function checkAndDeductQuota(stkId) {
  try {
    const org = await prisma.sTKOrganization.findUnique({
      where: { id: stkId },
      select: { whatsappCredits: true, name: true },
    });
    if (!org || org.whatsappCredits <= 0) return false;
    const newCredits = org.whatsappCredits - 1;
    await prisma.sTKOrganization.update({
      where: { id: stkId },
      data: { whatsappCredits: { decrement: 1 } },
    });
    // Düşük kredi uyarıları — yöneticiye WhatsApp bildirimi
    const warningThresholds = [100, 50, 10, 0];
    if (warningThresholds.includes(newCredits)) {
      try {
        const botEntry = activeBots.get(stkId);
        if (botEntry?.sock && botEntry.status === "connected") {
          // STK yöneticilerini bul
          const managers = await prisma.user.findMany({
            where: { role: { in: ["STK_MANAGER"] }, managedSTKs: { some: { stkId } } },
            select: { phone: true, name: true },
          });
          const urgency = newCredits === 0 ? "🚨 KRİTİK" : newCredits <= 10 ? "⚠️ ACİL" : "📢 UYARI";
          const msg = newCredits === 0
            ? `${urgency} *${org.name} Bot Kredisi Tükendi!*\n\nWhatsApp bot krediniz *0*'a düşmüştür. Bot artık yanıt veremeyecektir.\n\n🛒 Yeni kredi satın almak için STK Panelinize girin → Market bölümünden paket seçin.`
            : `${urgency} *${org.name} Bot Kredisi Azalıyor!*\n\nKalan kredi: *${newCredits}*\n\n🛒 Krediniz bitmeden STK Panelinize girin → Market bölümünden paket satın alın.`;
          for (const m of managers) {
            if (m.phone) {
              const mPhone = m.phone.replace(/\D/g, "");
              const jid = mPhone.length > 10 ? `${mPhone}@s.whatsapp.net` : `90${mPhone}@s.whatsapp.net`;
              try { await botEntry.sock.sendMessage(jid, { text: msg }); } catch {}
            }
          }
        }
        // Bot log'a kaydet
        await prisma.sTKBotLog.create({ data: { stkId, action: "QUOTA_WARNING", details: `Kredi uyarısı: ${newCredits} kaldı` } }).catch(() => {});
      } catch {}
    }
    return true;
  } catch (e) {
    console.error(`[KOTA] ${stkId} kota kontrol hatası:`, e.message);
    return true; // Hata durumunda botu durdurmamak için true dön
  }
}

const SESSION_BASE = path.join(__dirname, ".sessions");
if (!fs.existsSync(SESSION_BASE)) fs.mkdirSync(SESSION_BASE, { recursive: true });

// ═══════════════════════════════════════════════════════════
// BOT BAĞLANTISI BAŞLAT
// ═══════════════════════════════════════════════════════════
async function startBotForSTK(stk) {
  const stkId = stk.id;
  const stkName = stk.name;

  // Zaten aktif mi?
  if (activeBots.has(stkId)) {
    const existing = activeBots.get(stkId);
    if (existing.status === "connected" || existing.status === "connecting") return;
  }

  console.log(`[BOT] 🚀 ${stkName} için bot başlatılıyor...`);

  const sessionDir = path.join(SESSION_BASE, stkId);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  try {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: false,
      logger,
      browser: [`Kamulog-${stkName.substring(0, 20)}`, "Chrome", "22.04.01"],
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      markOnlineOnConnect: true,
    });

    activeBots.set(stkId, { sock, status: "connecting", retries: 0 });

    sock.ev.on("creds.update", saveCreds);

    // ── Bağlantı Durumu ──
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      const botState = activeBots.get(stkId) || {};

      // QR Üretildi → DB'ye yaz
      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { width: 400, margin: 2 });
          await prisma.sTKOrganization.update({
            where: { id: stkId },
            data: { waBotQrCode: qrDataUrl, waBotStatus: "PENDING_QR" },
          });
          activeBots.set(stkId, { ...botState, sock, status: "pending_qr" });
          console.log(`[BOT] 📱 ${stkName} → QR kod hazır!`);
        } catch (e) {
          console.error(`[BOT] ${stkName} QR yazma hatası:`, e.message);
        }
      }

      // Bağlandı
      if (connection === "open") {
        const phone = sock?.user?.id?.split(":")[0] || null;
        await prisma.sTKOrganization.update({
          where: { id: stkId },
          data: { waBotStatus: "CONNECTED", waBotPhone: phone, waBotQrCode: null },
        });
        activeBots.set(stkId, { ...botState, sock, status: "connected", retries: 0 });
        console.log(`[BOT] ✅ ${stkName} BAĞLANDI! Numara: ${phone}`);
      }

      // Bağlantı koptu
      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || "unknown";
        console.log(`[BOT] ❌ ${stkName} bağlantı koptu. Kod: ${statusCode}, Neden: ${reason}`);

        if (statusCode === DisconnectReason.loggedOut) {
          // Oturum kapandı — session temizle, yeniden QR üret
          console.log(`[BOT] 🔄 ${stkName} çıkış yapıldı — session temizleniyor...`);
          clearSessionDir(sessionDir);
          await prisma.sTKOrganization.update({
            where: { id: stkId },
            data: { waBotStatus: "PENDING_QR", waBotPhone: null, waBotQrCode: null },
          });
          activeBots.delete(stkId);
          setTimeout(() => startBotForSTK(stk), 3000);

        } else if (statusCode === DisconnectReason.restartRequired) {
          activeBots.delete(stkId);
          startBotForSTK(stk);

        } else if (statusCode === 408 || statusCode === DisconnectReason.timedOut) {
          // QR timeout — tekrar üret
          activeBots.delete(stkId);
          setTimeout(() => startBotForSTK(stk), 2000);

        } else {
          const retries = (botState.retries || 0) + 1;
          if (retries >= 10) {
            console.log(`[BOT] ⛔ ${stkName} → max deneme aşıldı, duraklatılıyor.`);
            await prisma.sTKOrganization.update({
              where: { id: stkId },
              data: { waBotStatus: "DISCONNECTED" },
            });
            activeBots.delete(stkId);
          } else {
            const delay = Math.min(3000 * Math.pow(2, retries - 1), 60000);
            activeBots.set(stkId, { sock: null, status: "retrying", retries });
            setTimeout(() => startBotForSTK(stk), delay);
          }
        }
      }
    });

    // ── Gelen Mesaj — Akıllı Otomatik Yanıt (Bot Zekası) ──
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const msg of messages) {
        // Güvenlik: kendi mesajları, gruplar, boş mesajlar atla
        if (!msg.message || msg.key.fromMe) continue;
        const from = msg.key.remoteJid;
        if (!from || from.endsWith("@g.us") || from.endsWith("@broadcast")) continue;

        const text = (
          msg.message.conversation
          || msg.message.extendedTextMessage?.text
          || msg.message.imageMessage?.caption
          || ""
        ).trim();

        // Telefon numarasını çıkar — son 10 hane (format bağımsız)
        const rawPhone = from.split("@")[0];
        let corePhone = rawPhone.replace(/^\+?90|^0/, "").slice(-10);
        // JID cache: farklı ülke kodu JID'lerinde gerçek telefonu kullan
        const _cachedPhone = getJidPhone(stkId, rawPhone);
        if (_cachedPhone) {
          corePhone = _cachedPhone.replace(/^\+?90|^0/, "").slice(-10);
        }
        // ═══ GLOBAL STATE SIFIRLAMA — Takılmaları önle ═══
        const lowerText = text.toLowerCase().trim();
        if (lowerText === "iptal" || lowerText === "menü" || lowerText === "menu" || lowerText === "başlangıç") {
          const stateKey = `${stkId}:${rawPhone}`;
          userStates.delete(stateKey);
          await sock.sendMessage(from, { text: `*${stkName} Sanal Asistanı:*\n\n🔄 İşleminiz iptal edildi ve ana menüye dönüldü.\n\nNasıl yardımcı olabilirim? *yardım* yazarak tüm komutları görebilirsiniz. 🙏` });
          continue;
        }

        // ═══ KVKK ONAM KONTROLÜ ═══
        if (!hasKvkkConsent(stkId, rawPhone)) {
          const stateKey = `${stkId}:${rawPhone}`;
          const kvkkState = userStates.get(stateKey);
          if (kvkkState?.type === "AWAITING_KVKK_CONSENT") {
            const answer = text.toLowerCase().trim();
            if (answer === "evet" || answer === "kabul" || answer === "1" || answer === "onaylıyorum") {
              saveKvkkConsent(stkId, rawPhone);
              userStates.delete(stateKey);
              await sock.sendMessage(from, { text: `*${stkName} Sanal Asistanı:*\n\n✅ KVKK onayınız alınmıştır. Teşekkür ederiz!\n\nNasıl yardımcı olabilirim? *yardım* yazarak tüm komutları görebilirsiniz. 🙏` });
              continue;
            } else if (answer === "hayır" || answer === "red" || answer === "2") {
              userStates.delete(stateKey);
              await sock.sendMessage(from, { text: `*${stkName} Sanal Asistanı:*\n\n❌ KVKK onayı verilmediği için hizmet sağlayamıyoruz.\n\nFikrinizi değiştirirseniz herhangi bir mesaj göndererek tekrar başlayabilirsiniz.` });
              continue;
            } else {
              await sock.sendMessage(from, { text: `*${stkName} Sanal Asistanı:*\n\n⚠️ Lütfen *EVET* veya *HAYIR* yazarak KVKK onayınızı bildiriniz.` });
              continue;
            }
          }
          // İlk etkileşim — KVKK metni göster
          userStates.set(`${stkId}:${rawPhone}`, { type: "AWAITING_KVKK_CONSENT" });
          await sock.sendMessage(from, {
            text: `*${stkName} Sanal Asistanı:*\n\n` +
              `🔒 *KVKK Aydınlatma ve Açık Rıza Metni*\n\n` +
              `6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında bilgilerinizin işlenmesine ilişkin:\n\n` +
              `• WhatsApp üzerinden paylaştığınız kişisel veriler (ad-soyad, telefon, TC kimlik no, e-posta) *${stkName}* tarafından üyelik ve aidat yönetimi amacıyla işlenecektir.\n` +
              `• Verileriniz 3. şahıslarla paylaşılmayacak, yalnızca dernek yönetimi tarafından kullanılacaktır.\n` +
              `• Verilerinizin silinmesini, düzeltilmesini veya işlenmesine itiraz etmek için derneğimize başvurabilirsiniz.\n\n` +
              `📋 Devam ederek kişisel verilerinizin yukarıda belirtilen amaçlarla işlenmesine onay vermiş olursunuz.\n\n` +
              `✅ Onaylıyorsanız *EVET* yazınız.\n❌ Onaylamıyorsanız *HAYIR* yazınız.`,
          });
          continue;
        }

        // ═══ KOTA KONTROLÜ — Her işlemden önce kredi düş ═══
        const hasQuota = await checkAndDeductQuota(stkId);
        if (!hasQuota) {
          // Yönetici mi kontrol et
          const isManager = await prisma.user.findFirst({
            where: { phone: { contains: corePhone }, role: { in: ["ADMIN", "STK_MANAGER"] } },
            select: { id: true },
          });
          if (isManager) {
            await sock.sendMessage(from, {
              text: `*${stkName} Sanal Asistanı:*\n\n⚠️ Sayın Yönetici, STK WhatsApp/Bot kotanız tükenmiştir.\n\nSisteminizin durmaması için lütfen Kamulog panelinden yeni paket satın alınız:\n👉 https://kamulog.net/stk-panel/market\n\n📊 Mevcut Kota: *0*`,
            });
          } else {
            await sock.sendMessage(from, {
              text: `*${stkName} Sanal Asistanı:*\n\nSistemimiz şu an hizmet verememektedir. Lütfen daha sonra tekrar deneyiniz. 🙏`,
            });
          }
          console.log(`[KOTA] ⛔ ${stkName} → ${rawPhone}: Kota tükendi, yanıt engellendi`);
          continue;
        }

        // ═══ GÖRSEL/BELGE DEKONT AVCISI + SÖZLEŞME YAKALAYICI ═══
        const hasImage = !!msg.message.imageMessage;
        const hasDocument = !!msg.message.documentMessage;
        if (hasImage || hasDocument) {
          try {
            const stateKey = `${stkId}:${rawPhone}`;
            const currentState = userStates.get(stateKey);

            // ── SÖZLEŞME YAKALAMA (üyelik başvurusu sırasında) ──
            if (currentState?.type === "AWAITING_REGISTRATION_DOCUMENT") {
              const orgInfo = await prisma.sTKOrganization.findUnique({ where: { id: stkId }, select: { name: true, slug: true } });
              const orgN = orgInfo?.name || stkName;
              // Belgeyi indir
              let contractUrl = null;
              try {
                const mediaMsg = hasImage ? msg.message.imageMessage : msg.message.documentMessage;
                const mediaType = hasImage ? "image" : "document";
                const stream = await downloadContentFromMessage(mediaMsg, mediaType);
                const chunks = [];
                for await (const chunk of stream) chunks.push(chunk);
                const buffer = Buffer.concat(chunks);
                const ext = hasImage ? "jpg" : "pdf";
                const fileName = `contract_${Date.now()}_${rawPhone.slice(-4)}.${ext}`;
                const uploadDir = path.join(__dirname, "..", "public", "uploads", "contracts");
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                fs.writeFileSync(path.join(uploadDir, fileName), buffer);
                contractUrl = `https://kamulog.net/uploads/contracts/${fileName}`;
                console.log(`[BOT] 📜 ${stkName} → Sözleşme kaydedildi: ${contractUrl}`);
              } catch (dlErr) { console.error(`[BOT] Sözleşme indirme hatası:`, dlErr.message); }

              // Üye adayı kaydı oluştur — geçici hafızadan TC/Email çek
              const regKey = `${stkId}:${corePhone}`;
              const savedData = tempRegistrationData.get(regKey) || {};
              const formattedPhone = `+90${corePhone}`;
              const pushName = savedData.name || msg.pushName || "WhatsApp Kullanıcısı";
              const savedTc = savedData.tc || "00000000000";
              const savedEmail = savedData.email || "";
              try {
                await prisma.sTKApplication.create({
                  data: {
                    stkId,
                    name: pushName,
                    phone: formattedPhone,
                    tcKimlik: savedTc,
                    email: savedEmail,
                    status: "PENDING",
                    registrationSource: "WHATSAPP",
                    documentUrl: contractUrl || undefined,
                  },
                });
                console.log(`[BOT] ✅ ${stkName} → ${rawPhone}: STKApplication oluşturuldu (TC: ${savedTc}, Email: ${savedEmail || 'YOK'})`);
              } catch (e) {
                console.error(`[BOT] Başvuru kayıt hatası:`, e.message);
                await sock.sendMessage(from, { text: `*${orgN} Sanal Asistanı:*\n\n⚠️ Kayıt sırasında teknik bir hata oluştu. Lütfen tekrar deneyiniz.` });
                userStates.delete(stateKey);
                tempRegistrationData.delete(regKey);
                continue;
              }

              // Hafızayı temizle
              tempRegistrationData.delete(regKey);
              userStates.delete(stateKey);
              await sock.sendMessage(from, {
                text: `*${orgN} Sanal Asistanı:*\n\n✅ Üyelik sözleşmeniz ve bilgileriniz başarıyla alındı!\n\n📋 Başvurunuz Yönetim Kurulu onayına sunulmuştur.\n\nDurumunuzu takip etmek için *durum* yazabilirsiniz. 🙏`,
              });
              console.log(`[BOT] ✅ ${stkName} → ${rawPhone}: Sözleşme yakalandı, STKApplication oluşturuldu`);
              try { await prisma.sTKBotLog.create({ data: { stkId, action: "CONTRACT_RECEIVED", details: `Yeni üye adayı sözleşme gönderdi. (${pushName}, ${rawPhone}, TC: ${savedTc})` } }); } catch {}
              continue;
            }

            // ── DEKONT ALGILAMA (herkes için — üye olsun olmasın) ──
            const orgInfo = await prisma.sTKOrganization.findUnique({
              where: { id: stkId },
              select: { name: true, acceptsDues: true, acceptsAnnualDues: true, acceptsDonation: true },
            });
            const orgN = orgInfo?.name || stkName;

            // Gönderen bilgilerini DB'den çek
            let senderName = null;
            let senderPhone = null;
            let senderTc = null;
            let senderEmail = null;
            let isKnownUser = false;
            // JID cache ile gerçek telefonu ekle
            const cachedPhoneForReceipt = getJidPhone(stkId, rawPhone);
            const receiptPhoneVariants = [corePhone, '0' + corePhone, '+90' + corePhone, '90' + corePhone];
            if (cachedPhoneForReceipt) {
              const cp = cachedPhoneForReceipt.replace(/^\+?90|^0/, '').slice(-10);
              if (!receiptPhoneVariants.includes(cachedPhoneForReceipt)) receiptPhoneVariants.push(cachedPhoneForReceipt);
              if (!receiptPhoneVariants.includes(cp)) receiptPhoneVariants.push(cp);
              if (!receiptPhoneVariants.includes('+90' + cp)) receiptPhoneVariants.push('+90' + cp);
            }
            try {
              const dbMember = await prisma.member.findFirst({
                where: { stkId, OR: [{ phone: { in: receiptPhoneVariants } }, { phone: { contains: corePhone } }, ...(cachedPhoneForReceipt ? [{ phone: { contains: cachedPhoneForReceipt.replace(/^\+?90|^0/, '').slice(-10) } }] : [])] },
                select: { name: true, surname: true, phone: true, tcKimlik: true, email: true },
              });
              if (dbMember) {
                senderName = `${dbMember.name} ${dbMember.surname || ""}`.trim();
                senderPhone = dbMember.phone;
                senderTc = dbMember.tcKimlik;
                senderEmail = dbMember.email;
                isKnownUser = true;
              } else {
                const dbApp = await prisma.sTKApplication.findFirst({
                  where: { stkId, OR: [{ phone: { in: receiptPhoneVariants } }, { phone: { contains: corePhone } }, ...(cachedPhoneForReceipt ? [{ phone: { contains: cachedPhoneForReceipt.replace(/^\+?90|^0/, '').slice(-10) } }] : [])] },
                  select: { name: true, phone: true, tcKimlik: true, email: true },
                });
                if (dbApp) {
                  senderName = dbApp.name;
                  senderPhone = dbApp.phone;
                  senderTc = dbApp.tcKimlik;
                  senderEmail = dbApp.email;
                  isKnownUser = true;
                }
              }
            } catch {}

            const mediaMsg = hasImage ? msg.message.imageMessage : msg.message.documentMessage;
            const mediaType = hasImage ? "image" : "document";

            if (isKnownUser) {
              // ✅ Kayıtlı kullanıcı — direkt ödeme türü menüsü
              let menuStr = `*${orgN} Sanal Asistanı:*\n\n📸 *Dekont Algılandı!*\n\nSayın *${senderName}*, gönderdiğiniz belgeyi sisteme işliyorum.\nLütfen ödeme türünü seçiniz (sadece rakam yazın):\n\n`;
              const optionsMap = {};
              let counter = 1;
              if (orgInfo?.acceptsDues) { menuStr += `${counter}️⃣ Aylık Aidat\n`; optionsMap[counter.toString()] = "MONTHLY_DUES"; counter++; }
              if (orgInfo?.acceptsAnnualDues) { menuStr += `${counter}️⃣ Yıllık Aidat\n`; optionsMap[counter.toString()] = "ANNUAL_DUES"; counter++; }
              if (orgInfo?.acceptsDonation) { menuStr += `${counter}️⃣ Bağış\n`; optionsMap[counter.toString()] = "DONATION"; counter++; }

              if (counter === 1) {
                await sock.sendMessage(from, { text: `*${orgN} Sanal Asistanı:*\n\n⚠️ Şu an sistemimizde aktif bir ödeme türü bulunmamaktadır. Lütfen dernek yönetimiyle iletişime geçiniz.` });
              } else {
                menuStr += `\nİptal için *iptal* yazınız.`;
                userStates.set(stateKey, { type: "AWAITING_RECEIPT_TYPE", mediaMsg, mediaType, msgKey: msg.key, optionsMap, senderName, senderPhone, senderTc, senderEmail });
                await sock.sendMessage(from, { text: menuStr });
                console.log(`[BOT] 📸 ${stkName} → ${rawPhone}: Dekont algılandı (kayıtlı: ${senderName})`);
              }
            } else {
              // ❓ Kayıtsız kullanıcı — bilgi iste
              userStates.set(stateKey, { type: "AWAITING_RECEIPT_USER_INFO", mediaMsg, mediaType, msgKey: msg.key });
              const infoMsg = `*${orgN} Sanal Asistanı:*\n\n📸 *Dekont Algılandı!*\n\nSistemimizde kaydınız bulunamadı. Dekontunuzu işleyebilmem için lütfen aşağıdaki bilgilerinizi tek mesajda gönderin:\n\n📝 *Format:*\nAd Soyad\nTC Kimlik No\nTelefon (Örn: 0539 123 45 67)\nE-posta\n\n_Örnek:_\nAhmet Yılmaz\n12345678901\n0539 123 45 67\nahmet@mail.com\n\nİptal için *iptal* yazınız.`;
              await sock.sendMessage(from, { text: infoMsg });
              console.log(`[BOT] 📸 ${stkName} → ${rawPhone}: Dekont algılandı (kayıtsız → bilgi isteniyor)`);
            }
          } catch (e) { console.error(`[BOT] Dekont algılama hatası:`, e.message); }
          continue;
        }

        if (!text) continue;

        const query = text.toLowerCase().replace(/[^\wğüşıöçâîûêa-z0-9\s]/gi, "").trim();

        console.log(`[BOT] 💬 ${stkName} ← ${rawPhone}: ${text.substring(0, 60)}`);

        try {
          // ─── STK bilgilerini çek ───
          const org = await prisma.sTKOrganization.findUnique({
            where: { id: stkId },
            select: {
              name: true,
              slug: true,
              phone: true,
              email: true,
              city: true,
              district: true,
              address: true,
              waBotAutoReply: true,
              monthlyDuesAmount: true,
              annualDuesAmount: true,
              contractPdfUrl: true,
              iban: true,
              bankAccountName: true,
              botContactPhone: true,
              // Finans checkbox ve notları (Panel senkronizasyonu)
              acceptsDues: true,
              acceptsAnnualDues: true,
              acceptsDonation: true,
              duesNote: true,
              annualDuesNote: true,
              donationNote: true,
              paymentNote: true,
            },
          });

          const orgName = org?.name || stkName;
          const PREFIX = `*${orgName} Sanal Asistanı:*\n\n`;

          // ─── Üye kontrolü: çoklu format eşleştirme (OR zırhı) ───
          const phoneVariants = [
            corePhone,                 // 5391234567
            '0' + corePhone,           // 05391234567
            '+90' + corePhone,         // +905391234567
            '90' + corePhone,          // 905391234567
          ];
          // JID cache'ten gerçek telefonu ekle
          const cachedRealPhone = getJidPhone(stkId, rawPhone);
          if (cachedRealPhone) {
            const cachedCore = cachedRealPhone.replace(/^\+?90|^0/, '').slice(-10);
            if (!phoneVariants.includes(cachedRealPhone)) phoneVariants.push(cachedRealPhone);
            if (!phoneVariants.includes(cachedCore)) phoneVariants.push(cachedCore);
            if (!phoneVariants.includes('+90' + cachedCore)) phoneVariants.push('+90' + cachedCore);
            if (!phoneVariants.includes('0' + cachedCore)) phoneVariants.push('0' + cachedCore);
          }
          let member = await prisma.member.findFirst({
            where: {
              stkId: stkId,
              OR: [
                { phone: { in: phoneVariants } },
                { phone: { contains: corePhone } },
              ],
            },
            select: {
              id: true,
              name: true,
              surname: true,
              status: true,
              joinDate: true,
              createdAt: true,
              updatedAt: true,
              phone: true,
              email: true,
              category: true,
            },
          });
          // rawPhone ile fallback (farklı ülke kodu JID'leri için)
          if (!member) {
            const rawPhoneClean = rawPhone.replace(/\D/g, "").slice(-10);
            if (rawPhoneClean !== corePhone) {
              member = await prisma.member.findFirst({
                where: {
                  stkId: stkId,
                  OR: [
                    { phone: { contains: rawPhoneClean } },
                    { phone: rawPhone },
                    { phone: '+' + rawPhone },
                  ],
                },
                select: {
                  id: true, name: true, surname: true, status: true,
                  joinDate: true, createdAt: true, updatedAt: true,
                  phone: true, email: true, category: true,
                },
              });
            }
          }

          // Başvuru tablosunda da ara (member yoksa)
          let applicant = null;
          if (!member) {
            // Önce normal phoneVariants ile ara
            applicant = await prisma.sTKApplication.findFirst({
              where: {
                stkId,
                OR: [
                  { phone: { in: phoneVariants } },
                  { phone: { contains: corePhone } },
                ],
              },
              select: { id: true, name: true, phone: true, status: true, email: true, createdAt: true, updatedAt: true, expiryDate: true },
            });
            // rawPhone ile de dene (WhatsApp JID farklı ülke kodu olabilir)
            if (!applicant) {
              const rawPhoneClean = rawPhone.replace(/\D/g, "").slice(-10);
              if (rawPhoneClean !== corePhone) {
                applicant = await prisma.sTKApplication.findFirst({
                  where: {
                    stkId,
                    OR: [
                      { phone: { contains: rawPhoneClean } },
                      { phone: rawPhone },
                      { phone: '+' + rawPhone },
                    ],
                  },
                  select: { id: true, name: true, phone: true, status: true, email: true, createdAt: true, updatedAt: true, expiryDate: true },
                });
              }
            }
            // Başvuruyu member formatına çevir
            if (applicant) {
              member = { id: applicant.id, name: applicant.name, surname: "", status: applicant.status === "APPROVED" ? "ACTIVE" : applicant.status, joinDate: null, createdAt: applicant.createdAt || null, updatedAt: applicant.updatedAt || null, phone: applicant.phone, email: applicant.email, category: null, expiryDate: applicant.expiryDate || null, _isFromApp: true };
            }
          }

          let replyText = "";
          const stateKey = `${stkId}:${rawPhone}`;
          const userState = userStates.get(stateKey);
          const queryTR = text.toLocaleLowerCase("tr-TR").trim();

          // ═══════════════════════════════════════════
          // KİMLİK TANIMLAMA KAPISI — telefon, TC veya e-posta ile tanı
          // ═══════════════════════════════════════════
          if (userState?.type === "AWAITING_PHONE_IDENTIFY") {
            const input = text.trim();
            let foundMember = null;
            let resolvedPhone = null;

            // TC Kimlik No mu? (11 haneli rakam)
            const digitsOnly = input.replace(/\D/g, "");
            if (digitsOnly.length === 11 && !input.includes("@")) {
              // TC ile ara
              foundMember = await prisma.member.findFirst({
                where: { stkId, tcKimlik: digitsOnly },
                select: { id: true, name: true, surname: true, status: true, phone: true },
              });
              if (!foundMember) {
                const foundApp = await prisma.sTKApplication.findFirst({
                  where: { stkId, tcKimlik: digitsOnly },
                  select: { id: true, name: true, phone: true, status: true },
                });
                if (foundApp) foundMember = { id: foundApp.id, name: foundApp.name, surname: "", status: foundApp.status, phone: foundApp.phone };
              }
              if (foundMember?.phone) resolvedPhone = foundMember.phone;

            } else if (input.includes("@")) {
              // E-posta ile ara
              const email = input.toLowerCase().trim();
              foundMember = await prisma.member.findFirst({
                where: { stkId, email: { equals: email, mode: "insensitive" } },
                select: { id: true, name: true, surname: true, status: true, phone: true },
              });
              if (!foundMember) {
                const foundApp = await prisma.sTKApplication.findFirst({
                  where: { stkId, email: { equals: email, mode: "insensitive" } },
                  select: { id: true, name: true, phone: true, status: true },
                });
                if (foundApp) foundMember = { id: foundApp.id, name: foundApp.name, surname: "", status: foundApp.status, phone: foundApp.phone };
              }
              if (foundMember?.phone) resolvedPhone = foundMember.phone;

            } else {
              // Telefon numarası ile ara
              let inputPhone = input.replace(/[\s\-\(\)]/g, "");
              if (inputPhone.startsWith("+90")) { /* OK */ }
              else if (inputPhone.startsWith("90") && inputPhone.length === 12) { inputPhone = "+" + inputPhone; }
              else if (inputPhone.startsWith("0") && inputPhone.length === 11) { inputPhone = "+9" + inputPhone; }
              else if (inputPhone.length === 10 && inputPhone.startsWith("5")) { inputPhone = "+90" + inputPhone; }
              else { inputPhone = "+90" + inputPhone.replace(/^0+/, ""); }

              resolvedPhone = inputPhone;
              const identCore = inputPhone.replace(/^\+?90|^0/, "").slice(-10);
              const identVariants = [identCore, '0' + identCore, '+90' + identCore, '90' + identCore, inputPhone];

              foundMember = await prisma.member.findFirst({
                where: { stkId, OR: [{ phone: { in: identVariants } }, { phone: { contains: identCore } }] },
                select: { id: true, name: true, surname: true, status: true, phone: true },
              });
              if (!foundMember) {
                const foundApp = await prisma.sTKApplication.findFirst({
                  where: { stkId, OR: [{ phone: { in: identVariants } }, { phone: { contains: identCore } }] },
                  select: { id: true, name: true, phone: true, status: true },
                });
                if (foundApp) foundMember = { id: foundApp.id, name: foundApp.name, surname: "", status: foundApp.status, phone: foundApp.phone };
              }
            }

            if (foundMember) {
              // Eşleme bulundu — JID cache'e kaydet
              if (resolvedPhone) saveJidMapping(stkId, rawPhone, resolvedPhone);
              const rc = (resolvedPhone || "").replace(/^\+?90|^0/, "").slice(-10);
              if (rc) corePhone = rc;
              userStates.delete(stateKey);
              await sock.sendMessage(from, {
                text: `${PREFIX}✅ Teşekkürler *${foundMember.name} ${foundMember.surname || ""}*! Sizi tanıdım.\n\nArtık size adınızla hitap edebilirim. Nasıl yardımcı olabilirim? *yardım* yazarak tüm komutları görebilirsiniz. 🙏`,
              });
              console.log(`[BOT] 🔗 ${stkName}: JID ${rawPhone} → ${resolvedPhone || input} eşlemesi kaydedildi (${foundMember.name})`);
              continue;
            } else {
              // Eşleşme yok — misafir olarak devam
              if (resolvedPhone) {
                saveJidMapping(stkId, rawPhone, resolvedPhone);
                const rc = resolvedPhone.replace(/^\+?90|^0/, "").slice(-10);
                if (rc) corePhone = rc;
              }
              userStates.delete(stateKey);
              await sock.sendMessage(from, {
                text: `${PREFIX}📱 Bilgileriniz kaydedildi.\n\nSistemimizde aktif bir üyelik bulunamadı. Üyelik başvurusu için *üye ol* yazabilirsiniz.\n\n❓ *yardım* — Tüm komutlar`,
              });
              continue;
            }
          }

          // Üye tanıma — JID cache yoksa ve member bulunamadıysa kimlik sor (tek seferlik)
          if (!member && !getJidPhone(stkId, rawPhone) && !userState) {
            userStates.set(stateKey, { type: "AWAITING_PHONE_IDENTIFY" });
            await sock.sendMessage(from, {
              text: `${PREFIX}📱 *Sizi tanıyabilmem için aşağıdakilerden birini yazınız:*\n\n📞 Telefon numaranız (Örn: 0539 123 45 67)\n🆔 TC Kimlik Numaranız (11 hane)\n📧 E-posta adresiniz\n\n_(Herhangi birini yazmanız yeterlidir)_`,
            });
            continue;
          }

          // ═══════════════════════════════════════════
          // STATE: İSTİFA SONRASI YENİDEN BAŞVURU
          // ═══════════════════════════════════════════
          if (userState?.type === "AWAITING_REAPPLY_CONFIRM") {
            if (queryTR === "evet") {
              userStates.delete(stateKey);
              // Sözleşme belgesini bul ve gönder (izole + tam URL)
              try {
                const reapplyContract = await findContractUrl(stkId, org?.contractPdfUrl);
                if (reapplyContract) {
                  await sock.sendMessage(from, {
                    document: { url: reapplyContract.url },
                    fileName: reapplyContract.fileName || "Uyelik_Sozlesmesi.pdf",
                    mimetype: "application/octet-stream",
                    caption: `*${stkName} Sanal Asistanı:*\n\n🎉 Harika! Sizi yeniden aramızda görmekten mutluluk duyarız!\n\nYukarıdaki *${reapplyContract.title}* belgesini doldurup fotoğrafını veya PDF'ini buraya gönderin. 📄`,
                  });
                } else {
                  await sock.sendMessage(from, { text: `*${stkName} Sanal Asistanı:*\n\n🎉 Sizi yeniden aramızda görmek isteriz!\n\nÜyelik başvurusu için lütfen *üye ol* yazınız. 🙏` });
                }
                userStates.set(stateKey, { type: "AWAITING_REGISTRATION_DOCUMENT" });
              } catch (e) {
                console.error(`[BOT] Reapply sözleşme hatası:`, e.message);
                await sock.sendMessage(from, { text: `*${stkName} Sanal Asistanı:*\n\nBaşvuru sürecini başlatmak için lütfen *üye ol* yazınız. 🙏` });
                userStates.delete(stateKey);
              }
            } else {
              userStates.delete(stateKey);
              await sock.sendMessage(from, { text: `*${stkName} Sanal Asistanı:*\n\nAnladık, iyi günler dileriz. 🙏\n\nFikrinizi değiştirirseniz bize her zaman yazabilirsiniz.` });
            }
            continue;
          }

          // ═══════════════════════════════════════════
          // STATE: KAYITSIZ KULLANICI BİLGİ TOPLAMA (DEKONT İÇİN)
          // ═══════════════════════════════════════════
          if (userState?.type === "AWAITING_RECEIPT_USER_INFO") {
            if (queryTR === "iptal" || queryTR === "vazgeç") {
              userStates.delete(stateKey);
              replyText = `${PREFIX}❌ Dekont kaydı iptal edildi. Başka bir işlem için *yardım* yazabilirsiniz.`;
              await sock.sendMessage(from, { text: replyText });
              continue;
            }

            // Satır satır parse et
            const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length < 4) {
              replyText = `${PREFIX}⚠️ Bilgileriniz eksik. Lütfen 4 satır halinde gönderin:\n\n1️⃣ Ad Soyad\n2️⃣ TC Kimlik No (11 hane)\n3️⃣ Telefon (Örn: 0539 123 45 67)\n4️⃣ E-posta\n\nİptal için *iptal* yazınız.`;
              await sock.sendMessage(from, { text: replyText });
              continue;
            }

            const uName = lines[0];
            const uTc = lines[1].replace(/\D/g, "");
            let uPhone = lines[2].replace(/[\s\-\(\)]/g, "");
            const uEmail = lines[3].toLowerCase().trim();

            // TC doğrulama
            if (uTc.length !== 11) {
              replyText = `${PREFIX}⚠️ TC Kimlik No 11 haneli olmalıdır. Girdiğiniz: "${lines[1]}"\n\nLütfen bilgilerinizi tekrar gönderin.`;
              await sock.sendMessage(from, { text: replyText });
              continue;
            }

            // Telefon normalizasyonu
            if (uPhone.startsWith("+90")) { /* zaten doğru format */ }
            else if (uPhone.startsWith("90") && uPhone.length === 12) { uPhone = "+" + uPhone; }
            else if (uPhone.startsWith("0") && uPhone.length === 11) { uPhone = "+9" + uPhone; }
            else if (uPhone.length === 10 && uPhone.startsWith("5")) { uPhone = "+90" + uPhone; }
            else { uPhone = "+90" + uPhone.replace(/^0+/, ""); }

            // Email doğrulama (basit)
            if (!uEmail.includes("@")) {
              replyText = `${PREFIX}⚠️ Geçerli bir e-posta adresi giriniz. Girdiğiniz: "${lines[3]}"\n\nLütfen bilgilerinizi tekrar gönderin.`;
              await sock.sendMessage(from, { text: replyText });
              continue;
            }

            // Bilgiler tamam — ödeme türü menüsüne geç
            const orgInfo2 = await prisma.sTKOrganization.findUnique({
              where: { id: stkId },
              select: { name: true, acceptsDues: true, acceptsAnnualDues: true, acceptsDonation: true },
            });
            const orgN2 = orgInfo2?.name || stkName;

            let menuStr2 = `*${orgN2} Sanal Asistanı:*\n\n✅ Bilgileriniz alındı!\n\n👤 *${uName}*\n📱 ${uPhone}\n\nŞimdi ödeme türünü seçiniz (sadece rakam yazın):\n\n`;
            const optionsMap2 = {};
            let counter2 = 1;
            if (orgInfo2?.acceptsDues) { menuStr2 += `${counter2}️⃣ Aylık Aidat\n`; optionsMap2[counter2.toString()] = "MONTHLY_DUES"; counter2++; }
            if (orgInfo2?.acceptsAnnualDues) { menuStr2 += `${counter2}️⃣ Yıllık Aidat\n`; optionsMap2[counter2.toString()] = "ANNUAL_DUES"; counter2++; }
            if (orgInfo2?.acceptsDonation) { menuStr2 += `${counter2}️⃣ Bağış\n`; optionsMap2[counter2.toString()] = "DONATION"; counter2++; }

            if (counter2 === 1) {
              userStates.delete(stateKey);
              await sock.sendMessage(from, { text: `*${orgN2} Sanal Asistanı:*\n\n⚠️ Şu an aktif ödeme türü bulunmamaktadır.` });
            } else {
              menuStr2 += `\nİptal için *iptal* yazınız.`;
              userStates.set(stateKey, {
                type: "AWAITING_RECEIPT_TYPE",
                mediaMsg: userState.mediaMsg,
                mediaType: userState.mediaType,
                msgKey: userState.msgKey,
                optionsMap: optionsMap2,
                senderName: uName,
                senderPhone: uPhone,
                senderTc: uTc,
                senderEmail: uEmail,
              });
              await sock.sendMessage(from, { text: menuStr2 });
              // JID → gerçek telefon eşlemesini kaydet
              saveJidMapping(stkId, rawPhone, uPhone);
              console.log(`[BOT] 📋 ${stkName} → ${rawPhone}: Bilgi alındı → ${uName} / ${uPhone} / ${uTc}`);
            }
            continue;
          }

          // ═══════════════════════════════════════════
          // STATE: DEKONT TÜR SEÇİMİ + DOSYA İNDİRME
          // ═══════════════════════════════════════════
          if (userState?.type === "AWAITING_RECEIPT_TYPE") {
            if (queryTR === "iptal" || queryTR === "vazgeç") {
              userStates.delete(stateKey);
              replyText = `${PREFIX}❌ Dekont kaydı iptal edildi. Başka bir işlem için *yardım* yazabilirsiniz.`;
              await sock.sendMessage(from, { text: replyText });
              continue;
            }

            const choice = queryTR.trim();
            const optionsMap = userState.optionsMap || { "1": "MONTHLY_DUES", "2": "ANNUAL_DUES", "3": "DONATION" };
            const paymentType = optionsMap[choice];
            if (!paymentType) {
              // Dinamik geçerli seçenekleri göster
              const validOptions = Object.entries(optionsMap).map(([k, v]) => {
                const label = v === "MONTHLY_DUES" ? "Aylık Aidat" : v === "ANNUAL_DUES" ? "Yıllık Aidat" : "Bağış";
                return `${k}️⃣ ${label}`;
              }).join("\n");
              replyText = `${PREFIX}⚠️ Geçersiz seçim. Lütfen geçerli bir rakam yazınız:\n\n${validOptions}\n\nİptal için *iptal* yazınız.`;
              await sock.sendMessage(from, { text: replyText });
              continue;
            }

            // ═══ BAĞIŞ SEÇİLDİYSE → MİKTAR SOR ═══
            if (paymentType === "DONATION") {
              userStates.set(stateKey, {
                ...userState,
                type: "AWAITING_DONATION_AMOUNT",
                paymentType: "DONATION",
              });
              replyText = `${PREFIX}💖 *Bağış yapmak istiyorsunuz!*\n\nLütfen bağış miktarınızı TL olarak yazınız (Örn: 500):\n\nİptal için *iptal* yazınız.`;
              await sock.sendMessage(from, { text: replyText });
              continue;
            }

            // Aylık/Yıllık aidat — tutarı STK profilinden çek
            let amount = 0;
            if (paymentType === "MONTHLY_DUES" && org?.monthlyDuesAmount) amount = parseFloat(org.monthlyDuesAmount) || 0;
            else if (paymentType === "ANNUAL_DUES" && org?.annualDuesAmount) amount = parseFloat(org.annualDuesAmount) || 0;

            // Medyayı sunucuya indir
            let receiptUrl = null;
            try {
              const { mediaMsg, mediaType } = userState;
              if (mediaMsg) {
                const stream = await downloadContentFromMessage(mediaMsg, mediaType);
                const chunks = [];
                for await (const chunk of stream) chunks.push(chunk);
                const buffer = Buffer.concat(chunks);
                const ext = mediaType === "image" ? "jpg" : "pdf";
                const fileName = `receipt_${Date.now()}_${rawPhone.slice(-4)}.${ext}`;
                const uploadDir = path.join(__dirname, "..", "public", "uploads", "receipts");
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                const filePath = path.join(uploadDir, fileName);
                fs.writeFileSync(filePath, buffer);
                receiptUrl = `https://kamulog.net/uploads/receipts/${fileName}`;
                console.log(`[BOT] 💾 ${stkName} → Dekont kaydedildi (absolute URL): ${receiptUrl}`);
              }
            } catch (dlErr) {
              console.error(`[BOT] Dekont indirme hatası:`, dlErr.message);
            }

            // ═══ SADECE STKPaymentReport'a yaz (Ödemeler sayfası) ═══
            const userPhone = userState.senderPhone || `+90${corePhone}`;
            const userName = userState.senderName || 'Bilinmiyor';
            const userTc = userState.senderTc || '00000000000';
            const userEmail = userState.senderEmail || '';
            const senderInfo = `WhatsApp Bot Dekontu. Gönderen: ${userName} - Tel: ${userPhone}`;
            const paymentTypeMap = { MONTHLY_DUES: "MONTHLY", ANNUAL_DUES: "ANNUAL", DONATION: "DONATION" };

            // Application bul veya oluştur
            const phoneClean = userPhone.replace(/\D/g, "").slice(-10);
            let appId = null;
            try {
              const existingApp = await prisma.sTKApplication.findFirst({
                where: { stkId, OR: [
                  { phone: { contains: phoneClean } },
                  { phone: { in: [userPhone, phoneClean, '0' + phoneClean, '+90' + phoneClean, '90' + phoneClean] } },
                  ...(userTc && userTc !== '00000000000' ? [{ tcKimlik: userTc }] : []),
                ] },
                select: { id: true },
              });
              if (existingApp) {
                appId = existingApp.id;
              } else {
                // Application yoksa oluştur (dekont takibi için gerekli)
                const newApp = await prisma.sTKApplication.create({
                  data: {
                    stkId,
                    name: userName,
                    phone: userPhone,
                    tcKimlik: userTc,
                    email: userEmail,
                    status: "PENDING",
                    registrationSource: "WHATSAPP_RECEIPT",
                  },
                });
                appId = newApp.id;
                console.log(`[BOT] 📋 ${stkName} → ${rawPhone}: Dekont için STKApplication oluşturuldu (${userName} / ${userPhone})`);
                saveJidMapping(stkId, rawPhone, userPhone);
              }
            } catch (appErr) {
              console.error(`[BOT] Application bul/oluştur hatası:`, appErr.message);
            }

            if (appId) {
              try {
                await prisma.sTKPaymentReport.create({
                  data: {
                    applicationId: appId,
                    amount,
                    paymentType: paymentTypeMap[paymentType] || "MONTHLY",
                    paymentDate: new Date(),
                    receiptUrl: receiptUrl || null,
                    note: senderInfo,
                    status: "PENDING",
                  },
                });
                console.log(`[BOT] 💳 ${stkName} → ${rawPhone}: Dekont STKPaymentReport'a kaydedildi`);
              } catch (e) { console.error(`[BOT] PaymentReport kayıt hatası:`, e.message); }
            } else {
              console.error(`[BOT] ❌ ${stkName} → ${rawPhone}: applicationId bulunamadı, dekont kaydedilemedi`);
            }

            userStates.delete(stateKey);
            const typeLabel = paymentType === "MONTHLY_DUES" ? "Aylık Aidat" : paymentType === "ANNUAL_DUES" ? "Yıllık Aidat" : "Bağış";
            replyText = `${PREFIX}✅ Dekontunuz başarıyla sisteme iletildi!\n\n📋 *Tür:* ${typeLabel}${amount > 0 ? `\n💰 *Tutar:* ${amount} ₺` : ""}\n📷 *Dekont:* ${receiptUrl ? "Kaydedildi ✅" : "Görsel alınamadı"}\n\nYönetim Kurulu onayından sonra üyelik süreniz güncellenecektir. Teşekkür ederiz! 🙏`;
            await sock.sendMessage(from, { text: replyText });
            console.log(`[BOT] ✅ ${stkName} → ${rawPhone}: Dekont kaydedildi (${typeLabel}, ${amount}₺)`);
            try { await prisma.sTKBotLog.create({ data: { stkId, action: "RECEIPT_RECEIVED", details: `Dekont alındı: ${typeLabel}, ${amount}₺ (${rawPhone})` } }); } catch {}
            continue;
          }

          // ═══════════════════════════════════════════
          // STATE: BAĞIŞ MİKTARI GİRİŞİ
          // ═══════════════════════════════════════════
          if (userState?.type === "AWAITING_DONATION_AMOUNT") {
            if (queryTR === "iptal" || queryTR === "vazgeç") {
              userStates.delete(stateKey);
              replyText = `${PREFIX}❌ Bağış işlemi iptal edildi. Başka bir işlem için *yardım* yazabilirsiniz.`;
              await sock.sendMessage(from, { text: replyText });
              continue;
            }

            const donationAmount = parseFloat(text.replace(/[^0-9.,]/g, "").replace(",", "."));
            if (!donationAmount || donationAmount <= 0) {
              replyText = `${PREFIX}⚠️ Geçerli bir tutar giriniz (Örn: 500).\n\nİptal için *iptal* yazınız.`;
              await sock.sendMessage(from, { text: replyText });
              continue;
            }

            // Medyayı indir
            let receiptUrl = null;
            try {
              const { mediaMsg, mediaType } = userState;
              if (mediaMsg) {
                const stream = await downloadContentFromMessage(mediaMsg, mediaType);
                const chunks = [];
                for await (const chunk of stream) chunks.push(chunk);
                const buffer = Buffer.concat(chunks);
                const ext = mediaType === "image" ? "jpg" : "pdf";
                const fileName = `donation_${Date.now()}_${rawPhone.slice(-4)}.${ext}`;
                const uploadDir = path.join(__dirname, "..", "public", "uploads", "receipts");
                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                fs.writeFileSync(path.join(uploadDir, fileName), buffer);
                receiptUrl = `https://kamulog.net/uploads/receipts/${fileName}`;
              }
            } catch (dlErr) { console.error(`[BOT] Bağış dekont indirme hatası:`, dlErr.message); }

            // STKPaymentReport'a kaydet
            const donUserPhone = userState.senderPhone || `+90${corePhone}`;
            const donUserName = userState.senderName || 'Bilinmiyor';
            const donUserTc = userState.senderTc || '00000000000';
            const donUserEmail = userState.senderEmail || '';
            const senderInfo = `WhatsApp Bağış Dekontu. Gönderen: ${donUserName} - Tel: ${donUserPhone} - Tutar: ${donationAmount} ₺`;
            const donPhoneClean = donUserPhone.replace(/\D/g, "").slice(-10);
            let appId = null;
            try {
              const existingApp = await prisma.sTKApplication.findFirst({
                where: { stkId, OR: [
                  { phone: { contains: donPhoneClean } },
                  { phone: { in: [donUserPhone, donPhoneClean, '0' + donPhoneClean, '+90' + donPhoneClean, '90' + donPhoneClean] } },
                  ...(donUserTc && donUserTc !== '00000000000' ? [{ tcKimlik: donUserTc }] : []),
                ] },
                select: { id: true },
              });
              if (existingApp) {
                appId = existingApp.id;
              } else {
                const newApp = await prisma.sTKApplication.create({
                  data: {
                    stkId,
                    name: donUserName,
                    phone: donUserPhone,
                    tcKimlik: donUserTc,
                    email: donUserEmail,
                    status: "PENDING",
                    registrationSource: "WHATSAPP_DONATION",
                  },
                });
                appId = newApp.id;
              }
            } catch (appErr) { console.error(`[BOT] Bağış application hatası:`, appErr.message); }

            if (appId) {
              try {
                await prisma.sTKPaymentReport.create({
                  data: {
                    applicationId: appId,
                    amount: donationAmount,
                    paymentType: "DONATION",
                    paymentDate: new Date(),
                    receiptUrl: receiptUrl || null,
                    note: senderInfo,
                    status: "PENDING",
                  },
                });
                console.log(`[BOT] 💖 ${stkName} → ${rawPhone}: Bağış ${donationAmount}₺ STKPaymentReport'a kaydedildi`);
              } catch (e) { console.error(`[BOT] Bağış kayıt hatası:`, e.message); }
            }

            userStates.delete(stateKey);
            replyText = `${PREFIX}✅ Bağışınız başarıyla sisteme iletildi!\n\n💖 *Tür:* Bağış\n💰 *Tutar:* ${donationAmount} ₺\n📷 *Dekont:* ${receiptUrl ? "Kaydedildi ✅" : "Görsel alınamadı"}\n\nBağışınız için çok teşekkür ederiz! 🙏`;
            await sock.sendMessage(from, { text: replyText });
            try { await prisma.sTKBotLog.create({ data: { stkId, action: "DONATION_RECEIVED", details: `Bağış alındı: ${donationAmount}₺ (${rawPhone})` } }); } catch {}
            continue;
          }

          // ═══════════════════════════════════════════
          // STATE: SSS SORU SEÇİMİ
          // ═══════════════════════════════════════════
          if (userState?.type === "AWAITING_FAQ_CHOICE") {
            if (queryTR === "iptal" || queryTR === "vazgeç" || queryTR === "menu" || queryTR === "menü" || queryTR === "yardım" || queryTR === "yardim") {
              userStates.delete(stateKey);
              replyText = `${PREFIX}Ana menüye dönüldü. Nasıl yardımcı olabilirim? *yardım* yazarak tüm komutları görebilirsiniz. 🙏`;
              await sock.sendMessage(from, { text: replyText });
              continue;
            }

            const faqChoice = queryTR.trim();
            const selectedFaq = userState.sssMap?.[faqChoice];
            if (selectedFaq) {
              userStates.delete(stateKey);
              replyText = `${PREFIX}📚 *SSS Cevabı*\n\n*Soru:* ${selectedFaq.q}\n\n*Cevap:* ${selectedFaq.a}\n\nBaşka bir soru için *sss* yazabilirsiniz.\nAna menü için *yardım* yazınız.`;
              await sock.sendMessage(from, { text: replyText });
              try { await prisma.sTKBotLog.create({ data: { stkId, action: "FAQ_ANSWERED", details: `SSS: ${selectedFaq.q.substring(0, 80)} (${rawPhone})` } }); } catch {}
              continue;
            } else {
              const maxNum = Object.keys(userState.sssMap || {}).length;
              replyText = `${PREFIX}⚠️ Geçersiz numara. Lütfen *1* ile *${maxNum}* arasında bir rakam yazınız.\n\nAna menü için *yardım* yazınız.`;
              await sock.sendMessage(from, { text: replyText });
              continue;
            }
          }

          // ═══════════════════════════════════════════
          // STATE MACHINE: ÜYELİK BAŞVURU AKIŞI
          // ═══════════════════════════════════════════

          // ADIM 2: Tüzük onayı bekliyor → KVKK adımına geç
          if (userState === "AWAITING_WELCOME_APPROVAL") {
            if (queryTR.includes("onaylıyorum") || queryTR.includes("onayliyorum") || queryTR === "evet" || queryTR === "onay") {
              replyText = `*Kişisel Verilerin Korunması Hakkında Bilgilendirme* 🔐\n\n` +
                `6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında;\n\n` +
                `Kimlik, iletişim ve diğer kişisel verileriniz, dernek üyelik işlemlerinin yürütülmesi, ` +
                `mevzuat yükümlülüklerinin yerine getirilmesi ve dernek faaliyetlerinin sürdürülebilmesi amacıyla işlenecektir.\n\n` +
                `Kişisel verileriniz üçüncü kişilerle açık rızanız olmadan paylaşılmayacaktır.\n\n` +
                `📋 KVKK haklarınız hakkında detaylı bilgi için: kvkk.gov.tr\n\n` +
                `Devam etmek için: *KABUL EDİYORUM* yazınız.\n` +
                `İptal etmek için: *iptal* yazınız.`;
              userStates.set(stateKey, "AWAITING_KVKK_APPROVAL");
              await sock.sendMessage(from, { text: replyText });
              console.log(`[BOT] 📋 ${stkName} → ${rawPhone}: KVKK metni gönderildi`);
              continue;
            } else if (queryTR === "iptal" || queryTR === "vazgeç" || queryTR === "vazgec") {
              userStates.delete(stateKey);
              replyText = `*${orgName} Sanal Asistanı:*\n\nÜyelik başvuru işleminiz iptal edilmiştir. Tekrar başvurmak isterseniz *üye ol* yazabilirsiniz. 🙏`;
              await sock.sendMessage(from, { text: replyText });
              continue;
            } else {
              replyText = `*${orgName} Üyelik Başvuru Sistemi:*\n\n⚠️ Lütfen devam etmek için *ONAYLIYORUM*, iptal etmek için *iptal* yazınız.`;
              await sock.sendMessage(from, { text: replyText });
              continue;
            }
          }

          // ADIM 3: KVKK onayı bekliyor → Kimlik doğrulamaya geç
          if (userState === "AWAITING_KVKK_APPROVAL") {
            if (queryTR.includes("kabul ediyorum") || queryTR.includes("kabul") || queryTR === "evet") {
              replyText = `*${orgName} Sanal Asistanı:* ✅\n\n` +
                `KVKK aydınlatma metnini ve üyelik taahhüdünü kabul ettiniz.\n` +
                `Hukuki onayınız sisteme kaydedilmiştir. ✅\n\n` +
                `🔐 Lütfen sistemimizde kayıtlı olan *TC Kimlik Numaranızı* veya *E-Posta adresinizi* yazınız.\n\n` +
                `Böylece sizi tanımlayıp hızlıca yönlendirebiliriz.`;
              userStates.set(stateKey, "AWAITING_IDENTIFICATION");
              await sock.sendMessage(from, { text: replyText });
              console.log(`[BOT] 🔐 ${stkName} → ${rawPhone}: Kimlik doğrulama bekleniyor`);
              continue;
            } else if (queryTR === "iptal" || queryTR === "vazgeç" || queryTR === "vazgec") {
              userStates.delete(stateKey);
              replyText = `*${orgName} Sanal Asistanı:*\n\nÜyelik başvuru işleminiz iptal edilmiştir. Tekrar başvurmak isterseniz *üye ol* yazabilirsiniz. 🙏`;
              await sock.sendMessage(from, { text: replyText });
              continue;
            } else {
              replyText = `*${orgName} Üyelik Başvuru Sistemi:*\n\n⚠️ Lütfen devam etmek için *KABUL EDİYORUM*, iptal etmek için *iptal* yazınız.`;
              await sock.sendMessage(from, { text: replyText });
              continue;
            }
          }

          // ADIM 4: KİMLİK DOĞRULAMA — TC veya Email ile eşleştir
          if (userState === "AWAITING_IDENTIFICATION") {
            const input = text.trim();
            const stkSlug = org?.slug || stkId;
            let foundMember = null;

            // TC Kimlik (11 haneli sayı)
            if (/^\d{11}$/.test(input)) {
              foundMember = await prisma.member.findFirst({
                where: { stkId, tcKimlik: input },
                select: { id: true, name: true, surname: true, phone: true },
              });
              if (!foundMember) {
                // Application tablosunda da ara
                const app = await prisma.sTKApplication.findFirst({
                  where: { stkId, tcKimlik: input },
                  select: { id: true, name: true, phone: true },
                });
                if (app) foundMember = { id: app.id, name: app.name, surname: "", phone: app.phone };
              }
            }

            // Email
            if (!foundMember && input.includes("@")) {
              foundMember = await prisma.member.findFirst({
                where: { stkId, email: input.toLowerCase() },
                select: { id: true, name: true, surname: true, phone: true },
              });
              if (!foundMember) {
                const app = await prisma.sTKApplication.findFirst({
                  where: { stkId, email: input.toLowerCase() },
                  select: { id: true, name: true, phone: true },
                });
                if (app) foundMember = { id: app.id, name: app.name, surname: "", phone: app.phone };
              }
            }

            if (foundMember) {
              // Telefon numarasını güncelle (kalıcı eşleşme) — HER İKİ TABLODA
              const phoneForDb = '+90' + corePhone;
              try {
                await prisma.member.update({ where: { id: foundMember.id }, data: { phone: phoneForDb } });
              } catch {
                // member olmayabilir, application olabilir
                try {
                  await prisma.sTKApplication.update({ where: { id: foundMember.id }, data: { phone: phoneForDb } });
                } catch {}
              }

              userStates.delete(stateKey);
              replyText = `*${orgName} Sanal Asistanı:* ✅\n\n` +
                `Sayın *${foundMember.name} ${foundMember.surname}*, kimliğiniz doğrulandı!\n\n` +
                `📱 Bu numara artık hesabınızla eşleştirilmiştir.\n\n` +
                `Size nasıl yardımcı olabilirim?\n` +
                `📋 *aidat* — Aidat bilgileriniz\n` +
                `👤 *durum* — Üyelik durumunuz\n` +
                `📍 *adres* — İletişim bilgileri`;
              await sock.sendMessage(from, { text: replyText });
              console.log(`[BOT] ✅ ${stkName} → ${rawPhone}: Kimlik doğrulandı (${foundMember.name})`);
              continue;
            } else {
              // TC veya Email'i geçici hafızaya kaydet
              const regKey = `${stkId}:${corePhone}`;
              const parsedTc = /^\d{11}$/.test(input) ? input : null;
              const parsedEmail = input.includes("@") ? input.toLowerCase() : null;
              tempRegistrationData.set(regKey, {
                tc: parsedTc,
                email: parsedEmail,
                name: msg.pushName || "WhatsApp Kullanıcısı",
              });
              console.log(`[BOT] 📝 ${stkName} → ${rawPhone}: Geçici hafızaya kaydedildi (TC: ${parsedTc || 'YOK'}, Email: ${parsedEmail || 'YOK'})`);

              // Sözleşme PDF'i bul ve gönder (izole arama + tam URL)
              const contract = await findContractUrl(stkId, org?.contractPdfUrl);
              if (contract) {
                try {
                  await sock.sendMessage(from, {
                    document: { url: contract.url },
                    mimetype: "application/octet-stream",
                    fileName: contract.fileName || `${orgName.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]/g, "").substring(0, 30)}_Uyelik_Sozlesmesi.pdf`,
                    caption: `*${orgName} Sanal Asistanı:*\n\nSistemimizde kaydınız bulunamadı. Ancak sizi aramızda görmekten mutluluk duyarız! 🤝\n\nYukarıdaki üyelik sözleşmemizi doldurup *fotoğrafını veya PDF'ini* buradan bana gönderebilirsiniz. 📄`,
                  });
                } catch (pdfErr) {
                  console.error(`[BOT] PDF hatası:`, pdfErr.message);
                  await sock.sendMessage(from, { text: `*${orgName} Sanal Asistanı:*\n\nSistemimizde kaydınız bulunamadı. Sizi aramızda görmekten mutluluk duyarız! 🤝\n\nÜyelik sözleşmenizi doldurarak fotoğrafını veya PDF'ini buradan gönderebilirsiniz. 📄` });
                }
              } else {
                await sock.sendMessage(from, { text: `*${orgName} Sanal Asistanı:*\n\nSistemimizde kaydınız bulunamadı. Sizi aramızda görmekten mutluluk duyarız! 🤝\n\nÜyelik başvurusu için *üye ol* yazınız. 🙏` });
              }
              // Belge bekleme moduna al
              userStates.set(stateKey, { type: "AWAITING_REGISTRATION_DOCUMENT" });
              console.log(`[BOT] 📋 ${stkName} → ${rawPhone}: Kimlik bulunamadı → Sözleşme bekleniyor (${input})`);
              continue;
            }
          }

          // ADIM 1: Üye değil + başvuru kelimeleri → Mobil uygulamaya yönlendir
          if ((!member || member.status === "APPLIED" || member.status === "PENDING" || member.status === "REJECTED") &&
              (queryTR.includes("üye ol") || queryTR.includes("uye ol") || queryTR.includes("başvuru") || queryTR.includes("basvuru") || queryTR.includes("kayıt") || queryTR.includes("kayit") || queryTR === "kayit" || queryTR === "kayıt" || queryTR.includes("katıl") || queryTR.includes("katil") || queryTR.includes("üyelik başvurusu") || queryTR.includes("uyelik"))) {
            replyText = `*${orgName} Sanal Asistanı:* 📋\n\nÜyelik başvurunuzu KamuLog mobil uygulaması üzerinden kolayca tamamlayabilirsiniz. 📲\n\n📱 *Nasıl Yapılır?*\n1\ufe0f\u20e3 KamuLog uygulamasını indirin ve giriş yapın\n2\ufe0f\u20e3 Sol menüden (≡) *Dernekler & Sendikalar* bölümüne girin\n3\ufe0f\u20e3 _${orgName}_ seçin ve başvurunuzu tamamlayın\n\nBaşvurunuz onaylanınca size bilgi verilecektir. 🙏`;
            await sock.sendMessage(from, { text: replyText });
            console.log(`[BOT] 📋 ${stkName} → ${rawPhone}: Üyelik başvurusu → Mobil uygulamaya yönlendirildi`);
            continue;
          }

          // ═══════════════════════════════════════════
          // NORMAL KEYWORD DETECTION (Mevcut Akıllı Yanıt)
          // ═══════════════════════════════════════════

          // ═══════════════════════════════════════════
          // KEYWORD: AİDAT / BORÇ
          // ═══════════════════════════════════════════
          if (query.includes("aidat") || query.includes("borc") || query.includes("borç") || query.includes("odeme") || query.includes("ödeme") || query.includes("iban")) {
              // Dinamik finans mesajı — panel checkbox'larına göre (HERKESe gösterilir)
              let duesMsg = `*${(orgName || '').toUpperCase()} ÜYELİK AİDATI*\n\n`;
              
              if (org?.bankAccountName) duesMsg += `🏦 *Hesap Sahibi:* ${org.bankAccountName}\n`;
              if (org?.iban) duesMsg += `💳 *IBAN:* ${org.iban}\n`;
              duesMsg += `\n`;

              if (org?.acceptsDues && org?.monthlyDuesAmount) {
                duesMsg += `📅 *Aylık Aidat:* ${org.monthlyDuesAmount} ₺\n`;
                if (org.duesNote) duesMsg += `   📝 _${org.duesNote}_\n`;
              }
              if (org?.acceptsAnnualDues && org?.annualDuesAmount) {
                duesMsg += `📆 *Yıllık Aidat:* ${org.annualDuesAmount} ₺\n`;
                if (org.annualDuesNote) duesMsg += `   📝 _${org.annualDuesNote}_\n`;
              }
              if (org?.acceptsDonation) {
                duesMsg += `💖 *Bağış Kabulü:* Aktif\n`;
                if (org.donationNote) duesMsg += `   📝 _${org.donationNote}_\n`;
              }
              if (org?.paymentNote) {
                duesMsg += `\n📌 *Ödeme Notu:* ${org.paymentNote}\n`;
              }

              // Üye varsa ödeme geçmişini göster
              if (member) {
                const payments = await prisma.sTKFinanceRecord.findMany({
                  where: { stkId, memberId: member.id, type: "INCOME" },
                  orderBy: { date: "desc" },
                  take: 3,
                  select: { amount: true, date: true, description: true },
                });

                if (payments.length > 0) {
                  const paymentList = payments.map(p =>
                    `  • ${new Date(p.date).toLocaleDateString("tr-TR")} — ${p.amount} ₺ ${p.description ? `(${p.description})` : ""}`
                  ).join("\n");
                  duesMsg += `\n📋 *Son Ödemeleriniz:*\n${paymentList}\n`;
                }
              }

              duesMsg += `\n📸 *Ödeme yaptıktan sonra dekontunuzun fotoğrafını veya PDF'ini bu ekrandan bana gönderiniz.* Otomatik olarak sisteme işlenecektir.`;

              const greeting = member ? `Sayın *${member.name} ${member.surname}*` : `Değerli ziyaretçimiz`;
              replyText = `${PREFIX}${greeting},\n\n${duesMsg}`;

          // ═══════════════════════════════════════════
          // KEYWORD: ADRES / İLETİŞİM
          // ═══════════════════════════════════════════
          } else if (query.includes("adres") || query.includes("iletisim") || query.includes("iletişim") || query.includes("telefon") || query.includes("konum")) {
            const parts = [];
            if (org?.address) parts.push(`📍 *Adres:* ${org.address}`);
            if (org?.city) parts.push(`🏙️ *Şehir:* ${org.city}${org.district ? ` / ${org.district}` : ""}`);
            if (org?.phone) parts.push(`📞 *Telefon:* ${org.phone}`);
            if (org?.email) parts.push(`📧 *E-posta:* ${org.email}`);

            if (parts.length > 0) {
              replyText = `${PREFIX}*İletişim Bilgilerimiz:*\n\n${parts.join("\n")}\n\n🌐 Bizi ziyaret ettiğiniz için teşekkür ederiz!`;
            } else {
              replyText = `${PREFIX}İletişim bilgilerimiz henüz sisteme girilmemiştir. Lütfen daha sonra tekrar deneyin.`;
            }

          // ═══════════════════════════════════════════
          // KEYWORD: DURUM / ÜYELİK
          // ═══════════════════════════════════════════
          } else if (query.includes("durum") || query.includes("uyelik") || query.includes("üyelik") || query.includes("kayit") || query.includes("kayıt") || query.includes("bilgi")) {
            if (member) {
              const statusLabels = {
                APPLIED: "📝 Başvuru Yapıldı",
                PENDING: "⏳ Beklemede",
                ACTIVE: "✅ Aktif Üye",
                APPROVED: "✅ Onaylandı",
                SUSPENDED: "⏸️ Askıya Alındı",
                EXPELLED: "🚫 İhraç Edildi",
                RESIGNED: "🚪 İstifa Etti",
                RESIGNED_BOARD: "🚪 Yönetim Kurulu İstifası",
                DECEASED: "🕊️ Vefat",
                RESIGNATION_REQ: "📋 İstifa Talebi",
                REJECTED: "❌ Reddedildi",
              };
              const categoryLabels = {
                ASIL: "Asıl Üye",
                FAHRI: "Fahri Üye",
                ONURSAL: "Onursal Üye",
              };

              const statusText = statusLabels[member.status] || member.status;
              const categoryText = categoryLabels[member.category] || member.category || "—";
              const joinDate = member.joinDate || member.createdAt;
              const joinText = joinDate
                ? new Date(joinDate).toLocaleDateString("tr-TR")
                : "Belirtilmemiş";

              // Üyelik süresi hesapla
              let durationText = "";
              let remainingText = "";
              let expiryText = "";
              const isActive = member.status === "ACTIVE" || member.status === "APPROVED";

              if (joinDate && isActive) {
                const start = new Date(joinDate);
                const now = new Date();
                const diffMs = now.getTime() - start.getTime();
                const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const years = Math.floor(totalDays / 365);
                const months = Math.floor((totalDays % 365) / 30);
                const days = totalDays % 30;
                if (years > 0) durationText = `${years} yıl ${months} ay`;
                else if (months > 0) durationText = `${months} ay ${days} gün`;
                else durationText = `${days} gün`;
              }

              // expiryDate varsa gerçek bitiş tarihini kullan
              if (member.expiryDate && isActive) {
                const expiry = new Date(member.expiryDate);
                const now = new Date();
                expiryText = expiry.toLocaleDateString("tr-TR");
                if (expiry > now) {
                  const remainMs = expiry.getTime() - now.getTime();
                  const remainDays = Math.floor(remainMs / (1000 * 60 * 60 * 24));
                  const remainMonths = Math.floor(remainDays / 30);
                  const remainDaysLeft = remainDays % 30;
                  if (remainMonths > 0) remainingText = `${remainMonths} ay ${remainDaysLeft} gün`;
                  else remainingText = `${remainDays} gün`;
                } else {
                  remainingText = "⚠️ Süre dolmuş";
                }
              } else if (joinDate && isActive) {
                // expiryDate yoksa yıllık dönem bazlı hesapla
                const start = new Date(joinDate);
                const now = new Date();
                const nextAnniversary = new Date(start);
                nextAnniversary.setFullYear(now.getFullYear());
                if (nextAnniversary <= now) nextAnniversary.setFullYear(now.getFullYear() + 1);
                const remainMs = nextAnniversary.getTime() - now.getTime();
                const remainDays = Math.floor(remainMs / (1000 * 60 * 60 * 24));
                const remainMonths = Math.floor(remainDays / 30);
                const remainDaysLeft = remainDays % 30;
                if (remainMonths > 0) remainingText = `${remainMonths} ay ${remainDaysLeft} gün`;
                else remainingText = `${remainDays} gün`;
                expiryText = nextAnniversary.toLocaleDateString("tr-TR");
              }

              // ═══ AİDAT BİLGİSİ — STKPaymentReport'tan son ödemeyi çek ═══
              let duesInfoText = "";
              try {
                // member.id ile application bul, ondan payment çek
                const appForPayment = member._isFromApp
                  ? { id: member.id }
                  : await prisma.sTKApplication.findFirst({
                      where: { stkId, OR: [{ phone: { contains: corePhone } }, ...(member.phone ? [{ phone: member.phone }] : [])] },
                      select: { id: true, expiryDate: true },
                    });

                // expiryDate applicant'tan varsa member'a aktar
                if (!member.expiryDate && appForPayment?.expiryDate) {
                  member.expiryDate = appForPayment.expiryDate;
                  const expiry = new Date(appForPayment.expiryDate);
                  const now = new Date();
                  expiryText = expiry.toLocaleDateString("tr-TR");
                  if (expiry > now) {
                    const remainMs = expiry.getTime() - now.getTime();
                    const remainDays = Math.floor(remainMs / (1000 * 60 * 60 * 24));
                    const remainMonths = Math.floor(remainDays / 30);
                    const remainDaysLeft = remainDays % 30;
                    if (remainMonths > 0) remainingText = `${remainMonths} ay ${remainDaysLeft} gün`;
                    else remainingText = `${remainDays} gün`;
                  } else {
                    remainingText = "⚠️ Süre dolmuş";
                  }
                }

                if (appForPayment) {
                  const lastPayment = await prisma.sTKPaymentReport.findFirst({
                    where: { applicationId: appForPayment.id },
                    orderBy: { createdAt: "desc" },
                    select: { paymentType: true, amount: true, status: true, createdAt: true },
                  });
                  if (lastPayment) {
                    const typeLabels = { MONTHLY: "Aylık Aidat", ANNUAL: "Yıllık Aidat", DONATION: "Bağış", MONTHLY_DUES: "Aylık Aidat", ANNUAL_DUES: "Yıllık Aidat" };
                    const statusLabelsP = { PENDING: "⏳ Onay Bekliyor", APPROVED: "✅ Onaylandı", REJECTED: "❌ Reddedildi" };
                    duesInfoText = `\n💳 *Son Aidat/Ödeme Bilgisi:*\n` +
                      `• Tür: ${typeLabels[lastPayment.paymentType] || lastPayment.paymentType}\n` +
                      `• Tutar: ${lastPayment.amount ? lastPayment.amount + " TL" : "—"}\n` +
                      `• Durum: ${statusLabelsP[lastPayment.status] || lastPayment.status}\n` +
                      `• Tarih: ${new Date(lastPayment.createdAt).toLocaleDateString("tr-TR")}\n`;
                  } else {
                    duesInfoText = `\n💳 *Aidat Bilgisi:* Henüz ödeme kaydı bulunmamaktadır.\n`;
                  }
                }
              } catch (duesErr) {
                console.error("[BOT] Aidat bilgisi çekme hatası:", duesErr.message);
              }

              replyText = `${PREFIX}Sayın *${member.name} ${member.surname || ""}*,\n\n` +
                `👤 *Üyelik Durumunuz:*\n\n` +
                `• Durum: ${statusText}\n` +
                `• Kategori: ${categoryText}\n` +
                `• Kayıt Tarihi: ${joinText}\n` +
                (durationText ? `• ⏱️ Üyelik Süresi: ${durationText}\n` : "") +
                (expiryText ? `• 📅 Bitiş Tarihi: ${expiryText}\n` : "") +
                (remainingText ? `• ⏳ Kalan Süre: ${remainingText}\n` : "") +
                ((member.status === "RESIGNED" || member.status === "RESIGNED_BOARD") && member.updatedAt
                  ? `• 🚪 İstifa Tarihi: ${new Date(member.updatedAt).toLocaleDateString("tr-TR")}\n` : "") +
                (member.status === "REJECTED" && member.updatedAt
                  ? `• ❌ Red Tarihi: ${new Date(member.updatedAt).toLocaleDateString("tr-TR")}\n` : "") +
                (member.status === "EXPELLED" && member.updatedAt
                  ? `• 🚫 İhraç Tarihi: ${new Date(member.updatedAt).toLocaleDateString("tr-TR")}\n` : "") +
                duesInfoText +
                `\n💡 Detaylı bilgi için derneğimize başvurabilirsiniz.`;
            } else {
              replyText = `${PREFIX}Üyelik bilgilerinizi görüntüleyebilmek için sistemimizdeki kaydınız gerekmektedir.\n\n` +
                `📱 Lütfen derneğimize kayıtlı telefon numaranızdan yazın.`;
            }

          // ═══════════════════════════════════════════
          // KEYWORD: MENÜ / YARDIM
          // ═══════════════════════════════════════════
          } else if (query.includes("menu") || query.includes("menü") || query.includes("yardim") || query.includes("yardım") || query.includes("komut")) {
            replyText = `${PREFIX}Size nasıl yardımcı olabilirim? Aşağıdaki komutlardan birini yazabilirsiniz:\n\n` +
              `📋 *aidat* — Aidat bilgilerinizi görüntüleyin\n` +
              `📍 *adres* — Derneğimizin iletişim bilgileri\n` +
              `👤 *durum* — Üyelik durumunuzu öğrenin\n` +
              `📅 *faaliyetler* — Son etkinlik ve duyurular\n` +
              `📚 *sss* — Sıkça sorulan sorular\n` +
              `📜 *sözleşme* — Üyelik sözleşmesini edinin\n` +
              `❓ *yardım* — Bu menüyü tekrar görüntüleyin\n\n` +
              `💬 Herhangi bir sorunuz için doğrudan yazabilirsiniz!`;

          // ═══════════════════════════════════════════
          // KEYWORD: SÖZLEŞME / TÜZÜK
          // ═══════════════════════════════════════════
          } else if (query.includes("sozlesme") || query.includes("sözleşme") || query.includes("tuzuk") || query.includes("tüzük")) {
            const contract = await findContractUrl(stkId, org?.contractPdfUrl);
            if (contract) {
              try {
                await sock.sendMessage(from, {
                  document: { url: contract.url },
                  mimetype: "application/octet-stream",
                  fileName: contract.fileName || `${orgName.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]/g, "").substring(0, 30)}_Sozlesme.pdf`,
                  caption: `*${orgName} Sanal Asistanı:*\n\n📜 Aşağıda derneğimizin resmi üyelik sözleşmesi/tüzüğü yer almaktadır.\n\nİnceleyip başvurunuzu KamuLog mobil uygulaması üzerinden gerçekleştirebilirsiniz. 📲`,
                });
                console.log(`[BOT] 📜 ${stkName} → ${rawPhone}: Sözleşme PDF gönderildi`);
                continue;
              } catch (pdfErr) {
                console.error(`[BOT] Sözleşme gönderim hatası:`, pdfErr.message);
                replyText = `${PREFIX}Sözleşme dosyası şu an gönderilemedi. Lütfen daha sonra tekrar deneyiniz. 🙏`;
              }
            } else {
              replyText = `${PREFIX}Sistemimizde henüz bir sözleşme/tüzük belgesi tanımlanmamıştır. Detaylı bilgi için derneğimize başvurabilirsiniz. 🙏`;
            }

          // ═══════════════════════════════════════════
          // KEYWORD: SSS / SORU / BİLGİ BANKASI
          // ═══════════════════════════════════════════
          } else if (query.includes("sss") || query.includes("soru") || query.includes("bilgi bankasi") || query.includes("bilgi bankası")) {
            try {
              const faqList = await prisma.sTKFAQ.findMany({
                where: { stkId },
                select: { id: true, question: true, answer: true },
                orderBy: { createdAt: "asc" },
                take: 15,
              });
              if (faqList.length > 0) {
                // SSS listesi + seçim menüsü
                let sssMsg = `${PREFIX}📚 *Sıkça Sorulan Sorular*\n\nAşağıdaki sorulardan birinin numarasını yazarak cevabını öğrenebilirsiniz:\n\n`;
                const sssMap = {};
                faqList.forEach((f, i) => {
                  const num = i + 1;
                  sssMsg += `*${num}.* ${f.question}\n`;
                  sssMap[num.toString()] = { q: f.question, a: f.answer };
                });
                sssMsg += `\nÖrnek: Cevabını görmek istediğiniz sorunun numarasını yazın (Örn: *1*)\nAna menü için *yardım* yazınız.`;
                userStates.set(stateKey, { type: "AWAITING_FAQ_CHOICE", sssMap });
                await sock.sendMessage(from, { text: sssMsg });
              } else {
                replyText = `${PREFIX}Henüz sıkça sorulan soru eklenmemiştir. Doğrudan sorunuzu yazabilirsiniz, size yardımcı olmaya çalışacağım! 🙏`;
              }
            } catch { replyText = `${PREFIX}SSS listesi yüklenirken bir hata oluştu. Lütfen tekrar deneyin.`; }

          // ═══════════════════════════════════════════
          // KEYWORD: FAALİYETLER / ETKİNLİKLER / DUYURULAR
          // ═══════════════════════════════════════════
          } else if (query.includes("faaliyet") || query.includes("etkinlik") || query.includes("duyuru") || query.includes("haber")) {
            try {
              const activities = await prisma.sTKActivity.findMany({
                where: { stkId, isPublished: true },
                orderBy: { createdAt: "desc" },
                take: 3,
                select: { title: true, date: true, createdAt: true, location: true },
              });

              if (activities.length > 0) {
                const emojis = ["1️⃣", "2️⃣", "3️⃣"];
                const list = activities.map((a, i) => {
                  const d = a.date ? new Date(a.date).toLocaleDateString("tr-TR") : new Date(a.createdAt).toLocaleDateString("tr-TR");
                  return `${emojis[i]} *${a.title}*\n   📆 ${d}${a.location ? ` • 📍 ${a.location}` : ""}`;
                }).join("\n\n");

                const stkSlug = org?.slug || stkId;
                replyText = `${PREFIX}*Son Faaliyetlerimiz:*\n\n${list}\n\n📌 Detaylar için *yardım* yazabilirsiniz.`;
              } else {
                replyText = `${PREFIX}Şu an için yaklaşan yeni bir faaliyet/duyuru bulunmamaktadır. 📌\n\nYeni etkinliklerimizi takip etmek için bizi izlemeye devam edin! 🙏`;
              }
            } catch {
              replyText = `${PREFIX}Faaliyetler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.`;
            }

          // ═══════════════════════════════════════════
          // KEYWORD: MERHABA / SELAMLAŞMAPe
          // ═══════════════════════════════════════════
          } else if (query.includes("merhaba") || query.includes("selam") || query.includes("meraba") || query === "sa" || query === "as" || query.includes("iyi gunler") || query.includes("iyi günler")) {
            const stkSlug = org?.slug || stkId;
            const MENU = `\n\n📋 *aidat* — Aidat bilgileri\n👤 *durum* — Üyelik durumu\n📍 *adres* — İletişim bilgileri\n📅 *faaliyetler* — Son etkinlikler\n📚 *sss* — Sıkça sorulan sorular\n❓ *yardım* — Tüm komutlar`;

            if (member) {
              const s = member.status;
              if (s === "ACTIVE" || s === "APPROVED") {
                // Premium (aidat) kontrolü
                let isPremium = false, daysLeft = 0;
                try {
                  const pc = await prisma.member.findUnique({ where: { id: member.id }, select: { expiryDate: true } });
                  isPremium = pc?.expiryDate && new Date(pc.expiryDate) > new Date();
                  daysLeft = isPremium ? Math.ceil((new Date(pc.expiryDate).getTime() - Date.now()) / 86400000) : 0;
                } catch {}

                if (isPremium) {
                  replyText = `${PREFIX}Sayın *${member.name} ${member.surname}*, Premium (Üyelik Aidatı Ödenmiş) menünüze hoş geldiniz! 👑\n\n⏳ Aidatınızın bitmesine *${daysLeft} gün* kaldı.${MENU}`;
                } else {
                  replyText = `${PREFIX}Sayın *${member.name} ${member.surname}*, aktif üyemizsiniz ancak aidat ödemeniz eksik görünmektedir. ⚠️\n\n💳 Aidat bilgileri için *aidat* yazabilirsiniz. Dekontunuzu göndermek için fotoğrafını buraya atmanız yeterlidir.${MENU}`;
                }
              } else if (s === "RESIGNED" || s === "RESIGNED_BOARD") {
                const stateKey = `${stkId}:${rawPhone}`;
                userStates.set(stateKey, { type: "AWAITING_REAPPLY_CONFIRM" });
                replyText = `${PREFIX}Sayın *${member.name} ${member.surname}*, sistemimizde daha önce *İstifa Etmiş* olarak görünüyorsunuz. 🚪\n\nYeniden aramıza katılmak ve başvuru yapmak ister misiniz?\n\nLütfen *EVET* veya *HAYIR* yazınız.`;
              } else if (s === "REJECTED") {
                replyText = `${PREFIX}Sayın *${member.name} ${member.surname}*, üzülerek bildiririz ki üyelik başvurunuz onaylanmamıştır. ❌\n\nYeni başvuru yapmak için *üye ol* yazabilirsiniz.${MENU}`;
              } else if (s === "PENDING" || s === "APPLIED") {
                replyText = `${PREFIX}Sayın *${member.name} ${member.surname}*, başvurunuz Yönetim Kurulu onayındadır. ⏳\n\nSonuç size bildirilecektir. Lütfen bekleyiniz.${MENU}`;
              } else if (s === "SUSPENDED") {
                replyText = `${PREFIX}Sayın *${member.name} ${member.surname}*, üyeliğiniz geçici olarak *askıya alınmıştır*. ⏸️\n\nDetaylı bilgi için derneğimize başvurunuz.${MENU}`;
              } else if (s === "EXPELLED") {
                replyText = `${PREFIX}Sayın *${member.name} ${member.surname}*, üyeliğiniz *ihraç kararı* ile sonlandırılmıştır. 🚫\n\nDetaylı bilgi için derneğimize başvurunuz.`;
              } else {
                replyText = `${PREFIX}Merhaba *${member.name} ${member.surname}*! 👋\n\n${orgName} sanal asistanına hoş geldiniz!${MENU}`;
              }
            } else {
              // Tanınmayan numara → Mobil uygulamaya yönlendir
              replyText = `${PREFIX}Merhaba! 👋\n\n${orgName} sanal asistanına hoş geldiniz!\n\n📱 Bu numara sistemimizde aktif bir üyelikle eşleşmemektedir.\n\n*Üyelik Başvurusu:*\nKamuLog uygulamasını indirin, giriş yapın. Sol menüden (≡) *Dernekler & Sendikalar* bölümüne girerek _${orgName}_ seçin ve başvurunuzu tamamlayın. 📲\n\n📍 *adres* — İletişim bilgileri\n❓ *yardım* — Tüm komutlar`;
            }

          // ═══════════════════════════════════════════
          // KEYWORD: RAPOR / ÖZET (PATRON MODU)
          // ═══════════════════════════════════════════
          } else if (query.includes("rapor") || query.includes("ozet") || query.includes("özet")) {
            // Yönetici mi kontrol et
            const manager = await prisma.user.findFirst({
              where: { phone: { contains: corePhone }, role: { in: ["ADMIN", "STK_MANAGER"] } },
              select: { id: true, name: true },
            });

            if (manager) {
              try {
                const [totalMembers, pendingMembers, expiringMembers, pendingPayments] = await Promise.all([
                  prisma.member.count({ where: { stkId, status: "ACTIVE" } }),
                  prisma.member.count({ where: { stkId, status: { in: ["PENDING", "APPLIED"] } } }),
                  prisma.member.count({ where: { stkId, status: "ACTIVE", expiryDate: { lte: new Date(Date.now() + 7 * 86400000) } } }),
                  prisma.sTKFinanceRecord.count({ where: { stkId, description: { contains: "WhatsApp" } } }),
                ]);

                replyText = `👑 *${orgName} GİZLİ YÖNETİCİ RAPORU* 👑\n\n` +
                  `Sayın *${manager.name || 'Başkan'}*, güncel özetiniz:\n\n` +
                  `👥 Aktif Üye: *${totalMembers}*\n` +
                  `⏳ Onay Bekleyen Üye: *${pendingMembers}*\n` +
                  `⚠️ Aidat Süresi Dolan/Azalan: *${expiringMembers}*\n` +
                  `💸 Onay Bekleyen Dekont: *${pendingPayments}*\n\n` +
                  `Sistem kusursuz çalışıyor komutanım! 🦅`;
                try { await prisma.sTKBotLog.create({ data: { stkId, action: "MANAGER_REPORT", details: `Yönetici raporu istendi (${manager.name || rawPhone})` } }); } catch {}
              } catch (e) {
                replyText = `${PREFIX}Rapor oluşturulurken hata: ${e.message}`;
              }
            } else {
              replyText = `${PREFIX}Bu komut yalnızca STK yöneticilerine özeldir. 🔒`;
            }

          // ═══════════════════════════════════════════
          // BİLİNMEYEN KOMUT — SSS + GENEL KARŞILAMA
          // ═══════════════════════════════════════════
          } else {
            // ── TEMSİLCİ / CANLI DESTEK ──
            if (query.includes("temsilci") || query.includes("canlı destek") || query.includes("canli destek") || query.includes("yetkili") || query.includes("insan")) {
              if (org?.botContactPhone) {
                const cleanPhone = org.botContactPhone.replace(/\D/g, "");
                replyText = `${PREFIX}📞 *Yetkili Temsilciye Yönlendiriliyorsunuz...*\n\nDetaylı görüşme için doğrudan temsilcimizle iletişime geçebilirsiniz:\n👉 wa.me/${cleanPhone}\n\nÇalışma saatlerimizde en kısa sürede dönüş yapılacaktır. 🙏`;
              } else {
                replyText = `${PREFIX}Canlı destek hizmeti için lütfen derneğimizle iletişime geçiniz.\n\n📍 *adres* yazarak iletişim bilgilerimizi görüntüleyebilirsiniz.`;
              }
              await sock.sendMessage(from, { text: replyText });
              continue;
            }

            // ── DOSYA/BELGE HAVUZU ARAMA ──
            let docFound = false;
            try {
              const docWords = query.split(/\s+/).filter(w => w.length > 2);
              if (docWords.length > 0) {
                const doc = await prisma.sTKBotDocument.findFirst({
                  where: {
                    stkId,
                    OR: docWords.flatMap(w => [
                      { title: { contains: w, mode: "insensitive" } },
                      { description: { contains: w, mode: "insensitive" } },
                    ]),
                  },
                  select: { title: true, description: true, fileUrl: true, fileName: true },
                });
                if (doc) {
                  docFound = true;
                  try {
                    const fullUrl = resolveFullUrl(doc.fileUrl);
                    await sock.sendMessage(from, {
                      document: { url: fullUrl },
                      fileName: doc.fileName,
                      mimetype: "application/octet-stream",
                      caption: `*${doc.title}*\n\n${doc.description}`,
                    });
                    try { await prisma.sTKBotLog.create({ data: { stkId, action: "DOCUMENT_SENT", details: `Dosya gönderildi: ${doc.title} (${rawPhone})` } }); } catch {}
                  } catch (docErr) {
                    console.error(`[BOT] Dosya gönderim hatası:`, docErr.message);
                    await sock.sendMessage(from, { text: `${PREFIX}📁 *${doc.title}*\n\n${doc.description}\n\n⚠️ Dosya gönderiminde sorun oluştu. Lütfen tekrar deneyin.` });
                  }
                  continue;
                }
              }
            } catch {}

            // Önce SSS (Sıkça Sorulan Sorular) tablosunda ara
            let faqFound = false;
            try {
              const words = query.split(/\s+/).filter(w => w.length > 3);
              if (words.length > 0) {
                const faq = await prisma.sTKFAQ.findFirst({
                  where: {
                    stkId,
                    OR: words.map(w => ({ question: { contains: w, mode: "insensitive" } })),
                  },
                  select: { question: true, answer: true },
                });
                if (faq) {
                  faqFound = true;
                  replyText = `${PREFIX}📚 *SSS Asistanı*\n\nSorduğunuz soruya en yakın cevabımız:\n\n*Soru:* ${faq.question}\n*Cevap:* ${faq.answer}\n\nBaşka bir işlem için *yardım* yazınız.`;
                  try { await prisma.sTKBotLog.create({ data: { stkId, action: "FAQ_ANSWERED", details: `Soru: ${faq.question.substring(0, 80)} → Yanıtlandı (${rawPhone})` } }); } catch {}
                }
              }
            } catch {}

            if (!faqFound) {
              // Özel otomatik yanıt metni varsa onu kullan
              if (org?.waBotAutoReply) {
                replyText = `${PREFIX}${org.waBotAutoReply}`;
              } else {
                const greeting = member
                  ? `Sayın *${member.name} ${member.surname}*,`
                  : `Değerli ziyaretçimiz,`;

                replyText = `${PREFIX}${greeting}\n\n` +
                  `Mesajınız için teşekkür ederiz! 🙏\n\n` +
                  `Aşağıdaki komutlardan birini yazarak size yardımcı olabilirim:\n\n` +
                  `📋 *aidat* — Aidat bilgileriniz\n` +
                  `📍 *adres* — İletişim bilgileri\n` +
                  `👤 *durum* — Üyelik durumunuz\n` +
                  `📅 *faaliyetler* — Son etkinlikler\n` +
                  `📊 *rapor* — Yönetici özeti\n` +
                  `❓ *yardım* — Tüm komutlar`;
              }
            }
          }

          // ─── MESAJI GÖNDER ───
          if (replyText) {
            await sock.sendMessage(from, { text: replyText });
            console.log(`[BOT] ✉️ ${stkName} → ${rawPhone}: Yanıt gönderildi (${query.substring(0, 20)}...)`);
          }

        } catch (e) {
          console.error(`[BOT] ${stkName} mesaj işleme hatası:`, e.message);
          // Hata durumunda bile kullanıcıya bir şey dön
          try {
            await sock.sendMessage(from, {
              text: `*${stkName} Sanal Asistanı:*\n\nŞu an bir teknik aksaklık yaşanmaktadır. Lütfen daha sonra tekrar deneyin veya derneğimize doğrudan ulaşın. 🙏`
            });
          } catch {}
        }
      }
    });

  } catch (err) {
    console.error(`[BOT] ${stkName} başlatma hatası:`, err.message);
    activeBots.delete(stkId);
    await prisma.sTKOrganization.update({
      where: { id: stkId },
      data: { waBotStatus: "DISCONNECTED" },
    }).catch(() => {});
  }
}

// ═══════════════════════════════════════════════════════════
// SESSION TEMİZLE
// ═══════════════════════════════════════════════════════════
function clearSessionDir(dir) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log("[BOT] 🗑️ Session temizlendi:", dir);
    }
  } catch (e) {
    console.error("[BOT] Session temizleme hatası:", e.message);
  }
}

// ═══════════════════════════════════════════════════════════
// TARAYICI: Yeni bot'ları keşfet ve başlat
// ═══════════════════════════════════════════════════════════
async function scanAndStartBots() {
  try {
    const stks = await prisma.sTKOrganization.findMany({
      where: {
        hasCustomWaBot: true,
        waBotStatus: { in: ["PENDING_QR", "CONNECTED", "DISCONNECTED"] },
      },
      select: { id: true, name: true, waBotStatus: true },
    });

    for (const stk of stks) {
      if (!activeBots.has(stk.id)) {
        // Yeni veya düşmüş bot — başlat
        console.log(`[BOT] 🔍 Keşfedildi: ${stk.name} (${stk.waBotStatus})`);
        startBotForSTK(stk);
      }
    }
  } catch (e) {
    console.error("[BOT] Tarama hatası:", e.message);
  }
}

// ═══════════════════════════════════════════════════════════
// CRON: AİDAT HATIRLATICI (Her sabah 09:00 Türkiye saati)
// ═══════════════════════════════════════════════════════════
async function runDuesReminder() {
  console.log("[CRON] 🔔 Aidat hatırlatıcı çalışıyor...");

  try {
    const now = new Date();

    // 7 gün ve 3 gün sonrası hesapla
    const in7days = new Date(now.getTime() + 7 * 86400000);
    const in3days = new Date(now.getTime() + 3 * 86400000);
    const in7start = new Date(in7days.toDateString());
    const in7end = new Date(in7start.getTime() + 86400000);
    const in3start = new Date(in3days.toDateString());
    const in3end = new Date(in3start.getTime() + 86400000);

    // 7 gün kalan üyeler
    const members7 = await prisma.member.findMany({
      where: { expiryDate: { gte: in7start, lt: in7end }, status: "ACTIVE" },
      select: { id: true, name: true, surname: true, phone: true, stkId: true },
    });

    // 3 gün kalan üyeler
    const members3 = await prisma.member.findMany({
      where: { expiryDate: { gte: in3start, lt: in3end }, status: "ACTIVE" },
      select: { id: true, name: true, surname: true, phone: true, stkId: true },
    });

    const allExpiring = [
      ...members7.map(m => ({ ...m, daysLeft: 7 })),
      ...members3.map(m => ({ ...m, daysLeft: 3 })),
    ];

    if (allExpiring.length === 0) {
      console.log("[CRON] ✅ Süresi dolan üye bulunmadı.");
      return;
    }

    console.log(`[CRON] 📋 ${allExpiring.length} üyenin süresi dolmak üzere.`);

    // STK bazında grupla
    const byStkId = {};
    for (const m of allExpiring) {
      if (!byStkId[m.stkId]) byStkId[m.stkId] = [];
      byStkId[m.stkId].push(m);
    }

    for (const [stkId, stkMembers] of Object.entries(byStkId)) {
      // Bu STK'nın aktif botu var mı?
      const botEntry = activeBots.get(stkId);
      if (!botEntry || botEntry.status !== "connected" || !botEntry.sock) {
        console.log(`[CRON] ⚠️ STK ${stkId} için aktif bot yok, atlanıyor.`);
        continue;
      }

      // STK bilgisini çek
      const org = await prisma.sTKOrganization.findUnique({
        where: { id: stkId },
        select: { name: true, phone: true },
      });

      const orgName = org?.name || "Derneğimiz";
      const PREFIX = `*${orgName} Sanal Asistanı:*\n\n`;
      let sentCount = 0;

      // Üyelere hatırlatma mesajı gönder
      for (const member of stkMembers) {
        if (!member.phone) continue;
        const cleaned = member.phone.replace(/[\s\-\+]/g, "");
        const jid = cleaned + "@s.whatsapp.net";

        try {
          const text = `${PREFIX}Sayın *${member.name} ${member.surname}*,\n\n` +
            `⏰ Üyelik aidatınızın bitmesine *${member.daysLeft} gün* kalmıştır.\n\n` +
            `💳 Lütfen aidatınızı yenilemek için uygulamamız üzerinden ödemenizi gerçekleştiriniz.\n\n` +
            `${member.daysLeft <= 3 ? "🔴 *Son uyarı!* Ödeme yapılmadığında üyelik haklarınız askıya alınabilir." : "💡 Erken yenileme yaparak kesintisiz hizmet alabilirsiniz."}\n\n` +
            `Sorularınız için derneğimize ulaşabilirsiniz. 🙏`;

          await botEntry.sock.sendMessage(jid, { text });
          sentCount++;
          console.log(`[CRON] ✉️ ${orgName} → ${member.name} ${member.surname} (${member.daysLeft} gün kaldı)`);

          // Rate limit: mesajlar arası 2 saniye bekle
          await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
          console.error(`[CRON] ${orgName} → ${member.name} gönderim hatası:`, e.message);
        }
      }

      // STK yöneticisine günlük özet gönder
      if (org?.phone && sentCount > 0) {
        try {
          const managerJid = org.phone.replace(/[\s\-\+]/g, "") + "@s.whatsapp.net";
          const summaryText = `*[SİSTEM BİLDİRİMİ]*\n\n` +
            `📊 *${orgName} — Günlük Aidat Raporu*\n\n` +
            `⏰ Bugün *${stkMembers.length}* üyenizin aidat süresi dolmak üzeredir.\n` +
            `✉️ *${sentCount}* üyeye otomatik hatırlatma gönderildi.\n\n` +
            `📋 Detaylar için STK panelinizi kontrol edin.`;

          await botEntry.sock.sendMessage(managerJid, { text: summaryText });
          console.log(`[CRON] 📊 ${orgName} yöneticisine özet gönderildi.`);
        } catch (e) {
          console.error(`[CRON] ${orgName} yönetici özeti hatası:`, e.message);
        }
      }

      console.log(`[CRON] ✅ ${orgName}: ${sentCount}/${stkMembers.length} hatırlatma gönderildi.`);
    }

    console.log("[CRON] 🔔 Aidat hatırlatıcı tamamlandı.");
  } catch (e) {
    console.error("[CRON] Aidat hatırlatıcı hatası:", e.message);
  }
}

// ═══════════════════════════════════════════════════════════
// ANA DÖNGÜ
// ═══════════════════════════════════════════════════════════
async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  🤖 Kamulog Multi-Tenant WA Bot Motor v2.0");
  console.log("  🔔 Cron: Aidat hatırlatıcı aktif (09:00 TR)");
  console.log("═══════════════════════════════════════════════");

  // İlk tarama
  await scanAndStartBots();

  // 30 saniyede bir yeni STK'ları kontrol et
  setInterval(scanAndStartBots, 30000);

  // CRON: Her sabah 09:00 Türkiye saati (UTC+3 → 06:00 UTC)
  cron.schedule("0 6 * * *", () => {
    console.log("[CRON] ⏰ Sabah 09:00 — Aidat hatırlatıcı tetiklendi.");
    runDuesReminder();
  }, { timezone: "Europe/Istanbul" });

  // Durum raporu — 5 dakikada bir
  setInterval(() => {
    const bots = Array.from(activeBots.entries());
    const connected = bots.filter(([, b]) => b.status === "connected").length;
    const pending = bots.filter(([, b]) => b.status === "pending_qr").length;
    console.log(`[BOT] 📊 Durum: ${bots.length} toplam | ${connected} bağlı | ${pending} QR bekliyor`);
  }, 300000);
}

main().catch(console.error);
