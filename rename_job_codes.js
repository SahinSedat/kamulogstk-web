const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const jobs = await prisma.jobListing.findMany({ where: { code: { startsWith: 'JOB-' } } });
    console.log(`${jobs.length} adet JOB- kodlu ilan bulundu`);
    
    for (const job of jobs) {
        const newCode = job.code.replace('JOB-', 'KMG-');
        await prisma.jobListing.update({ where: { id: job.id }, data: { code: newCode } });
    }
    console.log('Tüm kodlar KMG- olarak güncellendi');
}

main().then(() => prisma.$disconnect());
