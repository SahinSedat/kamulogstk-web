
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const count = await prisma.notification.count()
        console.log('Total Notifications:', count)

        const users = await prisma.user.findMany({
            select: { email: true, id: true }
        })
        console.log('Users:', users.length)

        users.forEach(u => console.log(u.email))

        const firstUserNotifs = await prisma.notification.findMany({
            take: 3
        })
        console.log('First 3 notifications:', firstUserNotifs)

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
