
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
        where: { stkId: stk.id },
        select: { name: true, surname: true, status: true }
    })

    console.log('--- Member List ---')
    members.forEach(m => {
        console.log(`${m.name} ${m.surname}: ${m.status}`)
    })
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
