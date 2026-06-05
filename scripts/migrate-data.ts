/**
 * Kamulog Veri Migrasyon Scripti
 * Django SQLite → PostgreSQL (Prisma)
 * Kullanım: npx tsx scripts/migrate-data.ts
 */
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const prisma = new PrismaClient();
const SSH = `sshpass -p 'W7JHHi35b2' ssh -o StrictHostKeyChecking=no root@91.151.95.75`;
const DJANGO = `cd /home/kamulog/kamulog && source venv/bin/activate`;

function fetchDjango(model: string): string {
    return execSync(`${SSH} "${DJANGO} && python manage.py dumpdata ${model} --format=json"`, { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
}

async function main() {
    console.log("🚀 Migrasyon başlatılıyor...\n");

    const userIdMap = new Map<number, string>();
    const instIdMap = new Map<number, string>();

    // 1. Kurumlar
    console.log("📦 Kurumlar...");
    const institutions = JSON.parse(fetchDjango("listings.Institution"));
    for (const i of institutions) {
        const c = await prisma.institution.upsert({
            where: { name: i.fields.name },
            create: { name: i.fields.name, isActive: i.fields.is_active, order: i.fields.order || 0 },
            update: {},
        });
        instIdMap.set(i.pk, c.id);
    }
    console.log(`  ✅ ${institutions.length} kurum`);

    // 2. Kullanıcılar
    console.log("👤 Kullanıcılar...");
    const users = JSON.parse(fetchDjango("accounts.User"));
    const roleMap: Record<string, string> = { admin: "ADMIN", moderator: "MODERATOR", consultant: "CONSULTANT", user: "USER" };
    for (const u of users) {
        const f = u.fields;
        try {
            const c = await prisma.user.upsert({
                where: { email: f.email },
                create: {
                    email: f.email,
                    password: f.password,
                    firstName: f.first_name || null,
                    lastName: f.last_name || null,
                    name: `${f.first_name || ""} ${f.last_name || ""}`.trim() || null,
                    phone: f.phone || null,
                    role: (roleMap[f.role?.toLowerCase()] || "USER") as "USER" | "ADMIN" | "MODERATOR" | "CONSULTANT",
                    isVerified: f.is_verified ?? false,
                    isActive: f.is_active ?? true,
                    isPremium: f.is_premium ?? false,
                    premiumUntil: f.premium_until ? new Date(f.premium_until) : null,
                    credits: f.credits ?? 20,
                    aiTokens: f.ai_tokens ?? 0,
                    subscriptionTier: f.subscription_tier || "basic",
                    employmentType: f.employment_type || null,
                    ministryCode: f.ministry_code || null,
                    title: f.title || null,
                    createdAt: new Date(f.date_joined || Date.now()),
                },
                update: {},
            });
            userIdMap.set(u.pk, c.id);
        } catch (e) {
            console.log(`  ⚠️ ${f.email}: ${(e as Error).message?.slice(0, 60)}`);
        }
    }
    console.log(`  ✅ ${userIdMap.size} kullanıcı`);

    // 3. Becayiş İlanları
    console.log("📋 Becayiş ilanları...");
    const listings = JSON.parse(fetchDjango("listings.BecayisListing"));
    let lCount = 0;
    for (const l of listings) {
        const f = l.fields;
        const ownerId = userIdMap.get(f.owner);
        if (!ownerId) continue;
        try {
            await prisma.becayisListing.upsert({
                where: { slug: f.slug },
                create: {
                    ownerId,
                    title: f.title,
                    role: f.role || "memur",
                    institutionId: f.institution ? instIdMap.get(f.institution) || null : null,
                    branch: f.branch || "",
                    currentCity: f.current_city,
                    targetCity: f.target_city,
                    assignmentMethod: f.assignment_method || null,
                    description: f.description || "",
                    isPremium: f.is_premium ?? false,
                    status: f.status || "draft",
                    slug: f.slug,
                    createdAt: new Date(f.created_at || Date.now()),
                },
                update: {},
            });
            lCount++;
        } catch (e) {
            console.log(`  ⚠️ İlan "${f.title}": ${(e as Error).message?.slice(0, 60)}`);
        }
    }
    console.log(`  ✅ ${lCount} ilan`);

    console.log(`\n🎉 Migrasyon tamamlandı! Kullanıcı: ${userIdMap.size}, Kurum: ${instIdMap.size}, İlan: ${lCount}`);
    await prisma.$disconnect();
}

main().catch(console.error);
