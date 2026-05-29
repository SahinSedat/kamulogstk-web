import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const email = 'chtszgzl@gmail.com' // I'll check all manager emails from the diagnostic later
    // Actually, I'll just try to delete all STK_MANAGERs who have NO STK

    console.log('--- ATTEMPTING TO CLEAN UP DETACHED MANAGERS ---')

    const users = await prisma.user.findMany({
        where: {
            role: 'STK_MANAGER',
            stk: null
        }
    })

    console.log(`Found ${users.length} manager(s) without an STK.`)

    for (const user of users) {
        try {
            console.log(`Attempting to delete user ${user.email} (ID: ${user.id})...`)
            await prisma.user.delete({ where: { id: user.id } })
            console.log(`Successfully deleted user ${user.email}`)
        } catch (error: any) {
            console.error(`Failed to delete user ${user.email}. Error code: ${error.code}`)
            console.error(`Error message: ${error.message}`)
            if (error.meta) {
                console.error(`Meta data (e.g. foreign key): ${JSON.stringify(error.meta)}`)
            }
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect())
