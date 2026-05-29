
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔔 Seeding notifications...')

    const users = await prisma.user.findMany()
    console.log(`Found ${users.length} users.`)

    const notifications = [
        {
            title: "Hoş Geldiniz!",
            message: "KamulogSTK platformuna katılımınız onaylanmıştır. Profilinizi tamamlayarak STK'ları keşfetmeye başlayabilirsiniz.",
            type: "info",
            isRead: false,
            createdAt: new Date() // Bugün
        },
        {
            title: "Yeni STK Etkinliği",
            message: "Takip ettiğiniz 'Doğa Koruma Derneği' bu hafta sonu bir fidan dikme etkinliği düzenliyor.",
            type: "event",
            isRead: true,
            createdAt: new Date(Date.now() - 86400000) // Dün
        },
        {
            title: "Sistem Bakımı",
            message: "Bu gece 02:00 - 04:00 saatleri arasında planlı bakım çalışması yapılacaktır.",
            type: "system",
            isRead: true,
            createdAt: new Date(Date.now() - 172800000) // 2 gün önce
        }
    ]

    let count = 0
    for (const user of users) {
        for (const n of notifications) {
            await prisma.notification.create({
                data: {
                    userId: user.id,
                    title: n.title,
                    message: n.message,
                    type: n.type,
                    isRead: n.isRead,
                    createdAt: n.createdAt
                }
            })
            count++
        }
    }

    console.log(`✅ ${count} notifications created for ${users.length} users.`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
