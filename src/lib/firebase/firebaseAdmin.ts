import * as admin from "firebase-admin";
import dns from "dns";
import https from "https";
import http from "http";

// ═══════════════════════════════════════════════════════════
// IPv4 ZORLAMA — VPS'te IPv6 devre dışı.
// Firebase SDK'nın kullandığı google-auth-library → gaxios
// Node.js http/https modülünü kullanıyor.
// globalAgent'ı IPv4-only agent ile değiştiriyoruz.
// ═══════════════════════════════════════════════════════════
dns.setDefaultResultOrder("ipv4first");
https.globalAgent = new https.Agent({ keepAlive: true, family: 4 });
http.globalAgent = new http.Agent({ keepAlive: true, family: 4 });

console.log("[NET] ✅ Tüm HTTP/HTTPS bağlantıları IPv4-only zorlandı.");

// IPv4-only HTTPS Agent (ek güvenlik)
const ipv4Agent = new https.Agent({ keepAlive: true, family: 4 });

/**
 * Firebase Admin SDK Singleton
 * Çevre değişkenlerinden (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) ayarlanır.
 * Birden fazla başlatmayı önler.
 *
 * ÖNEMLİ: Credential yoksa null döner — böylece firebaseMessaging null olur
 * ve push gönderme kodları güvenle "if (!firebaseMessaging)" ile kontrol edilebilir.
 */
function getFirebaseAdmin(): admin.app.App | null {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawKey = process.env.FIREBASE_PRIVATE_KEY;

    // Debug: Credential'ların varlığını logla (key'in kendisini değil!)
    console.log("[Firebase Admin] projectId:", projectId ? "✅" : "❌ YOK");
    console.log("[Firebase Admin] clientEmail:", clientEmail ? "✅" : "❌ YOK");
    console.log("[Firebase Admin] privateKey:", rawKey ? `✅ (${rawKey.length} karakter)` : "❌ YOK");

    if (!projectId || !clientEmail || !rawKey) {
        console.error("[Firebase Admin] ❌ Eksik çevre değişkenleri — push bildirimleri DEVRE DIŞI.");
        return null;
    }

    // Private key'deki \n karakterlerini düzelt
    let privateKey = rawKey;
    
    // Çevresindeki tırnak işaretlerini temizle
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
    }
    
    // Eğer gerçek newline yoksa, literal \n'leri gerçek newline'a çevir
    if (!privateKey.includes('\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    // Key format doğrulaması
    if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
        console.error("[Firebase Admin] ❌ Private key formatı geçersiz — BEGIN PRIVATE KEY başlığı bulunamadı.");
        return null;
    }

    console.log("[Firebase Admin] ✅ Credential'lar hazır, başlatılıyor...");

    try {
        const app = admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
            httpAgent: ipv4Agent,
        });
        console.log("[Firebase Admin] ✅ Firebase Admin başarıyla başlatıldı (IPv4-only).");
        return app;
    } catch (error) {
        console.error("[Firebase Admin] ❌ Firebase Admin başlatma hatası:", error);
        return null;
    }
}

const firebaseApp = getFirebaseAdmin();

export const firebaseAdmin = admin;
export const firebaseMessaging = firebaseApp ? admin.messaging(firebaseApp) : null;
export default firebaseApp;
