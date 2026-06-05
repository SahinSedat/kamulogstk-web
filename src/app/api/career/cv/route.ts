import { createAdminNotification } from "@/lib/services/adminNotificationService";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

/**
 * CV CRUD API — Kullanıcının CV'sini yönetir.
 * Tek CV politikası: Her kullanıcı yalnızca 1 aktif CV'ye sahip olabilir.
 *
 * GET  — Kullanıcının CV bilgisini döndürür
 * POST — CV yükle (multipart PDF) veya AI CV kaydet (JSON)
 * DELETE — Kullanıcının CV'sini siler
 *
 * Auth: Authorization: Token <userId>
 */

const CV_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "cvs");

async function resolveUser(req: NextRequest) {
    const auth = req.headers.get("authorization");
    if (!auth) return null;
    const parts = auth.split(" ");
    const token = parts.length === 2 ? parts[1] : auth;
    if (!token) return null;

    let user = await prisma.user.findUnique({
        where: { id: token },
        select: { id: true, isPremium: true, name: true },
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
            select: { id: true, isPremium: true, name: true },
        });
        if (user) return user;
    }
    return null;
}

// ── GET /api/career/cv — Kullanıcının CV bilgisini getir
export async function GET(req: NextRequest) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json(
                { error: "Yetkilendirme gerekli.", reauth: true },
                { status: 401 }
            );
        }

        const cv = await prisma.cV.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                title: true,
                data: true,
                template: true,
                pdfPath: true,
                pdfGeneratedAt: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!cv) {
            return NextResponse.json({ cv: null, hasCv: false });
        }

        // PDF URL oluştur
        const pdfUrl = cv.pdfPath
            ? `/uploads/cvs/${path.basename(cv.pdfPath)}`
            : null;

        return NextResponse.json({
            cv: {
                id: cv.id,
                title: cv.title,
                data: cv.data,
                template: cv.template,
                pdfUrl,
                pdfGeneratedAt: cv.pdfGeneratedAt,
                createdAt: cv.createdAt,
                updatedAt: cv.updatedAt,
            },
            hasCv: true,
        });
    } catch (error) {
        console.error("[CV GET] Hata:", error);
        return NextResponse.json(
            { error: "Sunucu hatası" },
            { status: 500 }
        );
    }
}

