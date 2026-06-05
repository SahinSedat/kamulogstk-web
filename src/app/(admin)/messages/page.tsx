export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { MessageSquare } from "lucide-react";
import AdminMessagingDashboard from "@/components/ui/AdminMessagingDashboard";

export default async function MessagesPage() {
  // İlk yükleme için sunucu tarafında temel istatistikleri çek
  const [
    totalConversations,
    totalMessages,
    filteredMessages,
    unreadConversations,
    totalBecayisMessages,
    filteredBecayisMessages,
  ] = await Promise.all([
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.message.count({ where: { isFiltered: true } }),
    prisma.conversation.count({ where: { unreadCount: { gt: 0 } } }),
    prisma.becayisMessage.count(),
    prisma.becayisMessage.count({ where: { isFiltered: true } }),
  ]);

  const initialStats = {
    consultant: {
      conversations: totalConversations,
      messages: totalMessages,
      filtered: filteredMessages,
      unread: unreadConversations,
    },
    becayis: {
      messages: totalBecayisMessages,
      filtered: filteredBecayisMessages,
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" /> Mesaj Yönetim Merkezi
        </h2>
        <p className="text-text-secondary text-sm mt-1">
          Tüm mesajlaşmaları izle, filtrele ve yönet
        </p>
      </div>
      <AdminMessagingDashboard initialStats={initialStats} />
    </div>
  );
}
