import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const stkCount = await prisma.sTK.count()
    const userCount = await prisma.user.count()
    const stkInfo = await prisma.sTK.findMany({ select: { id: true, name: true, managerId: true } })
    const userInfo = await prisma.user.findMany({ select: { id: true, email: true, role: true } })

    console.log(`STK_COUNT: ${stkCount}`)
    console.log(`USER_COUNT: ${userCount}`)
    console.log('STK_LIST: ' + JSON.stringify(stkInfo))
    console.log('USER_LIST: ' + JSON.stringify(userInfo))
}

main().catch(console.error).finally(() => prisma.$disconnect())
