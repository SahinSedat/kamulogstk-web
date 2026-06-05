"use client";

import { useState, useEffect } from "react";
import {
  Send,
  Loader2,
  Users,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Rocket,
  CreditCard,
  Info,
} from "lucide-react";

export default function SmsClient() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipientLoading, setRecipientLoading] = useState(true);
  const [phones, setPhones] = useState<string[]>([]);
  const [validCount, setValidCount] = useState(0);
  const [credit, setCredit] = useState<string | number>("Yükleniyor...");
  const [toast, setToast] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  const MAX_CHARS = 918; // 6 SMS x 153 karakter (uzun SMS)
  const SMS_LENGTH = 160;
  const CONCAT_LENGTH = 153; // Birleştirilmiş SMS parça uzunluğu

  // SMS sayısını hesapla
  const smsCount =
    message.length <= SMS_LENGTH
      ? message.length > 0
        ? 1
        : 0
      : Math.ceil(message.length / CONCAT_LENGTH);

  // Otomatik toast kapanması
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sayfa yüklendiğinde recipients API'sine istek at
  useEffect(() => {
    async function fetchRecipients() {
      try {
        const res = await fetch("/api/admin/sms/recipients");
        const data = await res.json();
        if (data.success) {
          setPhones(data.phones);
          setValidCount(data.validCount);
        } else {
          setToast({
            type: "error",
            text: data.error || "Alıcı listesi alınamadı.",
          });
        }
      } catch {
        setToast({ type: "error", text: "Sunucuya bağlanılamadı." });
      } finally {
        setRecipientLoading(false);
      }
    }

    async function fetchCredit() {
      try {
        const res = await fetch("/api/sms-bilgi");
        const data = await res.json();
        if (data?.credit !== undefined) {
          setCredit(data.credit);
        } else if (data?.data?.credit !== undefined) {
          setCredit(data.data.credit);
        } else {
          setCredit("Bilinmiyor");
        }
      } catch {
        setCredit("Hata");
      }
    }

    fetchRecipients();
    fetchCredit();
  }, []);

  const handleSend = async () => {
    if (!message.trim()) {
      setToast({ type: "warning", text: "Lütfen gönderilecek mesajı yazın." });
      return;
    }
    if (phones.length === 0) {
      setToast({
        type: "error",
        text: "Gönderilebilecek telefon numarası bulunamadı.",
      });
      return;
    }

    setLoading(true);
    setToast(null);

    try {
      const res = await fetch("/api/admin/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          phones: phones,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setToast({
          type: "success",
          text: `🎉 SMS'ler başarıyla gönderildi/kuyruğa alındı! (${phones.length} alıcı)`,
        });
        setMessage("");
      } else {
        setToast({
          type: "error",
          text: data.error || "SMS gönderimi sırasında bir hata oluştu.",
        });
      }
    } catch {
      setToast({
        type: "error",
        text: "Ağ hatası veya sunucuya ulaşılamıyor.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Mesajı */}
      {toast && (
        <div
          className="animate-slide-in"
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 9999,
            maxWidth: 440,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "16px 20px",
            borderRadius: 16,
            border: `1px solid ${
              toast.type === "success"
                ? "rgba(34, 197, 94, 0.3)"
                : toast.type === "warning"
                ? "rgba(250, 204, 21, 0.3)"
                : "rgba(239, 68, 68, 0.3)"
            }`,
            background:
              toast.type === "success"
                ? "linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(16, 185, 129, 0.08))"
                : toast.type === "warning"
                ? "linear-gradient(135deg, rgba(250, 204, 21, 0.12), rgba(245, 158, 11, 0.08))"
                : "linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.08))",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            color: "var(--text)",
          }}
        >
          {toast.type === "success" ? (
            <CheckCircle2
              className="w-5 h-5 shrink-0 mt-0.5"
              style={{ color: "#22c55e" }}
            />
          ) : toast.type === "warning" ? (
            <AlertTriangle
              className="w-5 h-5 shrink-0 mt-0.5"
              style={{ color: "#facc15" }}
            />
          ) : (
            <XCircle
              className="w-5 h-5 shrink-0 mt-0.5"
              style={{ color: "#ef4444" }}
            />
          )}
          <span className="text-sm font-medium">{toast.text}</span>
        </div>
      )}

      {/* Üst Bilgi Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kullanıcı Sayısı Kartı */}
        <div
          className="stat-card"
          style={{
            background:
              "linear-gradient(135deg, var(--bg-card), var(--bg-card))",
            borderColor: "rgba(66, 153, 225, 0.2)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                background: "linear-gradient(135deg, #4299E1, #3182CE)",
                boxShadow: "0 4px 14px rgba(66, 153, 225, 0.3)",
              }}
            >
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                SMS Alıcıları
              </p>
              {recipientLoading ? (
                <div className="flex items-center gap-2 mt-1">
                  <Loader2
                    className="w-4 h-4 animate-spin"
                    style={{ color: "var(--primary)" }}
                  />
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Yükleniyor...
                  </span>
                </div>
              ) : (
                <p
                  className="text-2xl font-bold mt-0.5"
                  style={{ color: "var(--text)" }}
                >
                  {validCount.toLocaleString("tr-TR")}
                  <span
                    className="text-sm font-normal ml-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    kullanıcı
                  </span>
                </p>
              )}
            </div>
          </div>
          {!recipientLoading && validCount > 0 && (
            <div
              className="mt-3 flex items-start gap-2 p-3 rounded-xl"
              style={{
                background: "rgba(66, 153, 225, 0.06)",
                border: "1px solid rgba(66, 153, 225, 0.1)",
              }}
            >
              <Info
                className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: "#4299E1" }}
              />
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Sistemdeki <strong>{validCount.toLocaleString("tr-TR")}</strong>{" "}
                kullanıcının telefon numarası SMS gönderimi için hazırdır.
              </p>
            </div>
          )}
        </div>

        {/* Kredi Bilgisi Kartı */}
        <div
          className="stat-card"
          style={{
            background:
              "linear-gradient(135deg, var(--bg-card), var(--bg-card))",
            borderColor: "rgba(16, 185, 129, 0.2)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                background: "linear-gradient(135deg, #10B981, #059669)",
                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
              }}
            >
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                VatanSMS Bakiye
              </p>
              <p
                className="text-2xl font-bold mt-0.5"
                style={{ color: "var(--text)" }}
              >
                {typeof credit === "number"
                  ? credit.toLocaleString("tr-TR")
                  : credit}
                <span
                  className="text-sm font-normal ml-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  kredi
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mesaj Yazma Kartı */}
      <div
        className="card"
        style={{
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Kart Başlık */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              padding: 10,
              borderRadius: 12,
              background:
                "linear-gradient(135deg, var(--primary), var(--primary-light))",
              boxShadow: "0 4px 14px rgba(66, 153, 225, 0.25)",
            }}
          >
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2
              className="font-semibold text-base"
              style={{ color: "var(--text)" }}
            >
              Mesaj İçeriği
            </h2>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Tüm alıcılara gönderilecek mesajı aşağıya yazın
            </p>
          </div>
        </div>

        {/* Mesaj Alanı */}
        <div style={{ padding: 24 }}>
          <div style={{ position: "relative" }}>
            <textarea
              rows={7}
              className="w-full resize-none"
              placeholder="Sayın üyemiz, Kamulog sisteminde yeni bir güncelleme mevcuttur..."
              value={message}
              maxLength={MAX_CHARS}
              onChange={(e) => setMessage(e.target.value)}
              style={{
                padding: 16,
                borderRadius: 14,
                fontSize: 14,
                lineHeight: 1.7,
                background: "var(--bg-muted)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                transition: "all 0.2s",
              }}
            />
          </div>

          {/* Karakter / SMS Sayacı */}
          <div
            className="flex items-center justify-between mt-3"
            style={{ padding: "0 4px" }}
          >
            <div className="flex items-center gap-4">
              <span
                className="text-xs font-medium"
                style={{
                  color:
                    message.length > MAX_CHARS * 0.9
                      ? "#ef4444"
                      : "var(--text-muted)",
                }}
              >
                {message.length} / {MAX_CHARS} karakter
              </span>
              <div
                style={{
                  width: 1,
                  height: 14,
                  background: "var(--border)",
                }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                {smsCount} SMS
              </span>
            </div>

            {/* Karakter progress bar */}
            <div
              style={{
                width: 120,
                height: 4,
                borderRadius: 2,
                background: "var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min((message.length / MAX_CHARS) * 100, 100)}%`,
                  height: "100%",
                  borderRadius: 2,
                  background:
                    message.length > MAX_CHARS * 0.9
                      ? "linear-gradient(90deg, #ef4444, #dc2626)"
                      : message.length > MAX_CHARS * 0.7
                      ? "linear-gradient(90deg, #f59e0b, #d97706)"
                      : "linear-gradient(90deg, var(--primary), var(--primary-light))",
                  transition: "all 0.3s ease",
                }}
              />
            </div>
          </div>
        </div>

        {/* Alt Bölüm - Gönder Butonu */}
        <div
          style={{
            padding: "16px 24px 24px",
          }}
        >
          <button
            onClick={handleSend}
            disabled={loading || !message.trim() || phones.length === 0}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "16px 24px",
              borderRadius: 16,
              border: "none",
              cursor:
                loading || !message.trim() || phones.length === 0
                  ? "not-allowed"
                  : "pointer",
              opacity:
                loading || !message.trim() || phones.length === 0 ? 0.5 : 1,
              fontSize: 16,
              fontWeight: 700,
              color: "#ffffff",
              background:
                "linear-gradient(135deg, var(--primary), var(--primary-light))",
              boxShadow: "0 6px 20px rgba(66, 153, 225, 0.35)",
              transition: "all 0.3s ease",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={(e) => {
              if (!loading && message.trim() && phones.length > 0) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 8px 28px rgba(66, 153, 225, 0.45)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(66, 153, 225, 0.35)";
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Gönderiliyor...</span>
              </>
            ) : (
              <>
                <Rocket className="w-6 h-6" />
                <span>
                  🚀 Tümüne SMS Gönder
                  {validCount > 0 && ` (${validCount.toLocaleString("tr-TR")} Kişi)`}
                </span>
              </>
            )}
          </button>

          {/* Uyarı Notu */}
          <div
            className="flex items-start gap-2 mt-4"
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "rgba(250, 204, 21, 0.06)",
              border: "1px solid rgba(250, 204, 21, 0.15)",
            }}
          >
            <AlertTriangle
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: "#facc15" }}
            />
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Bu işlem geri alınamaz. SMS, telefon numarası kayıtlı tüm
              kullanıcılara gönderilecektir. Lütfen mesaj içeriğini
              göndermeden önce dikkatlice kontrol edin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