// ── POST /api/career/cv — CV yükle veya AI CV kaydet
export async function POST(req: NextRequest) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json(
                { error: "Yetkilendirme gerekli.", reauth: true },
                { status: 401 }
            );
        }

        // ── Mevcut CV kontrolü ──
        const existingCv = await prisma.cV.findFirst({
            where: { userId: user.id },
        });

        // Content type kontrolü — AI mi yoksa manuel upload mi?
        const contentTypeHeader = req.headers.get("content-type") || "";
        const isAiGenerated = !contentTypeHeader.includes("multipart/form-data");

        // KURAL A: Mevcut CV varsa → yeni oluşturulamaz (hem AI hem manuel)
        if (existingCv) {
            return NextResponse.json(
                { error: "Zaten bir CV dosyanız mevcut. Yeni CV oluşturmak için önce mevcut CV'nizi silmeniz gerekiyor.", code: "CV_EXISTS" },
                { status: 400 }
            );
        }

        // KURAL B: AI CV için → cvApplicationsUsed ve plan kotası kontrolü
        if (isAiGenerated) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { 
                    cvApplicationsUsed: true,
                    kariyerSubscription: true,
                },
            });

            const cvUsed = userData?.cvApplicationsUsed || 0;

            // Plan kotasını CareerSubscriptionPlan tablosundan çek
            let planQuota = 1; // varsayılan
            const planName = (userData?.kariyerSubscription as any)?.plan;
            if (planName && planName !== "FREE") {
                const planRecord = await prisma.careerSubscriptionPlan.findFirst({
                    where: { name: planName },
                    select: { aiCvQuota: true },
                });
                if (planRecord) planQuota = planRecord.aiCvQuota;
            }

            if (cvUsed >= planQuota) {
                return NextResponse.json(
                    { error: `AI CV oluşturma hakkınız doldu (${cvUsed}/${planQuota}). Plan yükselterek daha fazla hak kazanabilirsiniz.`, code: "CV_QUOTA_EXCEEDED" },
                    { status: 400 }
                );
            }

            // AI kullanım sayacını artır
            await prisma.user.update({
                where: { id: user.id },
                data: { cvApplicationsUsed: { increment: 1 } },
            });
        }

        const contentType = contentTypeHeader;

        let title: string;
        let data: string;
        let pdfBytes: Buffer | null = null;
        let template = "modern";

        if (contentType.includes("multipart/form-data")) {
            // ── PDF dosya yükleme ──────────────────────
            const formData = await req.formData();
            const file = formData.get("file") as File | null;
            title = (formData.get("title") as string) || "Yüklenen CV";
            data = (formData.get("data") as string) || "";

            if (!file) {
                return NextResponse.json(
                    { error: "Dosya gereklidir." },
                    { status: 400 }
                );
            }

            // PDF formatı kontrolü (uzantı + MIME type)
            const fileExt = file.name.split('.').pop()?.toLowerCase();
            const fileMime = file.type?.toLowerCase() || "";
            if (fileExt !== "pdf" || (!fileMime.includes("pdf") && fileMime !== "application/octet-stream")) {
                return NextResponse.json(
                    { error: "Sadece PDF formatında dosya yüklenebilir." },
                    { status: 400 }
                );
            }

            // Dosya boyut kontrolü (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                return NextResponse.json(
                    { error: "Dosya boyutu 5MB'ı aşamaz." },
                    { status: 400 }
                );
            }

            const arrayBuffer = await file.arrayBuffer();
            pdfBytes = Buffer.from(arrayBuffer);
        } else {
            // ── JSON — AI oluşturulan CV ────────────────
            const body = await req.json();
            title = body.title || "AI CV";
            data = body.data || "";
            template = body.template || "ai_generated";

            // Base64 encoded PDF
            if (body.pdfBase64) {
                pdfBytes = Buffer.from(body.pdfBase64, "base64");
            }
        }

        // Uploads dizinini oluştur
        if (!existsSync(CV_UPLOAD_DIR)) {
            await mkdir(CV_UPLOAD_DIR, { recursive: true });
        }

        // PDF'i diske kaydet
        let pdfPath: string | null = null;
        if (pdfBytes) {
            const fileName = `${user.id}_${Date.now()}.pdf`;
            pdfPath = path.join(CV_UPLOAD_DIR, fileName);
            await writeFile(pdfPath, pdfBytes);
        }

        // Yeni CV oluştur (mevcut CV varsa yukarıda 400 döndürülür)
        const cv = await prisma.cV.create({
            data: {
                userId: user.id,
                title,
                data,
                template,
                pdfPath,
                pdfGeneratedAt: pdfBytes ? new Date() : undefined,
            },
        });

        // AI kullanımı logla
        await prisma.aIUsageLog.create({
            data: {
                userId: user.id,
                module: template === "ai_generated" ? "CAREER_CV_AI" : "CAREER_CV_UPLOAD",
                tokenUsed: 0,
            },
        });

        const pdfUrl = pdfPath
            ? `/uploads/cvs/${path.basename(pdfPath)}`
            : null;

        return NextResponse.json({
            success: true,
            cv: {
                id: cv.id,
                title: cv.title,
                pdfUrl,
                createdAt: cv.createdAt,
            },
        });
    } catch (error) {
        console.error("[CV POST] Hata:", error);
        return NextResponse.json(
            { error: "Sunucu hatası", detail: error instanceof Error ? error.message : "Bilinmeyen hata" },
            { status: 500 }
        );
    }
}

// ── DELETE /api/career/cv — Kullanıcının CV'sini sil
export async function DELETE(req: NextRequest) {
    try {
        const user = await resolveUser(req);
        if (!user) {
            return NextResponse.json(
                { error: "Yetkilendirme gerekli.", reauth: true },
                { status: 401 }
            );
        }

        const cv = await prisma.cV.findFirst({
            where: { userId: user.id },
        });

        if (!cv) {
            return NextResponse.json(
                { error: "Silinecek CV bulunamadı." },
                { status: 404 }
            );
        }

        // PDF dosyasını sil
        if (cv.pdfPath && existsSync(cv.pdfPath)) {
            try { await unlink(cv.pdfPath); } catch { /* ignore */ }
        }

        // DB kaydını sil
        await prisma.cV.delete({ where: { id: cv.id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[CV DELETE] Hata:", error);
        return NextResponse.json(
            { error: "Sunucu hatası" },
            { status: 500 }
        );
    }
}
