/**
 * Admin Bildirim Servisi — Sessiz Tetikleyici (v2)
 * 
 * API response yapısını ASLA bozmaz.
 * Her zaman .catch(() => {}) ile çağrılır (non-blocking).
 */

import { prisma } from "@/lib/prisma";

type AdminNotifType =
  | "SUBSCRIPTION_CAREER"
  | "SUBSCRIPTION_BECAYIS"
  | "PURCHASE_TOKEN"
  | "AD_NEW_BECAYIS"
  | "REQUEST_BECAYIS"
  | "AI_CV_CREATED"
  | "CV_UPLOADED"
  | "REPORT_COMPLAINT"
  | "CONSULTANT_MEETING"
  | "ACCOUNT_DELETE_REQUEST"
  | "ACCOUNT_FREEZE_REQUEST"
  | "STK_APPLICATION"
  | "STK_PAYMENT_REPORT"
  | "STK_PAYMENT_APPROVED"
  | "NEW_FORUM_TOPIC"
  | "FORUM_REPORT"
  | "USER_BAN"
  | "SYSTEM";

interface AdminNotifPayload {
  type: AdminNotifType;
  title: string;
  message: string;
  userId?: string;
  senderName?: string;
  relatedId?: string;
  details?: string;
  metadata?: Record<string, any>;
}

/**
 * Admin bildirim tablosuna sessizce kayıt atar.
 * Asla hata fırlatmaz, asla API response'u bozmaz.
 */
export async function createAdminNotification(payload: AdminNotifPayload): Promise<void> {
  try {
    await prisma.adminNotification.create({
      data: {
        type: payload.type,
        title: payload.title,
        message: payload.message,
        userId: payload.userId || null,
        senderName: payload.senderName || null,
        relatedId: payload.relatedId || null,
        details: payload.details || null,
        metadata: (payload.metadata as any) || undefined,
      },
    });
  } catch (e) {
    console.error("[AdminNotif] Bildirim kayıt hatası:", e);
  }
}
