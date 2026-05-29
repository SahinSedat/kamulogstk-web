import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function testCitizenAPI() {
    console.log('--- TESTING CITIZEN STK API LOGIC ---')
    try {
        const where: any = { status: 'ACTIVE' }
        const stks = await prisma.sTK.findMany({
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
        console.log(`Citizen API Success: Found ${stks.length} STKs`)
    } catch (error) {
        console.error('Citizen API Logic Failed:', error)
    }
}

async function testAdminAPI() {
    console.log('\n--- TESTING ADMIN STK API LOGIC ---')
    try {
        const where: any = {}
        const stks = await prisma.sTK.findMany({
            where,
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
        console.log(`Admin API Success: Found ${stks.length} STKs`)
    } catch (error) {
        console.error('Admin API Logic Failed:', error)
    }
}

async function runTests() {
    await testCitizenAPI()
    await testAdminAPI()
}

runTests().catch(console.error).finally(() => prisma.$disconnect())
