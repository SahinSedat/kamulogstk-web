
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        console.log('🧹 Cleaning up notifications...')

        // 1. Remove "New STK Event" and "System Maintenance" (mocked data)
        const deleted = await prisma.notification.deleteMany({
            where: {
                OR: [
                    { title: { contains: 'Yeni STK Etkinliği' } },
                    { title: { contains: 'Sistem Bakımı' } },
                    { title: { contains: 'Test Bildirimi' } }
                ]
            }
        })
        console.log(`Deleted ${deleted.count} unwanted notifications.`)

        // 2. Ensure "Welcome" notification exists for all users
        const users = await prisma.user.findMany({
            include: {
                notifications: {
                    where: { title: 'Hoş Geldiniz!' }
                }
            }
        })

        console.log(`Checking ${users.length} users for Welcome notification...`)

        for (const user of users) {
            if (user.notifications.length === 0) {
                console.log(`Creating Welcome notification for ${user.email}`)
                await prisma.notification.create({
                    data: {
                        userId: user.id,
                        title: "Hoş Geldiniz!",
                        message: "KamulogSTK platformuna katılımınız onaylanmıştır. Profilinizi tamamlayarak STK'ları keşfetmeye başlayabilirsiniz.",
                        type: "info",
                        isRead: false
                    }
                })
            }
        }

        console.log('✅ Done.')

    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
