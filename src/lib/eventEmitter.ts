/**
 * Kamulog In-Process Event Bus
 * SSE (Server-Sent Events) için mesaj yayınlama altyapısı
 *
 * Tek sunucu (PM2 1 instance) olduğu için Node.js EventEmitter yeterli.
 * Birden fazla instance olursa Redis Pub/Sub'a geçilmelidir.
 */

import { EventEmitter } from "events";

// Global event emitter — process seviyesinde singleton
const globalForEvents = globalThis as typeof globalThis & {
    messageEventEmitter?: EventEmitter;
    connectedUsers?: Set<string>;
};

export const messageEventEmitter =
    globalForEvents.messageEventEmitter ?? new EventEmitter();

// Connected users — global singleton
export const connectedUsers: Set<string> =
    globalForEvents.connectedUsers ?? new Set<string>();

// Disconnect timers — 5sn beklemeli offline geçiş
export const disconnectTimers: Map<string, ReturnType<typeof setTimeout>> =
    (globalForEvents as Record<string, unknown>).disconnectTimers as Map<string, ReturnType<typeof setTimeout>> ?? new Map();

// Production'da yeni instance oluşturulmasını engelle
if (process.env.NODE_ENV !== "production") {
    globalForEvents.messageEventEmitter = messageEventEmitter;
    globalForEvents.connectedUsers = connectedUsers;
    (globalForEvents as Record<string, unknown>).disconnectTimers = disconnectTimers;
}

// Max listener limit'ini artır (birçok SSE client bağlanabilir)
messageEventEmitter.setMaxListeners(200);

// ─── Event Tipleri ───────────────────────────────────────

export interface NewMessageEvent {
    type: "new_message";
    conversationId: string;
    messageId: string;
    senderId: string;
    text: string;
    messageType: string;
    timestamp: string;
    // Becayiş mesajları için
    receiverId?: string;
    listingId?: string;
}

export interface MessageStatusEvent {
    type: "message_delivered" | "message_read";
    conversationId?: string;
    messageIds: string[];
    userId: string;
    timestamp: string;
    // Becayiş için
    receiverId?: string;
    listingId?: string;
}

export interface PresenceEvent {
    type: "presence";
    userId: string;
    status: "online" | "offline";
    timestamp: string;
    lastSeen?: string;
}

export interface PresenceListEvent {
    type: "presence_list";
    users: string[];
    timestamp: string;
}

export type MessageEvent = NewMessageEvent | MessageStatusEvent | PresenceEvent | PresenceListEvent;

// ─── Event Yayınlama Fonksiyonları ────────────────────────

/**
 * Yeni mesaj event'i yayınla
 * Belirli kullanıcıya yönelik event: `message:{userId}`
 */
export function emitNewMessage(targetUserId: string, event: NewMessageEvent) {
    messageEventEmitter.emit(`message:${targetUserId}`, event);
}

/**
 * Mesaj durumu güncellemesi yayınla (DELIVERED / READ)
 */
export function emitMessageStatus(
    targetUserId: string,
    event: MessageStatusEvent
) {
    messageEventEmitter.emit(`message:${targetUserId}`, event);
}

/**
 * Presence event'i yayınla — tüm bağlı kullanıcılara
 */
export function emitPresence(event: PresenceEvent) {
    // Broadcast to all connected users
    for (const uid of connectedUsers) {
        messageEventEmitter.emit(`message:${uid}`, event);
    }
}
