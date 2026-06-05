import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — Danışman listesi + istatistikler + başvurular + hakedişler + ayarlar
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const tab = searchParams.get("tab") || "active";
        const search = searchParams.get("search") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const perPage = 10;

        if (tab === "active") {
            const where: any = {};
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: "insensitive" } },
                    { category: { contains: search, mode: "insensitive" } },
                ];
            }
            const [consultants, total] = await Promise.all([
                prisma.consultant.findMany({
                    where,
                    skip: (page - 1) * perPage,
                    take: perPage,
                    orderBy: { createdAt: "desc" },
                    include: {
                        _count: { select: { reviews: true, consultantConversations: true } },
                    },
                }),
                prisma.consultant.count({ where }),
            ]);
            return NextResponse.json({ consultants, total, totalPages: Math.ceil(total / perPage) });
        }

        if (tab === "applications") {
            const where: any = {};
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                ];
            }
            const statusFilter = searchParams.get("status") || "pending";
            if (statusFilter) where.status = statusFilter;

            const [applications, total] = await Promise.all([
                prisma.consultantApplication.findMany({
                    where,
                    skip: (page - 1) * perPage,
                    take: perPage,
                    orderBy: { createdAt: "desc" },
                }),
                prisma.consultantApplication.count({ where }),
            ]);
            return NextResponse.json({ applications, total, totalPages: Math.ceil(total / perPage) });
        }

        if (tab === "finance") {
            const period = searchParams.get("period") || new Date().toISOString().slice(0, 7);
            const [payouts, allConsultants, settings] = await Promise.all([
                prisma.consultantPayout.findMany({
                    where: { period },
                    include: { consultant: { select: { id: true, name: true, category: true, iban: true, avatarUrl: true } } },
                    orderBy: { earnedJetons: "desc" },
                }),
                prisma.consultant.findMany({
                    select: { id: true, completedConsultations: true, sessionFeeJeton: true },
                }),
                prisma.systemSetting.findMany(),
            ]);

            const jetonRate = parseFloat(settings.find(s => s.key === "jeton_rate")?.value || "50");
            const commissionRate = parseFloat(settings.find(s => s.key === "commission_rate")?.value || "20");
            const totalJetons = payouts.reduce((s, p) => s + p.earnedJetons, 0);
            const totalRevenueTL = totalJetons * jetonRate;
            const totalCommission = totalRevenueTL * (commissionRate / 100);
            const totalPayout = totalRevenueTL - totalCommission;

            return NextResponse.json({
                payouts,
                stats: { totalJetons, totalRevenueTL, totalCommission, totalPayout, jetonRate, commissionRate },
            });
        }

        if (tab === "settings") {
            const settings = await prisma.systemSetting.findMany();
            const mapped: Record<string, string> = {};
            settings.forEach(s => { mapped[s.key] = s.value; });
            return NextResponse.json({ settings: mapped });
        }

        return NextResponse.json({ error: "Geçersiz tab" }, { status: 400 });
    } catch (error) {
        console.error("Danışman modül hatası:", error);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

// POST — Yeni danışman, başvuru işleme, ayar kaydetme, hakediş
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
        }

        const body = await request.json();
        const { action } = body;

        // Yeni danışman oluştur
        if (action === "create_consultant") {
            const { name, title, category, bio, specializations, experienceYears, sessionFeeJeton, iban } = body;
            if (!name || !category) return NextResponse.json({ error: "İsim ve kategori gerekli" }, { status: 400 });
            const consultant = await prisma.consultant.create({
                data: {
                    name, title: title || "", category, bio: bio || "", specializations: specializations || [],
                    experienceYears: experienceYears || 0, sessionFeeJeton: sessionFeeJeton || 5, iban,
                },
            });
            return NextResponse.json({ success: true, consultant });
        }

        // Başvuru onayla → Danışman oluştur
        if (action === "approve_application") {
            const { applicationId } = body;
            const app = await prisma.consultantApplication.findUnique({ where: { id: applicationId } });
            if (!app) return NextResponse.json({ error: "Başvuru bulunamadı" }, { status: 404 });

            const [consultant] = await prisma.$transaction([
                prisma.consultant.create({
                    data: {
                        name: app.name, title: app.specialization || "", category: app.category,
                        bio: app.bio || "", experienceYears: app.experienceYears, sessionFeeJeton: 5,
                    },
                }),
                prisma.consultantApplication.update({ where: { id: applicationId }, data: { status: "approved" } }),
            ]);
            return NextResponse.json({ success: true, consultant });
        }

        // Başvuru reddet
        if (action === "reject_application") {
            const { applicationId, rejectionReason } = body;
            await prisma.consultantApplication.update({
                where: { id: applicationId },
                data: { status: "rejected", rejectionReason },
            });
            return NextResponse.json({ success: true });
        }

        // Ayar kaydet
        if (action === "save_settings") {
            const { jetonRate, commissionRate } = body;
            await Promise.all([
                prisma.systemSetting.upsert({
                    where: { key: "jeton_rate" }, update: { value: String(jetonRate) },
                    create: { key: "jeton_rate", value: String(jetonRate) },
                }),
                prisma.systemSetting.upsert({
                    where: { key: "commission_rate" }, update: { value: String(commissionRate) },
                    create: { key: "commission_rate", value: String(commissionRate) },
                }),
            ]);
            return NextResponse.json({ success: true });
        }

        // Hakediş ödenmiş olarak işaretle
        if (action === "mark_paid") {
            const { payoutId } = body;
            await prisma.consultantPayout.update({
                where: { id: payoutId },
                data: { status: "paid", paidAt: new Date() },
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
    } catch (error) {
        console.error("Danışman modül POST hatası:", error);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}

// PATCH — Danışman güncelle (düzenle, askıya al vb.)
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
        }

        const body = await request.json();
        const { id, ...data } = body;
        if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

        const allowedFields = ["name", "title", "category", "bio", "sessionFeeJeton", "costPerMessage", "maxMessagesPerSession", "iban", "isActive", "isOnline", "isFeatured", "experienceYears"];
        const updateData: any = {};
        for (const key of allowedFields) {
            if (data[key] !== undefined) updateData[key] = data[key];
        }

        const consultant = await prisma.consultant.update({ where: { id }, data: updateData });
        return NextResponse.json({ success: true, consultant });
    } catch (error) {
        console.error("Danışman güncelleme hatası:", error);
        return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
    }
}
