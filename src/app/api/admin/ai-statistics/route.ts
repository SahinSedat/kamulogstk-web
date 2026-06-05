import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/admin/ai-statistics — AI kullanım istatistikleri
export async function GET() {
  // 🛡️ GÜVENLİK: Admin oturumu zorunlu
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!role || !["ADMIN", "MODERATOR"].includes(role)) {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

    try {
        // ── 1. Toplam kullanım sayısı
        const totalUsage = await prisma.aIUsageLog.count();

        // ── 2. Toplam token tüketimi
        const tokenAgg = await prisma.aIUsageLog.aggregate({
            _sum: { tokenUsed: true },
        });
        const totalTokens = tokenAgg._sum.tokenUsed || 0;

        // ── 3. Modül bazında dağılım
        const moduleGroups = await prisma.aIUsageLog.groupBy({
            by: ["module"],
            _count: { id: true },
            orderBy: { _count: { id: "desc" } },
        });

        const moduleDistribution = moduleGroups.map((g: { module: string; _count: { id: number } }, i: number) => ({
            name: g.module,
            value: g._count.id,
            color: [
                "#4299E1",
                "#9F7AEA",
                "#48BB78",
                "#ED8936",
                "#F56565",
                "#38B2AC",
            ][i % 6],
        }));

        const topModule = moduleGroups.length > 0 ? moduleGroups[0].module : "N/A";

        // ── 4. Son 30 günlük günlük trend
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentLogs = await prisma.aIUsageLog.findMany({
            where: { createdAt: { gte: thirtyDaysAgo } },
            select: { createdAt: true, tokenUsed: true },
            orderBy: { createdAt: "asc" },
        });

        // Günlük gruplama
        const dailyMap = new Map<string, { count: number; tokens: number }>();

        // Son 30 gün için boş günleri de doldur
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
            dailyMap.set(key, { count: 0, tokens: 0 });
        }

        for (const log of recentLogs) {
            const d = new Date(log.createdAt);
            const key = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
            const existing = dailyMap.get(key) || { count: 0, tokens: 0 };
            existing.count += 1;
            existing.tokens += log.tokenUsed || 0;
            dailyMap.set(key, existing);
        }

        const dailyTrend = Array.from(dailyMap.entries()).map(([date, data]) => ({
            date,
            count: data.count,
            tokens: data.tokens,
        }));

        // ── 5. Günlük ortalama (son 30 gün)
        const recentCount = recentLogs.length;
        const dailyAvg = Math.round(recentCount / 30);

        return NextResponse.json({
            totalUsage,
            dailyAvg,
            totalTokens,
            topModule,
            moduleDistribution,
            dailyTrend,
        });
    } catch (error) {
        console.error("AI Statistics error:", error);
        return NextResponse.json(
            { error: "İstatistikler yüklenirken hata oluştu." },
            { status: 500 }
        );
    }
}
