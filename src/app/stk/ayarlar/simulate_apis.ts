import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function testCitizenAPI() {
    console.log('--- SIMULATING CITIZEN GET /api/citizen/stks ---')
    try {
        // Mocking the query
        const query = null
        const city = 'all'
        const type = 'all'
        const sectors = []

        const where: any = { status: 'ACTIVE' }

        const results = await prisma.sTK.findMany({
            where,
            select: {
                id: true,
                name: true,
                type: true,
                logo: true,
                city: true,
                district: true,
                description: true,
                stksectors: {
                    select: {
                        sector: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        members: {
                            where: { status: 'ACTIVE' }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        })
        console.log('Results:', JSON.stringify(results, null, 2))
        console.log('Citizen API simulation successful.')
    } catch (error) {
        console.error('Citizen API simulation FAILED:', error)
    }
}

async function testAdminAPI() {
    console.log('\n--- SIMULATING ADMIN GET /api/admin/stks ---')
    try {
        const results = await prisma.sTK.findMany({
            include: {
                manager: {
                    select: { id: true, name: true, email: true, phone: true, registrationPurpose: true }
                },
                members: {
                    select: { id: true, status: true }
                },
                package: {
                    select: { id: true, name: true, monthlyPrice: true, yearlyPrice: true, currency: true }
                },
                boardMembers: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        name: true,
                        position: true,
                        startDate: true
                    }
                },
                stksectors: {
                    include: { sector: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
        console.log('Results count:', results.length)
        console.log('Admin API simulation successful.')
    } catch (error) {
        console.error('Admin API simulation FAILED:', error)
    }
}

async function run() {
    await testCitizenAPI()
    await testAdminAPI()
}

run().finally(() => prisma.$disconnect())
