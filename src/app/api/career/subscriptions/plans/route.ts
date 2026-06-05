import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Kariyer Abonelik Planları CRUD API
 * GET    /api/career/subscriptions/plans — Tüm planları listele
 * POST   /api/career/subscriptions/plans — Yeni plan oluştur
 * PUT    /api/career/subscriptions/plans — Plan güncelle
 * DELETE /api/career/subscriptions/plans — Plan sil
 */

async function isAdmin() {
    const session = await getServerSession(authOptions);
    return session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR";
}

// GET — Tüm kariyer planlarını listele (mobil + admin)
export async function GET() {
    try {
        const plans = await prisma.careerSubscriptionPlan.findMany({
            orderBy: { order: "asc" },
        });
        return NextResponse.json({ plans });
    } catch (error) {
        console.error("Career plans GET error:", error);
        return NextResponse.json({ error: "Planlar yüklenemedi" }, { status: 500 });
    }
}

// POST — Yeni plan oluştur
export async function POST(req: NextRequest) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const {
            name, interval = "lifetime", price, yearlyPrice = 0,
            yearlyDiscountRate = 20, description, badgeText,
            aiMatchQuota = 5, aiCvQuota = 2, cvUploadQuota = 1,
            aiTokens = 100, hasAiAnalyze = false, hasCvBuilder = true,
            hasJobMatching = false, hasCareerRadar = false, careerRadarDays = 30,
            isDefault = false, storeProductId, appleProductId, googleProductId,
        } = body;

        if (!name || price === undefined) {
            return NextResponse.json({ error: "name ve price zorunlu" }, { status: 400 });
        }

        // Default plan kontrolü
        if (isDefault) {
            await prisma.careerSubscriptionPlan.updateMany({
                where: { isDefault: true },
                data: { isDefault: false },
            });
        }

        // Sıralama: mevcut en yüksek order + 1
        const maxOrder = await prisma.careerSubscriptionPlan.aggregate({
            _max: { order: true },
        });

        const plan = await prisma.careerSubscriptionPlan.create({
            data: {
                name, interval, price: parseFloat(price),
                yearlyPrice: parseFloat(yearlyPrice || "0"),
                yearlyDiscountRate: parseInt(yearlyDiscountRate || "20"),
                description: description || null, badgeText: badgeText || null,
                aiMatchQuota: parseInt(aiMatchQuota),
                aiCvQuota: parseInt(aiCvQuota),
                cvUploadQuota: parseInt(cvUploadQuota),
                aiTokens: parseInt(aiTokens),
                hasAiAnalyze, hasCvBuilder, hasJobMatching,
                hasCareerRadar, careerRadarDays: parseInt(careerRadarDays),
                isDefault,
                storeProductId: storeProductId || null,
                appleProductId: appleProductId || null,
                googleProductId: googleProductId || null,
                order: (maxOrder._max.order || 0) + 1,
            },
        });

        return NextResponse.json({ plan, success: true });
    } catch (error) {
        console.error("Career plan POST error:", error);
        return NextResponse.json({ error: "Plan oluşturulamadı" }, { status: 500 });
    }
}

// PUT — Plan güncelle
export async function PUT(req: NextRequest) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { id, ...data } = body;

        if (!id) {
            return NextResponse.json({ error: "id zorunlu" }, { status: 400 });
        }

        // Fiyat alanlarını parse et
        if (data.price !== undefined) data.price = parseFloat(data.price);
        if (data.yearlyPrice !== undefined) data.yearlyPrice = parseFloat(data.yearlyPrice);
        if (data.yearlyDiscountRate !== undefined) data.yearlyDiscountRate = parseInt(data.yearlyDiscountRate);
        if (data.aiMatchQuota !== undefined) data.aiMatchQuota = parseInt(data.aiMatchQuota);
        if (data.aiCvQuota !== undefined) data.aiCvQuota = parseInt(data.aiCvQuota);
        if (data.cvUploadQuota !== undefined) data.cvUploadQuota = parseInt(data.cvUploadQuota);
        if (data.aiTokens !== undefined) data.aiTokens = parseInt(data.aiTokens);
        if (data.careerRadarDays !== undefined) data.careerRadarDays = parseInt(data.careerRadarDays);

        // Null string -> null dönüşümü (boş string'ler null olmalı)
        if (data.appleProductId === "") data.appleProductId = null;
        if (data.googleProductId === "") data.googleProductId = null;
        if (data.storeProductId === "") data.storeProductId = null;
        if (data.description === "") data.description = null;
        if (data.badgeText === "") data.badgeText = null;

        // Default plan değişikliği
        if (data.isDefault === true) {
            await prisma.careerSubscriptionPlan.updateMany({
                where: { isDefault: true, id: { not: id } },
                data: { isDefault: false },
            });
        }

        // createdAt'ı güncellemeye dahil etme
        delete data.createdAt;

        const plan = await prisma.careerSubscriptionPlan.update({
            where: { id },
            data,
        });

        return NextResponse.json({ plan, success: true });
    } catch (error) {
        console.error("Career plan PUT error:", error);
        return NextResponse.json({ error: "Plan güncellenemedi" }, { status: 500 });
    }
}

// DELETE — Plan sil (default plan silinemez)
export async function DELETE(req: NextRequest) {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id zorunlu" }, { status: 400 });
        }

        const plan = await prisma.careerSubscriptionPlan.findUnique({ where: { id } });
        if (!plan) {
            return NextResponse.json({ error: "Plan bulunamadı" }, { status: 404 });
        }
        if (plan.isDefault) {
            return NextResponse.json({ error: "Varsayılan plan silinemez" }, { status: 400 });
        }

        await prisma.careerSubscriptionPlan.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Career plan DELETE error:", error);
        return NextResponse.json({ error: "Plan silinemedi" }, { status: 500 });
    }
}
