const dns = require("dns");
const https = require("https");
const http = require("http");
dns.setDefaultResultOrder("ipv4first");
https.globalAgent = new https.Agent({ keepAlive: true, family: 4 });
http.globalAgent = new http.Agent({ keepAlive: true, family: 4 });

const admin = require("firebase-admin");
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let pk = process.env.FIREBASE_PRIVATE_KEY || "";
if (pk.startsWith('"') && pk.endsWith('"')) pk = pk.slice(1, -1);
if (!pk.includes('\n')) pk = pk.replace(/\\n/g, '\n');

console.log("Project:", projectId);
console.log("Email:", clientEmail ? "OK" : "MISSING");
console.log("Key:", pk ? "OK (" + pk.length + " chars)" : "MISSING");

const app = admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey: pk }),
  httpAgent: new https.Agent({ keepAlive: true, family: 4 }),
});

const messaging = admin.messaging(app);
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const user = await prisma.user.findFirst({
    where: { fcmToken: { not: null } },
    select: { id: true, fcmToken: true, name: true },
  });
  if (!user || !user.fcmToken) { console.log("Token yok!"); process.exit(1); }
  console.log("User:", user.name, "token:", user.fcmToken.substring(0, 40) + "...");

  try {
    const result = await messaging.send({
      token: user.fcmToken,
      notification: { title: "FCM Direct Test", body: "Sunucudan dogrudan gonderildi" },
      android: { priority: "high" },
      data: { click_action: "FLUTTER_NOTIFICATION_CLICK" },
    });
    console.log("SUCCESS messageId:", result);
  } catch (err) {
    console.error("ERROR:", err.code, err.message);
    if (err.errorInfo) console.error("errorInfo:", JSON.stringify(err.errorInfo));
  }
  await prisma.$disconnect();
  process.exit(0);
})();
