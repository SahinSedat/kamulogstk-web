
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const stk = await prisma.sTK.findFirst()
    if (!stk) {
        console.log('No STK found')
        return
    }
    console.log(`STK: ${stk.name} (${stk.id})`)

    const activeMembers = await prisma.member.findMany({
        where: { stkId: stk.id, status: 'ACTIVE' },
        select: { id: true, name: true, surname: true, status: true }
    })

    console.log(`Found ${activeMembers.length} ACTIVE members:`)
    activeMembers.forEach(m => console.log(` - ${m.name} ${m.surname} (${m.status})`))
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
