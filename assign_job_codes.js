// Mevcut code'u olmayan ilanlar için otomatik JOB-XXXXXX kodu atama script'i

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function generateJobCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `JOB-${code}`;
}

async function main() {
    const jobs = await prisma.jobListing.findMany({ where: { code: null } });
    console.log(`${jobs.length} adet code'suz ilan bulundu`);
    
    let updated = 0;
    for (const job of jobs) {
        let code = generateJobCode();
        let attempts = 0;
        while (attempts < 10) {
            const existing = await prisma.jobListing.findUnique({ where: { code } });
            if (!existing) break;
            code = generateJobCode();
            attempts++;
        }
        await prisma.jobListing.update({ where: { id: job.id }, data: { code } });
        updated++;
    }
    console.log(`${updated} ilan güncellendi`);
}

main().then(() => prisma.$disconnect());
