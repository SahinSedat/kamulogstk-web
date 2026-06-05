import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/services/notificationService";

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
    select: { id: true, firstName: true, lastName: true },
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
      select: { id: true, firstName: true, lastName: true },
    });
    if (user) return user;
  }
  return null;
}

// PATCH /api/match-requests/[id]/respond
// Body: { action: "accept" | "reject" }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Auth doğrulama
    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Yetkilendirme gerekli.", reauth: true },
        { status: 401 }
      );
    }

    // 2. Match request'i bul
    const matchRequest = await prisma.matchRequest.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        listing: { select: { id: true, title: true, ownerId: true } },
      },
    });

    if (!matchRequest) {
      return NextResponse.json(
        { error: "Becayiş talebi bulunamadı." },
        { status: 404 }
      );
    }

    // 3. Yetki kontrolü: ilan sahibi (receiver) VEYA talep gönderen (sender/cancel)
    const isSender = matchRequest.senderId === user.id;
    const isReceiver = matchRequest.receiverId === user.id;

    if (!isSender && !isReceiver) {
      return NextResponse.json(
        { error: "Bu talebi yanıtlama yetkiniz yok." },
        { status: 403 }
      );
    }

    // 4. Sadece PENDING talepler yanıtlanabilir
    if (matchRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: `Bu talep zaten ${matchRequest.status === "ACCEPTED" ? "kabul edilmiş" : matchRequest.status === "CANCELLED" ? "iptal edilmiş" : "reddedilmiş"}.` },
        { status: 409 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (!action || !["accept", "reject", "cancel"].includes(action)) {
      return NextResponse.json(
        { error: "action 'accept', 'reject' veya 'cancel' olmalı." },
        { status: 400 }
      );
    }

    // Yetki doğrulama: cancel sadece sender, accept/reject sadece receiver
    if (action === "cancel" && !isSender) {
      return NextResponse.json(
        { error: "Sadece talebi gönderen iptal edebilir." },
        { status: 403 }
      );
    }
    if ((action === "accept" || action === "reject") && !isReceiver) {
      return NextResponse.json(
        { error: "Sadece ilan sahibi kabul/ret yapabilir." },
        { status: 403 }
      );
    }

    // 5. Status güncelle
    const newStatus = action === "accept" ? "ACCEPTED" : action === "cancel" ? "CANCELLED" : "REJECTED";
    await prisma.matchRequest.update({
      where: { id },
      data: { status: newStatus },
    });

    // 6. Kabul edildiyse ilanı "matched" yap (yayından kaldır)
    if (action === "accept") {
      await prisma.becayisListing.update({
        where: { id: matchRequest.listingId },
        data: { status: "matched" },
      });
    }

    // 6. Talep gönderene FCM bildirimi — arka planda (fire-and-forget)
    const receiverName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "İlan sahibi";

    // Bildirimi arka planda gönder — response'u BEKLETMEDen
    if (action === "accept" || action === "reject") {
      const notifPayload = action === "accept"
        ? {
            userId: matchRequest.senderId,
            title: "🎉 Becayiş Talebiniz Kabul Edildi!",
            message: `${receiverName}, "${matchRequest.listing.title}" ilanı için talebinizi kabul etti! Artık mesajlaşmaya başlayabilirsiniz.`,
            type: "BECAYIS_MATCH" as const,
            payload: {
              matchRequestId: id,
              listingId: matchRequest.listingId,
              receiverId: matchRequest.receiverId,
              receiverName: receiverName,
              senderId: matchRequest.senderId,
              senderName: [matchRequest.sender.firstName, matchRequest.sender.lastName].filter(Boolean).join(" ") || "Kullanıcı",
              action: "match_accepted",
            },
          }
        : {
            userId: matchRequest.senderId,
            title: "😔 Becayiş Talebiniz Reddedildi",
            message: `${receiverName}, "${matchRequest.listing.title}" ilanı için talebinizi maalesef kabul edemedi.`,
            type: "BECAYIS_MATCH" as const,
            payload: {
              matchRequestId: id,
              listingId: matchRequest.listingId,
              receiverId: matchRequest.receiverId,
              receiverName: receiverName,
              action: "match_rejected",
            },
          };

      // Fire-and-forget — response'u bekletmez
      createNotification(notifPayload).catch((e) => {
        console.error("[MatchRequest] Yanıt bildirimi gönderilemedi:", e);
      });
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: action === "accept"
        ? "Talebi kabul ettiniz! Artık mesajlaşabilirsiniz."
        : action === "cancel"
        ? "Talep iptal edildi."
        : "Talep reddedildi.",
    });

  } catch (error) {
    console.error("[MatchRequest] Respond error:", error);
    return NextResponse.json(
      { error: "Yanıt işlenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
