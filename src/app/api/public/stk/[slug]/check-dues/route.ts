import { NextRequest, NextResponse } from "next";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const { searchParams } = new URL(req.url);
    const tcKimlik = searchParams.get("tcKimlik");

    if (!tcKimlik || tcKimlik.length !== 11) {
      return NextResponse.json({ error: "Geçerli bir T.C. Kimlik numarası giriniz." }, { status: 400 });
    }

    const stk = await prisma.sTKOrganization.findUnique({
      where: { slug },
    });

    if (!stk) {
      return NextResponse.json({ error: "STK bulunamadı." }, { status: 404 });
    }

    const application = await prisma.sTKApplication.findFirst({
      where: {
        stkId: stk.id,
        tcKimlik,
      },
      include: {
        payments: {
          where: { status: "APPROVED" },
          orderBy: { paymentDate: "desc" },
          take: 1,
        }
      }
    });

    if (!application) {
      return NextResponse.json({ error: "Sistemde bu T.C. Kimlik numarasıyla eşleşen bir üyelik kaydı bulunamadı." }, { status: 404 });
    }

    if (application.status !== "APPROVED") {
      return NextResponse.json({ error: "Üyeliğiniz henüz onaylanmamış veya aktif değil. Aidat durumu sorgulanamıyor." }, { status: 400 });
    }

    // Aidat hesabı
    const lastPayment = application.payments[0];
    let message = "Sistemde Aktif Üye olarak görünüyorsunuz. Ancak henüz onaylanmış bir aidat ödemeniz bulunmamaktadır.";
    let dueDate = null;

    if (lastPayment) {
      const pDate = new Date(lastPayment.paymentDate);
      if (lastPayment.paymentType === "MONTHLY_DUES" || lastPayment.paymentType === "MONTHLY") {
        dueDate = new Date(pDate.setMonth(pDate.getMonth() + 1));
      } else if (lastPayment.paymentType === "YEARLY_DUES" || lastPayment.paymentType === "YEARLY") {
        dueDate = new Date(pDate.setFullYear(pDate.getFullYear() + 1));
      }
      
      if (dueDate) {
        const today = new Date();
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
          message = `Sistemde Aktif Üye olarak görünüyorsunuz. Son ödemeniz başarıyla işlenmiştir. Bir sonraki aidat ödemenize ${diffDays} gün kaldı. (${dueDate.toLocaleDateString('tr-TR')})`;
        } else if (diffDays === 0) {
          message = `Sistemde Aktif Üye olarak görünüyorsunuz. Aidat ödeme gününüz bugün! (${dueDate.toLocaleDateString('tr-TR')})`;
        } else {
          message = `Sistemde Aktif Üye olarak görünüyorsunuz. Aidat ödemeniz ${Math.abs(diffDays)} gün gecikmiştir. Lütfen aidat ödemenizi yapınız. (${dueDate.toLocaleDateString('tr-TR')})`;
        }
      }
    }

    return NextResponse.json({
      success: true,
      name: application.name,
      message,
      lastPaymentDate: lastPayment ? lastPayment.paymentDate : null,
      dueDate,
    }, { status: 200 });

  } catch (e) {
    console.error("[Check Dues] Error:", e);
    return NextResponse.json({ error: "Sistemsel bir hata oluştu." }, { status: 500 });
  }
}
