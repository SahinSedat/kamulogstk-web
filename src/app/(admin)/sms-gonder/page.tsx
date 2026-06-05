import { Metadata } from "next";
import SmsClient from "./SmsClient";

export const metadata: Metadata = {
  title: "Toplu SMS Gönderimi | Kamulog Admin",
  description: "Kullanıcılara toplu SMS gönderimi yapın.",
};

export default function SmsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
          Toplu SMS Gönder
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Sisteme kayıtlı ve telefon numarası bulunan tüm kullanıcılara VatanSMS üzerinden bilgilendirme mesajı gönderebilirsiniz.
        </p>
      </div>

      <SmsClient />
    </div>
  );
}
