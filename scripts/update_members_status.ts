
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const stk = await prisma.sTK.findFirst()
    if (!stk) {
        console.log('No STK found')
        return
    }
    console.log(`STK: ${stk.name}`)

    const members = await prisma.member.findMany({
        where: { stkId: stk.id, status: 'APPLIED' },
        take: 2 // Update first 2 applied members
    })

    for (const member of members) {
        await prisma.member.update({
            where: { id: member.id },
            data: { status: 'ACTIVE' }
        })
        console.log(`Updated ${member.name} ${member.surname} to ACTIVE`)
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
