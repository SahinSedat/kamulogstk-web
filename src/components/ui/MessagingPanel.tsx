"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Send, Search, Loader2, Check, CheckCheck, Paperclip, ChevronLeft } from "lucide-react";
import { sendMessage, markAsRead } from "@/actions/messages";

type Conversation = {
  id: string;
  userId: string;
  consultantId: string;
  category: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  user: { id: string; name: string | null; firstName: string | null; lastName: string | null; email: string };
  consultant: { id: string; name: string; isOnline: boolean };
};

type Message = {
  id: string;
  senderId: string;
  text: string;
  type: string;
  status: string;
  createdAt: string;
  sender: { id: string; name: string | null; firstName: string | null; lastName: string | null; email: string };
};

export default function MessagingPanel({ conversations }: { conversations: Conversation[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find((c) => c.id === selectedId);

  const filteredConversations = conversations.filter((c) => {
    const userName = c.user.name || `${c.user.firstName || ""} ${c.user.lastName || ""}`.trim() || c.user.email;
    return userName.toLowerCase().includes(searchQuery.toLowerCase()) || c.consultant.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  useEffect(() => {
    if (selectedId) {
      setLoadingMessages(true);
      fetch(`/api/conversations/${selectedId}/messages`)
        .then((r) => r.json())
        .then((data) => { setMessages(data); setLoadingMessages(false); })
        .catch(() => setLoadingMessages(false));

      // Okundu işaretle
      startTransition(async () => { await markAsRead(selectedId); });
    }
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedId || !selected) return;
    const text = messageText.trim();
    setMessageText("");

    // Optimistic update
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      senderId: "admin",
      text,
      type: "TEXT",
      status: "SENT",
      createdAt: new Date().toISOString(),
      sender: { id: "admin", name: "Admin", firstName: null, lastName: null, email: "" },
    };
    setMessages((prev) => [...prev, optimistic]);

    startTransition(async () => {
      // Danışman user ID'si üzerinden gönder (veya consultant userId)
      await sendMessage(selectedId, selected.consultant.id, text);
      // Mesajları yeniden yükle
      const data = await fetch(`/api/conversations/${selectedId}/messages`).then((r) => r.json());
      setMessages(data);
    });
  };

  const getUserName = (c: Conversation) =>
    c.user.name || `${c.user.firstName || ""} ${c.user.lastName || ""}`.trim() || c.user.email;

  const formatTime = (date: string) => new Date(date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const formatDate = (date: string) => new Date(date).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });

  return (
    <div className="glass-card overflow-hidden flex" style={{ height: "calc(100vh - 220px)" }}>
      {/* Sol Panel — Konuşma Listesi */}
      <div className={`${selectedId ? "hidden md:flex" : "flex"} flex-col w-full md:w-[340px] border-r border-white/5`}>
        <div className="p-3 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Konuşma ara..."
              className="w-full !pl-10 text-sm !py-2 !rounded-lg"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-white/[0.03] transition-colors border-b border-white/[0.02] text-left ${
                selectedId === c.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-semibold">
                  {getUserName(c)[0]?.toUpperCase() || "?"}
                </div>
                {c.consultant.isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-card" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{getUserName(c)}</p>
                  {c.lastMessageAt && (
                    <span className="text-[10px] text-text-muted flex-shrink-0 ml-2">{formatDate(c.lastMessageAt)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-muted truncate">{c.lastMessage || "Mesaj yok"}</p>
                  {c.unreadCount > 0 && (
                    <span className="ml-2 flex-shrink-0 w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-semibold">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sağ Panel — Mesajlar */}
      <div className={`${!selectedId ? "hidden md:flex" : "flex"} flex-col flex-1`}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-text-muted">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
                <Send className="w-8 h-8 text-primary" />
              </div>
              <p className="text-lg font-medium text-text-secondary">Mesajlar</p>
              <p className="text-sm mt-1">Sol taraftan bir konuşma seçin</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
              <button onClick={() => setSelectedId(null)} className="md:hidden p-1 rounded-lg hover:bg-white/10">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-semibold">
                {getUserName(selected)[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{getUserName(selected)}</p>
                <p className="text-[10px] text-text-muted">Danışman: {selected.consultant.name} · {selected.category}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${selected.consultant.isOnline ? "bg-green-400" : "bg-gray-500"}`} />
                <span className="text-[10px] text-text-muted">{selected.consultant.isOnline ? "Çevrimiçi" : "Çevrimdışı"}</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-text-muted text-sm">
                  Henüz mesaj yok. İlk mesajı gönderin.
                </div>
              ) : (
                messages.map((msg) => {
                  const isSender = msg.senderId !== selected.userId;
                  return (
                    <div key={msg.id} className={`flex ${isSender ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                        isSender
                          ? "bg-primary text-white rounded-br-md"
                          : "bg-white/5 text-text-primary rounded-bl-md"
                      }`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1 ${isSender ? "text-white/60" : "text-text-muted"}`}>
                          <span className="text-[10px]">{formatTime(msg.createdAt)}</span>
                          {isSender && (
                            msg.status === "READ" ? <CheckCheck className="w-3 h-3 text-blue-300" /> : <Check className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <button className="p-2.5 rounded-xl hover:bg-white/5 transition-colors text-text-muted">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Mesajınızı yazın..."
                  className="flex-1 text-sm !py-2.5 !rounded-xl"
                />
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || pending}
                  className="p-2.5 rounded-xl gradient-primary text-white disabled:opacity-50 transition-all"
                >
                  {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
