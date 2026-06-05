import { prisma } from "@/lib/prisma";

const GLOBAL_BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:3101";
const STK_BOT_URL = process.env.STK_BOT_URL || "http://localhost:3102";

/**
 * Akıllı WhatsApp Gönderici (Dynamic Router)
 * STK'nın kendi botu bağlıysa → 3102 (Özel Bot)
 * Değilse → 3101 (Global Bot)
 */
export async function sendDynamicWaMessage(
  phone: string,
  message: string,
  stkId?: string | null,
): Promise<{ sent: boolean; via: "stk_bot" | "global_bot"; error?: string }> {
  try {
    // STK ID varsa, kendi botu bağlı mı kontrol et
    if (stkId) {
      const stk = await prisma.sTKOrganization.findUnique({
        where: { id: stkId },
        select: { hasCustomWaBot: true, waBotStatus: true },
      });

      if (stk?.hasCustomWaBot && stk.waBotStatus === "CONNECTED") {
        // STK'nın kendi botu aktif → 3102'ye gönder
        try {
          const res = await fetch(`${STK_BOT_URL}/send-message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stkId, phone, message }),
            signal: AbortSignal.timeout(15000),
          });
          const data = await res.json();
          if (data.success) {
            console.log(`[WA-Router] ✅ STK Bot → ${phone} (stkId: ${stkId})`);
            return { sent: true, via: "stk_bot" };
          }
          // STK botu başarısız olursa global'e düş
          console.warn(`[WA-Router] ⚠️ STK Bot başarısız, Global'e düşülüyor → ${phone}`);
        } catch (e) {
          console.error(`[WA-Router] STK Bot erişim hatası:`, e instanceof Error ? e.message : e);
          // Fallback: Global Bot'a düş
        }
      }
    }

    // Global Bot → 3101
    const res = await fetch(`${GLOBAL_BOT_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    console.log(`[WA-Router] ${data.sent ? "✅" : "⚠️"} Global Bot → ${phone}`);
    return { sent: !!data.sent, via: "global_bot" };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error(`[WA-Router] ❌ Tüm botlar başarısız → ${phone}:`, errMsg);
    return { sent: false, via: "global_bot", error: errMsg };
  }
}

/**
 * Kampanya WhatsApp gönderici (formatlı mesaj)
 */
export async function sendDynamicCampaignWa(
  phone: string,
  title: string,
  content: string,
  stkId?: string | null,
) {
  const message = `📢 *${title}*\n\n${content}\n\n_Kamulog STK Bildirim Sistemi_`;
  return sendDynamicWaMessage(phone, message, stkId);
}
