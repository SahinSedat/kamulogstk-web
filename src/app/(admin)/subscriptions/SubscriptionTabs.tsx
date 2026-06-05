"use client";

import { useState, type ReactNode } from "react";
import { Crown, CreditCard, Package, XCircle, Target, Gem } from "lucide-react";

interface SubscriptionTabsProps {
  premiumUsersContent: ReactNode;
  becayisSubscriptionsContent: ReactNode;
  careerSubscriptionsContent: ReactNode;
  jetonPurchasesContent: ReactNode;
  plansContent: ReactNode;
  cancellationsContent: ReactNode;
}

const tabs = [
  { id: "premium", label: "👑 Premium Kullanıcılar", icon: Crown },
  { id: "becayis", label: "🤝 Becayiş Abonelikleri", icon: CreditCard },
  { id: "career", label: "🎯 Kariyer Abonelikleri", icon: Target },
  { id: "jetons", label: "💎 Jeton Satın Alımları", icon: Gem },
  { id: "plans", label: "📦 Plan Yönetimi", icon: Package },
  { id: "cancellations", label: "🚫 İptal Başvuruları", icon: XCircle },
];

export default function SubscriptionTabs({ premiumUsersContent, becayisSubscriptionsContent, careerSubscriptionsContent, jetonPurchasesContent, plansContent, cancellationsContent }: SubscriptionTabsProps) {
  const [active, setActive] = useState("premium");

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-xl mb-4 overflow-x-auto" style={{ background: "var(--bg-muted)" }}>
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center whitespace-nowrap ${isActive ? "shadow-sm" : ""}`}
              style={{
                background: isActive ? "var(--bg-card)" : "transparent",
                color: isActive ? "var(--primary)" : "var(--text-muted)",
                border: isActive ? "1px solid var(--border)" : "1px solid transparent",
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {active === "premium" && premiumUsersContent}
      {active === "becayis" && becayisSubscriptionsContent}
      {active === "career" && careerSubscriptionsContent}
      {active === "jetons" && jetonPurchasesContent}
      {active === "plans" && plansContent}
      {active === "cancellations" && cancellationsContent}
    </div>
  );
}
