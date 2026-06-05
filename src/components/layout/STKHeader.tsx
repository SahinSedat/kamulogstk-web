"use client";

import { useSession } from "next-auth/react";
import { Bell, Search, Sparkles, Check, ExternalLink, Crown } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface Notif { id: string; type: string; title: string; message: string; date: string; icon: string; }

export default function STKHeader() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "STK Yöneticisi";
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [planName, setPlanName] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    try { const r = await fetch("/api/stk-panel/notifications"); const j = await r.json(); if (j.success) setNotifs(j.data || []); } catch {}
  }, []);

  useEffect(() => { fetchNotifs(); const iv = setInterval(fetchNotifs, 60000); return () => clearInterval(iv); }, [fetchNotifs]);
  useEffect(() => { try { const s = localStorage.getItem("stk_read_notifs"); if (s) setReadIds(new Set(JSON.parse(s))); } catch {} }, []);
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  useEffect(() => {
    fetch("/api/stk-panel/market").then(r => r.json()).then(d => {
      if (d.success && d.requests) {
        const approved = d.requests.find((r: any) => r.status === "APPROVED" && r.package?.name);
        if (approved) setPlanName(approved.package.name);
      }
    }).catch(() => {});
  }, []);

  const unreadCount = notifs.filter(n => !readIds.has(n.id)).length;
  const markRead = (id: string) => { const next = new Set(readIds); next.add(id); setReadIds(next); localStorage.setItem("stk_read_notifs", JSON.stringify([...next])); };
  const markAllRead = () => { const next = new Set(notifs.map(n => n.id)); setReadIds(next); localStorage.setItem("stk_read_notifs", JSON.stringify([...next])); };
  const timeAgo = (d: string) => { const diff = Date.now() - new Date(d).getTime(); const m = Math.floor(diff/60000); if (m < 60) return `${m} dk önce`; const h = Math.floor(m/60); if (h < 24) return `${h} saat önce`; return `${Math.floor(h/24)} gün önce`; };

  return (
    <header className="sticky top-0 z-30 h-[72px] flex items-center justify-between px-8" style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderBottom: "1px solid rgba(139,92,246,0.06)", boxShadow: "0 1px 16px rgba(99,102,241,0.03)" }}>
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl transition-all duration-300" style={{ background: "rgba(248,250,252,0.8)", border: "1px solid rgba(139,92,246,0.08)" }}>
          <Search className="w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Ara..." className="w-full text-sm bg-transparent outline-none border-none" style={{ color: "#334155", padding: 0, boxShadow: "none" }} />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/stk-panel/market" className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 hover:shadow-md" style={{
          background: planName
            ? "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.06))"
            : "rgba(248,250,252,0.8)",
          border: planName ? "1px solid rgba(139,92,246,0.12)" : "1px solid rgba(148,163,184,0.15)",
        }}>
          {planName ? (
            <><Sparkles className="w-3.5 h-3.5" style={{ color: "#6366F1" }} />
            <span className="text-[11px] font-semibold" style={{ color: "#6366F1" }}>{planName}</span></>
          ) : (
            <><Crown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-medium text-slate-400">Standart</span></>
          )}
        </Link>

        {/* Notification Bell + Dropdown */}
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(!open)} className="relative p-2.5 rounded-xl transition-all duration-300 hover:bg-indigo-50" style={{ color: open ? "#6366F1" : "#94A3B8" }}>
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1" style={{ background: "linear-gradient(135deg, #EF4444, #F97316)", boxShadow: "0 2px 8px rgba(239,68,68,0.4)" }}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50" style={{ animation: "scaleIn .2s ease-out" }}>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div><h3 className="text-sm font-bold text-gray-900">🔔 Bildirimler</h3><p className="text-[11px] text-gray-400">{unreadCount} okunmamış</p></div>
                <div className="flex gap-2">
                  {unreadCount > 0 && <button onClick={markAllRead} className="text-[11px] text-indigo-600 font-medium flex items-center gap-1 hover:underline"><Check className="w-3 h-3"/>Tümünü Oku</button>}
                  <Link href="/stk-panel/bildirimler" onClick={() => setOpen(false)} className="text-[11px] text-gray-500 font-medium flex items-center gap-1 hover:text-indigo-600"><ExternalLink className="w-3 h-3"/>Tümü</Link>
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifs.length === 0 ? <div className="py-12 text-center"><p className="text-3xl mb-2">🔕</p><p className="text-xs text-gray-400">Bildirim yok</p></div> :
                notifs.slice(0, 15).map(n => {
                  const isRead = readIds.has(n.id);
                  return (
                    <div key={n.id} onClick={() => markRead(n.id)} className={`px-5 py-3.5 flex items-start gap-3 cursor-pointer transition-colors ${isRead ? "bg-white hover:bg-gray-50" : "bg-indigo-50/40 hover:bg-indigo-50/60"}`}>
                      <div className="text-xl mt-0.5">{n.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><p className={`text-xs font-semibold ${isRead ? "text-gray-700" : "text-gray-900"}`}>{n.title}</p><span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-indigo-100 text-indigo-700">{n.type === "NEW_MEMBER" ? "Yeni Üye" : n.type === "PAYMENT" ? "Ödeme" : n.type === "RESIGNATION" ? "İstifa" : n.type === "ASSEMBLY" ? "Genel Kurul" : "Karar"}</span></div>
                        <p className={`text-[11px] mt-0.5 truncate ${isRead ? "text-gray-400" : "text-gray-600"}`}>{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.date)}</p>
                      </div>
                      {!isRead && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0"/>}
                    </div>
                  );
                })}
              </div>
              {notifs.length > 15 && <div className="px-5 py-3 border-t border-gray-100 text-center"><Link href="/stk-panel/bildirimler" onClick={() => setOpen(false)} className="text-xs text-indigo-600 font-medium hover:underline">Tüm bildirimleri gör →</Link></div>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-4" style={{ borderLeft: "1px solid rgba(139,92,246,0.08)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 4px 12px rgba(99,102,241,0.25)" }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold" style={{ color: "#1E293B" }}>{userName}</p>
            <p className="text-[11px]" style={{ color: "#94A3B8" }}>STK Yöneticisi</p>
          </div>
        </div>
      </div>
      <style jsx>{`@keyframes scaleIn{from{opacity:0;transform:scale(.95) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </header>
  );
}
