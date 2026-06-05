/**
 * Kamulog WhatsApp Bot — Standalone Server (v5 — Baileys v6 + Latest WA Version)
 * AUTO-STARTS on PM2 boot, generates QR immediately
 * Uses fetchLatestBaileysVersion() to fix 405 protocol mismatch
 * Stays connected 24/7 after QR scan
 * HTTP API on port 3101
 */

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");
const QRCode = require("qrcode");
const http = require("http");
const fs = require("fs");
const path = require("path");
const pino = require("pino");

const PORT = 3101;
const SESSION_DIR = path.join(__dirname, "../.whatsapp-session");

// Silent logger — prevents noisy Baileys output
const logger = pino({ level: "silent" });

let sock = null;
let qrDataUrl = null;
let connectionStatus = "disconnected";
let connectedNumber = null;
let lastError = null;
let retryCount = 0;
const MAX_RETRIES = 15;

// ─── Bot Lifecycle ──────────────────────────────────────

async function connectToWhatsApp() {
    connectionStatus = "connecting";
    qrDataUrl = null;
    lastError = null;

    console.log("[WA] Starting WhatsApp connection (attempt " + (retryCount + 1) + ")...");

    try {
        // Fetch latest WA Web version to avoid 405 protocol mismatch
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log("[WA] Using WA Web v" + version.join(".") + " (latest: " + isLatest + ")");

        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

        sock = makeWASocket({
            version: version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            logger: logger,
            browser: ["Kamulog", "Chrome", "22.04.01"],
            generateHighQualityLinkPreview: false,
            syncFullHistory: false,
            markOnlineOnConnect: true,
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async function (update) {
            const { connection, lastDisconnect, qr } = update;

            // ── QR Generated ──
            if (qr) {
                try {
                    qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
                    connectionStatus = "waiting_qr";
                    retryCount = 0; // QR means connection is working
                    console.log("[WA] ✨ QR code ready — scan it from admin panel!");
                } catch (e) {
                    console.error("[WA] QR generation error:", e.message);
                }
            }

            // ── Connected ──
            if (connection === "open") {
                qrDataUrl = null;
                connectionStatus = "connected";
                lastError = null;
                retryCount = 0;
                connectedNumber = sock?.user?.id?.split(":")[0] || null;
                console.log("[WA] ✅ Connected! Number: " + connectedNumber);
            }

            // ── Disconnected ──
            if (connection === "close") {
                qrDataUrl = null;
                const statusCode = (lastDisconnect?.error)?.output?.statusCode;
                const reason = lastDisconnect?.error?.message || "unknown";

                console.log("[WA] Disconnected. Code: " + statusCode + ", Reason: " + reason);

                if (statusCode === DisconnectReason.loggedOut) {
                    console.log("[WA] Logged out — clearing session for new QR...");
                    connectionStatus = "disconnected";
                    connectedNumber = null;
                    sock = null;
                    clearSession();
                    retryCount = 0;
                    setTimeout(connectToWhatsApp, 2000);

                } else if (statusCode === DisconnectReason.restartRequired) {
                    console.log("[WA] Restart required — reconnecting...");
                    retryCount = 0;
                    connectToWhatsApp();

                } else if (statusCode === 408 || statusCode === DisconnectReason.timedOut) {
                    // QR timeout — normal behavior, just regenerate
                    console.log("[WA] QR timeout — generating new QR...");
                    connectionStatus = "disconnected";
                    setTimeout(connectToWhatsApp, 1500);

                } else {
                    retryCount++;
                    if (retryCount >= MAX_RETRIES) {
                        lastError = "Maksimum deneme aşıldı (" + MAX_RETRIES + "). Yeniden başlatmak için 'Yeniden Başlat' butonunu kullanın.";
                        connectionStatus = "disconnected";
                        console.log("[WA] Max retries reached. Waiting for manual restart.");
                    } else {
                        // Exponential backoff: 3s, 6s, 12s, 24s... max 60s
                        const delay = Math.min(3000 * Math.pow(2, retryCount - 1), 60000);
                        lastError = "Bağlantı hatası (" + statusCode + "): " + reason + " — " + Math.round(delay / 1000) + "s sonra tekrar denenecek...";
                        connectionStatus = "disconnected";
                        console.log("[WA] Retry #" + retryCount + " in " + delay + "ms...");
                        setTimeout(connectToWhatsApp, delay);
                    }
                }
            }
        });

    } catch (err) {
        console.error("[WA] Init error:", err.message);
        lastError = "Başlatma hatası: " + err.message;
        connectionStatus = "disconnected";
        retryCount++;
        const delay = Math.min(5000 * retryCount, 60000);
        console.log("[WA] Retrying in " + delay + "ms...");
        setTimeout(connectToWhatsApp, delay);
    }
}

function clearSession() {
    try {
        if (fs.existsSync(SESSION_DIR)) {
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
            console.log("[WA] Session cleared.");
        }
    } catch (e) {
        console.error("[WA] Failed to clear session:", e.message);
    }
}

async function sendMessage(phone, text) {
    if (!sock || connectionStatus !== "connected") return false;
    try {
        const cleaned = phone.replace(/[\s\-\+]/g, "");
        const jid = cleaned + "@s.whatsapp.net";
        await sock.sendMessage(jid, { text: text });
        console.log("[WA] ✉ Message sent → " + cleaned);
        return true;
    } catch (e) {
        console.error("[WA] Send error:", e.message);
        return false;
    }
}

// ─── HTTP API ───────────────────────────────────────────

function parseBody(req) {
    return new Promise(function (resolve, reject) {
        let body = "";
        req.on("data", function (c) { body += c; });
        req.on("end", function () {
            try { resolve(body ? JSON.parse(body) : {}); }
            catch (e) { reject(e); }
        });
        req.on("error", reject);
    });
}

function json(res, data, code) {
    res.writeHead(code || 200);
    res.end(JSON.stringify(data));
}

const server = http.createServer(async function (req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "application/json");

    if (req.method === "OPTIONS") { res.writeHead(200); return res.end(); }

    try {
        if (req.method === "GET" && req.url === "/status") {
            return json(res, {
                status: connectionStatus,
                qrDataUrl: qrDataUrl,
                connectedNumber: connectedNumber,
                lastError: lastError,
                uptime: Math.floor(process.uptime()),
                retryCount: retryCount,
            });
        }

        if (req.method === "POST" && req.url === "/send") {
            var body = await parseBody(req);
            if (!body.phone || !body.message) return json(res, { error: "phone and message required" }, 400);
            var sent = await sendMessage(body.phone, body.message);
            return json(res, { sent: sent });
        }

        if (req.method === "POST" && req.url === "/restart") {
            console.log("[WA] Manual restart requested.");
            if (sock) { try { sock.end(undefined); } catch (e) { } sock = null; }
            connectionStatus = "disconnected";
            qrDataUrl = null;
            retryCount = 0;
            clearSession();
            setTimeout(connectToWhatsApp, 500);
            return json(res, { ok: true, msg: "Restarting with new QR..." });
        }

        json(res, { error: "Not found" }, 404);
    } catch (e) {
        json(res, { error: e.message }, 500);
    }
});

// ─── Start ──────────────────────────────────────────────

server.listen(PORT, function () {
    console.log("[WA] ✅ Bot server v5 listening on port " + PORT);
    // AUTO-START: immediately connect and generate QR
    connectToWhatsApp();
});
