/**
 * Seed script: Django SQLite → PostgreSQL (Prisma)
 * Migrates 402 users, 34 institutions, 40 becayiş listings from old db.sqlite3
 * 
 * Usage: node scripts/seed-from-django.mjs
 */

import { PrismaClient } from "@prisma/client";
import { createId } from "@paralleldrive/cuid2";
import fs from "fs";

const prisma = new PrismaClient();

// Load exported JSON data
const usersData = JSON.parse(fs.readFileSync("/tmp/old_users.json", "utf-8"));
const institutionsData = JSON.parse(fs.readFileSync("/tmp/old_institutions.json", "utf-8"));
const listingsData = JSON.parse(fs.readFileSync("/tmp/old_listings.json", "utf-8"));

// Map Django role → Prisma Role
function mapRole(djangoRole, isSuperuser, isStaff) {
    if (djangoRole === "admin" || isSuperuser) return "ADMIN";
    if (djangoRole === "moderator" || isStaff) return "MODERATOR";
    if (djangoRole === "consultant") return "CONSULTANT";
    return "USER";
}

// Map Django listing status
function mapStatus(s) {
    if (s === "approved") return "approved";
    if (s === "rejected") return "rejected";
    if (s === "pending") return "pending";
    return s || "draft";
}

async function main() {
    console.log(`\n🔄 Migrating data from Django SQLite...`);
    console.log(`   Users: ${usersData.length}`);
    console.log(`   Institutions: ${institutionsData.length}`);
    console.log(`   Listings: ${listingsData.length}\n`);

    // ═════════════════════════════════════════════
    // 1) Map old user IDs → new CUIDs
    // ═════════════════════════════════════════════
    const userIdMap = new Map(); // old int id → new cuid

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({ where: { email: "admin@kamulog.net" } });

    let usersCreated = 0;
    let usersSkipped = 0;

    for (const u of usersData) {
        // Skip if email already exists
        const existing = await prisma.user.findUnique({ where: { email: u.email } });
        if (existing) {
            userIdMap.set(u.id, existing.id);
            usersSkipped++;
            continue;
        }

        const newId = createId();
        userIdMap.set(u.id, newId);

        const role = mapRole(u.role, u.is_superuser, u.is_staff);
        const nameStr = [u.first_name, u.last_name].filter(Boolean).join(" ") || null;

        await prisma.user.create({
            data: {
                id: newId,
                email: u.email,
                phone: u.phone_number || null,
                password: u.password, // Keep bcrypt/pbkdf2 hash as-is
                name: nameStr,
                firstName: u.first_name || null,
                lastName: u.last_name || null,
                role: role,
                isVerified: u.email_verified === 1,
                isActive: u.is_active === 1,
                isPremium: u.is_premium === 1,
                premiumUntil: u.premium_until ? new Date(u.premium_until) : null,
                aiTokens: u.ai_tokens || 0,
                becayisListingLimit: null,
                listingQuotaOneTime: 0,
                credits: 20,
                createdAt: new Date(u.date_joined),
                updatedAt: new Date(),
            },
        });
        usersCreated++;
    }

    console.log(`✅ Users: ${usersCreated} created, ${usersSkipped} skipped (already exist)`);

    // ═════════════════════════════════════════════
    // 2) Institutions
    // ═════════════════════════════════════════════
    const institutionIdMap = new Map();
    let instCreated = 0;

    for (const inst of institutionsData) {
        const existing = await prisma.institution.findUnique({ where: { name: inst.name } });
        if (existing) {
            institutionIdMap.set(inst.id, existing.id);
            continue;
        }

        const newId = createId();
        institutionIdMap.set(inst.id, newId);

        await prisma.institution.create({
            data: {
                id: newId,
                name: inst.name,
                isActive: true,
                order: inst.id,
            },
        });
        instCreated++;
    }

    console.log(`✅ Institutions: ${instCreated} created`);

    // ═════════════════════════════════════════════
    // 3) BecayisListings
    // ═════════════════════════════════════════════
    let listingsCreated = 0;
    let listingsSkipped = 0;

    for (const l of listingsData) {
        // Check if slug already exists
        const existing = await prisma.becayisListing.findUnique({ where: { slug: l.slug } });
        if (existing) {
            listingsSkipped++;
            continue;
        }

        // Verify owner exists
        const ownerId = userIdMap.get(l.owner_id);
        if (!ownerId) {
            console.log(`   ⚠ Listing "${l.title}" skipped: owner_id ${l.owner_id} not found`);
            listingsSkipped++;
            continue;
        }

        const institutionId = l.institution_id ? institutionIdMap.get(l.institution_id) : null;

        await prisma.becayisListing.create({
            data: {
                id: createId(),
                ownerId: ownerId,
                title: l.title,
                role: l.role || "",
                institutionId: institutionId || null,
                branch: l.branch || "",
                currentCity: l.current_city || "",
                currentDistrict: l.current_district || null,
                targetCity: l.target_city || "",
                assignmentMethod: l.assignment_method || null,
                assignmentMethodOther: null,
                description: l.description || "",
                isPremium: l.is_premium === 1,
                premiumUntil: l.premium_until ? new Date(l.premium_until) : null,
                status: mapStatus(l.status),
                approvedById: null,
                approvedAt: l.approved_at ? new Date(l.approved_at) : null,
                slug: l.slug,
                createdAt: new Date(l.created_at),
                updatedAt: new Date(l.updated_at),
            },
        });
        listingsCreated++;
    }

    console.log(`✅ Listings: ${listingsCreated} created, ${listingsSkipped} skipped`);

    // Final counts
    const totalUsers = await prisma.user.count();
    const totalInst = await prisma.institution.count();
    const totalListings = await prisma.becayisListing.count();

    console.log(`\n📊 Database totals:`);
    console.log(`   Users: ${totalUsers}`);
    console.log(`   Institutions: ${totalInst}`);
    console.log(`   BecayisListings: ${totalListings}`);
    console.log(`\n🎉 Migration complete!\n`);
}

main()
    .catch((e) => {
        console.error("❌ Migration failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
