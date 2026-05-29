
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const stks = await prisma.sTK.findMany({
        include: { manager: true }
    })

    console.log(`Found ${stks.length} STKs:`)
    for (const s of stks) {
        const activeCount = await prisma.member.count({
            where: { stkId: s.id, status: 'ACTIVE' }
        })
        console.log(`- ${s.name} (Manager: ${s.manager.name} ${s.manager.email}), Active Members: ${activeCount}`)
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
