import { getManagerSTK } from "@/lib/helpers/getManagerSTK";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendDynamicWaMessage } from "@/lib/whatsappSender";


// GET /api/stk-panel/members — Üyeleri getir
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;

    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stk = await getManagerSTK(user.id);
    if (!stk) {
      return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });
    }

    const members = await prisma.member.findMany({
      where: { stkId: stk.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        memberNumber: true,
        name: true,
        surname: true,
        tcKimlik: true,
        email: true,
        phone: true,
        status: true,
        category: true,
        registrationSource: true,
        joinDate: true,
        createdAt: true,
        city: true,
        district: true,
        premiumUntil: true,
      },
    });

    // ═══════════════════════════════════════════════════════════
    // Ödeme yapan üyeleri getir (STKPaymentReport APPROVED)
    // ═══════════════════════════════════════════════════════════
    let paidMembers: { id: string; name: string; phone: string; email: string; tcKimlik: string; paymentType: string; paymentDate: Date; premiumUntil: Date; applicationStatus: string }[] = [];
    try {
      const approvedPayments = await prisma.sTKPaymentReport.findMany({
        where: { status: "APPROVED", application: { stkId: stk.id } },
        orderBy: { paymentDate: "desc" },
        select: {
          paymentType: true,
          paymentDate: true,
          application: { select: { id: true, name: true, phone: true, email: true, tcKimlik: true, status: true } },
        },
      });
      // Her kişi için en son ödemeyi al (dedup by phone)
      const seen = new Set<string>();
      for (const p of approvedPayments) {
        const key = p.application.phone?.replace(/\D/g, "").slice(-10) || p.application.email || p.application.name;
        if (seen.has(key)) continue;
        seen.add(key);
        const isAnnual = p.paymentType.toUpperCase().includes("ANNUAL");
        const premiumUntil = new Date(p.paymentDate.getTime() + (isAnnual ? 365 : 30) * 86400000);
        paidMembers.push({
          id: p.application.id,
          name: p.application.name,
          phone: p.application.phone || "",
          email: p.application.email || "",
          tcKimlik: p.application.tcKimlik || "",
          paymentType: p.paymentType,
          paymentDate: p.paymentDate,
          premiumUntil,
          applicationStatus: p.application.status,
        });
      }

      // Member tablosunda eşleşenlerin premiumUntil'ini güncelle
      for (const paid of paidMembers) {
        const paidPhone10 = paid.phone.replace(/\D/g, "").slice(-10);
        const match = members.find(m => {
          const mPhone10 = m.phone?.replace(/\D/g, "").slice(-10) || "";
          return (paidPhone10 && mPhone10 && paidPhone10 === mPhone10) ||
                 (paid.email && m.email && paid.email.toLowerCase() === m.email.toLowerCase());
        });
        if (match && (!match.premiumUntil || new Date(match.premiumUntil) < paid.premiumUntil)) {
          (match as { premiumUntil: Date | null }).premiumUntil = paid.premiumUntil;
          // DB'yi de güncelle (async, bekleme yok)
          prisma.member.update({ where: { id: match.id }, data: { premiumUntil: paid.premiumUntil } }).catch(() => {});
        }
      }
    } catch (e) { console.error("[Members GET] PaymentReport tarama hatası:", e); }

    // İstatistikler
    const stats = {
      total: members.length,
      active: members.filter(m => m.status === "ACTIVE").length,
      pending: members.filter(m => m.status === "APPLIED" || m.status === "PENDING").length,
      resigned: members.filter(m => m.status === "RESIGNED" || m.status === "RESIGNED_BOARD").length,
      suspended: members.filter(m => m.status === "SUSPENDED").length,
      bySource: {
        ONLINE: members.filter(m => m.registrationSource === "ONLINE").length,
        MOBILE: members.filter(m => m.registrationSource === "MOBILE").length,
        IN_PERSON: members.filter(m => m.registrationSource === "IN_PERSON").length,
        FOUNDER: members.filter(m => m.registrationSource === "FOUNDER").length,
        IMPORT: members.filter(m => m.registrationSource === "IMPORT").length,
      },
    };

    // Başvuru istatistikleri
    const appStats = await prisma.sTKApplication.groupBy({
      by: ["status"],
      where: { stkId: stk.id },
      _count: true,
    });
    const appCounts: Record<string, number> = {};
    appStats.forEach(a => { appCounts[a.status] = a._count; });
    const enrichedStats = {
      ...stats,
      appTotal: appStats.reduce((s, a) => s + a._count, 0),
      appApproved: appCounts["APPROVED"] || 0,
      appPending: (appCounts["PENDING"] || 0) + (appCounts["APPLIED"] || 0),
      appRejected: appCounts["REJECTED"] || 0,
      paidCount: paidMembers.length,
    };

    return NextResponse.json({ success: true, data: members, paidMembers, stats: enrichedStats });
  } catch (error) {
    console.error("[STK Members GET]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST /api/stk-panel/members — Manuel üye ekle
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;

    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const stk = await getManagerSTK(user.id);
    if (!stk) {
      return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });
    }

    const body = await request.json();
    const { name, surname, tcKimlik, email, phone, city, district } = body;

    if (!name || !surname || !phone) {
      return NextResponse.json({ error: "Ad, Soyad ve Telefon zorunludur" }, { status: 400 });
    }

    // Aynı e-posta, TC veya telefon var mı kontrol et (Member + STKApplication)
    const orConditions: any[] = [{ phone }];
    if (email && email.trim() !== "") orConditions.push({ email });
    if (tcKimlik && tcKimlik.trim() !== "") orConditions.push({ tcKimlik });

    const existingMember = await prisma.member.findFirst({
      where: { stkId: stk.id, OR: orConditions },
    });
    if (existingMember) {
      const reason = (email && existingMember.email === email) ? "e-posta" : (tcKimlik && existingMember.tcKimlik === tcKimlik) ? "TC Kimlik" : "telefon";
      return NextResponse.json({ error: `Bu ${reason} ile zaten kayıtlı bir üye var` }, { status: 409 });
    }

    // STKApplication'da da kontrol et
    const existingApp = await prisma.sTKApplication.findFirst({
      where: { stkId: stk.id, OR: orConditions },
    });
    if (existingApp) {
      const reason = (email && existingApp.email === email) ? "e-posta" : (tcKimlik && existingApp.tcKimlik === tcKimlik) ? "TC Kimlik" : "telefon";
      return NextResponse.json({ error: `Bu ${reason} ile mobil başvuru yapılmış bir kullanıcı zaten mevcut (${existingApp.name})` }, { status: 409 });
    }

    const member = await prisma.member.create({
      data: {
        stkId: stk.id,
        name,
        surname,
        tcKimlik: tcKimlik || null,
        email: email && email.trim() !== "" ? email : null,
        phone,
        city: city || null,
        district: district || null,
        status: "ACTIVE",
        registrationSource: "IN_PERSON", // Manuel eklenen üyeler
        joinDate: new Date(),
        kvkkConsent: true,
        kvkkConsentDate: new Date(),
      },
    });

    // STK memberCount güncelle + STK adını al
    const stkOrg = await prisma.sTKOrganization.update({
      where: { id: stk.id },
      data: { memberCount: { increment: 1 } },
      select: { name: true, slug: true },
    });

    // Email bildirimi gönder
    if (email && email.trim() !== "") {
      try {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject: `🎉 ${stkOrg.name} — Hoş Geldiniz!`,
          html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
            <h2 style="color:#1e3a5f;">Hoş Geldiniz, ${name} ${surname}!</h2>
            <p>Sayın üyemiz, <strong>${stkOrg.name}</strong> kuruluşuna üye olarak eklendiniz.</p>
            <p>Kamulog uygulamasını indirerek tüm dernek faaliyetlerini takip edebilirsiniz. 📲</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
            <p style="color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} Kamulog — Kamu Çalışanları Süper Uygulaması</p>
          </div>`,
        });
      } catch (e) { console.error("[Manuel Üye Email]:", e); }
    }

    // WhatsApp bildirimi gönder (Dynamic Router)
    try {
      await sendDynamicWaMessage(
        phone,
        `🎉 Sayın ${name} ${surname},\n\n*${stkOrg.name}* kuruluşuna üye olarak eklendiniz.\n\nKamulog uygulamasını indirerek tüm dernek faaliyetlerini takip edebilirsiniz. 📲\n\nSaygılarımızla,\n${stkOrg.name}`,
        stk.id,
      );
    } catch (e) { console.error("[Manuel Üye WhatsApp]:", e); }

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (error) {
    console.error("[STK Members POST]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE /api/stk-panel/members?id=xxx&permanent=true — Üyeyi sil veya pasife al
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

    // Üyenin bu STK'ya ait olduğunu doğrula — ADLİ BİLİŞİM: Tüm veriyi çek
    const existing = await prisma.member.findFirst({ where: { id, stkId: stk.id } });
    if (!existing) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    // 🔒 HER ZAMAN SOFT DELETE — kalıcı silme devre dışı (cascade koruma)
    const member = await prisma.member.update({ where: { id }, data: { status: "SUSPENDED" } });

    // 🛡️ ADLİ BİLİŞİM LOG — Silinen üyenin TÜM verisi JSON olarak yedeklenir
    try {
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      await prisma.sTKAuditLog.create({
        data: {
          stkId: stk.id,
          userId: user.id,
          action: "DELETE_MEMBER",
          entityType: "MEMBER",
          entityId: id,
          details: existing as any,
          ipAddress: ip,
        },
      });
      console.log(`[AuditLog] 🛡️ DELETE_MEMBER logged: ${existing.name} ${existing.surname} (${id}) by ${user.id}`);
    } catch (logErr) {
      console.error("[AuditLog] Log kayıt hatası:", logErr);
    }

    return NextResponse.json({ success: true, data: member });
  } catch (error) {
    console.error("[STK Members DELETE]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// PATCH /api/stk-panel/members?id=xxx — Üye durumunu güncelle
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id: string; role: string } | undefined;
    if (!user || user.role !== "STK_MANAGER") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }
    const stk = await getManagerSTK(user.id);
    if (!stk) return NextResponse.json({ error: "Yönetilen STK bulunamadı" }, { status: 404 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

    const body = await request.json();
    const { status, rejectionReason } = body;
    if (!status) return NextResponse.json({ error: "status gerekli" }, { status: 400 });

    // Üyenin bu STK'ya ait olduğunu doğrula
    const existing = await prisma.member.findFirst({ where: { id, stkId: stk.id } });
    if (!existing) return NextResponse.json({ error: "Üye bulunamadı veya yetkiniz yok" }, { status: 404 });

    const member = await prisma.member.update({
      where: { id },
      data: { status },
    });

    // 🛡️ ADLİ BİLİŞİM LOG — Durum değişikliği kaydedilir
    try {
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      await prisma.sTKAuditLog.create({
        data: {
          stkId: stk.id,
          userId: user.id,
          action: "UPDATE_MEMBER",
          entityType: "MEMBER",
          entityId: id,
          details: { oldStatus: existing.status, newStatus: status, rejectionReason: rejectionReason || null, memberName: `${existing.name} ${existing.surname}`, memberPhone: existing.phone, memberEmail: existing.email },
          ipAddress: ip,
        },
      });
    } catch (logErr) {
      console.error("[AuditLog] Log kayıt hatası:", logErr);
    }

    // REJECTED durumunda gerekçeli e-posta bildirimi gönder
    if (status === "REJECTED" && rejectionReason && existing.email) {
      try {
        const stkOrg = await prisma.sTKOrganization.findUnique({
          where: { id: stk.id },
          select: { name: true },
        });
        const orgName = stkOrg?.name || "Derneğimiz";

        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: existing.email,
          subject: `${orgName} — Üyelik Durumu Güncellendi`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#DC2626;">❌ Üyelik Durumu: Reddedildi</h2>
              <p>Sayın <strong>${existing.name} ${existing.surname}</strong>,</p>
              <p><strong>${orgName}</strong> tarafından üyelik durumunuz "Reddedildi" olarak güncellenmiştir.</p>
              <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px;margin:16px 0;">
                <p style="color:#991B1B;font-weight:bold;margin:0 0 8px;">📋 Ret Gerekçesi:</p>
                <p style="color:#7F1D1D;margin:0;">${rejectionReason}</p>
              </div>
              <p>Sorularınız için lütfen derneğimize başvurunuz.</p>
              <p style="color:#9CA3AF;font-size:12px;">Bu e-posta ${orgName} üyelik sistemi tarafından gönderilmiştir.</p>
            </div>
          `,
        });
        console.log(`[Members PATCH] 📧 Ret gerekçesi e-posta gönderildi: ${existing.email}`);
      } catch (emailErr) {
        console.error("[Members PATCH] E-posta hatası:", emailErr);
      }
    }

    // WhatsApp bildirimi gönder (Dynamic Router — STK botu aktifse ondan gider)
    try {
      const stkOrg = await prisma.sTKOrganization.findUnique({
        where: { id: stk.id },
        select: { name: true },
      });
      const orgName = stkOrg?.name || "Derneğimiz";
      let waMsg = "";
      if (status === "ACTIVE") {
        waMsg = `🎉 Sayın ${existing.name} ${existing.surname},\n\n*${orgName}* kuruluşuna üyeliğiniz *onaylanmıştır!* ✅\n\nKamulog uygulamasından tüm dernek faaliyetlerini takip edebilirsiniz. 📲\n\nHoş geldiniz! 🤝`;
      } else if (status === "REJECTED") {
        waMsg = `Sayın ${existing.name} ${existing.surname},\n\n*${orgName}* kuruluşuna üyelik başvurunuz değerlendirilmiş ve reddedilmiştir.${rejectionReason ? `\n\n📋 Gerekçe: ${rejectionReason}` : ""}\n\nDetaylı bilgi için derneğimize başvurabilirsiniz. 🙏`;
      } else if (status === "SUSPENDED") {
        waMsg = `Sayın ${existing.name} ${existing.surname},\n\n*${orgName}* kuruluşundaki üyeliğiniz askıya alınmıştır. ⏸️\n\nDetaylı bilgi için derneğimize başvurabilirsiniz. 🙏`;
      }
      if (waMsg && existing.phone) {
        await sendDynamicWaMessage(existing.phone, waMsg, stk.id);
        console.log(`[Members PATCH] 📱 WhatsApp bildirimi gönderildi: ${existing.phone} (${status})`);
      }
    } catch (waErr) { console.error("[Members PATCH] WhatsApp hatası:", waErr); }

    return NextResponse.json({ success: true, data: member });
  } catch (error) {
    console.error("[STK Members PATCH]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
