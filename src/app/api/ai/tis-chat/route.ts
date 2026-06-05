import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";
import { callWithFailover } from "@/lib/ai/keyProvider";
import fs from "fs";
import path from "path";

// --- PDF Text Cache ---
const pdfTextCache = new Map<string, string>();

async function extractPdfText(fileUrl: string): Promise<string> {
  if (pdfTextCache.has(fileUrl)) {
    return pdfTextCache.get(fileUrl)!;
  }
  try {
    // fileUrl tam URL olabilir: https://kamulog.net/media/tis/xxx.pdf
    // veya relative: /media/tis/xxx.pdf
    let relativePath = fileUrl;
    if (fileUrl.startsWith("http")) {
      try {
        const url = new URL(fileUrl);
        relativePath = url.pathname; // /media/tis/xxx.pdf
      } catch { relativePath = fileUrl; }
    }
    const filePath = path.join(process.cwd(), "public", relativePath);
    console.log("[TIS-Chat] PDF path resolved:", filePath);
    if (!fs.existsSync(filePath)) {
      console.error("[TIS-Chat] PDF bulunamadi:", filePath);
      return "";
    }
    
    // pdftotext CLI ile text cikar (OCR-layer + native text destekli)
    const { execSync } = require("child_process");
    const fullText = execSync(`pdftotext "${filePath}" - 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });
    
    console.log(`[TIS-Chat] PDF parsed (pdftotext): ${fullText.length} karakter`);
    
    // max 50K karakter (GPT token limiti icin)
    const truncated = fullText.substring(0, 50000);
    if (truncated.length > 100) pdfTextCache.set(fileUrl, truncated);
    return truncated;
  } catch (e) {
    console.error("[TIS-Chat] PDF parse hatasi:", e);
    return "";
  }
}


// --- Auth: Token + Session ---
async function resolveUserId(req: NextRequest): Promise<string | null> {
  // 1) Token-based (Mobil)
  const auth = req.headers.get("authorization");
  if (auth) {
    const parts = auth.split(" ");
    const token = parts.length === 2 ? parts[1] : auth;
    if (token) {
      const u = await prisma.user.findUnique({ where: { id: token }, select: { id: true } });
      if (u) return u.id;
    }
  }
  // 2) Session-based (Web)
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string })?.id || null;
}

async function getTisInstitutionList(): Promise<string[]> {
  const docs = await prisma.tISDocument.findMany({
    where: { isActive: true },
    select: { institution: true },
    distinct: ["institution"],
    orderBy: { institution: "asc" },
  });
  return docs.map((d) => d.institution);
}

const SYSTEM_PROMPT = `Sen KamulogAI TİS Danışmanısın. Kullanıcının TİS (Toplu İş Sözleşmesi) hakları hakkında sorularını yanıtlıyorsun.

İŞLEYİŞ:
1. Kullanıcı ilk mesajında hangi kurumda çalıştığını belirtmemişse, ilk olarak "Hangi kurumda/bakanlıkta çalışıyorsunuz?" diye sor.
2. Kullanıcı kurumunu belirttikten sonra, sağlanacak TİS belgesi içeriğine dayanarak soruları yanıtla.
3. SADECE sağlanan TİS belgesindeki bilgilere dayanarak cevap ver. Belge içeriği "[Sayfa X]" etiketleriyle sayfa numaralı olarak verilmiştir.
4. Cevaplarında ilgili madde numaralarını ve sayfa numaralarını belirt.
5. TİS dosyasında olmayan bir şey sorulursa: "Bu konu sağlanan TİS belgesinde yer almamaktadır." de.
6. Türkçe cevap ver, profesyonel ve anlaşılır bir dil kullan.

ÖNEMLİ: Kullanıcının kurumu henüz belli değilse, asla uydurma bilgi verme. Önce kurumunu öğren.`;

/**
 * POST /api/ai/tis-chat
 * Body: { message: string, messages?: Array<{role, content}>, institutionHint?: string }
 *
 * Sohbet tabanli TIS danismani.
 * AI ilk basta kurumu sorar, kullanici belirttikten sonra TIS belgesini bulup inceler.
 */
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true, premiumUntil: true, credits: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  const now = new Date();
  const isPremiumActive = user.isPremium && (!user.premiumUntil || user.premiumUntil > now);

  // TIS AI jeton orani (SiteSettings)
  const jetonSetting = await prisma.siteSettings.findUnique({ where: { key: "tisJetonRate" } });
  const tisJetonRate = parseInt(jetonSetting?.value || "10") || 10;

  // TIS Chat kota kontrolu
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { plan: { select: { tisChatQuota: true } } },
  });

  // Kota: plan kotasi, yoksa premium icin 10 varsayilan
  const tisChatQuota = subscription?.plan?.tisChatQuota || (isPremiumActive ? 10 : 0);

  const usageThisMonth = await prisma.aIUsageLog.count({
    where: {
      userId,
      module: "TIS_CHAT",
      createdAt: {
        gte: new Date(currentYear, currentMonth - 1, 1),
        lt: new Date(currentYear, currentMonth, 1),
      },
    },
  });

  let usingJeton = false;
  const userCredits = (user as unknown as { credits: number }).credits || 0;

  // --- Jeton doneminde kac mesaj kullanildi ---
  const jetonUsageThisMonth = await prisma.aIUsageLog.count({
    where: {
      userId,
      module: "TIS_JETON",
      createdAt: {
        gte: new Date(currentYear, currentMonth - 1, 1),
        lt: new Date(currentYear, currentMonth, 1),
      },
    },
  });

  // Mevcut jeton döneminde kalan sohbet hakki
  // Her jeton tisJetonRate mesaj hakkı verir
  // Toplam hak = userCredits * tisJetonRate + (tisJetonRate - (jetonUsageThisMonth % tisJetonRate))
  // Basit mantik: jetonUsageThisMonth mesaj yapildi, her tisJetonRate'te 1 jeton dustu
  // Kalan mesaj = (sonraki jeton dusecek noktaya kadar kalan)
  const usedInCurrentCycle = jetonUsageThisMonth % tisJetonRate;
  const remainingInCurrentCycle = tisJetonRate - usedInCurrentCycle;

  if (!isPremiumActive) {
    // Standart kullanici — sadece jeton ile erisebilir
    if (userCredits < 1 && jetonUsageThisMonth === 0) {
      // Hic jetonu yok ve hic kullanmamis
      return NextResponse.json({
        error: "TİS AI sohbet için jeton veya premium abonelik gereklidir. Jeton satın alarak devam edebilirsiniz.",
        canUseJeton: true,
        credits: 0,
        tisJetonRate,
        noCredits: true,
      }, { status: 403 });
    }
    // Jeton varsa veya mevcut donemde hakki varsa devam
    if (userCredits < 1 && remainingInCurrentCycle <= 0) {
      return NextResponse.json({
        error: "Sohbet hakkınız doldu. Devam etmek için jeton satın alın.",
        canUseJeton: true,
        credits: 0,
        tisJetonRate,
        quotaExhausted: true,
        noCredits: true,
      }, { status: 403 });
    }
    usingJeton = true;
  } else if (usageThisMonth >= tisChatQuota) {
    // Premium ama kota doldu — jeton fallback
    if (userCredits >= 1 || (jetonUsageThisMonth > 0 && remainingInCurrentCycle > 0)) {
      usingJeton = true;
    } else {
      return NextResponse.json({
        error: "Bu ayki TİS sohbet hakkınız doldu. Jeton satın alarak devam edebilirsiniz.",
        quotaExceeded: true,
        used: usageThisMonth,
        limit: tisChatQuota,
        credits: 0,
        tisJetonRate,
      }, { status: 429 });
    }
  }

  const body = await req.json();
  const { message, messages: chatHistory, institutionHint } = body;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Mesaj gerekli" }, { status: 400 });
  }

  const institutions = await getTisInstitutionList();

  let matchedTisDoc = null;
  const searchText = (institutionHint || message).toLowerCase();

  for (const inst of institutions) {
    if (searchText.includes(inst.toLowerCase()) || inst.toLowerCase().includes(searchText.trim())) {
      matchedTisDoc = await prisma.tISDocument.findFirst({
        where: { institution: inst, isActive: true },
        select: { id: true, institution: true, title: true, fileUrl: true },
      });
      if (matchedTisDoc) break;
    }
  }

  // Sohbet gecmisinde daha once kurum eslesmesi yapilmis mi kontrol
  if (!matchedTisDoc && chatHistory && Array.isArray(chatHistory)) {
    for (const msg of chatHistory) {
      if (msg.role === "user") {
        const msgLower = msg.content.toLowerCase();
        for (const inst of institutions) {
          if (msgLower.includes(inst.toLowerCase()) || inst.toLowerCase().includes(msgLower.trim())) {
            matchedTisDoc = await prisma.tISDocument.findFirst({
              where: { institution: inst, isActive: true },
              select: { id: true, institution: true, title: true, fileUrl: true },
            });
            if (matchedTisDoc) break;
          }
        }
        if (matchedTisDoc) break;
      }
    }
  }

  const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "system",
      content: `Sistemdeki mevcut TİS belgeleri bulunan kurumlar: ${institutions.join(", ")}. Kullanıcının belirttiği kurum bunlardan biri ise o kurumun TİS belgesi hakkında bilgi ver. Eğer hiçbiri uymuyorsa kullanıcıya sistemdeki kurumları listele.`,
    },
  ];

  if (matchedTisDoc) {
    const pdfText = await extractPdfText(matchedTisDoc.fileUrl);
    if (pdfText) {
      openaiMessages.push({
        role: "system",
        content: `Aşağıda ${matchedTisDoc.institution} kurumuna ait "${matchedTisDoc.title}" başlıklı TİS belgesinin tam içeriği yer almaktadır. Tüm sorulara YALNIZCA bu belge içeriğine dayanarak cevap ver:\n\n${pdfText}`,
      });
    } else {
      openaiMessages.push({
        role: "system",
        content: `UYARI: ${matchedTisDoc.institution} kurumuna ait TİS belgesi sistemde mevcut ancak içeriği okunamadı. Kullanıcıya bu durumu bildir ve belgenin teknik nedenlerle şu an okunamadığını açıkla.`,
      });
    }
  }

  if (chatHistory && Array.isArray(chatHistory)) {
    for (const msg of chatHistory) {
      openaiMessages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }
  }

  openaiMessages.push({ role: "user", content: message.trim() });

  try {
    const completion = await callWithFailover("OPENAI", async (apiKey) => {
      const client = new OpenAI({ apiKey });
      return client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: openaiMessages,
        temperature: 0.3,
        max_tokens: 1500,
      });
    });

    const answer = completion.choices[0]?.message?.content || "Cevap oluşturulamadı.";

    // ---- Jeton Düşümü (basit mantık) ----
    // Her mesajda TIS_JETON log'u eklenir
    // Her tisJetonRate mesajda 1 jeton düşer (ilk mesajda dahil)
    if (usingJeton) {
      // Önce log ekle
      await prisma.aIUsageLog.create({
        data: { userId, module: "TIS_JETON", tokenUsed: 0 },
      }).catch(() => {});

      // Güncel kullanım sayısı (az önce eklenen dahil)
      const updatedJetonUsage = jetonUsageThisMonth + 1;
      
      // İlk mesajda (0→1) veya her tisJetonRate'in katında jeton düş
      if (updatedJetonUsage === 1 || updatedJetonUsage % tisJetonRate === 0) {
        // Guard: credits > 0 ise düş, yoksa düşme (negatife düşmeyi engelle)
        await prisma.user.updateMany({
          where: { id: userId, credits: { gt: 0 } },
          data: { credits: { decrement: 1 } },
        }).catch(() => {});
      }
    }

    // TIS_CHAT log
    await prisma.aIUsageLog.create({
      data: {
        userId,
        module: "TIS_CHAT",
        tokenUsed: completion.usage?.total_tokens || 0,
      },
    }).catch(() => {});

    // Güncel kredi bilgisini DB'den oku
    const freshUser = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
    const freshCredits = freshUser?.credits ?? 0;

    // Kalan sohbet hakkı hesaplama (jeton modu için)
    const updatedJetonUsage = jetonUsageThisMonth + 1;
    const usedInCycleNow = updatedJetonUsage % tisJetonRate;
    const chatRemaining = usedInCycleNow === 0 ? 0 : tisJetonRate - usedInCycleNow;

    return NextResponse.json({
      success: true,
      answer,
      institution: matchedTisDoc?.institution || null,
      tisTitle: matchedTisDoc?.title || null,
      quota: isPremiumActive && !usingJeton ? {
        used: usageThisMonth + 1,
        total: tisChatQuota,
        remaining: Math.max(0, tisChatQuota - usageThisMonth - 1),
      } : null,
      usingJeton,
      tisJetonRate,
      creditsRemaining: freshCredits,
      jetonChatRemaining: usingJeton ? chatRemaining : null,
      jetonChatTotal: usingJeton ? tisJetonRate : null,
    });
  } catch (error: unknown) {
    console.error("[TIS-Chat] AI hatasi:", error);
    const msg = error instanceof Error ? error.message : "AI servisi su an yanit veremiyor";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
