import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function isAdmin() {
    const session = await getServerSession(authOptions);
    return session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR";
}

// GET — Soruları listele
export async function GET(req: NextRequest) {
    if (!(await isAdmin())) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;
    const where: any = {};
    if (category && category !== "Tümü") where.category = category;

    try {
        const [questions, totalCount] = await Promise.all([
            prisma.kpssQuestion.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
            prisma.kpssQuestion.count({ where }),
        ]);
        const [lisansCount, onlisansCount, ortaogretimCount, totalAll] = await Promise.all([
            prisma.kpssQuestion.count({ where: { category: "Lisans" } }),
            prisma.kpssQuestion.count({ where: { category: "Önlisans" } }),
            prisma.kpssQuestion.count({ where: { category: "Ortaöğretim" } }),
            prisma.kpssQuestion.count(),
        ]);
        return NextResponse.json({
            questions: questions.map(q => ({ ...q, createdAt: q.createdAt.toISOString() })),
            totalCount, page, limit,
            totalPages: Math.ceil(totalCount / limit),
            stats: { total: totalAll, lisans: lisansCount, onlisans: onlisansCount, ortaogretim: ortaogretimCount },
        });
    } catch (error) {
        console.error("KPSS questions GET:", error);
        return NextResponse.json({ error: "Sorular yüklenemedi" }, { status: 500 });
    }
}

// POST — Manuel soru ekleme
export async function POST(req: NextRequest) {
    if (!(await isAdmin())) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

    try {
        const body = await req.json();
        const { category, subject, questionText, options, correctAnswer, explanation, difficulty } = body;

        if (!category || !subject || !questionText || !options || !correctAnswer) {
            return NextResponse.json({ error: "Tüm alanlar zorunlu." }, { status: 400 });
        }

        const q = await prisma.kpssQuestion.create({
            data: {
                category,
                subject,
                questionText,
                options,
                correctAnswer,
                explanation: explanation || null,
                difficulty: difficulty || 2,
                isActive: true,
            },
        });

        return NextResponse.json({ success: true, question: q });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return NextResponse.json({ error: "Bu soru zaten bu kategoride mevcut (mükerrer)." }, { status: 409 });
        }
        console.error("KPSS question POST:", error);
        return NextResponse.json({ error: "Soru eklenemedi" }, { status: 500 });
    }
}

// PATCH — Soru düzenleme (doğru cevap, metin, şıklar, açıklama)
export async function PATCH(req: NextRequest) {
    if (!(await isAdmin())) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id parametresi gerekli" }, { status: 400 });

    try {
        const body = await req.json();
        const { category, subject, questionText, options, correctAnswer, explanation, difficulty, isActive } = body;

        const updateData: Record<string, unknown> = {};
        if (category !== undefined) updateData.category = category;
        if (subject !== undefined) updateData.subject = subject;
        if (questionText !== undefined) updateData.questionText = questionText;
        if (options !== undefined) updateData.options = options;
        if (correctAnswer !== undefined) updateData.correctAnswer = correctAnswer;
        if (explanation !== undefined) updateData.explanation = explanation;
        if (difficulty !== undefined) updateData.difficulty = difficulty;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updated = await prisma.kpssQuestion.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({ success: true, question: updated });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ error: "Soru bulunamadı." }, { status: 404 });
        }
        console.error("KPSS question PATCH:", error);
        return NextResponse.json({ error: "Soru güncellenemedi" }, { status: 500 });
    }
}

// DELETE — Tek soru, toplu ID silme, kategori temizleme, tümünü silme
export async function DELETE(req: NextRequest) {
    if (!(await isAdmin())) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids"); // virgülle ayrılmış ID'ler
    const clearCategory = searchParams.get("clearCategory");
    const clearAll = searchParams.get("clearAll");

    try {
        // Tek soru silme
        if (id) {
            await prisma.kpssQuestion.delete({ where: { id } });
            return NextResponse.json({ success: true, message: "Soru silindi." });
        }
        // Toplu ID silme (checkbox seçim)
        if (ids) {
            const idList = ids.split(",").filter(Boolean);
            if (idList.length === 0) return NextResponse.json({ error: "Geçersiz ID listesi" }, { status: 400 });
            const result = await prisma.kpssQuestion.deleteMany({ where: { id: { in: idList } } });
            return NextResponse.json({ success: true, message: `${result.count} soru silindi.`, deletedCount: result.count });
        }
        // Kategori temizleme
        if (clearCategory) {
            const result = await prisma.kpssQuestion.deleteMany({ where: { category: clearCategory } });
            return NextResponse.json({ success: true, message: `${clearCategory} kategorisindeki ${result.count} soru silindi.`, deletedCount: result.count });
        }
        // Tümünü silme
        if (clearAll === "true") {
            const result = await prisma.kpssQuestion.deleteMany({});
            return NextResponse.json({ success: true, message: `Tüm ${result.count} soru silindi.`, deletedCount: result.count });
        }
        return NextResponse.json({ error: "id, ids, clearCategory veya clearAll parametresi gerekli" }, { status: 400 });
    } catch (error) {
        console.error("KPSS question DELETE:", error);
        return NextResponse.json({ error: "Silme başarısız" }, { status: 500 });
    }
}
