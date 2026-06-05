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

// DELETE /api/match-requests/[id]
// Kullanıcı için talebi gizler (soft-delete).
// Sender ise senderHidden=true, receiver ise receiverHidden=true.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await resolveUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Yetkilendirme gerekli.", reauth: true },
        { status: 401 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchRequest = await (prisma as any).matchRequest.findUnique({
      where: { id },
      select: { senderId: true, receiverId: true },
    });

    if (!matchRequest) {
      return NextResponse.json(
        { error: "Talep bulunamadı." },
        { status: 404 }
      );
    }

    const isSender = matchRequest.senderId === user.id;
    const isReceiver = matchRequest.receiverId === user.id;

    if (!isSender && !isReceiver) {
      return NextResponse.json(
        { error: "Bu talebi silme yetkiniz yok." },
        { status: 403 }
      );
    }

    // Soft-delete: ilgili kullanıcı tarafını gizle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).matchRequest.update({
      where: { id },
      data: {
        ...(isSender ? { senderHidden: true } : {}),
        ...(isReceiver ? { receiverHidden: true } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Talep listenizden kaldırıldı.",
    });
  } catch (error) {
    console.error("[MatchRequests] Delete error:", error);
    return NextResponse.json(
      { error: "Talep silinirken hata oluştu." },
      { status: 500 }
    );
  }
}
