import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * resolveUser — Authorization: Token <userId> header'dan kullanıcıyı çözer.
 */
async function resolveUser(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const parts = auth.split(" ");
  const token = parts.length === 2 ? parts[1] : auth;
  if (!token) return null;

  let user = await prisma.user.findUnique({
    where: { id: token },
    select: { id: true },
  });
  if (user) return user;

  const phoneHeader = req.headers.get("x-user-phone");
  if (phoneHeader) {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: phoneHeader },
          { phoneNumber: phoneHeader },
        ],
      },
      select: { id: true },
    });
    if (user) return user;
  }
  return null;
}

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  name: true,
  avatarUrl: true,
  unvan: true,
  kurum: true,
  bakanlik: true,
  istihdamTuru: true,
  city: true,
};

const LISTING_SELECT = {
  id: true,
  title: true,
  currentCity: true,
  targetCity: true,
  status: true,
  adNumber: true,
  slug: true,
  branch: true,
  role: true,
  institution: { select: { id: true, name: true } },
};

// GET /api/match-requests — Kullanıcının gönderdiği ve aldığı tüm talepleri listele
export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Yetkilendirme gerekli.", reauth: true },
        { status: 401 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allRequests = await (prisma as any).matchRequest.findMany({
      where: {
        OR: [
          { senderId: user.id, senderHidden: false },
          { receiverId: user.id, receiverHidden: false },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: USER_SELECT },
        receiver: { select: USER_SELECT },
        listing: { select: LISTING_SELECT },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentRequests = allRequests.filter((r: any) => r.senderId === user.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const receivedRequests = allRequests.filter((r: any) => r.receiverId === user.id);

    // Kota bilgisi
    const FREE_MATCH_REQUEST_LIMIT = 2;
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isPremium: true },
    });
    let maxRequests = FREE_MATCH_REQUEST_LIMIT;
    if (userRecord?.isPremium) {
      const activeSub = await prisma.subscription.findFirst({
        where: { userId: user.id, status: "active" },
        orderBy: { createdAt: "desc" },
      });
      if (activeSub) {
        const plan = await prisma.subscriptionPlan.findUnique({
          where: { id: activeSub.planId },
        });
        maxRequests = (plan as Record<string, unknown>)?.matchRequestQuota as number ?? 15;
      } else {
        maxRequests = 15; // premium fallback
      }
    }

    return NextResponse.json({
      sentRequests,
      receivedRequests,
      totalSent: sentRequests.length,
      totalReceived: receivedRequests.length,
      quota: { used: sentRequests.length, max: maxRequests },
    });
  } catch (error) {
    console.error("[MatchRequests] List error:", error);
    return NextResponse.json(
      { error: "Talepler yüklenirken hata oluştu." },
      { status: 500 }
    );
  }
}
