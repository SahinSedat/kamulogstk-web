import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
}
async function main() {
    console.log('🌱 Seeding database...')

    // Create admin user
    const adminPassword = await hashPassword('admin123')
    const admin = await prisma.user.upsert({
        where: { email: 'admin@kamulogstk.com' },
        update: {},
        create: {
            email: 'admin@kamulogstk.com',
            password: adminPassword,
            name: 'Sistem Yöneticisi',
            role: 'ADMIN',
            status: 'ACTIVE',
            phone: '0532 000 0000',
        },
    })
    console.log('✅ Admin user created:', admin.email)

    // Create second admin user
    const admin2Password = await hashPassword('cihat123')
    const admin2 = await prisma.user.upsert({
        where: { email: 'chtszgzl@gmail.com' },
        update: {},
        create: {
            email: 'chtszgzl@gmail.com',
            password: admin2Password,
            name: 'Cihat',
            role: 'ADMIN',
            status: 'ACTIVE',
            phone: '',
        },
    })
    console.log('✅ Admin 2 user created:', admin2.email)

    // Create main admin user
    const mainAdminPassword = await hashPassword('Sedat.,34')
    const mainAdmin = await prisma.user.upsert({
        where: { email: 'admin@kamulog.net' },
        update: {
            password: mainAdminPassword,
            role: 'ADMIN',
            status: 'ACTIVE',
        },
        create: {
            email: 'admin@kamulog.net',
            password: mainAdminPassword,
            name: 'Admin',
            role: 'ADMIN',
            status: 'ACTIVE',
            phone: '',
        },
    })
    console.log('✅ Main Admin user created:', mainAdmin.email)

    // Create sample packages
    const packages = await Promise.all([
        prisma.package.upsert({
            where: { id: 'pkg-starter' },
            update: {},
            create: {
                id: 'pkg-starter',
                name: 'Başlangıç',
                description: 'Küçük STKlar için ideal başlangıç paketi',
                monthlyPrice: 299,
                yearlyPrice: 2990,
                maxMembers: 100,
                maxBoardMembers: 5,
                features: ['100 üye limiti', 'Temel raporlama', 'E-posta desteği'],
                status: 'ACTIVE',
            },
        }),
        prisma.package.upsert({
            where: { id: 'pkg-pro' },
            update: {},
            create: {
                id: 'pkg-pro',
                name: 'Profesyonel',
                description: 'Orta ölçekli STKlar için gelişmiş özellikler',
                monthlyPrice: 599,
                yearlyPrice: 5990,
                maxMembers: 500,
                maxBoardMembers: 10,
                features: ['500 üye limiti', 'Gelişmiş raporlama', 'Öncelikli destek', 'API erişimi'],
                status: 'ACTIVE',
            },
        }),
        prisma.package.upsert({
            where: { id: 'pkg-enterprise' },
            update: {},
            create: {
                id: 'pkg-enterprise',
                name: 'Kurumsal',
                description: 'Büyük STKlar için tam özellikli paket',
                monthlyPrice: 999,
                yearlyPrice: 9990,
                maxMembers: null,
                maxBoardMembers: 25,
                features: ['Sınırsız üye', 'Özel raporlar', '7/24 destek', 'API erişimi', 'Özel entegrasyonlar'],
                status: 'ACTIVE',
            },
        }),
    ])
    console.log('✅ Packages created:', packages.length)

    console.log('🎉 Seeding completed!')
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
