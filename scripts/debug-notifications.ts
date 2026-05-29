
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Debugging notifications...')

    const users = await prisma.user.findMany({
        include: {
            _count: {
                select: { notifications: true }
            }
        }
    })

    console.log(`Found ${users.length} users.`)
    for (const u of users) {
        console.log(`User: ${u.email} (${u.name}) - Notifications: ${u._count.notifications}`)
        if (u._count.notifications > 0) {
            const lastNotif = await prisma.notification.findFirst({
                where: { userId: u.id },
                orderBy: { createdAt: 'desc' }
            })
            console.log(`  Last Notification: ${lastNotif?.title} (${lastNotif?.createdAt})`)
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
